import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est authentifié
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Récupérer tous les groupes Telegram
router.get('/telegram/groups', isAuthenticated, async (req, res) => {
  try {
    console.log('Récupération des groupes Telegram...');
    // Récupérer tous les cours planifiés avec leurs groupes Telegram
    const fixedSchedules = db.select()
      .from(schema.fixedSchedules)
      .all();

    // Récupérer les statistiques des groupes Telegram
    console.log('Récupération des statistiques des groupes Telegram...');
    const groupStats = await getTelegramGroupStats();
    console.log(`Nombre de statistiques récupérées: ${groupStats.length}`);

    // Créer une map des statistiques par ID de groupe
    const statsMap = new Map();
    groupStats.forEach(stat => {
      statsMap.set(stat.telegramGroupId, stat);
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
          level: schedule.level || 'N/A',
          groupName: schedule.telegram_group,
          groupLink,
          memberCount,
          messageCount,
          lastActivity,
          teacherName: schedule.teacher_name || 'Non assigné',
        };
      });

    res.json(telegramGroups);
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des groupes Telegram' });
  }
});

// Récupérer les statistiques des groupes Telegram
router.get('/telegram/stats', isAuthenticated, async (req, res) => {
  try {
    const groupStats = await getTelegramGroupStats();
    res.json(groupStats);
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques des groupes Telegram' });
  }
});

// Rafraîchir les statistiques des groupes Telegram
router.post('/telegram/refresh-stats', isAuthenticated, async (req, res) => {
  try {
    // Exécuter le script d'importation des données Telegram
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.join(__dirname, '..', '..', 'import-telegram-groups.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur lors de l'exécution du script: ${error.message}`);
        return res.status(500).json({ message: 'Erreur lors du rafraîchissement des statistiques des groupes Telegram' });
      }
      
      if (stderr) {
        console.error(`Erreur standard: ${stderr}`);
      }
      
      console.log(`Sortie standard: ${stdout}`);
      res.json({ message: 'Statistiques des groupes Telegram rafraîchies avec succès' });
    });
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des statistiques des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors du rafraîchissement des statistiques des groupes Telegram' });
  }
});

// Importer les données Excel
router.post('/telegram/import-excel', isAuthenticated, async (req, res) => {
  try {
    // Exécuter le script d'importation des données Excel
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scriptPath = path.join(__dirname, '..', '..', 'import-telegram-groups.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erreur lors de l'exécution du script: ${error.message}`);
        return res.status(500).json({ message: 'Erreur lors de l\'importation des données Excel' });
      }
      
      if (stderr) {
        console.error(`Erreur standard: ${stderr}`);
      }
      
      console.log(`Sortie standard: ${stdout}`);
      res.json({ message: 'Données Excel importées avec succès' });
    });
  } catch (error) {
    console.error('Erreur lors de l\'importation des données Excel:', error);
    res.status(500).json({ message: 'Erreur lors de l\'importation des données Excel' });
  }
});

// Récupérer les étudiants d'un groupe Telegram
router.get('/telegram/groups/:groupId/students', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Récupérer le groupe Telegram
    const schedule = db.select()
      .from(schema.fixedSchedules)
      .where(eq(schema.fixedSchedules.id, parseInt(groupId)))
      .get();
    
    if (!schedule) {
      return res.status(404).json({ message: 'Groupe Telegram non trouvé' });
    }
    
    // Générer des étudiants simulés pour le groupe
    const studentCount = Math.floor(Math.random() * 20) + 5;
    const students = [];
    
    const firstNames = [
      'Ahmed', 'Ali', 'Amina', 'Fatima', 'Hassan', 'Karim', 'Layla', 'Mariam', 'Mohamed', 'Nadia',
      'Omar', 'Rania', 'Samir', 'Sara', 'Youssef', 'Zahra', 'Amir', 'Dina', 'Farid', 'Hala'
    ];
    
    const lastNames = [
      'Abbas', 'Ahmed', 'Ali', 'Farah', 'Hassan', 'Ibrahim', 'Khalil', 'Mahmoud', 'Mohamed', 'Mustafa',
      'Nasser', 'Omar', 'Rahman', 'Said', 'Saleh', 'Youssef', 'Zaki', 'Amari', 'Bakri', 'Darwish'
    ];
    
    const badges = [
      'Super participatif', 'Media Master', 'Reaction King', null, null, null
    ];
    
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    for (let i = 1; i <= studentCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;
      const lastActivity = now - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000);
      const isActiveThisWeek = lastActivity > oneWeekAgo;
      const messageCount = Math.floor(Math.random() * 100) + (isActiveThisWeek ? 20 : 0);
      const badge = badges[Math.floor(Math.random() * badges.length)];
      
      students.push({
        id: i,
        telegramUserId: `user${i}_${schedule.id}`,
        telegramUsername: username,
        telegramFirstName: firstName,
        telegramLastName: lastName,
        lastActivity,
        messageCount,
        isActiveThisWeek,
        badge
      });
    }
    
    res.json(students);
  } catch (error) {
    console.error('Erreur lors de la récupération des étudiants du groupe Telegram:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des étudiants du groupe Telegram' });
  }
});

// Récupérer les sessions à venir
router.get('/sessions/upcoming', isAuthenticated, async (req, res) => {
  try {
    // Générer des sessions à venir simulées
    const courses = db.select()
      .from(schema.fixedSchedules)
      .all();
    
    const upcomingSessions = courses.map(course => {
      // Générer une date aléatoire dans les 7 prochains jours
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 7) + 1);
      
      // Générer une heure aléatoire entre 8h et 18h
      const hour = Math.floor(Math.random() * 10) + 8;
      const minute = Math.random() < 0.5 ? 0 : 30;
      
      return {
        id: course.id,
        courseId: course.id,
        date: date.toLocaleDateString('fr-FR'),
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      };
    });
    
    res.json(upcomingSessions);
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions à venir:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des sessions à venir' });
  }
});

// Fonction pour récupérer les statistiques des groupes Telegram
async function getTelegramGroupStats() {
  try {
    // Récupérer les statistiques des groupes Telegram depuis la base de données
    const stats = db.select()
      .from(schema.telegramGroupStats)
      .all();
    
    return stats.map(stat => ({
      telegramGroupId: stat.telegram_group_id,
      memberCount: stat.member_count,
      messageCount: stat.message_count,
      lastActivity: stat.last_activity,
      lastUpdated: stat.last_updated
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques des groupes Telegram:', error);
    return [];
  }
}

export default router;