import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq, and } from 'drizzle-orm';
import { zoomService } from '../services/zoom-service';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';

export class ZoomMeetingsController {
  // Récupérer toutes les réunions Zoom
  async getAllZoomMeetings(req: Request, res: Response) {
    try {
      const zoomMeetings = await db.select().from(schema.zoomMeetings).all();
      res.json(zoomMeetings);
    } catch (error) {
      console.error('Erreur lors de la récupération des réunions Zoom:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer une réunion Zoom par ID
  async getZoomMeetingById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const zoomMeeting = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.id, id))
        .get();

      if (!zoomMeeting) {
        return res.status(404).json({ error: 'Réunion Zoom non trouvée' });
      }

      res.json(zoomMeeting);
    } catch (error) {
      console.error('Erreur lors de la récupération de la réunion Zoom:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer les réunions Zoom par cours planifié
  async getZoomMeetingsByFixedSchedule(req: Request, res: Response) {
    try {
      const fixedScheduleId = parseInt(req.params.fixedScheduleId);
      const zoomMeetings = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.fixedScheduleId, fixedScheduleId))
        .all();

      res.json(zoomMeetings);
    } catch (error) {
      console.error('Erreur lors de la récupération des réunions Zoom:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Créer une réunion Zoom pour un cours planifié
  async createZoomMeeting(req: Request, res: Response) {
    try {
      const fixedScheduleId = parseInt(req.params.fixedScheduleId);
      
      // Vérifier si le cours planifié existe
      const fixedSchedule = await db.select().from(schema.fixedSchedules)
        .where(eq(schema.fixedSchedules.id, fixedScheduleId))
        .get();

      if (!fixedSchedule) {
        return res.status(404).json({ error: 'Cours planifié non trouvé' });
      }

      // Vérifier si une réunion Zoom existe déjà pour ce cours
      const existingMeeting = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.fixedScheduleId, fixedScheduleId))
        .get();

      if (existingMeeting) {
        return res.status(400).json({ error: 'Une réunion Zoom existe déjà pour ce cours' });
      }

      // Créer la réunion Zoom
      const zoomMeeting = await zoomService.createMeetingForFixedSchedule(fixedScheduleId);
      res.status(201).json(zoomMeeting);
    } catch (error) {
      console.error('Erreur lors de la création de la réunion Zoom:', error);
      
      // Créer un log d'erreur
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.ERROR,
        `Erreur lors de la création de la réunion Zoom pour le cours ${req.params.fixedScheduleId}`,
        { error: error.message }
      );
      
      res.status(500).json({ error: error.message });
    }
  }

  // Supprimer une réunion Zoom
  async deleteZoomMeeting(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      // Récupérer la réunion Zoom
      const zoomMeeting = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.id, id))
        .get();

      if (!zoomMeeting) {
        return res.status(404).json({ error: 'Réunion Zoom non trouvée' });
      }

      // Supprimer la réunion Zoom de la base de données
      await db.delete(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.id, id))
        .run();

      // Créer un log de suppression
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.INFO,
        `Réunion Zoom supprimée pour le cours ${zoomMeeting.fixedScheduleId}`,
        { zoomMeetingId: zoomMeeting.zoomMeetingId }
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur lors de la suppression de la réunion Zoom:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Mettre à jour le statut d'une réunion Zoom
  async updateZoomMeetingStatus(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Le statut est requis' });
      }

      // Vérifier si la réunion Zoom existe
      const zoomMeeting = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.id, id))
        .get();

      if (!zoomMeeting) {
        return res.status(404).json({ error: 'Réunion Zoom non trouvée' });
      }

      // Mettre à jour le statut
      await db.update(schema.zoomMeetings)
        .set({ status })
        .where(eq(schema.zoomMeetings.id, id))
        .run();

      // Récupérer la réunion mise à jour
      const updatedMeeting = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.id, id))
        .get();

      res.json(updatedMeeting);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de la réunion Zoom:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Créer des réunions Zoom en masse pour plusieurs cours planifiés
  async createBulkZoomMeetings(req: Request, res: Response) {
    try {
      const { fixedScheduleIds } = req.body;

      if (!fixedScheduleIds || !Array.isArray(fixedScheduleIds) || fixedScheduleIds.length === 0) {
        return res.status(400).json({ error: 'Liste d\'IDs de cours planifiés requise' });
      }

      const results = [];
      const errors = [];

      // Créer les réunions Zoom pour chaque cours planifié
      for (const fixedScheduleId of fixedScheduleIds) {
        try {
          // Vérifier si le cours planifié existe
          const fixedSchedule = await db.select().from(schema.fixedSchedules)
            .where(eq(schema.fixedSchedules.id, fixedScheduleId))
            .get();

          if (!fixedSchedule) {
            errors.push({ fixedScheduleId, error: 'Cours planifié non trouvé' });
            continue;
          }

          // Vérifier si une réunion Zoom existe déjà pour ce cours
          const existingMeeting = await db.select().from(schema.zoomMeetings)
            .where(eq(schema.zoomMeetings.fixedScheduleId, fixedScheduleId))
            .get();

          if (existingMeeting) {
            errors.push({ fixedScheduleId, error: 'Une réunion Zoom existe déjà pour ce cours' });
            continue;
          }

          // Créer la réunion Zoom
          const zoomMeeting = await zoomService.createMeetingForFixedSchedule(fixedScheduleId);
          results.push(zoomMeeting);
        } catch (error) {
          console.error(`Erreur lors de la création de la réunion Zoom pour le cours ${fixedScheduleId}:`, error);
          
          // Créer un log d'erreur
          await automationLogsService.createLog(
            LogType.ZOOM_CREATION,
            LogStatus.ERROR,
            `Erreur lors de la création de la réunion Zoom pour le cours ${fixedScheduleId}`,
            { error: error.message }
          );
          
          errors.push({ fixedScheduleId, error: error.message });
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

export const zoomMeetingsController = new ZoomMeetingsController();
