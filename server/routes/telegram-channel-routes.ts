import express from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { UserRole } from '@shared/schema';
import { telegramService } from '../services/telegram-service';
import { eq } from 'drizzle-orm';

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

// Récupérer toutes les configurations de transfert
router.get('/telegram/channel-forwards', isAuthenticated, async (req, res) => {
  try {
    const configs = await db.select().from(schema.telegramChannelForwards).all();
    res.json(configs);
  } catch (error) {
    console.error('Erreur lors de la récupération des configurations de transfert:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des configurations de transfert' });
  }
});

// Récupérer une configuration de transfert par ID
router.get('/telegram/channel-forwards/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const config = await db.select().from(schema.telegramChannelForwards)
      .where(eq(schema.telegramChannelForwards.id, parseInt(id)))
      .get();

    if (!config) {
      return res.status(404).json({ message: 'Configuration de transfert non trouvée' });
    }

    res.json(config);
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration de transfert:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la configuration de transfert' });
  }
});

// Créer une nouvelle configuration de transfert
router.post('/telegram/channel-forwards', isAdmin, async (req, res) => {
  try {
    const { sourceChannelId, sourceChannelName, targetGroupId, targetGroupName } = req.body;

    if (!sourceChannelId || !sourceChannelName || !targetGroupId || !targetGroupName) {
      return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
    }

    const config = await telegramService.configureChannelForward(
      sourceChannelId,
      sourceChannelName,
      targetGroupId,
      targetGroupName
    );

    res.status(201).json(config);
  } catch (error) {
    console.error('Erreur lors de la création de la configuration de transfert:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la configuration de transfert' });
  }
});

// Mettre à jour une configuration de transfert
router.patch('/telegram/channel-forwards/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { sourceChannelId, sourceChannelName, targetGroupId, targetGroupName, isActive } = req.body;

    const config = await db.select().from(schema.telegramChannelForwards)
      .where(eq(schema.telegramChannelForwards.id, parseInt(id)))
      .get();

    if (!config) {
      return res.status(404).json({ message: 'Configuration de transfert non trouvée' });
    }

    await db.update(schema.telegramChannelForwards)
      .set({
        sourceChannelId: sourceChannelId || config.sourceChannelId,
        sourceChannelName: sourceChannelName || config.sourceChannelName,
        targetGroupId: targetGroupId || config.targetGroupId,
        targetGroupName: targetGroupName || config.targetGroupName,
        isActive: isActive !== undefined ? isActive : config.isActive,
        updatedAt: Date.now()
      })
      .where(eq(schema.telegramChannelForwards.id, parseInt(id)))
      .run();

    const updatedConfig = await db.select().from(schema.telegramChannelForwards)
      .where(eq(schema.telegramChannelForwards.id, parseInt(id)))
      .get();

    res.json(updatedConfig);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration de transfert:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la configuration de transfert' });
  }
});

// Supprimer une configuration de transfert
router.delete('/telegram/channel-forwards/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const config = await db.select().from(schema.telegramChannelForwards)
      .where(eq(schema.telegramChannelForwards.id, parseInt(id)))
      .get();

    if (!config) {
      return res.status(404).json({ message: 'Configuration de transfert non trouvée' });
    }

    await db.delete(schema.telegramChannelForwards)
      .where(eq(schema.telegramChannelForwards.id, parseInt(id)))
      .run();

    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la configuration de transfert:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la configuration de transfert' });
  }
});

// Exécuter tous les transferts automatiques
router.post('/telegram/channel-forwards/execute', isAdmin, async (req, res) => {
  try {
    const result = await telegramService.executeAllChannelForwards();
    res.json(result);
  } catch (error) {
    console.error('Erreur lors de l\'exécution des transferts automatiques:', error);
    res.status(500).json({ message: 'Erreur lors de l\'exécution des transferts automatiques' });
  }
});

// Exécuter manuellement la tâche planifiée de transfert
router.post('/telegram/channel-forwards/execute-scheduled', isAdmin, async (req, res) => {
  try {
    const { schedulerService } = require('../services/scheduler-service');
    const result = await schedulerService.manuallyExecuteChannelForwards();
    res.json(result);
  } catch (error) {
    console.error('Erreur lors de l\'exécution manuelle de la tâche planifiée de transfert:', error);
    res.status(500).json({ message: 'Erreur lors de l\'exécution manuelle de la tâche planifiée de transfert' });
  }
});

export default router;
