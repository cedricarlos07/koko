import express from 'express';
import { telegramService } from '../services/telegram-service';
import axios from 'axios';

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
    // Vérifier si le token est configuré
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Token Telegram non configuré'
      });
    }

    // Tester la connexion en récupérant les informations du bot
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`
      );

      res.json({
        success: true,
        botInfo: response.data.result
      });
    } catch (error) {
      console.error('Erreur lors du test de connexion à l\'API Telegram:', error);
      console.error('Détails de l\'erreur:', error.response ? error.response.data : 'Pas de données de réponse');

      res.status(500).json({
        success: false,
        message: `Erreur lors du test de connexion: ${error.message}`,
        error: error.response ? error.response.data : 'Pas de données de réponse'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion à l\'API Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de la connexion à l\'API Telegram',
      error: error.message
    });
  }
});

// Route de test pour tester directement l'API Telegram
router.post('/telegram/test/debug/direct-api', async (req, res) => {
  try {
    const { method, endpoint, params } = req.body;

    if (!method || !endpoint) {
      return res.status(400).json({
        success: false,
        message: 'La méthode et l\'endpoint sont requis'
      });
    }

    // Vérifier si le token est configuré
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Token Telegram non configuré'
      });
    }

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`;
    console.log(`Appel direct à l'API Telegram: ${method.toUpperCase()} ${url}`);
    console.log('Paramètres:', params);

    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(url, { params });
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(url, params);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Méthode non supportée'
      });
    }

    console.log('Réponse de l\'API Telegram:', response.data);

    res.json({
      success: true,
      result: response.data
    });
  } catch (error) {
    console.error('Erreur lors de l\'appel direct à l\'API Telegram:', error);
    console.error('Détails de l\'erreur:', error.response ? error.response.data : 'Pas de données de réponse');

    res.status(500).json({
      success: false,
      message: `Erreur lors de l'appel direct à l'API Telegram: ${error.message}`,
      error: error.response ? error.response.data : 'Pas de données de réponse'
    });
  }
});

export default router;
