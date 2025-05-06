import express from 'express';
import { db } from '../db';

const router = express.Router();

// Récupérer tous les groupes Telegram depuis la vue personnalisée
router.get('/telegram/groups-view', async (req, res) => {
  try {
    console.log('Récupération des groupes Telegram depuis la vue personnalisée...');
    
    // Vérifier si la vue existe
    const viewExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='view' AND name='telegram_groups_view'
    `).get();
    
    if (!viewExists) {
      console.error('La vue telegram_groups_view n\'existe pas');
      return res.status(404).json({ message: 'La vue telegram_groups_view n\'existe pas' });
    }
    
    // Récupérer les données de la vue
    const telegramGroups = db.prepare('SELECT * FROM telegram_groups_view').all();
    
    console.log(`Nombre de groupes Telegram récupérés: ${telegramGroups.length}`);
    
    res.json(telegramGroups);
  } catch (error) {
    console.error('Erreur lors de la récupération des groupes Telegram:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des groupes Telegram' });
  }
});

export default router;
