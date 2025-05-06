import express from 'express';
import { schedulerService } from '../services/scheduler-service';
import { automationLogService } from '../services/automation-log-service';
import { UserRole } from '@shared/schema';

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est administrateur
const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Accès refusé. Vous devez être administrateur.' });
  }
  next();
};

// Récupérer tous les logs d'automatisation
router.get('/logs', isAdmin, async (req, res) => {
  try {
    const logs = await automationLogService.getLogs();
    res.json(logs);
  } catch (error) {
    console.error('Erreur lors de la récupération des logs d\'automatisation:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des logs d\'automatisation' });
  }
});

// Récupérer les logs d'automatisation pour un cours
router.get('/logs/course/:id', isAdmin, async (req, res) => {
  try {
    const courseId = parseInt(req.params.id, 10);
    const logs = await automationLogService.getLogsByCourse(courseId);
    res.json(logs);
  } catch (error) {
    console.error(`Erreur lors de la récupération des logs d'automatisation pour le cours ${req.params.id}:`, error);
    res.status(500).json({ message: `Erreur lors de la récupération des logs d'automatisation pour le cours ${req.params.id}` });
  }
});

// Récupérer les logs d'automatisation par type
router.get('/logs/type/:type', isAdmin, async (req, res) => {
  try {
    const logs = await automationLogService.getLogsByType(req.params.type);
    res.json(logs);
  } catch (error) {
    console.error(`Erreur lors de la récupération des logs d'automatisation de type ${req.params.type}:`, error);
    res.status(500).json({ message: `Erreur lors de la récupération des logs d'automatisation de type ${req.params.type}` });
  }
});

// Réinitialiser le planificateur de tâches
router.post('/scheduler/reset', isAdmin, async (req, res) => {
  try {
    await schedulerService.initializeScheduler();
    res.json({ message: 'Planificateur de tâches réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du planificateur de tâches:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du planificateur de tâches' });
  }
});

// Exécuter manuellement l'importation des cours à venir
router.post('/scheduler/import', isAdmin, async (req, res) => {
  try {
    await schedulerService.runImportManually();
    res.json({ message: 'Importation des cours à venir exécutée avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'importation des cours à venir:', error);
    res.status(500).json({ message: 'Erreur lors de l\'importation des cours à venir' });
  }
});

// Exécuter manuellement l'envoi des rappels de cours
router.post('/scheduler/reminders', isAdmin, async (req, res) => {
  try {
    await schedulerService.runRemindersManually();
    res.json({ message: 'Envoi des rappels de cours exécuté avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi des rappels de cours:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi des rappels de cours' });
  }
});

export default router;
