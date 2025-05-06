import { createTelegramTables } from './migrations/create-telegram-tables';
import { createDynamicScheduleTable } from './migrations/create-dynamic-schedule-table';

// Fonction pour exécuter toutes les migrations
async function runMigrations() {
  console.log('Exécution des migrations...');

  // Exécuter les migrations dans l'ordre
  await createTelegramTables();
  await createDynamicScheduleTable();

  console.log('Toutes les migrations ont été exécutées avec succès');
}

// Pour ESM, on exécute directement la fonction
runMigrations()
  .then(() => {
    console.log('Migrations terminées avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors des migrations:', error);
    process.exit(1);
  });
