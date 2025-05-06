import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'data', 'kodjo-english-v2.db');

// Créer une connexion à la base de données
const db = new Database(dbPath);

// Vérifier si le paramètre simulation_mode existe
const simulationMode = db.prepare('SELECT * FROM system_settings WHERE key = ?').get('simulation_mode');

if (simulationMode) {
  // Mettre à jour le paramètre
  db.prepare('UPDATE system_settings SET value = ?, updated_at = ? WHERE key = ?').run('false', Date.now(), 'simulation_mode');
  console.log('Mode simulation désactivé');
} else {
  // Créer le paramètre
  db.prepare('INSERT INTO system_settings (key, value, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
    'simulation_mode',
    'false',
    'Active ou désactive le mode simulation',
    Date.now(),
    Date.now()
  );
  console.log('Paramètre simulation_mode créé et désactivé');
}

// Fermer la connexion à la base de données
db.close();
