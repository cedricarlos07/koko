import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Chemin vers la base de données
const dbPath = path.resolve(process.cwd(), './data/kodjo-english-v2.db');

// Vérifier si le répertoire data existe, sinon le créer
const dataDir = path.resolve(process.cwd(), './data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialiser la connexion à la base de données
const db = new Database(dbPath);

// Fonction pour initialiser la base de données d'automatisation
async function initAutomationDb() {
  console.log('Initialisation de la base de données d\'automatisation...');
  console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

  try {
    // Créer la table des logs d'automatisation si elle n'existe pas
    db.exec(`
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

    console.log('Table automation_logs créée ou déjà existante.');

    // Vérifier si la table system_settings existe
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='system_settings'
    `).get();

    if (!tableExists) {
      // Créer la table des paramètres système
      db.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);

      console.log('Table system_settings créée.');

      // Insérer les paramètres par défaut
      const now = Date.now();

      const insertStmt = db.prepare(`
        INSERT INTO system_settings (key, value, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Paramètre pour le mode simulation
      insertStmt.run(
        'simulation_mode',
        'true',
        'Active ou désactive le mode simulation pour les automatisations',
        now,
        now
      );

      // Paramètre pour l'heure d'envoi des rappels
      insertStmt.run(
        'reminder_time',
        '06:00',
        'Heure d\'envoi des rappels de cours (format HH:MM en GMT)',
        now,
        now
      );

      // Paramètre pour le jour d'importation
      insertStmt.run(
        'import_day',
        'sunday',
        'Jour de la semaine pour l\'importation automatique des cours',
        now,
        now
      );

      // Paramètre pour l'heure d'importation
      insertStmt.run(
        'import_time',
        '01:00',
        'Heure d\'importation automatique des cours (format HH:MM en GMT)',
        now,
        now
      );

      console.log('Paramètres système par défaut insérés.');
    } else {
      console.log('Table system_settings déjà existante.');
    }

    console.log('Initialisation de la base de données d\'automatisation terminée avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données d\'automatisation:', error);
    throw error;
  }
}

// Exécuter l'initialisation
initAutomationDb().catch(error => {
  console.error('Erreur lors de l\'initialisation de la base de données d\'automatisation:', error);
  process.exit(1);
});
