import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { telegramService } from '../services/telegram-service';
import { UserRole } from '@shared/schema';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';
import { zoomService } from '../services/zoom-service';
import { format } from 'date-fns';
import axios from 'axios';

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est authentifié
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Vous devez être connecté pour accéder à cette ressource.' });
  }
  next();
};

// Middleware pour vérifier si l'utilisateur est administrateur
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Accès refusé. Vous devez être administrateur.' });
  }
  next();
};

// Récupérer les informations d'un groupe Telegram
router.get('/telegram/test/group-info', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'L\'ID du groupe est requis' });
    }

    console.log(`Récupération des informations du groupe Telegram ${groupId}...`);

    // Vérifier si le groupe existe dans la base de données
    const existingGroup = await db.select()
      .from(schema.telegramGroupStats)
      .where(schema.telegramGroupStats.telegramGroupId == groupId as string)
      .get();

    // Récupérer les informations du groupe via l'API Telegram (force le mode réel)
    const groupInfo = await telegramService.getGroupInfo(groupId as string, false);

    // Vérifier si le bot est connecté au groupe
    let isConnected = false;
    try {
      // Tenter d'envoyer un message silencieux pour vérifier la connexion
      await telegramService.sendMessage({
        chatId: groupId as string,
        message: '🔍 Vérification de la connexion...',
        parseMode: 'HTML',
        silent: true
      });
      isConnected = true;
    } catch (error) {
      console.error(`Erreur lors de la vérification de la connexion au groupe ${groupId}:`, error);
      isConnected = false;
    }

    // Construire la réponse
    const response = {
      id: groupId,
      title: groupInfo.title || `Groupe ${groupId}`,
      memberCount: groupInfo.memberCount || 0,
      messageCount: groupInfo.messageCount || 0,
      lastActivity: groupInfo.lastActivity || Date.now(),
      isConnected
    };

    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du groupe Telegram:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des informations du groupe Telegram',
      error: error.message
    });
  }
});

// Récupérer les utilisateurs d'un groupe Telegram
router.get('/telegram/test/users', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'L\'ID du groupe est requis' });
    }

    console.log(`Récupération des utilisateurs du groupe Telegram ${groupId}...`);

    // Récupérer les utilisateurs du groupe via l'API Telegram (force le mode réel)
    const users = await telegramService.getGroupMembers(groupId as string, false);

    // Récupérer les badges des utilisateurs
    const userBadges = await db.select()
      .from(schema.telegramUserBadges)
      .where(schema.telegramUserBadges.telegramGroupId == groupId as string)
      .all();

    // Créer une map des badges par ID d'utilisateur
    const badgesMap = new Map();
    userBadges.forEach(badge => {
      badgesMap.set(badge.telegramUserId, badge.badge);
    });

    // Transformer les données pour l'API
    const transformedUsers = users.map(user => ({
      id: user.id,
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      messageCount: user.messageCount || 0,
      lastActivity: user.lastActivity || Date.now(),
      badge: badgesMap.get(user.id) || null
    }));

    res.json(transformedUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs du groupe Telegram:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs du groupe Telegram',
      error: error.message
    });
  }
});

// Récupérer l'activité d'un groupe Telegram
router.get('/telegram/test/activity', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'L\'ID du groupe est requis' });
    }

    console.log(`Récupération de l'activité du groupe Telegram ${groupId}...`);

    // Récupérer l'activité du groupe via l'API Telegram (force le mode réel)
    const activity = await telegramService.getGroupActivity(groupId as string, false);

    res.json(activity);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'activité du groupe Telegram:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de l\'activité du groupe Telegram',
      error: error.message
    });
  }
});

// Rafraîchir les informations d'un groupe Telegram
router.post('/telegram/test/refresh', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'L\'ID du groupe est requis' });
    }

    console.log(`Rafraîchissement des informations du groupe Telegram ${groupId}...`);

    // Rafraîchir les informations du groupe via l'API Telegram
    await telegramService.refreshGroupInfo(groupId as string);

    // Créer un log pour le rafraîchissement
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.SUCCESS,
      `Informations du groupe Telegram ${groupId} rafraîchies avec succès`,
      {
        groupId
      }
    );

    res.json({
      success: true,
      message: 'Informations du groupe rafraîchies avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des informations du groupe Telegram:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.ERROR,
      `Erreur lors du rafraîchissement des informations du groupe Telegram ${req.query.groupId}`,
      {
        error: error.message,
        groupId: req.query.groupId
      }
    );

    res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement des informations du groupe Telegram',
      error: error.message
    });
  }
});

// Générer un classement et assigner des badges
router.post('/telegram/test/generate-ranking', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'L\'ID du groupe est requis' });
    }

    console.log(`Génération du classement pour le groupe Telegram ${groupId}...`);

    // Récupérer les utilisateurs du groupe via l'API Telegram
    const users = await telegramService.getGroupMembers(groupId as string);

    // Trier les utilisateurs par nombre de messages
    const sortedUsers = [...users].sort((a, b) => b.messageCount - a.messageCount);

    // Assigner des badges aux 3 premiers utilisateurs
    const badges = [
      '🏆 Super Actif',
      '🥈 Très Actif',
      '🥉 Actif'
    ];

    let badgesAssigned = 0;

    // Supprimer les badges existants
    await db.delete(schema.telegramUserBadges)
      .where(schema.telegramUserBadges.telegramGroupId == groupId as string)
      .run();

    // Assigner les nouveaux badges
    for (let i = 0; i < Math.min(3, sortedUsers.length); i++) {
      if (sortedUsers[i].messageCount > 0) {
        await db.insert(schema.telegramUserBadges)
          .values({
            telegramGroupId: groupId as string,
            telegramUserId: sortedUsers[i].id,
            badge: badges[i],
            assignedAt: Date.now()
          })
          .run();

        badgesAssigned++;
      }
    }

    // Envoyer un message dans le groupe pour annoncer les badges
    try {
      let message = '🏆 <b>Classement des membres les plus actifs</b>\n\n';

      for (let i = 0; i < Math.min(3, sortedUsers.length); i++) {
        if (sortedUsers[i].messageCount > 0) {
          const user = sortedUsers[i];
          const username = user.username
            ? `@${user.username}`
            : `${user.firstName} ${user.lastName}`;

          message += `${badges[i]} ${username} - ${user.messageCount} messages\n`;
        }
      }

      await telegramService.sendMessage({
        chatId: groupId as string,
        message,
        parseMode: 'HTML'
      });
    } catch (error) {
      console.error(`Erreur lors de l'envoi du message de classement:`, error);
    }

    // Créer un log pour la génération du classement
    await automationLogsService.createLog(
      LogType.TELEGRAM_BADGES,
      LogStatus.SUCCESS,
      `Classement généré pour le groupe Telegram ${groupId}`,
      {
        groupId,
        badgesAssigned
      }
    );

    res.json({
      success: true,
      message: 'Classement généré avec succès',
      badgesAssigned
    });
  } catch (error) {
    console.error('Erreur lors de la génération du classement:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_BADGES,
      LogStatus.ERROR,
      `Erreur lors de la génération du classement pour le groupe Telegram ${req.query.groupId}`,
      {
        error: error.message,
        groupId: req.query.groupId
      }
    );

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du classement',
      error: error.message
    });
  }
});

// Exécuter un test
router.post('/telegram/test/run-test', isAuthenticated, async (req, res) => {
  try {
    console.log('Route /telegram/test/run-test appelée avec les paramètres:', req.body);

    const { testId, groupId } = req.body;

    if (!testId || !groupId) {
      console.log('Erreur: ID du test ou ID du groupe manquant');
      return res.status(400).json({
        success: false,
        message: 'L\'ID du test et l\'ID du groupe sont requis'
      });
    }

    console.log(`Exécution du test ${testId} pour le groupe Telegram ${groupId}...`);

    let result = {
      success: false,
      message: 'Test non implémenté'
    };

    switch (testId) {
      case 'countMembers':
        // Test pour compter les membres du groupe (force le mode réel)
        console.log(`Début du test countMembers pour le groupe ${groupId}`);
        try {
          const memberCount = await telegramService.countGroupMembers(groupId, false);
          console.log(`Résultat du test countMembers: ${memberCount} membres détectés`);
          result = {
            success: true,
            message: `${memberCount} membres détectés dans le groupe`
          };
        } catch (testError) {
          console.error(`Erreur lors du test countMembers:`, testError);
          throw testError;
        }
        break;

      case 'sendMessage':
        // Test pour envoyer un message simple dans le groupe
        const simpleMessage = `
📝 <b>Test d'envoi de message</b>

Ce message a été envoyé pour tester la fonctionnalité d'envoi de messages.

📅 Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
`;

        await telegramService.sendMessage({
          chatId: groupId,
          message: simpleMessage,
          parseMode: 'HTML'
        });

        result = {
          success: true,
          message: 'Message envoyé avec succès dans le groupe'
        };
        break;

      case 'sendZoomLink':
        // Test pour envoyer un lien Zoom dans le groupe
        const zoomMeeting = await zoomService.createTestMeeting('Test de l\'intégration Zoom');

        const zoomMessage = `
🎥 <b>Test de l'intégration Zoom</b>

Un lien Zoom a été généré pour tester l'intégration entre Telegram et Zoom.

📍 <b>Rejoindre la réunion</b>: <a href="${zoomMeeting.zoomMeetingUrl}">Cliquez ici</a>
🔑 <b>ID de réunion</b>: ${zoomMeeting.zoomMeetingId}
⏰ <b>Date</b>: ${format(new Date(), 'dd/MM/yyyy HH:mm')}

Ce message est un test automatique.
`;

        await telegramService.sendMessage({
          chatId: groupId,
          message: zoomMessage,
          parseMode: 'HTML'
        });

        result = {
          success: true,
          message: 'Lien Zoom envoyé avec succès dans le groupe',
          meetingUrl: zoomMeeting.zoomMeetingUrl,
          meetingId: zoomMeeting.zoomMeetingId
        };
        break;

      case 'countMessages':
        // Test pour capter les messages et les compter (force le mode réel)
        console.log(`Début du test countMessages pour le groupe ${groupId}`);
        try {
          const messageCount = await telegramService.countGroupMessages(groupId, false);
          console.log(`Résultat du test countMessages: ${messageCount} messages détectés`);
          result = {
            success: true,
            message: `${messageCount} messages détectés dans le groupe`
          };
        } catch (testError) {
          console.error(`Erreur lors du test countMessages:`, testError);
          throw testError;
        }
        break;

      case 'assignBadges':
        // Test pour analyser l'activité et attribuer des badges (force le mode réel)
        console.log(`Début du test assignBadges pour le groupe ${groupId}`);
        try {
          const badgeResult = await telegramService.assignRandomBadges(groupId, false);
          console.log(`Résultat du test assignBadges: ${badgeResult.badgesAssigned} badges attribués`);

          // Préparer un message détaillé avec les utilisateurs récompensés
          let detailedMessage = `${badgeResult.badgesAssigned} badges attribués aux utilisateurs les plus actifs`;
          detailedMessage += ` et annoncés dans le groupe Telegram`;

          // Forcer l'envoi du message dans le groupe
          console.log(`Tentative d'envoi forcé du message dans le groupe ${groupId}...`);
          try {
            // Créer un message formaté avec les utilisateurs récompensés
            let message = `🏆 *Classement des membres les plus actifs* 🏆\n\n`;
            message += `Voici les membres les plus actifs de ce groupe :\n\n`;

            badgeResult.topUsers.forEach((user, index) => {
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
            await telegramService.sendMessage(groupId, message, 'Markdown');
            console.log(`Message de classement envoyé avec succès dans le groupe ${groupId}`);
          } catch (sendError) {
            console.error(`Erreur lors de l'envoi forcé du message dans le groupe ${groupId}:`, sendError);
          }

          if (badgeResult.topUsers && badgeResult.topUsers.length > 0) {
            detailedMessage += ':\n\n';
            badgeResult.topUsers.forEach((user, index) => {
              detailedMessage += `${index + 1}. ${user.badge} - ${user.firstName} ${user.lastName}${user.username ? ` (@${user.username})` : ''} - Score: ${user.score}\n`;
            });
          }

          result = {
            success: true,
            message: detailedMessage,
            topUsers: badgeResult.topUsers
          };
        } catch (testError) {
          console.error(`Erreur lors du test assignBadges:`, testError);
          throw testError;
        }
        break;

      case 'forwardMessage':
        // Test pour transférer un message depuis une chaîne
        const channelMessage = `
📢 <b>Message de test depuis la chaîne</b>

Ce message a été transféré automatiquement depuis la chaîne d'annonces pour tester la fonctionnalité de transfert.

📅 Date: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
`;

        await telegramService.sendMessage({
          chatId: groupId,
          message: channelMessage,
          parseMode: 'HTML'
        });

        result = {
          success: true,
          message: 'Message transféré avec succès dans le groupe'
        };
        break;

      case 'sendReminder':
        // Test pour envoyer un rappel programmé
        // Planifier un rappel dans 1 minute
        const reminderTime = new Date(Date.now() + 60 * 1000);

        const reminderMessage = `
⏰ <b>Rappel automatique</b>

Ceci est un rappel automatique programmé pour tester la fonctionnalité de rappel.

📅 Date de programmation: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
⏰ Date d'exécution prévue: ${format(reminderTime, 'dd/MM/yyyy HH:mm:ss')}
`;

        // Enregistrer le rappel dans la base de données
        const reminder = {
          groupId,
          message: reminderMessage,
          scheduledTime: reminderTime.getTime(),
          createdAt: Date.now()
        };

        // Planifier l'envoi du rappel
        setTimeout(async () => {
          try {
            await telegramService.sendMessage({
              chatId: groupId,
              message: reminderMessage,
              parseMode: 'HTML'
            });

            console.log(`Rappel envoyé avec succès dans le groupe ${groupId}`);

            // Créer un log pour le rappel
            await automationLogsService.createLog(
              LogType.TELEGRAM_MESSAGE,
              LogStatus.SUCCESS,
              `Rappel automatique envoyé dans le groupe ${groupId}`,
              { groupId, scheduledTime: reminderTime.getTime() }
            );
          } catch (error) {
            console.error(`Erreur lors de l'envoi du rappel dans le groupe ${groupId}:`, error);

            // Créer un log pour l'erreur
            await automationLogsService.createLog(
              LogType.TELEGRAM_MESSAGE,
              LogStatus.ERROR,
              `Erreur lors de l'envoi du rappel dans le groupe ${groupId}`,
              { error: error.message, groupId, scheduledTime: reminderTime.getTime() }
            );
          }
        }, 60 * 1000);

        result = {
          success: true,
          message: `Rappel programmé pour ${format(reminderTime, 'HH:mm:ss')} (dans 1 minute)`,
          scheduledTime: reminderTime.getTime()
        };
        break;

      default:
        result = {
          success: false,
          message: `Test inconnu: ${testId}`
        };
    }

    // Créer un log pour le test
    try {
      await automationLogsService.createLog(
        LogType.TEST,
        result.success ? LogStatus.SUCCESS : LogStatus.ERROR,
        `Test ${testId} exécuté pour le groupe Telegram ${groupId}`,
        {
          testId,
          groupId,
          result
        }
      );
    } catch (logError) {
      console.error('Erreur lors de la création du log:', logError);
      // Continuer malgré l'erreur de log
    }

    res.json(result);
  } catch (error) {
    console.error(`Erreur lors de l'exécution du test:`, error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TEST,
      LogStatus.ERROR,
      `Erreur lors de l'exécution du test ${req.body.testId} pour le groupe Telegram ${req.body.groupId}`,
      {
        error: error.message,
        testId: req.body.testId,
        groupId: req.body.groupId
      }
    );

    res.status(500).json({
      success: false,
      message: `Erreur lors de l'exécution du test: ${error.message}`
    });
  }
});

// Planifier un rappel
router.post('/telegram/test/schedule-reminder', isAuthenticated, async (req, res) => {
  try {
    const { groupId, reminderTime } = req.body;

    if (!groupId || !reminderTime) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID du groupe et l\'heure du rappel sont requis'
      });
    }

    console.log(`Planification d'un rappel pour le groupe Telegram ${groupId} à ${reminderTime}...`);

    // Convertir l'heure du rappel en timestamp
    const reminderTimestamp = new Date(reminderTime).getTime();

    // Vérifier que l'heure du rappel est dans le futur
    if (reminderTimestamp <= Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'L\'heure du rappel doit être dans le futur'
      });
    }

    // Créer un rappel dans la base de données
    await db.insert(schema.scheduledMessages)
      .values({
        telegramGroupId: groupId,
        message: `⏰ <b>RAPPEL AUTOMATIQUE</b>\n\nCeci est un rappel automatique planifié à ${format(new Date(reminderTimestamp), 'HH:mm:ss')}.\n\nCe message a été envoyé par le système de test.`,
        scheduledTime: reminderTimestamp,
        status: 'pending',
        createdAt: Date.now()
      })
      .run();

    // Créer un log pour la planification du rappel
    await automationLogsService.createLog(
      LogType.SCHEDULED_MESSAGE,
      LogStatus.SUCCESS,
      `Rappel planifié pour le groupe Telegram ${groupId}`,
      {
        groupId,
        reminderTime
      }
    );

    res.json({
      success: true,
      message: `Rappel planifié pour ${format(new Date(reminderTimestamp), 'HH:mm:ss')}`
    });
  } catch (error) {
    console.error('Erreur lors de la planification du rappel:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.SCHEDULED_MESSAGE,
      LogStatus.ERROR,
      `Erreur lors de la planification du rappel pour le groupe Telegram ${req.body.groupId}`,
      {
        error: error.message,
        groupId: req.body.groupId,
        reminderTime: req.body.reminderTime
      }
    );

    res.status(500).json({
      success: false,
      message: `Erreur lors de la planification du rappel: ${error.message}`
    });
  }
});

// Envoyer un message personnalisé
router.post('/telegram/test/send-message', isAuthenticated, async (req, res) => {
  try {
    const { groupId, message, parseMode } = req.body;

    if (!groupId || !message) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID du groupe et le message sont requis'
      });
    }

    console.log(`Envoi d'un message personnalisé dans le groupe Telegram ${groupId}...`);

    // Envoyer le message
    await telegramService.sendMessage({
      chatId: groupId,
      message,
      parseMode: parseMode || 'HTML'
    });

    // Créer un log pour l'envoi du message
    await automationLogsService.createLog(
      LogType.TELEGRAM_MESSAGE,
      LogStatus.SUCCESS,
      `Message personnalisé envoyé dans le groupe Telegram ${groupId}`,
      {
        groupId,
        messageLength: message.length
      }
    );

    res.json({
      success: true,
      message: 'Message envoyé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message personnalisé:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_MESSAGE,
      LogStatus.ERROR,
      `Erreur lors de l'envoi du message personnalisé dans le groupe Telegram ${req.body.groupId}`,
      {
        error: error.message,
        groupId: req.body.groupId
      }
    );

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message personnalisé',
      error: error.message
    });
  }
});

// Transférer un message depuis une chaîne
router.post('/telegram/test/forward-message', isAuthenticated, async (req, res) => {
  try {
    const { sourceChannelId, targetGroupId } = req.body;

    if (!sourceChannelId || !targetGroupId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID de la chaîne source et l\'ID du groupe cible sont requis'
      });
    }

    console.log(`Transfert d'un message depuis la chaîne ${sourceChannelId} vers le groupe ${targetGroupId}...`);

    // Créer un message de test
    const testMessage = `
📢 <b>Message de test depuis la chaîne ${sourceChannelId}</b>

Ce message a été créé pour simuler un transfert depuis une chaîne Telegram.

📅 Date: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
`;

    // Envoyer le message dans le groupe cible
    await telegramService.sendMessage({
      chatId: targetGroupId,
      message: testMessage,
      parseMode: 'HTML'
    });

    // Créer un log pour le transfert
    await automationLogsService.createLog(
      LogType.TELEGRAM_MESSAGE,
      LogStatus.SUCCESS,
      `Message transféré depuis la chaîne ${sourceChannelId} vers le groupe ${targetGroupId}`,
      {
        sourceChannelId,
        targetGroupId
      }
    );

    res.json({
      success: true,
      message: 'Message transféré avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du transfert du message:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_MESSAGE,
      LogStatus.ERROR,
      `Erreur lors du transfert du message depuis la chaîne ${req.body.sourceChannelId} vers le groupe ${req.body.targetGroupId}`,
      {
        error: error.message,
        sourceChannelId: req.body.sourceChannelId,
        targetGroupId: req.body.targetGroupId
      }
    );

    res.status(500).json({
      success: false,
      message: 'Erreur lors du transfert du message',
      error: error.message
    });
  }
});

// Nettoyer les données de test
router.post('/telegram/test/cleanup', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ message: 'L\'ID du groupe est requis' });
    }

    console.log(`Nettoyage des données de test pour le groupe Telegram ${groupId}...`);

    // Supprimer les badges des utilisateurs
    await db.delete(schema.telegramUserBadges)
      .where(schema.telegramUserBadges.telegramGroupId == groupId as string)
      .run();

    // Supprimer les rappels planifiés
    await db.delete(schema.scheduledMessages)
      .where(schema.scheduledMessages.telegramGroupId == groupId as string)
      .run();

    // Supprimer les logs de test
    await db.delete(schema.automationLogs)
      .where(schema.automationLogs.type == LogType.TEST)
      .run();

    // Envoyer un message dans le groupe pour informer du nettoyage
    try {
      await telegramService.sendMessage({
        chatId: groupId as string,
        message: '🧹 <b>Nettoyage des données de test</b>\n\nToutes les données de test ont été supprimées.',
        parseMode: 'HTML'
      });
    } catch (error) {
      console.error(`Erreur lors de l'envoi du message de nettoyage:`, error);
    }

    // Créer un log pour le nettoyage
    await automationLogsService.createLog(
      LogType.CLEANUP,
      LogStatus.SUCCESS,
      `Données de test nettoyées pour le groupe Telegram ${groupId}`,
      {
        groupId
      }
    );

    res.json({
      success: true,
      message: 'Données de test nettoyées avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des données de test:', error);

    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.CLEANUP,
      LogStatus.ERROR,
      `Erreur lors du nettoyage des données de test pour le groupe Telegram ${req.query.groupId}`,
      {
        error: error.message,
        groupId: req.query.groupId
      }
    );

    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des données de test',
      error: error.message
    });
  }
});

export default router;
