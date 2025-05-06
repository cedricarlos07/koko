import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { telegramService } from '../services/telegram-service';
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

// Récupérer les statistiques globales de la plateforme
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    console.log('Récupération des statistiques globales...');
    
    // Récupérer les statistiques des utilisateurs
    const users = await db.select().from(schema.users).all();
    const studentCount = users.filter(user => user.role === 'student').length;
    const professorCount = users.filter(user => user.role === 'professor').length;
    const coachCount = users.filter(user => user.role === 'coach').length;
    const adminCount = users.filter(user => user.role === 'admin').length;
    
    // Récupérer les statistiques des cours
    const courses = await db.select().from(schema.fixedSchedules).all();
    
    // Récupérer les statistiques des groupes Telegram
    const telegramGroups = await telegramService.getAllGroupStats();
    
    // Transformer les données pour l'API
    const telegramStats = courses
      .filter(schedule => schedule.telegram_group)
      .map(schedule => {
        // Générer un lien Telegram
        const groupName = schedule.telegram_group;
        const groupLink = groupName.startsWith('@')
          ? `https://t.me/${groupName.replace('@', '')}`
          : `https://t.me/c/${groupName.replace('-100', '')}`;
        
        // Récupérer les statistiques du groupe Telegram
        const stats = telegramGroups.find(stat => stat.telegramGroupId === groupName);
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
    
    // Construire la réponse
    const response = {
      users: {
        total: users.length,
        students: studentCount,
        professors: professorCount,
        coaches: coachCount,
        admins: adminCount
      },
      courses: {
        total: courses.length
      },
      telegramStats
    };
    
    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques globales:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques globales' });
  }
});

export default router;
