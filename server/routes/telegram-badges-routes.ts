import express from 'express';
import { telegramBadgesService } from '../services/telegram-badges-service';
import { systemSettingsService } from '../services/system-settings-service';

const router = express.Router();

// Récupérer tous les badges
router.get('/telegram/badges', async (req, res) => {
  try {
    const badges = await telegramBadgesService.getAllBadges();
    res.json(badges);
  } catch (error) {
    console.error('Erreur lors de la récupération des badges:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des badges' });
  }
});

// Récupérer les meilleurs étudiants d'un groupe pour une période donnée
router.get('/telegram/groups/:groupId/top-students', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { periodStart, periodEnd } = req.query;

    // Valider les paramètres
    if (!groupId) {
      return res.status(400).json({ message: 'ID de groupe manquant' });
    }

    // Convertir les timestamps en nombres
    const start = periodStart ? Number(periodStart) : Date.now() - 7 * 24 * 60 * 60 * 1000; // Par défaut: 7 derniers jours
    const end = periodEnd ? Number(periodEnd) : Date.now();

    const topStudents = await telegramBadgesService.getTopStudentsForPeriod(groupId, start, end);
    res.json(topStudents);
  } catch (error) {
    console.error('Erreur lors de la récupération des meilleurs étudiants:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des meilleurs étudiants' });
  }
});

// Récupérer les badges d'un étudiant
router.get('/telegram/students/:studentId/badges', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Valider les paramètres
    if (!studentId) {
      return res.status(400).json({ message: 'ID d\'étudiant manquant' });
    }

    const badges = await telegramBadgesService.getStudentBadges(Number(studentId));
    res.json(badges);
  } catch (error) {
    console.error('Erreur lors de la récupération des badges de l\'étudiant:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des badges de l\'étudiant' });
  }
});

// Attribuer un badge à un étudiant
router.post('/telegram/students/:studentId/badges', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { badgeId, groupId, periodStart, periodEnd } = req.body;

    // Valider les paramètres
    if (!studentId || !badgeId || !groupId || !periodStart || !periodEnd) {
      return res.status(400).json({ message: 'Paramètres manquants' });
    }

    const result = await telegramBadgesService.awardBadgeToStudent({
      telegramStudentId: Number(studentId),
      telegramBadgeId: Number(badgeId),
      telegramGroupId: groupId,
      periodStart: Number(periodStart),
      periodEnd: Number(periodEnd)
    });

    if (result) {
      res.json({ message: 'Badge attribué avec succès', badgeId: result });
    } else {
      res.status(500).json({ message: 'Erreur lors de l\'attribution du badge' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'attribution du badge:', error);
    res.status(500).json({ message: 'Erreur lors de l\'attribution du badge' });
  }
});

// Attribuer des badges aux meilleurs étudiants d'un groupe pour une période donnée
router.post('/telegram/groups/:groupId/award-badges', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { periodStart, periodEnd } = req.body;

    // Valider les paramètres
    if (!groupId || !periodStart || !periodEnd) {
      return res.status(400).json({ message: 'Paramètres manquants' });
    }

    const result = await telegramBadgesService.awardBadgesToTopStudents(
      groupId,
      Number(periodStart),
      Number(periodEnd)
    );

    if (result) {
      res.json({ message: 'Badges attribués avec succès' });
    } else {
      res.status(500).json({ message: 'Erreur lors de l\'attribution des badges' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'attribution des badges:', error);
    res.status(500).json({ message: 'Erreur lors de l\'attribution des badges' });
  }
});

// Simuler la participation des étudiants pour un groupe
router.post('/telegram/groups/:groupId/simulate-participation', async (req, res) => {
  try {
    // Vérifier si le mode simulation est activé
    const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();
    if (!isSimulationMode) {
      return res.status(403).json({ message: 'Le mode simulation est désactivé' });
    }

    const { groupId } = req.params;
    const { periodStart, periodEnd, studentCount } = req.body;

    // Valider les paramètres
    if (!groupId) {
      return res.status(400).json({ message: 'ID de groupe manquant' });
    }

    // Utiliser des valeurs par défaut si nécessaire
    const start = periodStart ? Number(periodStart) : Date.now() - 7 * 24 * 60 * 60 * 1000; // Par défaut: 7 derniers jours
    const end = periodEnd ? Number(periodEnd) : Date.now();
    const count = studentCount ? Number(studentCount) : 10;

    const result = await telegramBadgesService.simulateStudentParticipation(
      groupId,
      start,
      end,
      count
    );

    if (result) {
      res.json({ message: 'Participation simulée avec succès' });
    } else {
      res.status(500).json({ message: 'Erreur lors de la simulation de la participation' });
    }
  } catch (error) {
    console.error('Erreur lors de la simulation de la participation:', error);
    res.status(500).json({ message: 'Erreur lors de la simulation de la participation' });
  }
});

// Simuler la participation pour tous les groupes
router.post('/telegram/simulate-all-participation', async (req, res) => {
  try {
    // Vérifier si le mode simulation est activé
    const isSimulationMode = await systemSettingsService.isSimulationModeEnabled();
    if (!isSimulationMode) {
      return res.status(403).json({ message: 'Le mode simulation est désactivé' });
    }

    const result = await telegramBadgesService.simulateParticipationForAllGroups();

    if (result) {
      res.json({ message: 'Participation simulée avec succès pour tous les groupes' });
    } else {
      res.status(500).json({ message: 'Erreur lors de la simulation de la participation' });
    }
  } catch (error) {
    console.error('Erreur lors de la simulation de la participation:', error);
    res.status(500).json({ message: 'Erreur lors de la simulation de la participation' });
  }
});

// Récupérer les périodes disponibles
router.get('/telegram/periods', async (req, res) => {
  try {
    const periods = telegramBadgesService.generatePeriods();
    res.json(periods);
  } catch (error) {
    console.error('Erreur lors de la récupération des périodes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des périodes' });
  }
});

export default router;
