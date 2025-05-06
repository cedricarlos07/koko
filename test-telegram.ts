import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer le token Telegram depuis les variables d'environnement
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';

if (!telegramToken) {
  console.error('TELEGRAM_BOT_TOKEN non défini. Veuillez définir cette variable d\'environnement.');
  process.exit(1);
}

// Initialiser le bot Telegram
const bot = new TelegramBot(telegramToken, { polling: true });

console.log('Bot Telegram initialisé avec succès !');
console.log('Token utilisé :', telegramToken);

// Écouter les messages
bot.on('message', async (msg) => {
  console.log('Message reçu :', msg);
  
  // Répondre au message
  await bot.sendMessage(msg.chat.id, `J'ai reçu votre message : ${msg.text}`);
});

// Fonction pour envoyer un message de test
async function sendTestMessage(chatId: string) {
  try {
    const messageContent = `📚 *Cours du jour : Français Avancé*
👨‍🏫 Prof : Jean Dupont
🕒 Heure : 10:00 GMT
🔗 [👉 Lien Zoom ici](https://zoom.us/j/123456789)

Bonne journée et soyez ponctuel·les ! 🎯`;

    await bot.sendMessage(chatId, messageContent, { parse_mode: 'Markdown' });
    console.log('Message de test envoyé avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message de test :', error);
  }
}

// Demander à l'utilisateur d'entrer un ID de chat
console.log('Pour envoyer un message de test, veuillez ajouter ce bot à un groupe Telegram.');
console.log('Ensuite, envoyez un message dans ce groupe pour obtenir l\'ID du chat.');
console.log('Vous pouvez également envoyer un message directement au bot pour tester.');

// Garder le script en cours d'exécution
console.log('Le bot est en cours d\'exécution. Appuyez sur Ctrl+C pour quitter.');
