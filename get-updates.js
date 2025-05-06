import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer le token Telegram depuis les variables d'environnement
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';

if (!telegramToken) {
  console.error('TELEGRAM_BOT_TOKEN non défini. Veuillez définir cette variable d\'environnement.');
  process.exit(1);
}

// URL pour obtenir les mises à jour
const url = `https://api.telegram.org/bot${telegramToken}/getUpdates`;

// Obtenir les mises à jour
fetch(url)
  .then(response => response.json())
  .then(data => {
    console.log('Mises à jour du bot :', JSON.stringify(data, null, 2));
    
    // Extraire les IDs de chat
    if (data.ok && data.result && data.result.length > 0) {
      console.log('\nIDs de chat trouvés :');
      const chatIds = new Set();
      
      data.result.forEach(update => {
        if (update.message && update.message.chat) {
          const chat = update.message.chat;
          chatIds.add(chat.id);
          console.log(`- ${chat.id} (${chat.type}: ${chat.title || chat.username || 'Chat privé'})`);
        }
      });
      
      if (chatIds.size === 0) {
        console.log('Aucun ID de chat trouvé. Envoyez un message au bot pour obtenir un ID de chat.');
      } else {
        console.log('\nPour envoyer un message à un chat, utilisez :');
        console.log(`npx tsx send-message.js CHAT_ID`);
      }
    } else {
      console.log('Aucune mise à jour trouvée. Envoyez un message au bot pour obtenir des mises à jour.');
    }
  })
  .catch(error => {
    console.error('Erreur lors de la récupération des mises à jour :', error);
    process.exit(1);
  });
