import axios from 'axios';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import { systemSettingsService } from './system-settings-service';
import { automationLogsService, LogType, LogStatus } from './automation-logs-service';
import { zoomOAuthService } from './zoom-oauth-service';
import { addDays, format, parse, setHours, setMinutes } from 'date-fns';

// Interface pour les paramètres de création de réunion Zoom
interface CreateZoomMeetingParams {
  topic: string;
  startTime: Date;
  duration: number;
  timezone: string;
  hostEmail: string;
}

// Service pour gérer les réunions Zoom
export class ZoomService {
  private zoomApiUrl = 'https://api.zoom.us/v2';

  // Fonction pour créer une réunion Zoom
  async createMeeting(params: CreateZoomMeetingParams): Promise<{ id: string; url: string }> {
    // Vérifier si le mode simulation est activé
    const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();

    if (isSimulationMode) {
      // Simuler la création d'une réunion Zoom
      const simulatedId = `simulated_${Date.now()}`;
      const simulatedUrl = `https://zoom.us/j/${simulatedId}`;

      // Créer un log pour la simulation
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.SIMULATED,
        `Simulation de création de réunion Zoom: ${params.topic}`,
        params
      );

      return {
        id: simulatedId,
        url: simulatedUrl
      };
    }

    try {
      // Vérifier les scopes OAuth
      const scopeCheck = await zoomOAuthService.checkScopes();
      if (!scopeCheck.valid) {
        throw new Error(`Scopes OAuth insuffisants. Manquants: ${scopeCheck.missingScopes.join(', ')}`);
      }

      // Obtenir l'utilisateur Zoom (utilisera l'email de l'hôte)
      let userId = 'me'; // Par défaut, utiliser l'utilisateur authentifié

      if (params.hostEmail) {
        try {
          // Rechercher l'utilisateur par email
          const usersResponse = await zoomOAuthService.request(
            'GET',
            `/users?email=${encodeURIComponent(params.hostEmail)}`
          );

          if (usersResponse.users && usersResponse.users.length > 0) {
            userId = usersResponse.users[0].id;
          }
        } catch (error) {
          console.warn(`Impossible de trouver l'utilisateur Zoom avec l'email ${params.hostEmail}. Utilisation de l'utilisateur par défaut.`);
        }
      }

      // Créer la réunion Zoom via l'API OAuth
      const meetingData = await zoomOAuthService.request(
        'POST',
        `/users/${userId}/meetings`,
        {
          topic: params.topic,
          type: 2, // Réunion planifiée
          start_time: params.startTime.toISOString(),
          duration: params.duration,
          timezone: params.timezone,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: true,
            auto_recording: 'none'
          }
        }
      );

      // Créer un log pour la création réussie
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.SUCCESS,
        `Réunion Zoom créée: ${params.topic}`,
        {
          meetingId: meetingData.id,
          joinUrl: meetingData.join_url,
          params
        }
      );

      return {
        id: meetingData.id,
        url: meetingData.join_url
      };
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.ERROR,
        `Erreur lors de la création de la réunion Zoom: ${params.topic}`,
        {
          error: error.response?.data || error.message,
          params
        }
      );

      throw new Error(`Erreur lors de la création de la réunion Zoom: ${error.message}`);
    }
  }

  // Fonction pour créer une réunion Zoom pour un cours planifié
  async createMeetingForFixedSchedule(fixedScheduleId: number, forDate?: Date): Promise<schema.ZoomMeeting> {
    // Récupérer le cours planifié
    const fixedSchedule = await db.select().from(schema.fixedSchedules)
      .where(eq(schema.fixedSchedules.id, fixedScheduleId))
      .get();

    if (!fixedSchedule) {
      throw new Error(`Cours planifié non trouvé: ${fixedScheduleId}`);
    }

    // Déterminer la date de la réunion
    const meetingDate = forDate || this.getNextDayOfWeek(fixedSchedule.day);

    // Parser l'heure du cours (format HH:MM)
    const [hours, minutes] = fixedSchedule.time.split(':').map(Number);

    // Définir l'heure de début de la réunion
    const startTime = new Date(meetingDate);
    startTime.setHours(hours, minutes, 0, 0);

    // Récupérer le fuseau horaire
    const timezone = await systemSettingsService.getTimezone();

    // Créer la réunion Zoom
    const { id, url } = await this.createMeeting({
      topic: `${fixedSchedule.courseName} - ${fixedSchedule.teacherName}`,
      startTime,
      duration: fixedSchedule.duration,
      timezone,
      hostEmail: fixedSchedule.zoomHostEmail
    });

    // Enregistrer la réunion dans la base de données
    const zoomMeeting: schema.InsertZoomMeeting = {
      fixedScheduleId,
      zoomMeetingId: id,
      zoomMeetingUrl: url,
      startTime: startTime.getTime(),
      status: 'scheduled',
      createdAt: Date.now()
    };

    const result = db.insert(schema.zoomMeetings).values(zoomMeeting).run();
    const insertedId = result.lastInsertRowid as number;

    const insertedMeeting = db.select().from(schema.zoomMeetings)
      .where(eq(schema.zoomMeetings.id, insertedId))
      .get();

    if (!insertedMeeting) {
      throw new Error('Erreur lors de l\'enregistrement de la réunion Zoom');
    }

    return insertedMeeting;
  }

  // Fonction pour récupérer toutes les réunions Zoom
  async getAllZoomMeetings(): Promise<schema.ZoomMeeting[]> {
    return db.select().from(schema.zoomMeetings).all();
  }

  // Fonction pour récupérer les réunions Zoom par cours planifié
  async getZoomMeetingsByFixedSchedule(fixedScheduleId: number): Promise<schema.ZoomMeeting[]> {
    return db.select().from(schema.zoomMeetings)
      .where(eq(schema.zoomMeetings.fixedScheduleId, fixedScheduleId))
      .all();
  }

  // Fonction pour récupérer la prochaine réunion Zoom pour un cours planifié
  async getNextZoomMeetingForFixedSchedule(fixedScheduleId: number): Promise<schema.ZoomMeeting | undefined> {
    const now = Date.now();

    const meetings = await db.select().from(schema.zoomMeetings)
      .where(eq(schema.zoomMeetings.fixedScheduleId, fixedScheduleId))
      .all();

    // Filtrer les réunions futures et les trier par date de début
    const futureMeetings = meetings
      .filter(meeting => meeting.startTime > now)
      .sort((a, b) => a.startTime - b.startTime);

    return futureMeetings.length > 0 ? futureMeetings[0] : undefined;
  }

  // Fonction pour créer une réunion récurrente
  async createRecurringMeeting(params: CreateZoomMeetingParams & {
    recurrence: {
      type: 1 | 2 | 3; // 1: Quotidien, 2: Hebdomadaire, 3: Mensuel
      repeat_interval?: number; // Intervalle de répétition
      weekly_days?: string; // Jours de la semaine (1-7, séparés par virgule)
      end_date_time?: string; // Date de fin (ISO)
      end_times?: number; // Nombre d'occurrences
    }
  }): Promise<{ id: string; url: string }> {
    // Vérifier si le mode simulation est activé
    const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();

    if (isSimulationMode) {
      // Simuler la création d'une réunion récurrente
      const simulatedId = `simulated_recurring_${Date.now()}`;
      const simulatedUrl = `https://zoom.us/j/${simulatedId}`;

      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.SIMULATED,
        `Simulation de création de réunion récurrente Zoom: ${params.topic}`,
        params
      );

      return {
        id: simulatedId,
        url: simulatedUrl
      };
    }

    try {
      // Vérifier les scopes OAuth
      const scopeCheck = await zoomOAuthService.checkScopes();
      if (!scopeCheck.valid) {
        throw new Error(`Scopes OAuth insuffisants. Manquants: ${scopeCheck.missingScopes.join(', ')}`);
      }

      // Obtenir l'utilisateur Zoom
      let userId = 'me';
      if (params.hostEmail) {
        try {
          const usersResponse = await zoomOAuthService.request(
            'GET',
            `/users?email=${encodeURIComponent(params.hostEmail)}`
          );

          if (usersResponse.users && usersResponse.users.length > 0) {
            userId = usersResponse.users[0].id;
          }
        } catch (error) {
          console.warn(`Impossible de trouver l'utilisateur Zoom avec l'email ${params.hostEmail}. Utilisation de l'utilisateur par défaut.`);
        }
      }

      // Créer la réunion récurrente via l'API OAuth
      const meetingData = await zoomOAuthService.request(
        'POST',
        `/users/${userId}/meetings`,
        {
          topic: params.topic,
          type: 8, // Réunion récurrente avec heure fixe
          start_time: params.startTime.toISOString(),
          duration: params.duration,
          timezone: params.timezone,
          recurrence: params.recurrence,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: true,
            auto_recording: 'none'
          }
        }
      );

      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.SUCCESS,
        `Réunion récurrente Zoom créée: ${params.topic}`,
        {
          meetingId: meetingData.id,
          joinUrl: meetingData.join_url,
          params
        }
      );

      return {
        id: meetingData.id,
        url: meetingData.join_url
      };
    } catch (error) {
      await automationLogsService.createLog(
        LogType.ZOOM_CREATION,
        LogStatus.ERROR,
        `Erreur lors de la création de la réunion récurrente Zoom: ${params.topic}`,
        {
          error: error.response?.data || error.message,
          params
        }
      );

      throw new Error(`Erreur lors de la création de la réunion récurrente Zoom: ${error.message}`);
    }
  }

  // Fonction pour obtenir la prochaine date pour un jour de la semaine donné
  private getNextDayOfWeek(dayName: string): Date {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const todayIndex = today.getDay(); // 0 = Dimanche, 1 = Lundi, etc.

    const targetIndex = days.indexOf(dayName.toLowerCase());
    if (targetIndex === -1) {
      throw new Error(`Jour de la semaine non reconnu: ${dayName}`);
    }

    // Calculer le nombre de jours à ajouter
    let daysToAdd = targetIndex - todayIndex;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Ajouter une semaine si le jour est déjà passé
    }

    return addDays(today, daysToAdd);
  }

  // Fonction pour récupérer les participants d'une réunion Zoom
  async getMeetingParticipants(meetingId: string): Promise<any[]> {
    // Vérifier si le mode simulation est activé
    const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();

    if (isSimulationMode) {
      // Simuler la récupération des participants
      const simulatedParticipants = [];
      const participantCount = Math.floor(Math.random() * 15) + 5; // Entre 5 et 20 participants

      for (let i = 0; i < participantCount; i++) {
        const joinTime = Date.now() - Math.floor(Math.random() * 60 * 60 * 1000); // Entre maintenant et il y a 1 heure
        const duration = Math.floor(Math.random() * 60) + 10; // Entre 10 et 70 minutes
        const leaveTime = joinTime + duration * 60 * 1000;

        simulatedParticipants.push({
          id: `simulated_${i}`,
          name: `Participant ${i + 1}`,
          email: `participant${i + 1}@example.com`,
          join_time: new Date(joinTime).toISOString(),
          leave_time: new Date(leaveTime).toISOString(),
          duration: duration,
          attentiveness_score: Math.floor(Math.random() * 100)
        });
      }

      // Créer un log pour la simulation
      await automationLogsService.createLog(
        LogType.ZOOM_INFO,
        LogStatus.SIMULATED,
        `Simulation de récupération des participants pour la réunion Zoom ${meetingId}`,
        { participantCount, participants: simulatedParticipants }
      );

      return simulatedParticipants;
    }

    try {
      // Vérifier les scopes OAuth
      const scopeCheck = await zoomOAuthService.checkScopes();
      if (!scopeCheck.valid) {
        throw new Error(`Scopes OAuth insuffisants. Manquants: ${scopeCheck.missingScopes.join(', ')}`);
      }

      // Récupérer les participants via l'API Zoom
      const participantsData = await zoomOAuthService.request(
        'GET',
        `/past_meetings/${meetingId}/participants`
      );

      // Créer un log pour la récupération réussie
      await automationLogsService.createLog(
        LogType.ZOOM_INFO,
        LogStatus.SUCCESS,
        `Participants de la réunion Zoom ${meetingId} récupérés avec succès`,
        { participantCount: participantsData.participants?.length || 0 }
      );

      return participantsData.participants || [];
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.ZOOM_INFO,
        LogStatus.ERROR,
        `Erreur lors de la récupération des participants de la réunion Zoom ${meetingId}`,
        { error: error.response?.data || error.message }
      );

      throw new Error(`Erreur lors de la récupération des participants: ${error.message}`);
    }
  }

  // Fonction pour enregistrer les participants d'une réunion Zoom
  async saveParticipants(meetingId: string): Promise<number> {
    try {
      // Récupérer les participants
      const participants = await this.getMeetingParticipants(meetingId);

      // Récupérer la réunion Zoom
      const zoomMeeting = await db.select().from(schema.zoomMeetings)
        .where(eq(schema.zoomMeetings.zoomMeetingId, meetingId))
        .get();

      if (!zoomMeeting) {
        throw new Error(`Réunion Zoom non trouvée: ${meetingId}`);
      }

      // Enregistrer chaque participant
      let savedCount = 0;
      for (const participant of participants) {
        const joinTime = new Date(participant.join_time).getTime();
        const leaveTime = participant.leave_time ? new Date(participant.leave_time).getTime() : null;

        // Insérer le participant dans la base de données
        await db.insert(schema.zoomParticipants).values({
          zoomMeetingId: meetingId,
          participantId: participant.id || null,
          participantName: participant.name || 'Anonyme',
          participantEmail: participant.email || null,
          joinTime,
          leaveTime,
          duration: participant.duration || null,
          attentionScore: participant.attentiveness_score || null,
          createdAt: Date.now()
        }).run();

        savedCount++;
      }

      // Mettre à jour les statistiques de la réunion
      if (participants.length > 0) {
        // Calculer la durée moyenne
        const totalDuration = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
        const averageDuration = Math.round(totalDuration / participants.length);

        // Trouver l'heure de début et de fin
        const joinTimes = participants.map(p => new Date(p.join_time).getTime());
        const leaveTimes = participants
          .filter(p => p.leave_time)
          .map(p => new Date(p.leave_time).getTime());

        const startTime = Math.min(...joinTimes);
        const endTime = leaveTimes.length > 0 ? Math.max(...leaveTimes) : null;

        // Vérifier si des statistiques existent déjà
        const existingStats = await db.select().from(schema.zoomMeetingStats)
          .where(eq(schema.zoomMeetingStats.zoomMeetingId, meetingId))
          .get();

        if (existingStats) {
          // Mettre à jour les statistiques existantes
          await db.update(schema.zoomMeetingStats)
            .set({
              participantCount: participants.length,
              averageDuration,
              maxParticipants: participants.length, // Simplification, idéalement calculer le nombre max simultané
              startTime,
              endTime,
              createdAt: Date.now()
            })
            .where(eq(schema.zoomMeetingStats.id, existingStats.id))
            .run();
        } else {
          // Créer de nouvelles statistiques
          await db.insert(schema.zoomMeetingStats).values({
            zoomMeetingId: meetingId,
            participantCount: participants.length,
            averageDuration,
            maxParticipants: participants.length, // Simplification, idéalement calculer le nombre max simultané
            startTime,
            endTime,
            createdAt: Date.now()
          }).run();
        }
      }

      return savedCount;
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement des participants de la réunion Zoom ${meetingId}:`, error);
      throw error;
    }
  }

  // Fonction pour récupérer les statistiques d'une réunion Zoom
  async getMeetingStats(meetingId: string): Promise<any> {
    try {
      // Récupérer les statistiques depuis la base de données
      const stats = await db.select().from(schema.zoomMeetingStats)
        .where(eq(schema.zoomMeetingStats.zoomMeetingId, meetingId))
        .get();

      if (stats) {
        return stats;
      }

      // Si aucune statistique n'existe, essayer de les générer
      await this.saveParticipants(meetingId);

      // Récupérer les statistiques nouvellement générées
      return await db.select().from(schema.zoomMeetingStats)
        .where(eq(schema.zoomMeetingStats.zoomMeetingId, meetingId))
        .get();
    } catch (error) {
      console.error(`Erreur lors de la récupération des statistiques de la réunion Zoom ${meetingId}:`, error);
      throw error;
    }
  }

  // Fonction pour récupérer les statistiques de toutes les réunions Zoom
  async getAllMeetingStats(): Promise<any[]> {
    try {
      // Récupérer toutes les réunions Zoom
      const meetings = await this.getAllZoomMeetings();

      // Récupérer les statistiques pour chaque réunion
      const stats = [];
      for (const meeting of meetings) {
        try {
          const meetingStats = await this.getMeetingStats(meeting.zoomMeetingId);
          if (meetingStats) {
            stats.push({
              ...meetingStats,
              fixedScheduleId: meeting.fixedScheduleId,
              zoomMeetingUrl: meeting.zoomMeetingUrl,
              status: meeting.status
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération des statistiques pour la réunion ${meeting.zoomMeetingId}:`, error);
          // Continuer avec la prochaine réunion
        }
      }

      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de toutes les réunions Zoom:', error);
      return [];
    }
  }
}

// Exporter une instance du service
export const zoomService = new ZoomService();
