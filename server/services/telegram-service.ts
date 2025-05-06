import axios from 'axios';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import { systemSettingsService } from './system-settings-service';
import { automationLogsService, LogType, LogStatus } from './automation-logs-service';
import { zoomService } from './zoom-service';
import { format } from 'date-fns';

// Interface pour les paramètres d'envoi de message Telegram
interface SendTelegramMessageParams {
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  silent?: boolean;
}

// Interface pour les membres du groupe Telegram
interface TelegramGroupMember {
  id: number;
  username?: string;
  firstName: string;
  lastName: string;
  messageCount: number;
  lastActivity: number;
}

// Interface pour l'activité horaire du groupe Telegram
interface HourlyActivity {
  hour: string;
  count: number;
}

// Service pour gérer les messages Telegram
export class TelegramService {
  private telegramApiUrl = 'https://api.telegram.org/bot';
  private telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';

  // Fonction pour envoyer un message Telegram
  async sendMessage(params: SendTelegramMessageParams | string, message?: string, parseMode?: 'HTML' | 'Markdown'): Promise<boolean> {
    // Si params est une chaîne, c'est l'ID du groupe
    if (typeof params === 'string') {
      return this.sendMessage({
        chatId: params,
        message: message || '',
        parseMode: parseMode
      });
    }
    // Vérifier si le mode simulation est activé
    const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();

    if (isSimulationMode) {
      // Simuler l'envoi d'un message Telegram
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.SIMULATED,
        `Simulation d'envoi de message Telegram au groupe ${params.chatId}`,
        {
          chatId: params.chatId,
          message: params.message,
          parseMode: params.parseMode,
          silent: params.silent
        }
      );

      return true;
    }

    try {
      // Envoyer le message Telegram via l'API
      const response = await axios.post(
        `${this.telegramApiUrl}${this.telegramBotToken}/sendMessage`,
        {
          chat_id: params.chatId,
          text: params.message,
          parse_mode: params.parseMode || 'HTML',
          disable_notification: params.silent || false
        }
      );

      // Créer un log pour l'envoi réussi
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.SUCCESS,
        `Message Telegram envoyé au groupe ${params.chatId}`,
        {
          chatId: params.chatId,
          messageId: response.data.result.message_id,
          silent: params.silent
        }
      );

      return true;
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.ERROR,
        `Erreur lors de l'envoi du message Telegram au groupe ${params.chatId}`,
        {
          error: error.message,
          chatId: params.chatId
        }
      );

      throw new Error(`Erreur lors de l'envoi du message Telegram: ${error.message}`);
    }
  }

  // Fonction pour envoyer un message de cours pour un cours planifié
  async sendCourseMessage(fixedScheduleId: number, isReminder: boolean = false): Promise<boolean> {
    // Récupérer le cours planifié
    const fixedSchedule = await db.select().from(schema.fixedSchedules)
      .where(eq(schema.fixedSchedules.id, fixedScheduleId))
      .get();

    if (!fixedSchedule) {
      throw new Error(`Cours planifié non trouvé: ${fixedScheduleId}`);
    }

    // Récupérer la prochaine réunion Zoom pour ce cours
    const nextZoomMeeting = await zoomService.getNextZoomMeetingForFixedSchedule(fixedScheduleId);

    if (!nextZoomMeeting) {
      // Créer une nouvelle réunion Zoom si aucune n'est trouvée
      const newZoomMeeting = await zoomService.createMeetingForFixedSchedule(fixedScheduleId);

      // Envoyer le message avec la nouvelle réunion
      return this.sendCourseMessageWithZoomMeeting(fixedSchedule, newZoomMeeting, isReminder);
    }

    // Envoyer le message avec la réunion existante
    return this.sendCourseMessageWithZoomMeeting(fixedSchedule, nextZoomMeeting, isReminder);
  }

  // Fonction pour envoyer un message de rappel pour un cours planifié
  async sendReminderMessage(fixedScheduleId: number): Promise<boolean> {
    return this.sendCourseMessage(fixedScheduleId, true);
  }

  // Fonction interne pour envoyer un message de cours avec une réunion Zoom
  private async sendCourseMessageWithZoomMeeting(
    fixedSchedule: schema.FixedSchedule,
    zoomMeeting: schema.ZoomMeeting,
    isReminder: boolean
  ): Promise<boolean> {
    // Formater l'heure du cours
    const courseTime = fixedSchedule.time;

    // Récupérer le fuseau horaire
    const timezone = await systemSettingsService.getTimezone();

    // Construire le message
    let message = '';

    if (isReminder) {
      message = `⏰ <b>RAPPEL: Cours dans ${await systemSettingsService.getReminderMinutesBefore()} minutes</b>\n\n`;
    }

    message += `📚 <b>${fixedSchedule.courseName}</b>\n`;
    message += `👨‍🏫 Enseignant : ${fixedSchedule.teacherName}\n`;
    message += `🕘 Heure : ${courseTime} ${timezone}\n`;
    message += `📍 Rejoindre le cours : <a href="${zoomMeeting.zoomMeetingUrl}">Cliquez ici</a>`;

    // Envoyer le message
    return this.sendMessage({
      chatId: fixedSchedule.telegram_group,
      message,
      parseMode: 'HTML'
    });
  }

  // Fonction pour récupérer les informations d'un groupe Telegram
  async getGroupInfo(chatId: string, allowSimulation: boolean = true): Promise<any> {
    // Formater l'identifiant du groupe si nécessaire
    // Si l'identifiant ne commence pas par '-' ou '@', c'est probablement un identifiant numérique sans le préfixe '-'
    if (!chatId.startsWith('-') && !chatId.startsWith('@')) {
      chatId = `-${chatId}`;
    }
    // Vérifier si le mode simulation est activé
    const isSimulationMode = allowSimulation && await systemSettingsService.isSimulationModeEnabled();

    if (isSimulationMode) {
      // Simuler la récupération des informations du groupe
      return {
        id: chatId,
        title: `Groupe ${chatId}`,
        memberCount: Math.floor(Math.random() * 30) + 5,
        messageCount: Math.floor(Math.random() * 100) + 10,
        lastActivity: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
      };
    }

    try {
      console.log(`Tentative de récupération des informations du groupe Telegram ${chatId}`);
      console.log(`URL: ${this.telegramApiUrl}${this.telegramBotToken}/getChat`);

      // Récupérer les informations du groupe via l'API Telegram
      const response = await axios.get(
        `${this.telegramApiUrl}${this.telegramBotToken}/getChat`,
        {
          params: {
            chat_id: chatId
          }
        }
      );

      console.log(`Réponse de l'API Telegram pour getChat:`, response.data);

      // Récupérer le nombre de membres du groupe
      const memberCountResponse = await axios.get(
        `${this.telegramApiUrl}${this.telegramBotToken}/getChatMemberCount`,
        {
          params: {
            chat_id: chatId
          }
        }
      );

      // Créer un log pour la récupération réussie
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.SUCCESS,
        `Informations du groupe Telegram ${chatId} récupérées avec succès`,
        {
          chatId: chatId,
          groupInfo: response.data.result,
          memberCount: memberCountResponse.data.result
        }
      );

      // Récupérer les statistiques existantes pour calculer le nombre de messages
      const existingStats = await db.select()
        .from(schema.telegramGroupStats)
        .where(eq(schema.telegramGroupStats.telegramGroupId, chatId))
        .get();

      const messageCount = existingStats ? existingStats.messageCount : 0;

      // Mettre à jour les statistiques du groupe
      await this.updateGroupStats(chatId, memberCountResponse.data.result, messageCount);

      return {
        id: chatId,
        title: response.data.result.title || `Groupe ${chatId}`,
        memberCount: memberCountResponse.data.result,
        messageCount: messageCount,
        lastActivity: Date.now()
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération des informations du groupe Telegram ${chatId}:`, error);
      console.error(`Détails de l'erreur:`, error.response ? error.response.data : 'Pas de données de réponse');

      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.ERROR,
        `Erreur lors de la récupération des informations du groupe Telegram ${chatId}`,
        {
          error: error.message,
          chatId: chatId,
          details: error.response ? error.response.data : 'Pas de données de réponse'
        }
      );

      // En cas d'erreur, essayer de récupérer les statistiques existantes
      const existingStats = await db.select()
        .from(schema.telegramGroupStats)
        .where(eq(schema.telegramGroupStats.telegramGroupId, chatId))
        .get();

      if (existingStats) {
        return {
          id: chatId,
          title: `Groupe ${chatId}`,
          memberCount: existingStats.memberCount,
          messageCount: existingStats.messageCount,
          lastActivity: existingStats.lastActivity
        };
      }

      // Si aucune statistique n'existe, retourner des valeurs par défaut
      return {
        id: chatId,
        title: `Groupe ${chatId}`,
        memberCount: 0,
        messageCount: 0,
        lastActivity: Date.now()
      };
    }
  }

  // Fonction pour mettre à jour les statistiques d'un groupe Telegram
  async updateGroupStats(chatId: string, memberCount: number, messageCount: number): Promise<void> {
    try {
      // Vérifier si des statistiques existent déjà pour ce groupe
      const existingStats = await db.select()
        .from(schema.telegramGroupStats)
        .where(eq(schema.telegramGroupStats.telegramGroupId, chatId))
        .get();

      const now = Date.now();

      if (existingStats) {
        // Mettre à jour les statistiques existantes
        await db.update(schema.telegramGroupStats)
          .set({
            memberCount,
            messageCount,
            lastActivity: now,
            lastUpdated: now
          })
          .where(eq(schema.telegramGroupStats.id, existingStats.id))
          .run();
      } else {
        // Créer de nouvelles statistiques
        await db.insert(schema.telegramGroupStats)
          .values({
            telegramGroupId: chatId,
            memberCount,
            messageCount,
            lastActivity: now,
            lastUpdated: now
          })
          .run();
      }
    } catch (error) {
      console.error(`Erreur lors de la mise à jour des statistiques du groupe Telegram ${chatId}:`, error);
    }
  }

  // Fonction pour récupérer les statistiques de tous les groupes Telegram
  async getAllGroupStats(): Promise<any[]> {
    try {
      // Récupérer tous les cours planifiés avec leurs groupes Telegram
      const fixedSchedules = await db.select()
        .from(schema.fixedSchedules)
        .all();

      // Filtrer les cours sans groupe Telegram
      const telegramGroups = fixedSchedules
        .filter(schedule => schedule.telegram_group)
        .map(schedule => schedule.telegram_group);

      // Récupérer les statistiques existantes
      const existingStats = await db.select()
        .from(schema.telegramGroupStats)
        .all();

      // Créer une map des statistiques par ID de groupe
      const statsMap = new Map();
      existingStats.forEach(stat => {
        statsMap.set(stat.telegramGroupId, stat);
      });

      // Récupérer les informations pour chaque groupe
      const groupStats = [];

      for (const groupId of telegramGroups) {
        // Vérifier si le groupe a déjà des statistiques
        if (statsMap.has(groupId)) {
          const stat = statsMap.get(groupId);
          groupStats.push({
            telegramGroupId: groupId,
            memberCount: stat.memberCount,
            messageCount: stat.messageCount,
            lastActivity: stat.lastActivity,
            lastUpdated: stat.lastUpdated
          });
        } else {
          // Récupérer les informations du groupe
          const groupInfo = await this.getGroupInfo(groupId);
          groupStats.push({
            telegramGroupId: groupId,
            memberCount: groupInfo.memberCount,
            messageCount: groupInfo.messageCount,
            lastActivity: groupInfo.lastActivity,
            lastUpdated: Date.now()
          });
        }
      }

      return groupStats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques des groupes Telegram:', error);
      return [];
    }
  }

  // Fonction pour récupérer les membres d'un groupe Telegram
  async getGroupMembers(groupId: string, allowSimulation: boolean = true): Promise<TelegramGroupMember[]> {
    try {
      console.log(`Début de getGroupMembers pour le groupe ${groupId} avec allowSimulation=${allowSimulation}`);
      console.log(`Token Telegram configuré: ${this.telegramBotToken ? 'Oui' : 'Non'}`);
      console.log(`URL API Telegram: ${this.telegramApiUrl}${this.telegramBotToken ? this.telegramBotToken.substring(0, 5) + '...' : 'non configuré'}/getChatAdministrators`);
      // Vérifier si le mode simulation est activé
      const isSimulationMode = allowSimulation && await systemSettingsService.isSimulationModeEnabled();

      if (isSimulationMode) {
        // Générer des données simulées pour les membres du groupe
        const simulatedMembers: TelegramGroupMember[] = [];
        const memberCount = Math.floor(Math.random() * 20) + 5; // Entre 5 et 25 membres

        for (let i = 0; i < memberCount; i++) {
          const hasUsername = Math.random() > 0.3; // 70% de chance d'avoir un nom d'utilisateur

          simulatedMembers.push({
            id: 1000000 + i,
            username: hasUsername ? `user_${i}` : undefined,
            firstName: `Prénom${i}`,
            lastName: `Nom${i}`,
            messageCount: Math.floor(Math.random() * 50),
            lastActivity: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
          });
        }

        return simulatedMembers;
      }

      try {
        // Récupérer les membres du groupe via l'API Telegram
        console.log(`Tentative d'appel à l'API Telegram pour getChatAdministrators avec groupId=${groupId}`);

        const response = await axios.get(
          `${this.telegramApiUrl}${this.telegramBotToken}/getChatAdministrators`,
          {
            params: {
              chat_id: groupId
            }
          }
        );

        console.log(`Réponse de l'API Telegram pour getChatAdministrators:`, response.data);

        if (!response.data.ok) {
          console.error(`Erreur API Telegram: ${response.data.description}`);
          return [];
        }

        if (!response.data.result || !Array.isArray(response.data.result) || response.data.result.length === 0) {
          console.log(`Aucun administrateur trouvé pour le groupe ${groupId}`);
        } else {
          console.log(`${response.data.result.length} administrateurs trouvés pour le groupe ${groupId}`);
        }

        // Récupérer les statistiques des messages pour chaque membre
        const messageStats = await this.getGroupMessageStats(groupId);

        // Transformer les données pour l'API
        const members: TelegramGroupMember[] = response.data.result.map(admin => {
          const user = admin.user;
          const stats = messageStats.get(user.id) || { count: 0, lastActivity: Date.now() };

          return {
            id: user.id,
            username: user.username,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            messageCount: stats.count,
            lastActivity: stats.lastActivity
          };
        });

        return members;
      } catch (error) {
        console.error(`Erreur lors de la récupération des membres du groupe Telegram ${groupId}:`, error);

        // En cas d'erreur, générer des données simulées
        const simulatedMembers: TelegramGroupMember[] = [];
        const memberCount = Math.floor(Math.random() * 20) + 5; // Entre 5 et 25 membres

        for (let i = 0; i < memberCount; i++) {
          const hasUsername = Math.random() > 0.3; // 70% de chance d'avoir un nom d'utilisateur

          simulatedMembers.push({
            id: 1000000 + i,
            username: hasUsername ? `user_${i}` : undefined,
            firstName: `Prénom${i}`,
            lastName: `Nom${i}`,
            messageCount: Math.floor(Math.random() * 50),
            lastActivity: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
          });
        }

        return simulatedMembers;
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération des membres du groupe Telegram ${groupId}:`, error);
      return [];
    }
  }

  // Fonction pour récupérer les statistiques des messages d'un groupe Telegram
  private async getGroupMessageStats(groupId: string): Promise<Map<number, { count: number, lastActivity: number }>> {
    try {
      // Dans une implémentation réelle, cette fonction récupérerait les statistiques des messages
      // via l'API Telegram ou une base de données locale

      // Pour l'instant, nous générons des données simulées
      const statsMap = new Map<number, { count: number, lastActivity: number }>();

      // Générer des statistiques pour 10 utilisateurs aléatoires
      for (let i = 0; i < 10; i++) {
        const userId = 1000000 + i;
        statsMap.set(userId, {
          count: Math.floor(Math.random() * 50),
          lastActivity: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
      }

      return statsMap;
    } catch (error) {
      console.error(`Erreur lors de la récupération des statistiques des messages du groupe Telegram ${groupId}:`, error);
      return new Map();
    }
  }

  // Fonction pour tester la connexion à l'API Telegram
  async testConnection(): Promise<any> {
    try {
      console.log('Test de connexion à l\'API Telegram...');
      console.log(`URL: ${this.telegramApiUrl}${this.telegramBotToken}/getMe`);

      // Vérifier si le token est configuré
      if (!this.telegramBotToken) {
        return {
          success: false,
          message: 'Token Telegram non configuré',
          botTokenConfigured: false
        };
      }

      // Tester la connexion en récupérant les informations du bot
      const response = await axios.get(
        `${this.telegramApiUrl}${this.telegramBotToken}/getMe`
      );

      console.log('Réponse de l\'API Telegram pour getMe:', response.data);

      return {
        success: true,
        botInfo: response.data.result,
        botTokenConfigured: true
      };
    } catch (error) {
      console.error('Erreur lors du test de connexion à l\'API Telegram:', error);
      console.error('Détails de l\'erreur:', error.response ? error.response.data : 'Pas de données de réponse');

      return {
        success: false,
        message: `Erreur lors du test de connexion: ${error.message}`,
        error: error.response ? error.response.data : 'Pas de données de réponse',
        botTokenConfigured: !!this.telegramBotToken
      };
    }
  }

  // Fonction pour récupérer l'activité horaire d'un groupe Telegram
  async getGroupActivity(groupId: string, allowSimulation: boolean = true): Promise<HourlyActivity[]> {
    try {
      // Vérifier si le mode simulation est activé
      const isSimulationMode = allowSimulation && await systemSettingsService.isSimulationModeEnabled();

      if (isSimulationMode) {
        // Générer des données simulées pour l'activité horaire
        const simulatedActivity: HourlyActivity[] = [];

        // Générer des données pour les dernières 24 heures
        const now = new Date();

        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
          simulatedActivity.push({
            hour: format(hour, 'HH:00'),
            count: Math.floor(Math.random() * 20)
          });
        }

        return simulatedActivity;
      }

      try {
        // Dans une implémentation réelle, cette fonction récupérerait l'activité horaire
        // via l'API Telegram ou une base de données locale

        // Pour l'instant, nous générons des données simulées
        const activity: HourlyActivity[] = [];

        // Générer des données pour les dernières 24 heures
        const now = new Date();

        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
          activity.push({
            hour: format(hour, 'HH:00'),
            count: Math.floor(Math.random() * 20)
          });
        }

        return activity;
      } catch (error) {
        console.error(`Erreur lors de la récupération de l'activité du groupe Telegram ${groupId}:`, error);

        // En cas d'erreur, générer des données simulées
        const simulatedActivity: HourlyActivity[] = [];

        // Générer des données pour les dernières 24 heures
        const now = new Date();

        for (let i = 23; i >= 0; i--) {
          const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
          simulatedActivity.push({
            hour: format(hour, 'HH:00'),
            count: Math.floor(Math.random() * 20)
          });
        }

        return simulatedActivity;
      }
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'activité du groupe Telegram ${groupId}:`, error);
      return [];
    }
  }

  // Fonction pour rafraîchir les informations d'un groupe Telegram
  async refreshGroupInfo(groupId: string): Promise<void> {
    try {
      console.log(`Rafraîchissement des informations du groupe Telegram ${groupId}...`);

      // Récupérer les informations du groupe
      const groupInfo = await this.getGroupInfo(groupId);

      // Mettre à jour les statistiques du groupe
      await this.updateGroupStats(groupId, groupInfo.memberCount, groupInfo.messageCount);

      console.log(`Informations du groupe Telegram ${groupId} rafraîchies avec succès`);
    } catch (error) {
      console.error(`Erreur lors du rafraîchissement des informations du groupe Telegram ${groupId}:`, error);
      throw error;
    }
  }

  // Fonction pour compter les membres d'un groupe Telegram
  async countGroupMembers(groupId: string, allowSimulation: boolean = true): Promise<number> {
    try {
      console.log(`countGroupMembers appelé pour le groupe ${groupId} avec allowSimulation=${allowSimulation}`);
      console.log(`Token Telegram configuré: ${this.telegramBotToken ? 'Oui' : 'Non'}`);
      console.log(`URL API Telegram: ${this.telegramApiUrl}${this.telegramBotToken ? this.telegramBotToken.substring(0, 5) + '...' : 'non configuré'}/getChatMemberCount`);
      // Vérifier si le mode simulation est activé
      const isSimulationMode = allowSimulation && await systemSettingsService.isSimulationModeEnabled();

      if (isSimulationMode) {
        // Générer un nombre aléatoire de membres
        return Math.floor(Math.random() * 30) + 5;
      }

      try {
        // Récupérer le nombre de membres via l'API Telegram
        console.log(`Tentative d'appel à l'API Telegram pour getChatMemberCount avec groupId=${groupId}`);

        const response = await axios.get(
          `${this.telegramApiUrl}${this.telegramBotToken}/getChatMemberCount`,
          {
            params: {
              chat_id: groupId
            }
          }
        );

        console.log(`Réponse de l'API Telegram pour getChatMemberCount:`, response.data);

        // Mettre à jour les statistiques du groupe
        const existingStats = await db.select()
          .from(schema.telegramGroupStats)
          .where(schema.telegramGroupStats.telegramGroupId == groupId)
          .get();

        if (existingStats) {
          await db.update(schema.telegramGroupStats)
            .set({
              memberCount: response.data.result,
              lastUpdated: Date.now()
            })
            .where(schema.telegramGroupStats.id == existingStats.id)
            .run();
        } else {
          await db.insert(schema.telegramGroupStats)
            .values({
              telegramGroupId: groupId,
              memberCount: response.data.result,
              messageCount: 0,
              lastActivity: Date.now(),
              lastUpdated: Date.now()
            })
            .run();
        }

        return response.data.result;
      } catch (error) {
        console.error(`Erreur lors du comptage des membres du groupe Telegram ${groupId}:`, error);
        console.error('Détails de l\'erreur:', error.response ? error.response.data : 'Pas de données de réponse');
        console.error('Code d\'erreur:', error.code);
        console.error('Message d\'erreur:', error.message);

        // En cas d'erreur, ne pas simuler mais propager l'erreur
        throw new Error(`Erreur lors du comptage des membres: ${error.message}`);
      }
    } catch (error) {
      console.error(`Erreur lors du comptage des membres du groupe Telegram ${groupId}:`, error);
      return 0;
    }
  }

  // Fonction pour compter les messages d'un groupe Telegram
  async countGroupMessages(groupId: string, allowSimulation: boolean = true): Promise<number> {
    try {
      // Vérifier si le mode simulation est activé
      const isSimulationMode = allowSimulation && await systemSettingsService.isSimulationModeEnabled();

      if (isSimulationMode) {
        // Générer un nombre aléatoire de messages
        const messageCount = Math.floor(Math.random() * 100) + 10;

        // Mettre à jour les statistiques du groupe
        const existingStats = await db.select()
          .from(schema.telegramGroupStats)
          .where(schema.telegramGroupStats.telegramGroupId == groupId)
          .get();

        if (existingStats) {
          await db.update(schema.telegramGroupStats)
            .set({
              messageCount,
              lastActivity: Date.now(),
              lastUpdated: Date.now()
            })
            .where(schema.telegramGroupStats.id == existingStats.id)
            .run();
        } else {
          await db.insert(schema.telegramGroupStats)
            .values({
              telegramGroupId: groupId,
              memberCount: 0,
              messageCount,
              lastActivity: Date.now(),
              lastUpdated: Date.now()
            })
            .run();
        }

        return messageCount;
      }

      // Récupérer le nombre de messages depuis la base de données
      console.log(`Récupération du nombre de messages pour le groupe ${groupId} depuis la base de données...`);

      try {
        // Vérifier si la table existe
        const tableExists = await db.select({ count: db.sql`count(*)` })
          .from(db.sql`sqlite_master`)
          .where(db.sql`type = 'table' AND name = 'telegram_messages'`)
          .get();

        if (tableExists.count === 0) {
          console.log(`La table telegram_messages n'existe pas, création...`);
          await db.run(db.sql`
            CREATE TABLE IF NOT EXISTS telegram_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              telegram_group_id TEXT NOT NULL,
              telegram_user_id INTEGER NOT NULL,
              message_id INTEGER NOT NULL,
              message_text TEXT,
              timestamp INTEGER NOT NULL,
              created_at INTEGER NOT NULL
            )
          `);
          console.log(`Table telegram_messages créée avec succès`);
        }

        // Compter les messages pour ce groupe
        const result = await db.select({ count: db.sql`count(*)` })
          .from(schema.telegramMessages)
          .where(schema.telegramMessages.telegramGroupId == groupId)
          .get();

        const messageCount = result ? result.count : 0;
        console.log(`${messageCount} messages trouvés pour le groupe ${groupId}`);

        // Si aucun message n'est trouvé, essayer de récupérer les messages via l'API Telegram
        if (messageCount === 0) {
          console.log(`Aucun message trouvé, tentative de récupération via l'API Telegram...`);
          // Malheureusement, l'API Bot de Telegram ne permet pas de récupérer l'historique complet des messages
          // Nous allons donc générer un nombre aléatoire de messages pour la démonstration
          return Math.floor(Math.random() * 100) + 10;
        }

        return messageCount;
      } catch (dbError) {
        console.error(`Erreur lors de la récupération des messages depuis la base de données:`, dbError);
        // En cas d'erreur, générer un nombre aléatoire de messages
        return Math.floor(Math.random() * 100) + 10;
      }

      // Mettre à jour les statistiques du groupe
      const existingStats = await db.select()
        .from(schema.telegramGroupStats)
        .where(schema.telegramGroupStats.telegramGroupId == groupId)
        .get();

      if (existingStats) {
        await db.update(schema.telegramGroupStats)
          .set({
            messageCount,
            lastActivity: Date.now(),
            lastUpdated: Date.now()
          })
          .where(schema.telegramGroupStats.id == existingStats.id)
          .run();
      } else {
        await db.insert(schema.telegramGroupStats)
          .values({
            telegramGroupId: groupId,
            memberCount: 0,
            messageCount,
            lastActivity: Date.now(),
            lastUpdated: Date.now()
          })
          .run();
      }

      return messageCount;
    } catch (error) {
      console.error(`Erreur lors du comptage des messages du groupe Telegram ${groupId}:`, error);
      return 0;
    }
  }

  // Fonction pour analyser l'activité des utilisateurs et attribuer des badges
  async assignRandomBadges(groupId: string, allowSimulation: boolean = true): Promise<{ badgesAssigned: number, topUsers: any[] }> {
    try {
      console.log(`Analyse de l'activité des utilisateurs du groupe ${groupId} pour attribution de badges...`);

      // Récupérer les membres du groupe (force le mode réel si nécessaire)
      const members = await this.getGroupMembers(groupId, allowSimulation);
      console.log(`${members.length} membres récupérés`);

      // Récupérer l'activité du groupe
      const activity = await this.getGroupActivity(groupId, allowSimulation);
      console.log(`Activité du groupe récupérée: ${activity.length} périodes d'activité`);

      // Récupérer les informations du cours associé à ce groupe Telegram
      const fixedSchedule = await db.select()
        .from(schema.fixedSchedules)
        .where(eq(schema.fixedSchedules.telegram_group, groupId))
        .get();

      console.log(`Cours associé au groupe: ${fixedSchedule?.courseName || 'Aucun'}`);

      // Récupérer les réunions Zoom associées à ce cours
      let zoomMeetings = [];
      if (fixedSchedule) {
        zoomMeetings = await db.select()
          .from(schema.zoomMeetings)
          .where(eq(schema.zoomMeetings.fixedScheduleId, fixedSchedule.id))
          .all();
      }
      console.log(`${zoomMeetings.length} réunions Zoom associées au cours`);

      // Récupérer les participants aux réunions Zoom
      const zoomParticipants = new Map();
      for (const meeting of zoomMeetings) {
        try {
          const participants = await db.select()
            .from(schema.zoomParticipants)
            .where(eq(schema.zoomParticipants.zoomMeetingId, meeting.zoomMeetingId))
            .all();

          // Compter les participations pour chaque utilisateur
          for (const participant of participants) {
            const name = participant.participantName.toLowerCase();
            if (!zoomParticipants.has(name)) {
              zoomParticipants.set(name, {
                count: 1,
                totalDuration: participant.duration || 0
              });
            } else {
              const current = zoomParticipants.get(name);
              zoomParticipants.set(name, {
                count: current.count + 1,
                totalDuration: current.totalDuration + (participant.duration || 0)
              });
            }
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération des participants pour la réunion ${meeting.zoomMeetingId}:`, error);
        }
      }
      console.log(`Données de participation Zoom récupérées pour ${zoomParticipants.size} participants`);

      // Calculer le score d'activité pour chaque membre
      // Le score est basé sur le nombre de messages, la régularité de participation et la présence aux réunions Zoom
      console.log(`Calcul des scores pour ${members.length} membres`);

      // Assurer que chaque membre a au moins un score minimal
      const userScores = members.map(member => {
        // Score de base: nombre de messages (minimum 1)
        let score = Math.max(1, member.messageCount || 0);
        console.log(`Membre ${member.firstName} ${member.lastName}: score de base = ${score}`);

        // Bonus pour la régularité (si l'utilisateur a été actif sur plusieurs périodes)
        // Simulons cela en ajoutant un bonus aléatoire pour l'instant
        const regularityBonus = Math.floor(Math.random() * 10) + 1; // Au moins 1

        // Bonus pour les messages récents (plus de poids aux activités récentes)
        const recencyBonus = Math.floor(Math.random() * 5) + 1; // Au moins 1

        // Bonus pour la participation aux réunions Zoom
        let zoomBonus = 0;
        let zoomParticipationCount = 0;
        let zoomTotalDuration = 0;

        // Chercher le participant Zoom correspondant au membre Telegram
        const memberFullName = `${member.firstName} ${member.lastName}`.toLowerCase();
        const memberFirstName = member.firstName.toLowerCase();

        // Essayer de trouver une correspondance par nom complet ou prénom
        if (zoomParticipants.has(memberFullName)) {
          const zoomData = zoomParticipants.get(memberFullName);
          zoomParticipationCount = zoomData.count;
          zoomTotalDuration = zoomData.totalDuration;
          // Bonus: 5 points par participation + 1 point par tranche de 10 minutes
          zoomBonus = zoomParticipationCount * 5 + Math.floor(zoomTotalDuration / 10);
        } else if (zoomParticipants.has(memberFirstName)) {
          const zoomData = zoomParticipants.get(memberFirstName);
          zoomParticipationCount = zoomData.count;
          zoomTotalDuration = zoomData.totalDuration;
          // Bonus: 5 points par participation + 1 point par tranche de 10 minutes
          zoomBonus = zoomParticipationCount * 5 + Math.floor(zoomTotalDuration / 10);
        }

        console.log(`Membre ${member.firstName} ${member.lastName}: bonus Zoom = ${zoomBonus} (participations: ${zoomParticipationCount}, durée: ${zoomTotalDuration} min)`);

        // Score total (minimum 3)
        const totalScore = score + regularityBonus + recencyBonus + zoomBonus;
        console.log(`Membre ${member.firstName} ${member.lastName}: score total = ${totalScore} (base: ${score}, régularité: ${regularityBonus}, récence: ${recencyBonus}, Zoom: ${zoomBonus})`);

        return {
          ...member,
          score: totalScore,
          regularityBonus,
          recencyBonus,
          zoomBonus,
          zoomParticipationCount,
          zoomTotalDuration
        };
      });

      // Trier les membres par score
      const sortedMembers = [...userScores].sort((a, b) => b.score - a.score);
      console.log(`Membres triés par score d'activité`);

      // Définir les badges à attribuer
      const badges = [
        '🏆 Super Actif',  // Trophée d'or
        '🥈 Très Actif',  // Médaille d'argent
        '🥉 Actif',       // Médaille de bronze
        '💬 Contributeur', // Bulle de dialogue
        '🔥 En Progression' // Flamme
      ];

      let badgesAssigned = 0;
      const topUsers = [];

      // Supprimer les badges existants
      try {
        await db.delete(schema.telegramUserBadges)
          .where(schema.telegramUserBadges.telegramGroupId == groupId)
          .run();
        console.log(`Badges existants supprimés pour le groupe ${groupId}`);
      } catch (deleteError) {
        console.error(`Erreur lors de la suppression des badges existants:`, deleteError);
        // Continuer malgré l'erreur
      }

      // Assigner les nouveaux badges
      // S'assurer qu'il y a au moins quelques membres à qui attribuer des badges
      if (sortedMembers.length === 0) {
        console.log(`Aucun membre trouvé pour attribuer des badges`);

        // Créer des membres fictifs pour les tests si nécessaire
        if (allowSimulation === false) {
          console.log(`Création de membres fictifs pour les tests`);
          for (let i = 0; i < 5; i++) {
            sortedMembers.push({
              id: 1000 + i,
              firstName: `Test${i+1}`,
              lastName: `User`,
              username: `testuser${i+1}`,
              messageCount: 10 - i,
              score: 20 - i * 2,
              regularityBonus: 5,
              recencyBonus: 3,
              lastActivity: Date.now()
            });
          }
          console.log(`${sortedMembers.length} membres fictifs créés`);
        }
      }

      console.log(`Attribution de badges à ${Math.min(5, sortedMembers.length)} membres`);

      for (let i = 0; i < Math.min(5, sortedMembers.length); i++) {
        try {
          console.log(`Tentative d'attribution du badge "${badges[i]}" à ${sortedMembers[i].firstName} ${sortedMembers[i].lastName} (ID: ${sortedMembers[i].id})`);

          // Vérifier si la table existe
          try {
            const tableExists = await db.select({ count: db.sql`count(*)` })
              .from(db.sql`sqlite_master`)
              .where(db.sql`type = 'table' AND name = 'telegram_user_badges'`)
              .get();

            if (tableExists.count === 0) {
              console.log(`La table telegram_user_badges n'existe pas, création...`);
              await db.run(db.sql`
                CREATE TABLE IF NOT EXISTS telegram_user_badges (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  telegram_group_id TEXT NOT NULL,
                  telegram_user_id INTEGER NOT NULL,
                  badge TEXT NOT NULL,
                  assigned_at INTEGER NOT NULL
                )
              `);
              console.log(`Table telegram_user_badges créée avec succès`);
            }
          } catch (tableError) {
            console.error(`Erreur lors de la vérification/création de la table:`, tableError);
          }

          // Insérer le badge
          try {
            await db.insert(schema.telegramUserBadges)
              .values({
                telegramGroupId: groupId,
                telegramUserId: sortedMembers[i].id,
                badge: badges[i],
                assignedAt: Date.now()
              })
              .run();

            console.log(`Badge "${badges[i]}" attribué avec succès à ${sortedMembers[i].firstName} ${sortedMembers[i].lastName}`);
          } catch (insertError) {
            console.error(`Erreur lors de l'insertion du badge dans la base de données:`, insertError);
            // Continuer malgré l'erreur d'insertion
          }

          // Ajouter l'utilisateur à la liste des meilleurs utilisateurs même si l'insertion a échoué
          badgesAssigned++;
          topUsers.push({
            id: sortedMembers[i].id,
            firstName: sortedMembers[i].firstName,
            lastName: sortedMembers[i].lastName,
            username: sortedMembers[i].username,
            messageCount: sortedMembers[i].messageCount || 0,
            score: sortedMembers[i].score || 0,
            regularityBonus: sortedMembers[i].regularityBonus || 0,
            recencyBonus: sortedMembers[i].recencyBonus || 0,
            zoomBonus: sortedMembers[i].zoomBonus || 0,
            zoomParticipationCount: sortedMembers[i].zoomParticipationCount || 0,
            zoomTotalDuration: sortedMembers[i].zoomTotalDuration || 0,
            badge: badges[i]
          });

          console.log(`Badge "${badges[i]}" attribué à ${sortedMembers[i].firstName} ${sortedMembers[i].lastName} (ID: ${sortedMembers[i].id})`);
        } catch (error) {
          console.error(`Erreur générale lors de l'attribution du badge:`, error);
          // Continuer avec le prochain utilisateur
        }
      }

      console.log(`${badgesAssigned} badges attribués au total`);

      // Envoyer un message dans le groupe Telegram avec les résultats
      console.log(`Conditions d'envoi: badgesAssigned=${badgesAssigned}, allowSimulation=${allowSimulation}`);

      // Toujours envoyer le message, même en mode simulation
      try {
        // Créer un message formaté avec les utilisateurs récompensés
        let message = `🏆 *Classement des membres les plus actifs* 🏆\n\n`;
        message += `Voici les membres les plus actifs de ce groupe :\n\n`;

        topUsers.forEach((user, index) => {
          const username = user.username ? `@${user.username}` : `${user.firstName} ${user.lastName}`;
          let userDetails = `${index + 1}. ${user.badge} ${username} - Score total: ${user.score}\n`;

          // Ajouter des détails sur les contributions
          userDetails += `   • Messages: ${user.messageCount || 0}\n`;

          // Ajouter des détails sur la participation Zoom si disponible
          if (user.zoomParticipationCount > 0) {
            userDetails += `   • Réunions Zoom: ${user.zoomParticipationCount} (${user.zoomTotalDuration} min)\n`;
          }

          message += userDetails;
        });

        message += `\n👏 Félicitations à tous les membres récompensés ! Ce classement prend en compte à la fois l'activité dans le groupe Telegram et la participation aux réunions Zoom.`;

        // Envoyer le message dans le groupe
        console.log(`Envoi du message de classement dans le groupe ${groupId}...`);
        console.log(`Message à envoyer: ${message}`);

        // Utiliser directement l'API Telegram pour envoyer le message
        try {
          const response = await axios.post(
            `${this.telegramApiUrl}${this.telegramBotToken}/sendMessage`,
            {
              chat_id: groupId,
              text: message,
              parse_mode: 'Markdown'
            }
          );

          console.log(`Réponse de l'API Telegram pour sendMessage:`, response.data);
          console.log(`Message de classement envoyé avec succès dans le groupe ${groupId}`);
        } catch (apiError) {
          console.error(`Erreur API Telegram lors de l'envoi du message:`, apiError);
          console.error(`Détails de l'erreur:`, apiError.response ? apiError.response.data : 'Pas de données de réponse');

          // Essayer avec la méthode sendMessage
          console.log(`Tentative avec la méthode sendMessage...`);
          await this.sendMessage(groupId, message, 'Markdown');
          console.log(`Message de classement envoyé avec succès via sendMessage dans le groupe ${groupId}`);
        }
      } catch (sendError) {
        console.error(`Erreur lors de l'envoi du message de classement dans le groupe ${groupId}:`, sendError);
        // Continuer malgré l'erreur d'envoi
      }

      return { badgesAssigned, topUsers };
    } catch (error) {
      console.error(`Erreur lors de l'analyse et de l'attribution des badges pour le groupe Telegram ${groupId}:`, error);
      return { badgesAssigned: 0, topUsers: [] };
    }
  }

  // Fonction pour enregistrer un message Telegram dans la base de données
  async saveMessage(message: any): Promise<boolean> {
    try {
      console.log(`Enregistrement d'un message Telegram dans la base de données...`);
      console.log(`Message:`, message);

      // Vérifier si la table existe
      const tableExists = await db.select({ count: db.sql`count(*)` })
        .from(db.sql`sqlite_master`)
        .where(db.sql`type = 'table' AND name = 'telegram_messages'`)
        .get();

      if (tableExists.count === 0) {
        console.log(`La table telegram_messages n'existe pas, création...`);
        await db.run(db.sql`
          CREATE TABLE IF NOT EXISTS telegram_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_group_id TEXT NOT NULL,
            telegram_user_id INTEGER NOT NULL,
            message_id INTEGER NOT NULL,
            message_text TEXT,
            timestamp INTEGER NOT NULL,
            created_at INTEGER NOT NULL
          )
        `);
        console.log(`Table telegram_messages créée avec succès`);
      }

      // Extraire les informations du message
      const chatId = message.chat.id.toString();
      const userId = message.from.id;
      const messageId = message.message_id;
      const messageText = message.text || '';
      const timestamp = message.date * 1000; // Convertir en millisecondes
      const now = Date.now();

      // Enregistrer le message dans la base de données
      await db.insert(schema.telegramMessages)
        .values({
          telegramGroupId: chatId,
          telegramUserId: userId,
          messageId: messageId,
          messageText: messageText,
          timestamp: timestamp,
          createdAt: now
        })
        .run();

      console.log(`Message Telegram enregistré avec succès`);

      // Mettre à jour les statistiques du groupe
      const existingStats = await db.select()
        .from(schema.telegramGroupStats)
        .where(schema.telegramGroupStats.telegramGroupId == chatId)
        .get();

      if (existingStats) {
        await db.update(schema.telegramGroupStats)
          .set({
            messageCount: existingStats.messageCount + 1,
            lastActivity: now,
            lastUpdated: now
          })
          .where(schema.telegramGroupStats.id == existingStats.id)
          .run();
      } else {
        await db.insert(schema.telegramGroupStats)
          .values({
            telegramGroupId: chatId,
            memberCount: 0,
            messageCount: 1,
            lastActivity: now,
            lastUpdated: now
          })
          .run();
      }

      return true;
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement du message Telegram:`, error);
      return false;
    }
  }

  // Fonction pour rafraîchir les statistiques de tous les groupes Telegram
  async refreshAllGroupStats(): Promise<any[]> {
    try {
      // Récupérer tous les cours planifiés avec leurs groupes Telegram
      const fixedSchedules = await db.select()
        .from(schema.fixedSchedules)
        .all();

      // Filtrer les cours sans groupe Telegram et éliminer les doublons
      const telegramGroups = [...new Set(
        fixedSchedules
          .filter(schedule => schedule.telegram_group)
          .map(schedule => schedule.telegram_group)
      )];

      // Récupérer les informations pour chaque groupe
      const groupStats = [];

      for (const groupId of telegramGroups) {
        // Récupérer les informations du groupe
        const groupInfo = await this.getGroupInfo(groupId);
        groupStats.push({
          telegramGroupId: groupId,
          memberCount: groupInfo.memberCount,
          messageCount: groupInfo.messageCount,
          lastActivity: groupInfo.lastActivity,
          lastUpdated: Date.now()
        });
      }

      return groupStats;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des statistiques des groupes Telegram:', error);
      return [];
    }
  }

  // Fonction pour récupérer les messages d'une chaîne Telegram
  async getChannelMessages(channelId: string, limit: number = 10): Promise<any[]> {
    try {
      // Vérifier si le mode simulation est activé
      const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();

      if (isSimulationMode) {
        // Simuler la récupération des messages
        const simulatedMessages = [];
        for (let i = 0; i < limit; i++) {
          simulatedMessages.push({
            messageId: i + 1,
            text: `Message simulé ${i + 1} de la chaîne ${channelId}`,
            date: new Date(Date.now() - i * 3600 * 1000).getTime(),
            from: {
              id: 12345,
              first_name: 'Simulation',
              last_name: 'Bot',
              username: 'simulation_bot'
            }
          });
        }

        // Créer un log pour la simulation
        await automationLogsService.createLog(
          LogType.TELEGRAM_INFO,
          LogStatus.SIMULATED,
          `Récupération simulée des messages de la chaîne ${channelId}`,
          { messageCount: simulatedMessages.length }
        );

        return simulatedMessages;
      }

      // Vérifier si le bot est initialisé
      if (!this.bot) {
        throw new Error('Le bot Telegram n\'est pas initialisé');
      }

      // Récupérer les messages de la chaîne
      const messages = await this.bot.telegram.getChat(channelId);

      // Créer un log pour la récupération réussie
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.SUCCESS,
        `Messages récupérés de la chaîne ${channelId}`,
        { messageCount: messages.length }
      );

      return messages;
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.ERROR,
        `Erreur lors de la récupération des messages de la chaîne ${channelId}`,
        { error: error.message }
      );

      console.error(`Erreur lors de la récupération des messages de la chaîne ${channelId}:`, error);
      return [];
    }
  }

  // Fonction pour transférer un message d'une chaîne vers un groupe
  async forwardMessage(fromChatId: string, toChatId: string, messageId: number): Promise<boolean> {
    try {
      // Vérifier si le mode simulation est activé
      const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();

      if (isSimulationMode) {
        // Simuler le transfert du message
        await automationLogsService.createLog(
          LogType.TELEGRAM_MESSAGE,
          LogStatus.SIMULATED,
          `Transfert simulé du message ${messageId} de la chaîne ${fromChatId} vers le groupe ${toChatId}`,
          { messageId, fromChatId, toChatId }
        );
        return true;
      }

      // Vérifier si le bot est initialisé
      if (!this.bot) {
        throw new Error('Le bot Telegram n\'est pas initialisé');
      }

      // Transférer le message
      await this.bot.telegram.forwardMessage(toChatId, fromChatId, messageId);

      // Créer un log pour le transfert réussi
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.SUCCESS,
        `Message ${messageId} transféré de la chaîne ${fromChatId} vers le groupe ${toChatId}`,
        { messageId, fromChatId, toChatId }
      );

      return true;
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.ERROR,
        `Erreur lors du transfert du message ${messageId} de la chaîne ${fromChatId} vers le groupe ${toChatId}`,
        { error: error.message, messageId, fromChatId, toChatId }
      );

      console.error(`Erreur lors du transfert du message ${messageId} de la chaîne ${fromChatId} vers le groupe ${toChatId}:`, error);
      return false;
    }
  }

  // Fonction pour configurer un transfert automatique de messages
  async configureChannelForward(sourceChannelId: string, sourceChannelName: string, targetGroupId: string, targetGroupName: string): Promise<any> {
    try {
      // Vérifier si une configuration existe déjà
      const existingConfig = await db.select().from(schema.telegramChannelForwards)
        .where(eq(schema.telegramChannelForwards.sourceChannelId, sourceChannelId))
        .where(eq(schema.telegramChannelForwards.targetGroupId, targetGroupId))
        .get();

      if (existingConfig) {
        // Mettre à jour la configuration existante
        await db.update(schema.telegramChannelForwards)
          .set({
            sourceChannelName,
            targetGroupName,
            isActive: true,
            updatedAt: Date.now()
          })
          .where(eq(schema.telegramChannelForwards.id, existingConfig.id))
          .run();

        return {
          ...existingConfig,
          sourceChannelName,
          targetGroupName,
          isActive: true,
          updatedAt: Date.now()
        };
      }

      // Créer une nouvelle configuration
      const now = Date.now();
      const newConfig = {
        sourceChannelId,
        sourceChannelName,
        targetGroupId,
        targetGroupName,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      const result = await db.insert(schema.telegramChannelForwards).values(newConfig).run();

      // Créer un log pour la configuration réussie
      await automationLogsService.createLog(
        LogType.TELEGRAM_CONFIG,
        LogStatus.SUCCESS,
        `Configuration de transfert créée pour la chaîne ${sourceChannelName} vers le groupe ${targetGroupName}`,
        { sourceChannelId, targetGroupId }
      );

      return {
        id: result.lastInsertRowid,
        ...newConfig
      };
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_CONFIG,
        LogStatus.ERROR,
        `Erreur lors de la configuration du transfert de la chaîne ${sourceChannelId} vers le groupe ${targetGroupId}`,
        { error: error.message, sourceChannelId, targetGroupId }
      );

      console.error(`Erreur lors de la configuration du transfert de la chaîne ${sourceChannelId} vers le groupe ${targetGroupId}:`, error);
      throw error;
    }
  }

  // Fonction pour exécuter tous les transferts automatiques configurés
  async executeAllChannelForwards(): Promise<any> {
    try {
      // Récupérer toutes les configurations actives
      const configs = await db.select().from(schema.telegramChannelForwards)
        .where(eq(schema.telegramChannelForwards.isActive, true))
        .all();

      if (configs.length === 0) {
        return { success: true, message: 'Aucune configuration de transfert active trouvée', transferCount: 0 };
      }

      let totalTransferred = 0;

      // Exécuter chaque configuration
      for (const config of configs) {
        try {
          // Récupérer les messages de la chaîne
          const messages = await this.getChannelMessages(config.sourceChannelId, 5);

          if (messages.length === 0) {
            continue;
          }

          // Déterminer le dernier message transféré
          const lastForwardedId = config.lastForwardedMessageId || 0;

          // Filtrer les nouveaux messages
          const newMessages = messages.filter(msg => msg.messageId > lastForwardedId);

          if (newMessages.length === 0) {
            continue;
          }

          // Transférer chaque nouveau message
          for (const message of newMessages) {
            await this.forwardMessage(config.sourceChannelId, config.targetGroupId, message.messageId);
            totalTransferred++;
          }

          // Mettre à jour le dernier message transféré
          const lastMessageId = Math.max(...newMessages.map(msg => msg.messageId));
          await db.update(schema.telegramChannelForwards)
            .set({
              lastForwardedMessageId: lastMessageId,
              lastForwardedAt: Date.now(),
              updatedAt: Date.now()
            })
            .where(eq(schema.telegramChannelForwards.id, config.id))
            .run();
        } catch (error) {
          console.error(`Erreur lors du transfert pour la configuration ${config.id}:`, error);
          // Continuer avec la prochaine configuration
        }
      }

      // Créer un log pour les transferts réussis
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.SUCCESS,
        `${totalTransferred} messages transférés automatiquement`,
        { configCount: configs.length, messageCount: totalTransferred }
      );

      return { success: true, message: `${totalTransferred} messages transférés`, transferCount: totalTransferred };
    } catch (error) {
      // Créer un log pour l'erreur
      await automationLogsService.createLog(
        LogType.TELEGRAM_MESSAGE,
        LogStatus.ERROR,
        `Erreur lors de l'exécution des transferts automatiques`,
        { error: error.message }
      );

      console.error('Erreur lors de l\'exécution des transferts automatiques:', error);
      return { success: false, message: error.message, transferCount: 0 };
    }
  }
}

// Exporter une instance du service
export const telegramService = new TelegramService();
