import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Chemin vers la base de données
const dbPath = path.join(dataDir, 'kodjo-english-v2.db');

// Créer une connexion à la base de données
const db = new Database(dbPath);

// Activer les contraintes de clé étrangère
db.pragma('foreign_keys = ON');

// Créer la table des statistiques des groupes Telegram si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS telegram_group_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_group_id TEXT NOT NULL,
    member_count INTEGER NOT NULL,
    message_count INTEGER NOT NULL,
    last_activity INTEGER NOT NULL,
    last_updated INTEGER NOT NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_telegram_group_stats_telegram_group_id ON telegram_group_stats(telegram_group_id);
`);

console.log('Table des statistiques des groupes Telegram créée avec succès');

// Fermer la connexion à la base de données
db.close();
