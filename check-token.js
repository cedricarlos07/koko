import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Récupérer le token Telegram depuis les variables d'environnement
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';

console.log('Token Telegram :', telegramToken);

if (!telegramToken) {
  console.error('TELEGRAM_BOT_TOKEN non défini. Veuillez définir cette variable d\'environnement.');
  process.exit(1);
}

console.log('Le token est correctement chargé !');
