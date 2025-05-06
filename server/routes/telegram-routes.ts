import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { UserRole } from '@shared/schema';

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

import { telegramService } from '../services/telegram-service';

// Récupérer tous les groupes Telegram
router.get('/telegram/groups', async (req, res) => {
  try {
    console.log('Récupération des groupes Telegram...');
    // Récupérer tous les cours planifiés avec leurs groupes Telegram
    const fixedSchedules = db.select()
      .from(schema.fixedSchedules)
      .all();

    // Récupérer les statistiques des groupes Telegram
    console.log('Récupération des statistiques des groupes Telegram...');
    const groupStats = await telegramService.getAllGroupStats();
    console.log(`Nombre de statistiques récupérées: ${groupStats.length}`);

    // Créer une map des statistiques par ID de groupe
    const statsMap = new Map();
    groupStats.forEach(stat => {
      statsMap.set(stat.telegramGroupId, stat);
      console.log(`Statistiques pour le groupe ${stat.telegramGroupId}: ${stat.memberCount} membres, ${stat.messageCount} messages`);
    });

    // Transformer les données pour l'API
    console.log(`Nombre de cours planifiés: ${fixedSchedules.length}`);
    const telegramGroupsFiltered = fixedSchedules
      .filter(schedule => schedule.telegram_group); // Filtrer les cours sans groupe Telegram

    console.log(`Nombre de groupes Telegram après filtrage: ${telegramGroupsFiltered.length}`);

    const telegramGroups = telegramGroupsFiltered
      .map(schedule => {
        // Générer un lien Telegram
        const groupName = schedule.telegram_group;
        const groupLink = groupName.startsWith('@')
          ? `https://t.me/${groupName.replace('@', '')}`
          : `https://t.me/c/${groupName.replace('-100', '')}`;

        // Récupérer les statistiques réelles du groupe Telegram
        const stats = statsMap.get(groupName);
        const memberCount = stats ? stats.memberCount : 0;
        const messageCount = stats ? stats.messageCount : 0;
        const lastActivity = stats ? stats.lastActivity : Date.now();

        return {
          id: schedule.id,
          courseId: schedule.id,
          courseName: schedule.course_name,
          level: schedule.level,
          groupName: schedule.telegram_group,
          groupLink,
          memberCount,
          messageCount,
          lastActivity,
          teacherName: schedule.teacher_name,
        };
      });

    res.json(telegramGroups);
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des groupes Telegram' });
  }
});

// Rafraîchir les statistiques des groupes Telegram
router.post('/telegram/refresh-stats', async (req, res) => {
  try {
    // Appeler le service Telegram pour rafraîchir les statistiques
    const groupStats = await telegramService.refreshAllGroupStats();

    res.json({
      message: 'Statistiques des groupes Telegram rafraîchies avec succès',
      count: groupStats.length,
      stats: groupStats
    });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des statistiques des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors du rafraîchissement des statistiques des groupes Telegram' });
  }
});

// Envoyer un message à un groupe Telegram
router.post('/telegram/send-message', async (req, res) => {
  try {
    const { groupId, message } = req.body;

    if (!groupId || !message) {
      return res.status(400).json({ message: 'Le groupe et le message sont requis' });
    }

    // Récupérer le groupe Telegram
    const schedule = db.select()
      .from(schema.fixedSchedules)
      .where(schema.fixedSchedules.id == groupId)
      .get();

    if (!schedule) {
      return res.status(404).json({ message: 'Groupe Telegram non trouvé' });
    }

    // Dans une vraie application, cette route appellerait l'API Telegram pour envoyer le message
    // Ici, nous simulons simplement un délai
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({ message: 'Message envoyé avec succès', groupName: schedule.telegram_group });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du message' });
  }
});

export default router;
