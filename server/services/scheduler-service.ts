import cron from 'node-cron';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import { systemSettingsService } from './system-settings-service';
import { automationLogsService, LogType, LogStatus } from './automation-logs-service';
import { zoomService } from './zoom-service';
import { telegramService } from './telegram-service';
import { addDays, format, parse, setHours, setMinutes, subMinutes } from 'date-fns';

// Service pour gérer la planification des tâches
export class SchedulerService {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private reminderTimeouts: Map<number, NodeJS.Timeout> = new Map();

  // Fonction pour initialiser les tâches planifiées
  async initializeScheduler(): Promise<void> {
    console.log('Initialisation du planificateur de tâches...');

    // Arrêter toutes les tâches existantes
    this.stopAllTasks();

    // Planifier la création des réunions Zoom pour chaque jour de la semaine
    this.scheduleZoomCreation();

    // Planifier l'envoi des messages de cours pour chaque jour de la semaine
    this.scheduleCourseMessages();

    // Planifier le transfert automatique des messages de la chaîne Telegram
    this.scheduleChannelForwards();

    console.log('Planificateur de tâches initialisé avec succès');
  }

  // Fonction pour planifier la création des réunions Zoom
  private scheduleZoomCreation(): void {
    // Planifier la création des réunions Zoom tous les dimanches à minuit
    const taskId = 'zoom-creation';
    const task = cron.schedule('0 0 * * 0', async () => {
      console.log('Exécution de la tâche de création des réunions Zoom...');

      try {
        // Récupérer tous les cours planifiés actifs
        const fixedSchedules = await db.select().from(schema.fixedSchedules)
          .where(eq(schema.fixedSchedules.isActive, true))
          .all();

        // Créer les réunions Zoom pour chaque cours
        for (const schedule of fixedSchedules) {
          try {
            await zoomService.createMeetingForFixedSchedule(schedule.id);
            console.log(`Réunion Zoom créée pour le cours ${schedule.courseName}`);
          } catch (error) {
            console.error(`Erreur lors de la création de la réunion Zoom pour le cours ${schedule.courseName}:`, error);
          }
        }

        console.log('Tâche de création des réunions Zoom terminée avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'exécution de la tâche de création des réunions Zoom:', error);
      }
    });

    this.scheduledTasks.set(taskId, task);
    console.log(`Tâche planifiée: ${taskId}`);
  }

  // Fonction pour planifier l'envoi des messages de cours
  private scheduleCourseMessages(): void {
    // Planifier l'envoi des messages pour chaque jour de la semaine
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    days.forEach((day, index) => {
      const taskId = `course-messages-${day}`;

      // Planifier l'envoi des messages à 6h du matin chaque jour
      const task = cron.schedule(`0 6 * * ${index}`, async () => {
        console.log(`Exécution de la tâche d'envoi des messages pour ${day}...`);

        try {
          // Récupérer tous les cours planifiés actifs pour ce jour
          const fixedSchedules = await db.select().from(schema.fixedSchedules)
            .where(eq(schema.fixedSchedules.isActive, true))
            .where(eq(schema.fixedSchedules.day, day))
            .all();

          // Envoyer les messages pour chaque cours
          for (const schedule of fixedSchedules) {
            try {
              await telegramService.sendCourseMessage(schedule.id);
              console.log(`Message envoyé pour le cours ${schedule.courseName}`);

              // Planifier le rappel
              this.scheduleReminder(schedule);
            } catch (error) {
              console.error(`Erreur lors de l'envoi du message pour le cours ${schedule.courseName}:`, error);
            }
          }

          console.log(`Tâche d'envoi des messages pour ${day} terminée avec succès`);
        } catch (error) {
          console.error(`Erreur lors de l'exécution de la tâche d'envoi des messages pour ${day}:`, error);
        }
      });

      this.scheduledTasks.set(taskId, task);
      console.log(`Tâche planifiée: ${taskId}`);
    });
  }

  // Fonction pour planifier un rappel pour un cours
  private async scheduleReminder(fixedSchedule: schema.FixedSchedule): Promise<void> {
    try {
      // Récupérer le nombre de minutes avant le cours pour envoyer un rappel
      const reminderMinutesBefore = await systemSettingsService.getReminderMinutesBefore();

      // Parser l'heure du cours (format HH:MM)
      const [hours, minutes] = fixedSchedule.time.split(':').map(Number);

      // Calculer l'heure du rappel
      const now = new Date();
      const courseTime = new Date(now);
      courseTime.setHours(hours, minutes, 0, 0);

      const reminderTime = subMinutes(courseTime, reminderMinutesBefore);

      // Vérifier si l'heure du rappel est dans le futur
      if (reminderTime > now) {
        // Calculer le délai en millisecondes
        const delay = reminderTime.getTime() - now.getTime();

        // Planifier le rappel
        const timeout = setTimeout(async () => {
          try {
            await telegramService.sendReminderMessage(fixedSchedule.id);
            console.log(`Rappel envoyé pour le cours ${fixedSchedule.courseName}`);

            // Supprimer le timeout de la map
            this.reminderTimeouts.delete(fixedSchedule.id);
          } catch (error) {
            console.error(`Erreur lors de l'envoi du rappel pour le cours ${fixedSchedule.courseName}:`, error);
          }
        }, delay);

        // Stocker le timeout dans la map
        this.reminderTimeouts.set(fixedSchedule.id, timeout);

        console.log(`Rappel planifié pour le cours ${fixedSchedule.courseName} à ${format(reminderTime, 'HH:mm')}`);
      }
    } catch (error) {
      console.error(`Erreur lors de la planification du rappel pour le cours ${fixedSchedule.courseName}:`, error);
    }
  }

  // Fonction pour arrêter toutes les tâches planifiées
  stopAllTasks(): void {
    // Arrêter toutes les tâches cron
    for (const [taskId, task] of this.scheduledTasks.entries()) {
      task.stop();
      console.log(`Tâche arrêtée: ${taskId}`);
    }

    // Vider la map des tâches
    this.scheduledTasks.clear();

    // Arrêter tous les timeouts de rappel
    for (const [scheduleId, timeout] of this.reminderTimeouts.entries()) {
      clearTimeout(timeout);
      console.log(`Rappel annulé pour le cours ${scheduleId}`);
    }

    // Vider la map des timeouts
    this.reminderTimeouts.clear();

    console.log('Toutes les tâches planifiées ont été arrêtées');
  }

  // Fonction pour démarrer manuellement la tâche de création des réunions Zoom
  async manuallyCreateZoomMeetings(): Promise<void> {
    console.log('Exécution manuelle de la tâche de création des réunions Zoom...');

    try {
      // Récupérer tous les cours planifiés actifs
      const fixedSchedules = await db.select().from(schema.fixedSchedules)
        .where(eq(schema.fixedSchedules.isActive, true))
        .all();

      // Créer les réunions Zoom pour chaque cours
      for (const schedule of fixedSchedules) {
        try {
          await zoomService.createMeetingForFixedSchedule(schedule.id);
          console.log(`Réunion Zoom créée pour le cours ${schedule.courseName}`);
        } catch (error) {
          console.error(`Erreur lors de la création de la réunion Zoom pour le cours ${schedule.courseName}:`, error);
        }
      }

      console.log('Tâche de création des réunions Zoom terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la tâche de création des réunions Zoom:', error);
      throw error;
    }
  }

  // Fonction pour démarrer manuellement la tâche d'envoi des messages de cours
  async manuallySendCourseMessages(day?: string): Promise<void> {
    const targetDay = day || this.getCurrentDay();

    console.log(`Exécution manuelle de la tâche d'envoi des messages pour ${targetDay}...`);

    try {
      // Récupérer tous les cours planifiés actifs pour ce jour
      const fixedSchedules = await db.select().from(schema.fixedSchedules)
        .where(eq(schema.fixedSchedules.isActive, true))
        .where(eq(schema.fixedSchedules.day, targetDay))
        .all();

      // Envoyer les messages pour chaque cours
      for (const schedule of fixedSchedules) {
        try {
          await telegramService.sendCourseMessage(schedule.id);
          console.log(`Message envoyé pour le cours ${schedule.courseName}`);

          // Planifier le rappel
          this.scheduleReminder(schedule);
        } catch (error) {
          console.error(`Erreur lors de l'envoi du message pour le cours ${schedule.courseName}:`, error);
        }
      }

      console.log(`Tâche d'envoi des messages pour ${targetDay} terminée avec succès`);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la tâche d'envoi des messages pour ${targetDay}:`, error);
      throw error;
    }
  }

  // Fonction pour obtenir le jour de la semaine actuel
  private getCurrentDay(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    return days[today.getDay()];
  }

  // Fonction pour planifier le transfert automatique des messages de la chaîne Telegram
  private scheduleChannelForwards(): void {
    // Planifier le transfert toutes les heures
    const taskId = 'channel-forwards';
    const task = cron.schedule('0 * * * *', async () => {
      console.log('Exécution de la tâche de transfert des messages de la chaîne Telegram...');

      try {
        // Exécuter tous les transferts configurés
        const result = await telegramService.executeAllChannelForwards();

        // Créer un log pour l'exécution réussie
        await automationLogsService.createLog(
          LogType.TELEGRAM_MESSAGE,
          LogStatus.SUCCESS,
          `Tâche de transfert des messages de la chaîne Telegram exécutée avec succès`,
          { result }
        );

        console.log(`Tâche de transfert des messages terminée: ${result.transferCount} messages transférés`);
      } catch (error) {
        // Créer un log pour l'erreur
        await automationLogsService.createLog(
          LogType.TELEGRAM_MESSAGE,
          LogStatus.ERROR,
          `Erreur lors de l'exécution de la tâche de transfert des messages de la chaîne Telegram`,
          { error: error.message }
        );

        console.error('Erreur lors de l\'exécution de la tâche de transfert des messages de la chaîne Telegram:', error);
      }
    });

    this.scheduledTasks.set(taskId, task);
    console.log(`Tâche planifiée: ${taskId}`);
  }

  // Fonction pour démarrer manuellement la tâche de transfert des messages de la chaîne Telegram
  async manuallyExecuteChannelForwards(): Promise<any> {
    console.log('Exécution manuelle de la tâche de transfert des messages de la chaîne Telegram...');

    try {
      // Exécuter tous les transferts configurés
      const result = await telegramService.executeAllChannelForwards();

      // Créer un log pour l'exécution réussie
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.SUCCESS,
        `Tâche de transfert des messages de la chaîne Telegram exécutée manuellement avec succès`,
        { result }
      );

      console.log(`Tâche de transfert des messages terminée: ${result.transferCount} messages transférés`);
      return result;
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.ERROR,
        `Erreur lors de l'exécution manuelle de la tâche de transfert des messages de la chaîne Telegram`,
        { error: error.message }
      );

      console.error('Erreur lors de l\'exécution manuelle de la tâche de transfert des messages de la chaîne Telegram:', error);
      throw error;
    }
  }
}

// Exporter une instance du service
export const schedulerService = new SchedulerService();
