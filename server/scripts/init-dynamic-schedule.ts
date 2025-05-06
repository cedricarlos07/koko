import { db, sqlite } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';

async function initDynamicScheduleTable() {
  console.log('Vérification de la table dynamic_schedule...');
  
  try {
    // Vérifier si la table existe
    const tableExists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dynamic_schedule'").get();
    
    if (!tableExists) {
      console.log('La table dynamic_schedule n\'existe pas. Création de la table...');
      
      // Créer la table
      sqlite.exec(`
        CREATE TABLE dynamic_schedule (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fixed_schedule_id INTEGER NOT NULL,
          course_name TEXT NOT NULL,
          level TEXT NOT NULL,
          teacher_name TEXT NOT NULL,
          scheduled_date INTEGER NOT NULL,
          scheduled_time TEXT NOT NULL,
          duration INTEGER NOT NULL,
          zoom_meeting_id TEXT,
          zoom_meeting_url TEXT,
          status TEXT DEFAULT 'pending',
          telegram_group TEXT,
          created_at INTEGER NOT NULL
        )
      `);
      
      console.log('Table dynamic_schedule créée avec succès.');
    } else {
      console.log('La table dynamic_schedule existe déjà.');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la table dynamic_schedule:', error);
  }
}

// Exécuter la fonction
initDynamicScheduleTable()
  .then(() => {
    console.log('Initialisation terminée.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
  });
