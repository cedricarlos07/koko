import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Assurez-vous que le répertoire de la base de données existe
const dbDir = path.dirname(process.env.DATABASE_PATH || './data/kodjo-english.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Chemin vers le fichier de base de données SQLite
const dbPath = process.env.DATABASE_PATH || './data/kodjo-english.db';
console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

// Créer une connexion à la base de données SQLite
const sqlite = new Database(dbPath);

// Créer une instance de Drizzle
export const db = drizzle(sqlite);

// Exporter l'instance SQLite pour une utilisation dans d'autres parties de l'application
export { sqlite };
