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

console.log('Token Telegram :', telegramToken);

// Initialiser le bot Telegram
const bot = new TelegramBot(telegramToken, { polling: true });

console.log('Bot Telegram initialisé avec succès !');

// Écouter les messages
bot.on('message', (msg) => {
  console.log('Message reçu :', JSON.stringify(msg, null, 2));
  
  // Répondre au message
  bot.sendMessage(msg.chat.id, `J'ai reçu votre message : ${msg.text}`);
  
  // Afficher l'ID du chat
  console.log('ID du chat :', msg.chat.id);
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

// Exposer la fonction pour l'utiliser plus tard
(global as any).sendTestMessage = sendTestMessage;

console.log('Le bot est en cours d\'exécution. Envoyez un message au bot pour obtenir l\'ID du chat.');
console.log('Pour envoyer un message de test, utilisez la fonction sendTestMessage("ID_DU_CHAT")');
console.log('Appuyez sur Ctrl+C pour quitter.');
