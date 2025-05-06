import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db, sqlite } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import { csvImportService } from './csv-import-service';

// Interface pour les données du CSV
interface FixScheduleCSV {
  'Course Name': string;
  'Level': string;
  'Teacher Name': string;
  'Day': string;
  'Time': string;
  'Duration (min)': string;
  'Telegram Group': string;
  'Zoom Host Email': string;
}

// Service pour gérer le planning fixe
export class FixedScheduleService {
  // Chemin par défaut vers le fichier CSV
  private defaultCsvPath = path.resolve(process.cwd(), 'data/csv/fix_schedule.csv');

  // Fonction pour importer le planning fixe depuis un fichier CSV
  async importFromCSV(filePath: string = this.defaultCsvPath): Promise<schema.FixedSchedule[]> {
    try {
      console.log(`Importation du planning fixe depuis ${filePath}...`);

      // Utiliser le service d'importation CSV
      const insertedSchedules = await csvImportService.importFixedScheduleFromCSV(filePath);

      console.log('Importation du planning fixe terminée avec succès');
      return insertedSchedules;
    } catch (error) {
      console.error('Erreur lors de l\'importation du planning fixe:', error);
      throw error;
    }
  }

  // Fonction pour récupérer tous les cours planifiés
  async getAllFixedSchedules(): Promise<schema.FixedSchedule[]> {
    return db.select().from(schema.fixedSchedules).all();
  }

  // Fonction pour récupérer un cours planifié par son ID
  async getFixedScheduleById(id: number): Promise<schema.FixedSchedule | undefined> {
    return db.select().from(schema.fixedSchedules)
      .where(eq(schema.fixedSchedules.id, id))
      .get();
  }

  // Fonction pour mettre à jour un cours planifié
  async updateFixedSchedule(id: number, data: {
    courseName?: string;
    level?: schema.CourseLevelType;
    teacherName?: string;
    telegramGroup?: string;
    zoomHostEmail?: string;
  }): Promise<schema.FixedSchedule | undefined> {
    db.update(schema.fixedSchedules)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(schema.fixedSchedules.id, id))
      .run();

    return this.getFixedScheduleById(id);
  }

  // Fonction pour activer ou désactiver un cours planifié
  async toggleFixedScheduleStatus(id: number, isActive: boolean): Promise<schema.FixedSchedule | undefined> {
    db.update(schema.fixedSchedules)
      .set({ isActive, updatedAt: Date.now() })
      .where(eq(schema.fixedSchedules.id, id))
      .run();

    return this.getFixedScheduleById(id);
  }

  // Fonction pour créer un nouveau cours planifié
  async createFixedSchedule(data: schema.InsertFixedSchedule): Promise<schema.FixedSchedule | undefined> {
    try {
      // Insérer le cours dans la base de données
      const result = db.insert(schema.fixedSchedules).values(data).run();

      // Récupérer l'ID inséré
      const insertedId = result.lastInsertRowid as number;

      // Récupérer et retourner le cours créé
      return this.getFixedScheduleById(insertedId);
    } catch (error) {
      console.error('Erreur lors de la création du cours planifié:', error);
      throw error;
    }
  }

  // Fonction pour supprimer un cours planifié
  async deleteFixedSchedule(id: number): Promise<boolean> {
    try {
      console.log(`Tentative de suppression du cours planifié avec l'ID ${id}`);

      // Vérifier si le cours existe
      const course = await this.getFixedScheduleById(id);
      if (!course) {
        console.log(`Cours avec l'ID ${id} non trouvé`);
        return false;
      }

      // Vérifier si les tables existent avant de tenter de supprimer des données
      try {
        // Supprimer directement le cours sans se soucier des références
        console.log(`Suppression du cours ${id}`);
        db.delete(schema.fixedSchedules)
          .where(eq(schema.fixedSchedules.id, id))
          .run();

        console.log(`Cours ${id} supprimé avec succès`);
        return true;
      } catch (error) {
        console.error(`Erreur lors de la suppression du cours ${id}:`, error);

        // Si la suppression échoue, essayons une approche plus directe avec SQL brut
        try {
          console.log(`Tentative de suppression directe avec SQL brut pour le cours ${id}`);
          sqlite.exec(`DELETE FROM fixed_schedules WHERE id = ${id}`);
          console.log(`Cours ${id} supprimé avec succès via SQL brut`);
          return true;
        } catch (sqlError) {
          console.error(`Erreur lors de la suppression directe du cours ${id}:`, sqlError);
          throw sqlError;
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la suppression du cours planifié ${id}:`, error);
      throw error;
    }
  }

  // Fonction pour normaliser le jour de la semaine
  private normalizeDay(day: string): schema.WeekDayType {
    const normalizedDay = day.toLowerCase().trim();

    switch (normalizedDay) {
      case 'monday':
      case 'lundi':
        return 'monday';
      case 'tuesday':
      case 'mardi':
        return 'tuesday';
      case 'wednesday':
      case 'mercredi':
        return 'wednesday';
      case 'thursday':
      case 'jeudi':
        return 'thursday';
      case 'friday':
      case 'vendredi':
        return 'friday';
      case 'saturday':
      case 'samedi':
        return 'saturday';
      case 'sunday':
      case 'dimanche':
        return 'sunday';
      default:
        throw new Error(`Jour de la semaine non reconnu: ${day}`);
    }
  }

  // Fonction pour normaliser le niveau de cours
  private normalizeLevel(level: string): schema.CourseLevelType {
    const normalizedLevel = level.toLowerCase().trim();

    switch (normalizedLevel) {
      case 'bbg':
        return 'bbg';
      case 'abg':
        return 'abg';
      case 'ig':
        return 'ig';
      default:
        // Par défaut, on utilise 'bbg'
        return 'bbg';
    }
  }
}

// Exporter une instance du service
export const fixedScheduleService = new FixedScheduleService();
