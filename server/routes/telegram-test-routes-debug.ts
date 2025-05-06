import express from 'express';
import { telegramService } from '../services/telegram-service';

const router = express.Router();

// Route de test pour vérifier la configuration du bot Telegram
router.get('/telegram/test/debug/config', async (req, res) => {
  try {
    // Récupérer la configuration du bot Telegram
    const config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN ? 
        `${process.env.TELEGRAM_BOT_TOKEN.substring(0, 5)}...${process.env.TELEGRAM_BOT_TOKEN.substring(process.env.TELEGRAM_BOT_TOKEN.length - 5)}` : 
        'Non configuré',
      botTokenConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      apiUrl: 'https://api.telegram.org/bot',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration du bot Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la configuration du bot Telegram',
      error: error.message
    });
  }
});

// Route de test pour vérifier la connexion à l'API Telegram
router.get('/telegram/test/debug/connection', async (req, res) => {
  try {
    // Vérifier la connexion à l'API Telegram
    const result = await telegramService.testConnection();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion à l\'API Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de la connexion à l\'API Telegram',
      error: error.message
    });
  }
});

export default router;
