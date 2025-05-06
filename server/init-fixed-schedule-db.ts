import { db, sqlite } from './db';
import * as schema from '../shared/schema-fixed-schedule';

// Fonction pour initialiser les tables pour le planning fixe
async function initializeFixedScheduleDB() {
  console.log('Initialisation des tables pour le planning fixe...');

  try {
    // Table des cours planifiés (planning fixe)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS fixed_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name TEXT NOT NULL,
        level TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        telegram_group TEXT NOT NULL,
        zoom_host_email TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Table des logs d'automatisation
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        details TEXT,
        fixed_schedule_id INTEGER,
        created_at INTEGER NOT NULL
      )
    `);

    // Table des réunions Zoom générées
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS zoom_meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixed_schedule_id INTEGER NOT NULL,
        zoom_meeting_id TEXT NOT NULL,
        zoom_meeting_url TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (fixed_schedule_id) REFERENCES fixed_schedules (id)
      )
    `);

    // Table des configurations système
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Insérer les paramètres système par défaut
    const defaultSettings = [
      {
        key: 'simulation_mode',
        value: 'true',
        description: 'Active ou désactive le mode simulation (true/false)',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        key: 'reminder_minutes_before',
        value: '30',
        description: 'Nombre de minutes avant le cours pour envoyer un rappel',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        key: 'timezone',
        value: 'GMT',
        description: 'Fuseau horaire utilisé pour les cours',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    for (const setting of defaultSettings) {
      const existingSetting = db.select().from(schema.systemSettings)
        .where(schema.systemSettings.key == setting.key)
        .all();

      if (existingSetting.length === 0) {
        db.insert(schema.systemSettings).values(setting).run();
        console.log(`Paramètre système créé: ${setting.key}`);
      } else {
        console.log(`Paramètre système existant: ${setting.key}`);
      }
    }

    console.log('Initialisation des tables pour le planning fixe terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des tables pour le planning fixe:', error);
    throw error;
  }
}

// Exécuter l'initialisation
initializeFixedScheduleDB().then(() => {
  console.log('Script d\'initialisation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'initialisation:', error);
});
