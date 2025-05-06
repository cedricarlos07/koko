import { Request, Response } from 'express';
import { db, sqlite } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq, and, between, gte, lte } from 'drizzle-orm';
import { zoomService } from '../services/zoom-service';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';
import { addDays, format, parse, parseISO, startOfDay, endOfDay } from 'date-fns';

export class DynamicScheduleController {
  constructor() {
    this.initDynamicScheduleTable();
  }

  // Initialiser la table dynamic_schedule si elle n'existe pas
  private async initDynamicScheduleTable() {
    try {
      console.log('Vérification de la table dynamic_schedule...');

      // Vérifier si la table existe
      const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dynamic_schedule'").get();

      if (!tableExists) {
        console.log('La table dynamic_schedule n\'existe pas. Création de la table...');

        // Créer la table
        sqlite.exec(`
          CREATE TABLE dynamic_schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fixed_schedule_id INTEGER NOT NULL,
            course_name TEXT NOT NULL,
            level TEXT NOT NULL,
            teacher_name TEXT NOT NULL,
            scheduled_date INTEGER NOT NULL,
            scheduled_time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            zoom_meeting_id TEXT,
            zoom_meeting_url TEXT,
            status TEXT DEFAULT 'pending',
            telegram_group TEXT,
            created_at INTEGER NOT NULL
          )
        `);

        console.log('Table dynamic_schedule créée avec succès.');
      } else {
        console.log('La table dynamic_schedule existe déjà.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la table dynamic_schedule:', error);
    }
  }
  // Récupérer le planning dynamique pour une période donnée
  async getDynamicSchedule(req: Request, res: Response) {
    try {
      const startTimestamp = parseInt(req.query.start as string);
      const endTimestamp = parseInt(req.query.end as string);

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return res.status(400).json({ error: 'Les paramètres start et end sont requis et doivent être des timestamps' });
      }

      // Récupérer les entrées du planning dynamique pour la période
      const dynamicSchedule = await db.select().from(schema.dynamicSchedule)
        .where(
          and(
            gte(schema.dynamicSchedule.scheduledDate, startTimestamp),
            lte(schema.dynamicSchedule.scheduledDate, endTimestamp)
          )
        )
        .all();

      res.json(dynamicSchedule);
    } catch (error) {
      console.error('Erreur lors de la récupération du planning dynamique:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer une entrée du planning dynamique par ID
  async getDynamicScheduleById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const scheduleEntry = await db.select().from(schema.dynamicSchedule)
        .where(eq(schema.dynamicSchedule.id, id))
        .get();

      if (!scheduleEntry) {
        return res.status(404).json({ error: 'Entrée de planning non trouvée' });
      }

      res.json(scheduleEntry);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'entrée de planning:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Générer le planning dynamique pour une semaine donnée
  async generateDynamicSchedule(req: Request, res: Response) {
    try {
      const { weekStart } = req.body;

      if (!weekStart) {
        return res.status(400).json({ error: 'Le paramètre weekStart est requis' });
      }

      // Convertir le timestamp en date
      const startDate = new Date(weekStart);

      // Calculer la date de fin (7 jours après)
      const endDate = addDays(startDate, 6);

      // Récupérer tous les cours du planning fixe
      let fixedSchedules = await db.select().from(schema.fixedSchedules)
        .where(eq(schema.fixedSchedules.isActive, true))
        .all();

      // Si aucun cours n'est trouvé, utiliser les données du fichier real_fix_schedule.csv
      if (fixedSchedules.length === 0) {
        console.log('Aucun cours trouvé dans la base de données, utilisation des données du fichier real_fix_schedule.csv');

        // Récupérer les données réelles depuis la base de données
        const realFixSchedule = await db.select().from(schema.fixedSchedules).all();

        fixedSchedules = realFixSchedule.map(course => ({
          ...course,
          id: 0,
          isActive: true,
          createdAt: 0,
          updatedAt: 0
        }));
      }

      // Supprimer les entrées existantes pour cette semaine
      await db.delete(schema.dynamicSchedule)
        .where(
          and(
            gte(schema.dynamicSchedule.scheduledDate, startDate.getTime()),
            lte(schema.dynamicSchedule.scheduledDate, endDate.getTime())
          )
        )
        .run();

      // Mapper les jours de la semaine
      const weekDays = {
        'sunday': 0,
        'monday': 1,
        'tuesday': 2,
        'wednesday': 3,
        'thursday': 4,
        'friday': 5,
        'saturday': 6
      };

      const results = [];

      // Pour chaque cours du planning fixe
      for (const schedule of fixedSchedules) {
        try {
          // Récupérer l'index du jour dans la semaine (0-6)
          const dayIndex = weekDays[schedule.day.toLowerCase()];

          if (dayIndex === undefined) {
            console.warn(`Jour non reconnu: ${schedule.day}`);
            continue;
          }

          // Calculer la date du cours pour cette semaine
          const courseDate = addDays(startDate, dayIndex);

          // Créer l'entrée dans le planning dynamique
          const now = Date.now();
          const result = await db.insert(schema.dynamicSchedule).values({
            fixedScheduleId: schedule.id,
            courseName: schedule.courseName,
            level: schedule.level,
            teacherName: schedule.teacherName,
            scheduledDate: courseDate.getTime(),
            scheduledTime: schedule.time,
            duration: schedule.duration,
            zoomMeetingId: null,
            zoomMeetingUrl: null,
            status: 'pending',
            telegramGroup: schedule.telegramGroup,
            createdAt: now
          }).run();

          results.push({
            id: result.lastInsertRowid,
            fixedScheduleId: schedule.id,
            courseName: schedule.courseName,
            scheduledDate: courseDate.getTime(),
            scheduledTime: schedule.time
          });
        } catch (error) {
          console.error(`Erreur lors de la génération du planning pour le cours ${schedule.id}:`, error);
        }
      }

      // Créer un log de succès
      await automationLogsService.createLog(
        LogType.SCHEDULED_MESSAGE,
        LogStatus.SUCCESS,
        `Planning dynamique généré pour la semaine du ${format(startDate, 'dd/MM/yyyy')} au ${format(endDate, 'dd/MM/yyyy')}`,
        { entriesCount: results.length }
      );

      res.json({
        success: true,
        count: results.length,
        entries: results
      });
    } catch (error) {
      console.error('Erreur lors de la génération du planning dynamique:', error);

      // Créer un log d'erreur
      await automationLogsService.createLog(
        LogType.SCHEDULED_MESSAGE,
        LogStatus.ERROR,
        'Erreur lors de la génération du planning dynamique',
        { error: error.message }
      );

      res.status(500).json({ error: error.message });
    }
  }

  // Créer une réunion Zoom pour une entrée du planning dynamique
  async createZoomMeeting(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      // Récupérer l'entrée du planning
      const scheduleEntry = await db.select().from(schema.dynamicSchedule)
        .where(eq(schema.dynamicSchedule.id, id))
        .get();

      if (!scheduleEntry) {
        return res.status(404).json({ error: 'Entrée de planning non trouvée' });
      }

      // Vérifier si une réunion Zoom existe déjà
      if (scheduleEntry.zoomMeetingId) {
        return res.status(400).json({ error: 'Une réunion Zoom existe déjà pour cette entrée' });
      }

      // Créer la date de début
      const startDate = new Date(scheduleEntry.scheduledDate);
      const [hours, minutes] = scheduleEntry.scheduledTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      // Créer la réunion Zoom
      const zoomMeeting = await zoomService.createMeeting({
        topic: `${scheduleEntry.courseName} - ${scheduleEntry.teacherName}`,
        startTime: startDate,
        duration: scheduleEntry.duration,
        timezone: 'GMT'
      });

      // Mettre à jour l'entrée du planning
      await db.update(schema.dynamicSchedule)
        .set({
          zoomMeetingId: zoomMeeting.id,
          zoomMeetingUrl: zoomMeeting.url,
          status: 'scheduled'
        })
        .where(eq(schema.dynamicSchedule.id, id))
        .run();

      // Récupérer l'entrée mise à jour
      const updatedEntry = await db.select().from(schema.dynamicSchedule)
        .where(eq(schema.dynamicSchedule.id, id))
        .get();

      // Créer un log de succès
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.SUCCESS,
        `Réunion Zoom créée pour ${scheduleEntry.courseName} le ${format(startDate, 'dd/MM/yyyy à HH:mm')}`,
        {
          meetingId: zoomMeeting.id,
          joinUrl: zoomMeeting.url,
          scheduleId: id
        }
      );

      res.json(updatedEntry);
    } catch (error) {
      console.error('Erreur lors de la création de la réunion Zoom:', error);

      // Créer un log d'erreur
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.ERROR,
        `Erreur lors de la création de la réunion Zoom pour l'entrée ${req.params.id}`,
        { error: error.message }
      );

      res.status(500).json({ error: error.message });
    }
  }

  // Créer des réunions Zoom en masse pour plusieurs entrées du planning
  async createBulkZoomMeetings(req: Request, res: Response) {
    try {
      const { scheduleIds } = req.body;

      if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
        return res.status(400).json({ error: 'Liste d\'IDs d\'entrées de planning requise' });
      }

      const results = [];
      const errors = [];

      // Créer les réunions Zoom pour chaque entrée
      for (const scheduleId of scheduleIds) {
        try {
          // Récupérer l'entrée du planning
          const scheduleEntry = await db.select().from(schema.dynamicSchedule)
            .where(eq(schema.dynamicSchedule.id, scheduleId))
            .get();

          if (!scheduleEntry) {
            errors.push({ scheduleId, error: 'Entrée de planning non trouvée' });
            continue;
          }

          // Vérifier si une réunion Zoom existe déjà
          if (scheduleEntry.zoomMeetingId) {
            errors.push({ scheduleId, error: 'Une réunion Zoom existe déjà pour cette entrée' });
            continue;
          }

          // Créer la date de début
          const startDate = new Date(scheduleEntry.scheduledDate);
          const [hours, minutes] = scheduleEntry.scheduledTime.split(':').map(Number);
          startDate.setHours(hours, minutes, 0, 0);

          // Créer la réunion Zoom
          const zoomMeeting = await zoomService.createMeeting({
            topic: `${scheduleEntry.courseName} - ${scheduleEntry.teacherName}`,
            startTime: startDate,
            duration: scheduleEntry.duration,
            timezone: 'GMT'
          });

          // Mettre à jour l'entrée du planning
          await db.update(schema.dynamicSchedule)
            .set({
              zoomMeetingId: zoomMeeting.id,
              zoomMeetingUrl: zoomMeeting.url,
              status: 'scheduled'
            })
            .where(eq(schema.dynamicSchedule.id, scheduleId))
            .run();

          // Créer un log de succès
          await automationLogsService.createLog(
            LogType.ZOOM_CREATION,
            LogStatus.SUCCESS,
            `Réunion Zoom créée pour ${scheduleEntry.courseName} le ${format(startDate, 'dd/MM/yyyy à HH:mm')}`,
            {
              meetingId: zoomMeeting.id,
              joinUrl: zoomMeeting.url,
              scheduleId
            }
          );

          results.push({
            scheduleId,
            courseName: scheduleEntry.courseName,
            zoomMeetingId: zoomMeeting.id,
            zoomMeetingUrl: zoomMeeting.url
          });
        } catch (error) {
          console.error(`Erreur lors de la création de la réunion Zoom pour l'entrée ${scheduleId}:`, error);

          // Créer un log d'erreur
          await automationLogsService.createLog(
            LogType.ZOOM_CREATION,
            LogStatus.ERROR,
            `Erreur lors de la création de la réunion Zoom pour l'entrée ${scheduleId}`,
            { error: error.message }
          );

          errors.push({ scheduleId, error: error.message });
        }
      }

      res.json({
        success: results.length > 0,
        created: results.length,
        errors: errors.length,
        results,
        errorDetails: errors
      });
    } catch (error) {
      console.error('Erreur lors de la création des réunions Zoom en masse:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const dynamicScheduleController = new DynamicScheduleController();
