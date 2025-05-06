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

// Récupérer l'ID du chat depuis les arguments de la ligne de commande
const chatId = process.argv[2];

if (!chatId) {
  console.error('Veuillez spécifier l\'ID du chat en argument.');
  console.log('Exemple : npx tsx send-message.js 123456789');
  process.exit(1);
}

// Initialiser le bot Telegram
const bot = new TelegramBot(telegramToken);

// Message à envoyer
const messageContent = `📚 *Cours du jour : Français Avancé*
👨‍🏫 Prof : Jean Dupont
🕒 Heure : 10:00 GMT
🔗 [👉 Lien Zoom ici](https://zoom.us/j/123456789)

Bonne journée et soyez ponctuel·les ! 🎯`;

// Envoyer le message
bot.sendMessage(chatId, messageContent, { parse_mode: 'Markdown' })
  .then(() => {
    console.log('Message envoyé avec succès !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'envoi du message :', error);
    process.exit(1);
  });
