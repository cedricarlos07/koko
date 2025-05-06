import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { createZoomMeeting } from '../zoom';
import { automationLogService } from './automation-log-service';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';

/**
 * Service pour l'importation automatique des cours depuis le fichier Excel
 */
export class ExcelImportService {
  private excelFilePath: string;

  constructor(excelFilePath: string) {
    this.excelFilePath = excelFilePath;
  }

  /**
   * Importe les cours à venir depuis le fichier Excel
   * Cette méthode est appelée chaque dimanche à 01h GMT par le cron
   */
  async importUpcomingCourses(): Promise<void> {
    try {
      console.log(`Importation des cours à venir depuis ${this.excelFilePath}`);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(this.excelFilePath)) {
        throw new Error(`Le fichier ${this.excelFilePath} n'existe pas.`);
      }
      
      // Lire le fichier Excel
      const workbook = XLSX.readFile(this.excelFilePath);
      
      // Obtenir le nom de la première feuille
      const sheetName = workbook.SheetNames[0];
      
      // Obtenir la feuille de calcul
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir la feuille de calcul en JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`Nombre d'enregistrements trouvés: ${data.length}`);
      
      if (data.length === 0) {
        console.log('Aucun cours trouvé dans le fichier Excel.');
        return;
      }
      
      // Obtenir la date du jour
      const today = new Date();
      
      // Obtenir le début de la semaine (lundi)
      const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
      
      // Extraire les cours pour la semaine à venir
      const upcomingCourses = this.extractUpcomingCourses(data, startOfCurrentWeek);
      
      console.log(`Nombre de cours à venir: ${upcomingCourses.length}`);
      
      // Traiter chaque cours
      for (const course of upcomingCourses) {
        await this.processCourse(course);
      }
      
      console.log('Importation des cours à venir terminée avec succès.');
    } catch (error) {
      console.error('Erreur lors de l\'importation des cours à venir:', error);
      await automationLogService.createLog({
        type: 'excel_import',
        status: 'error',
        message: `Erreur lors de l'importation des cours à venir: ${error.message}`,
        details: JSON.stringify(error),
      });
      throw error;
    }
  }
  
  /**
   * Extrait les cours pour la semaine à venir
   * @param data Les données du fichier Excel
   * @param startOfWeek La date de début de la semaine
   * @returns Les cours pour la semaine à venir
   */
  private extractUpcomingCourses(data: any[], startOfWeek: Date): any[] {
    return data.filter(record => {
      // Extraire la date du cours
      const startDateStr = record['Start Date & Time'];
      if (!startDateStr) return false;
      
      try {
        // Convertir la date en objet Date
        const courseDate = new Date(startDateStr);
        
        // Vérifier si la date est valide
        if (isNaN(courseDate.getTime())) return false;
        
        // Calculer la date de fin de la semaine (dimanche)
        const endOfWeek = addDays(startOfWeek, 6);
        
        // Vérifier si le cours est dans la semaine à venir
        return courseDate >= startOfWeek && courseDate <= endOfWeek;
      } catch (error) {
        console.error(`Erreur lors de l'analyse de la date ${startDateStr}:`, error);
        return false;
      }
    });
  }
  
  /**
   * Traite un cours (création de réunion Zoom, stockage en base de données)
   * @param course Le cours à traiter
   */
  private async processCourse(course: any): Promise<void> {
    try {
      // Extraire les informations du cours
      const topicParts = (course['Topic '] || '').split('-').map((part: string) => part.trim());
      const courseName = topicParts[0] || '';
      const level = this.normalizeLevel(topicParts.length > 1 ? topicParts[1] : '');
      const teacherName = course['Coach'] || '';
      const startDateStr = course['Start Date & Time'] || '';
      const duration = parseInt(course['Duration (Min)'] || '60', 10);
      const zoomLink = course['Zoom Link'] || '';
      const zoomId = course['ZOOM ID'] || '';
      const gmtTime = course['TIME (GMT) '] || '';
      const telegramGroup = `@${courseName.toLowerCase().replace(/\\s+/g, '')}_group`;
      const zoomHostEmail = course['Schedule for'] || '';
      
      // Convertir la date en objet Date
      const startDate = new Date(startDateStr);
      
      // Extraire le jour de la semaine
      const day = this.getDayOfWeek(startDate);
      
      // Extraire l'heure
      const time = this.extractTime(startDate);
      
      // Vérifier si le cours existe déjà en base de données
      const existingCourse = db.select()
        .from(schema.fixedSchedules)
        .where(
          schema.fixedSchedules.courseName == courseName &&
          schema.fixedSchedules.teacherName == teacherName &&
          schema.fixedSchedules.day == day &&
          schema.fixedSchedules.time == time
        )
        .all();
      
      if (existingCourse.length > 0) {
        // Le cours existe déjà, mettre à jour les informations
        const courseId = existingCourse[0].id;
        
        db.update(schema.fixedSchedules)
          .set({
            level,
            duration,
            telegramGroup,
            zoomHostEmail,
            updatedAt: Date.now(),
          })
          .where(schema.fixedSchedules.id == courseId)
          .run();
        
        console.log(`Cours mis à jour: ${courseName} le ${day} à ${time}`);
        
        // Vérifier si une réunion Zoom existe déjà
        const existingZoomMeeting = db.select()
          .from(schema.zoomMeetings)
          .where(schema.zoomMeetings.fixedScheduleId == courseId)
          .all();
        
        if (existingZoomMeeting.length === 0 && !zoomLink) {
          // Créer une réunion Zoom
          await this.createZoomMeeting(courseId, courseName, startDate, duration, zoomHostEmail);
        }
      } else {
        // Le cours n'existe pas, l'ajouter en base de données
        const result = db.insert(schema.fixedSchedules)
          .values({
            courseName,
            level,
            teacherName,
            day,
            time,
            duration,
            telegramGroup,
            zoomHostEmail,
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .run();
        
        const courseId = result.lastInsertRowid as number;
        
        console.log(`Cours créé: ${courseName} le ${day} à ${time}`);
        
        // Créer une réunion Zoom si nécessaire
        if (!zoomLink) {
          await this.createZoomMeeting(courseId, courseName, startDate, duration, zoomHostEmail);
        } else {
          // Stocker le lien Zoom existant
          db.insert(schema.zoomMeetings)
            .values({
              fixedScheduleId: courseId,
              zoomMeetingId: zoomId.toString(),
              zoomMeetingUrl: zoomLink,
              startTime: startDate.getTime(),
              status: 'scheduled',
              createdAt: Date.now(),
            })
            .run();
          
          console.log(`Lien Zoom existant stocké pour le cours ${courseName}`);
        }
      }
    } catch (error) {
      console.error(`Erreur lors du traitement du cours:`, error);
      await automationLogService.createLog({
        type: 'course_processing',
        status: 'error',
        message: `Erreur lors du traitement du cours: ${error.message}`,
        details: JSON.stringify({ course, error }),
      });
    }
  }
  
  /**
   * Crée une réunion Zoom pour un cours
   * @param courseId L'ID du cours
   * @param courseName Le nom du cours
   * @param startDate La date de début du cours
   * @param duration La durée du cours en minutes
   * @param zoomHostEmail L'email de l'hôte Zoom
   */
  private async createZoomMeeting(
    courseId: number,
    courseName: string,
    startDate: Date,
    duration: number,
    zoomHostEmail: string
  ): Promise<void> {
    try {
      // Vérifier si le mode simulation est activé
      const simulationMode = this.isSimulationModeEnabled();
      
      if (simulationMode) {
        // Simuler la création d'une réunion Zoom
        console.log(`[SIMULATION] Création d'une réunion Zoom pour le cours ${courseName}`);
        
        // Générer un ID et un lien Zoom fictifs
        const fakeZoomId = Math.floor(Math.random() * 1000000000);
        const fakeZoomLink = `https://us02web.zoom.us/j/${fakeZoomId}`;
        
        // Stocker la réunion Zoom simulée
        db.insert(schema.zoomMeetings)
          .values({
            fixedScheduleId: courseId,
            zoomMeetingId: fakeZoomId.toString(),
            zoomMeetingUrl: fakeZoomLink,
            startTime: startDate.getTime(),
            status: 'simulated',
            createdAt: Date.now(),
          })
          .run();
        
        // Créer un log d'automatisation
        await automationLogService.createLog({
          type: 'zoom_creation',
          status: 'simulated',
          message: `Réunion Zoom simulée pour le cours ${courseName}`,
          details: JSON.stringify({
            courseId,
            courseName,
            startDate,
            duration,
            zoomHostEmail,
            zoomMeetingId: fakeZoomId,
            zoomMeetingUrl: fakeZoomLink,
          }),
          fixedScheduleId: courseId,
        });
      } else {
        // Créer une réunion Zoom réelle
        const zoomMeeting = await createZoomMeeting({
          topic: courseName,
          start_time: startDate.toISOString(),
          duration,
          host_email: zoomHostEmail,
        });
        
        // Stocker la réunion Zoom
        db.insert(schema.zoomMeetings)
          .values({
            fixedScheduleId: courseId,
            zoomMeetingId: zoomMeeting.id.toString(),
            zoomMeetingUrl: zoomMeeting.join_url,
            startTime: startDate.getTime(),
            status: 'scheduled',
            createdAt: Date.now(),
          })
          .run();
        
        // Créer un log d'automatisation
        await automationLogService.createLog({
          type: 'zoom_creation',
          status: 'success',
          message: `Réunion Zoom créée pour le cours ${courseName}`,
          details: JSON.stringify({
            courseId,
            courseName,
            startDate,
            duration,
            zoomHostEmail,
            zoomMeetingId: zoomMeeting.id,
            zoomMeetingUrl: zoomMeeting.join_url,
          }),
          fixedScheduleId: courseId,
        });
        
        console.log(`Réunion Zoom créée pour le cours ${courseName}: ${zoomMeeting.join_url}`);
      }
    } catch (error) {
      console.error(`Erreur lors de la création de la réunion Zoom:`, error);
      
      // Créer un log d'automatisation
      await automationLogService.createLog({
        type: 'zoom_creation',
        status: 'error',
        message: `Erreur lors de la création de la réunion Zoom pour le cours ${courseName}: ${error.message}`,
        details: JSON.stringify({
          courseId,
          courseName,
          startDate,
          duration,
          zoomHostEmail,
          error,
        }),
        fixedScheduleId: courseId,
      });
    }
  }
  
  /**
   * Vérifie si le mode simulation est activé
   * @returns true si le mode simulation est activé, false sinon
   */
  private isSimulationModeEnabled(): boolean {
    const settings = db.select()
      .from(schema.systemSettings)
      .where(schema.systemSettings.key == 'simulation_mode')
      .all();
    
    return settings.length > 0 && settings[0].value === 'true';
  }
  
  /**
   * Normalise le niveau de cours
   * @param level Le niveau de cours
   * @returns Le niveau normalisé
   */
  private normalizeLevel(level: string): string {
    if (!level) return 'bbg';
    
    const normalizedLevel = level.toLowerCase().trim();
    
    // Mapping des niveaux CECR vers les niveaux BBG/ABG/IG
    switch (normalizedLevel) {
      case 'a1':
      case 'a2':
      case 'beginner':
      case 'elementary':
      case 'bbg':
        return 'bbg';
      case 'b1':
      case 'b2':
      case 'intermediate':
      case 'abg':
        return 'abg';
      case 'c1':
      case 'c2':
      case 'advanced':
      case 'ig':
        return 'ig';
      default:
        // Par défaut, on utilise 'bbg'
        return 'bbg';
    }
  }
  
  /**
   * Obtient le jour de la semaine à partir d'une date
   * @param date La date
   * @returns Le jour de la semaine (monday, tuesday, etc.)
   */
  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }
  
  /**
   * Extrait l'heure à partir d'une date
   * @param date La date
   * @returns L'heure au format HH:MM
   */
  private extractTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

// Créer une instance du service
const excelImportService = new ExcelImportService(
  path.resolve(process.cwd(), 'Kodjo English - Classes Schedules (2).xlsx')
);

export { excelImportService };
