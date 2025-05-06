import fs from 'fs';
import path from 'path';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import { automationLogsService, LogType, LogStatus } from './automation-logs-service';
import { parse } from 'csv-parse/sync';

// Service pour l'importation des données CSV
export class CsvImportService {
  // Chemin par défaut vers le fichier CSV
  private defaultCsvPath = path.resolve(process.cwd(), 'data/csv/fix_schedule.csv');
  
  // Importer le planning fixe depuis un fichier CSV
  async importFixedScheduleFromCSV(filePath: string = this.defaultCsvPath): Promise<schema.FixedSchedule[]> {
    try {
      console.log(`Importation du planning fixe depuis ${filePath}...`);
      
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Le fichier ${filePath} n'existe pas`);
      }
      
      // Lire le fichier CSV
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      console.log(`${records.length} lignes trouvées dans le fichier CSV`);
      
      // Supprimer les données existantes
      await db.delete(schema.fixedSchedules).run();
      console.log('Données existantes supprimées');
      
      // Insérer les nouvelles données
      const now = Date.now();
      const insertedSchedules: schema.FixedSchedule[] = [];
      
      for (const record of records) {
        try {
          // Extraire les données de la ligne
          const courseName = record['Course Name'] || record['courseName'] || record['Cours'] || '';
          const level = record['Level'] || record['level'] || record['Niveau'] || '';
          const teacherName = record['Teacher Name'] || record['teacherName'] || record['Coach'] || record['Professeur'] || '';
          const day = record['Day'] || record['day'] || record['Jour'] || '';
          const time = record['Time'] || record['time'] || record['Heure'] || '';
          const duration = parseInt(record['Duration (min)'] || record['duration'] || '60');
          const telegramGroup = record['Telegram Group'] || record['telegramGroup'] || record['Groupe Telegram'] || '';
          const zoomHostEmail = record['Zoom Host Email'] || record['zoomHostEmail'] || record['Email'] || '';
          
          // Normaliser les données
          const normalizedDay = this.normalizeDay(day);
          const normalizedLevel = this.normalizeLevel(level);
          
          // Insérer dans la base de données
          const result = await db.insert(schema.fixedSchedules).values({
            courseName,
            level: normalizedLevel,
            teacherName,
            day: normalizedDay,
            time,
            duration,
            telegramGroup,
            zoomHostEmail,
            isActive: true,
            createdAt: now,
            updatedAt: now
          }).run();
          
          // Récupérer l'ID inséré
          const insertedId = result.lastInsertRowid as number;
          
          // Récupérer l'enregistrement inséré
          const insertedSchedule = await db.select().from(schema.fixedSchedules)
            .where(eq(schema.fixedSchedules.id, insertedId))
            .get();
          
          if (insertedSchedule) {
            insertedSchedules.push(insertedSchedule);
            console.log(`Cours planifié créé: ${courseName} (${teacherName}) le ${normalizedDay} à ${time}`);
          }
        } catch (error) {
          console.error('Erreur lors de l\'insertion d\'un cours:', error);
        }
      }
      
      // Créer un log de succès
      await automationLogsService.createLog(
        LogType.IMPORT,
        LogStatus.SUCCESS,
        `Planning fixe importé avec succès: ${insertedSchedules.length} cours importés`,
        { count: insertedSchedules.length }
      );
      
      console.log(`Importation terminée: ${insertedSchedules.length} cours importés`);
      return insertedSchedules;
    } catch (error) {
      console.error('Erreur lors de l\'importation du planning fixe:', error);
      
      // Créer un log d'erreur
      await automationLogsService.createLog(
        LogType.IMPORT,
        LogStatus.ERROR,
        'Erreur lors de l\'importation du planning fixe',
        { error: error.message }
      );
      
      throw error;
    }
  }
  
  // Fonction pour normaliser le jour de la semaine
  private normalizeDay(day: string): schema.WeekDayType {
    const days: Record<string, schema.WeekDayType> = {
      'monday': 'monday',
      'lundi': 'monday',
      'tuesday': 'tuesday',
      'mardi': 'tuesday',
      'wednesday': 'wednesday',
      'mercredi': 'wednesday',
      'thursday': 'thursday',
      'jeudi': 'thursday',
      'friday': 'friday',
      'vendredi': 'friday',
      'saturday': 'saturday',
      'samedi': 'saturday',
      'sunday': 'sunday',
      'dimanche': 'sunday'
    };
    
    const normalizedDay = days[day.toLowerCase().trim()];
    if (!normalizedDay) {
      console.warn(`Jour non reconnu: ${day}, utilisation de 'monday' par défaut`);
      return 'monday';
    }
    
    return normalizedDay;
  }
  
  // Fonction pour normaliser le niveau du cours
  private normalizeLevel(level: string): schema.CourseLevelType {
    const levels: Record<string, schema.CourseLevelType> = {
      'bbg': 'bbg',
      'abg': 'abg',
      'ig': 'ig',
      'zbg': 'bbg',
      'iag': 'ig',
      'a1': 'bbg',
      'a2': 'bbg',
      'b1': 'abg',
      'b2': 'abg',
      'c1': 'ig',
      'c2': 'ig',
      'débutant': 'bbg',
      'intermédiaire': 'abg',
      'avancé': 'ig'
    };
    
    const normalizedLevel = levels[level.toLowerCase().trim()];
    if (!normalizedLevel) {
      console.warn(`Niveau non reconnu: ${level}, utilisation de 'bbg' par défaut`);
      return 'bbg';
    }
    
    return normalizedLevel;
  }
  
  // Fonction pour extraire les noms des coachs du planning fixe
  async getCoachesFromFixedSchedule(): Promise<string[]> {
    try {
      const fixedSchedules = await db.select().from(schema.fixedSchedules).all();
      
      // Extraire les noms des coachs uniques
      const coaches = Array.from(new Set(fixedSchedules.map(schedule => schedule.teacherName)));
      
      // Trier par ordre alphabétique
      coaches.sort();
      
      return coaches;
    } catch (error) {
      console.error('Erreur lors de la récupération des coachs:', error);
      return [];
    }
  }
  
  // Fonction pour extraire les niveaux du planning fixe
  async getLevelsFromFixedSchedule(): Promise<string[]> {
    try {
      const fixedSchedules = await db.select().from(schema.fixedSchedules).all();
      
      // Extraire les niveaux uniques
      const levels = Array.from(new Set(fixedSchedules.map(schedule => schedule.level)));
      
      return levels;
    } catch (error) {
      console.error('Erreur lors de la récupération des niveaux:', error);
      return [];
    }
  }
}

export const csvImportService = new CsvImportService();
