import express from 'express';
import { telegramService } from '../services/telegram-service';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';

const router = express.Router();

// Route pour recevoir les mises à jour de Telegram (webhook)
router.post('/telegram/webhook', async (req, res) => {
  try {
    console.log('Webhook Telegram reçu:', req.body);
    
    // Vérifier si la mise à jour contient un message
    if (req.body && req.body.message) {
      const message = req.body.message;
      
      // Enregistrer le message dans la base de données
      await telegramService.saveMessage(message);
      
      // Créer un log pour la réception du message
      await automationLogsService.createLog(
        LogType.TELEGRAM_INFO,
        LogStatus.SUCCESS,
        `Message Telegram reçu de ${message.from.first_name} ${message.from.last_name || ''}`,
        {
          message: message
        }
      );
    }
    
    // Répondre avec succès
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur lors du traitement du webhook Telegram:', error);
    
    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.ERROR,
      `Erreur lors du traitement du webhook Telegram`,
      {
        error: error.message,
        body: req.body
      }
    );
    
    // Répondre avec succès malgré l'erreur pour éviter que Telegram ne réessaie
    res.status(200).json({ success: false, error: error.message });
  }
});

// Route pour configurer le webhook Telegram
router.post('/telegram/set-webhook', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL requise' });
    }
    
    // Configurer le webhook Telegram
    const telegramApiUrl = 'https://api.telegram.org/bot';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!telegramBotToken) {
      return res.status(400).json({ success: false, message: 'Token Telegram non configuré' });
    }
    
    const response = await fetch(`${telegramApiUrl}${telegramBotToken}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url
      })
    });
    
    const data = await response.json();
    
    // Créer un log pour la configuration du webhook
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.SUCCESS,
      `Webhook Telegram configuré avec succès`,
      {
        url: url,
        response: data
      }
    );
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erreur lors de la configuration du webhook Telegram:', error);
    
    // Créer un log pour l'erreur
    await automationLogsService.createLog(
      LogType.TELEGRAM_INFO,
      LogStatus.ERROR,
      `Erreur lors de la configuration du webhook Telegram`,
      {
        error: error.message
      }
    );
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour obtenir les informations du webhook Telegram actuel
router.get('/telegram/webhook-info', async (req, res) => {
  try {
    // Récupérer les informations du webhook Telegram
    const telegramApiUrl = 'https://api.telegram.org/bot';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!telegramBotToken) {
      return res.status(400).json({ success: false, message: 'Token Telegram non configuré' });
    }
    
    const response = await fetch(`${telegramApiUrl}${telegramBotToken}/getWebhookInfo`);
    const data = await response.json();
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du webhook Telegram:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
