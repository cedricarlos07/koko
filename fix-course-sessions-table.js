import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chemin vers le fichier de base de données SQLite
const dbPath = process.env.DATABASE_PATH || './data/kodjo-english-v2.db';
console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

// Vérifier si le fichier existe
if (!fs.existsSync(dbPath)) {
  console.error(`La base de données ${dbPath} n'existe pas.`);
  process.exit(1);
}

// Créer une connexion à la base de données SQLite
const db = new Database(dbPath);
console.log('Connexion à la base de données établie');

try {
  // Vérifier si la table course_sessions existe déjà
  const courseSessionsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='course_sessions'").get();
  
  if (courseSessionsExists) {
    console.log('La table course_sessions existe déjà');
  } else {
    console.log('La table course_sessions n\'existe pas, création...');
    
    // Créer la table course_sessions
    db.prepare(`
      CREATE TABLE course_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        session_number INTEGER NOT NULL,
        professor_id INTEGER,
        coach_id INTEGER,
        scheduled_date INTEGER NOT NULL,
        scheduled_time TEXT NOT NULL,
        time_zone TEXT DEFAULT 'GMT',
        zoom_meeting_id TEXT,
        zoom_meeting_url TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses (id),
        FOREIGN KEY (professor_id) REFERENCES users (id),
        FOREIGN KEY (coach_id) REFERENCES users (id)
      )
    `).run();
    console.log('Table course_sessions créée');
  }
  
  // Mettre à jour les références à la table sessions dans d'autres tables
  // 1. Mettre à jour la table attendance
  const attendanceTableInfo = db.prepare("PRAGMA table_info(attendance)").all();
  const hasSessionIdColumn = attendanceTableInfo.some(col => col.name === 'session_id');
  
  if (hasSessionIdColumn) {
    console.log('Mise à jour des références dans la table attendance...');
    
    // Créer une table temporaire
    db.prepare(`
      CREATE TABLE attendance_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        join_time INTEGER,
        leave_time INTEGER,
        duration INTEGER,
        present INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES course_sessions (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `).run();
    
    // Copier les données
    db.prepare(`
      INSERT INTO attendance_temp (id, session_id, user_id, join_time, leave_time, duration, present, created_at)
      SELECT id, session_id, user_id, join_time, leave_time, duration, present, created_at FROM attendance
    `).run();
    
    // Supprimer l'ancienne table
    db.prepare("DROP TABLE attendance").run();
    
    // Renommer la table temporaire
    db.prepare("ALTER TABLE attendance_temp RENAME TO attendance").run();
    
    console.log('Table attendance mise à jour');
  }
  
  // 2. Mettre à jour la table message_logs
  const messageLogsTableInfo = db.prepare("PRAGMA table_info(message_logs)").all();
  const hasSessionIdColumnInMessageLogs = messageLogsTableInfo.some(col => col.name === 'session_id');
  
  if (hasSessionIdColumnInMessageLogs) {
    console.log('Mise à jour des références dans la table message_logs...');
    
    // Créer une table temporaire
    db.prepare(`
      CREATE TABLE message_logs_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER NOT NULL,
        time TEXT NOT NULL,
        course_id INTEGER NOT NULL,
        session_id INTEGER,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        telegram_group_id TEXT,
        zoom_link TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses (id),
        FOREIGN KEY (session_id) REFERENCES course_sessions (id)
      )
    `).run();
    
    // Copier les données
    db.prepare(`
      INSERT INTO message_logs_temp (id, date, time, course_id, session_id, message, status, telegram_group_id, zoom_link, created_at)
      SELECT id, date, time, course_id, session_id, message, status, telegram_group_id, zoom_link, created_at FROM message_logs
    `).run();
    
    // Supprimer l'ancienne table
    db.prepare("DROP TABLE message_logs").run();
    
    // Renommer la table temporaire
    db.prepare("ALTER TABLE message_logs_temp RENAME TO message_logs").run();
    
    console.log('Table message_logs mise à jour');
  }
  
  // Mettre à jour le schéma dans le code
  console.log('Opération terminée avec succès');
  console.log('IMPORTANT: Vous devez maintenant mettre à jour le fichier shared/schema-sqlite.ts pour renommer la table "sessions" en "course_sessions"');
} catch (error) {
  console.error('Erreur lors de la correction des tables:', error);
} finally {
  // Fermer la connexion
  db.close();
  console.log('Connexion à la base de données fermée');
}
