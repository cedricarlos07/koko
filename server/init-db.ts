import { db, sqlite } from './db';
import { UserRole, CourseLevel } from '../shared/schema-sqlite';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function initializeDatabase() {
  console.log('Initializing SQLite database...');

  // Créer les tables
  try {
    // Utilisateurs
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar_url TEXT,
        telegram_username TEXT,
        telegram_chat_id TEXT,
        points INTEGER DEFAULT 0,
        last_login INTEGER,
        created_at INTEGER NOT NULL
      )
    `);

    // Cours
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        level TEXT NOT NULL,
        description TEXT,
        telegram_group_link TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    // Sessions
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
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
    `);

    // Présences
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        join_time INTEGER,
        leave_time INTEGER,
        duration INTEGER,
        present INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Activité Telegram
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS telegram_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        message_type TEXT,
        message_count INTEGER DEFAULT 0,
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (course_id) REFERENCES courses (id)
      )
    `);

    // Badges
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        criteria TEXT NOT NULL,
        icon_name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Badges utilisateurs
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_id INTEGER NOT NULL,
        awarded_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (badge_id) REFERENCES badges (id)
      )
    `);

    // Règles d'automatisation
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        trigger_type TEXT NOT NULL,
        trigger_data TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_data TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        send_time TEXT,
        time_zone TEXT,
        last_sent INTEGER,
        next_send INTEGER,
        created_at INTEGER NOT NULL
      )
    `);

    // Templates de messages
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS template_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Logs d'activité
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Logs de messages
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS message_logs (
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
        FOREIGN KEY (session_id) REFERENCES sessions (id)
      )
    `);

    // Ne pas créer la table de sessions ici, elle sera créée automatiquement par better-sqlite3-session-store

    console.log('Tables created successfully');

    // Vérifier si l'utilisateur admin existe déjà
    const adminExists = sqlite.prepare('SELECT * FROM users WHERE username = ?').get('admin');

    if (!adminExists) {
      // Créer un utilisateur admin par défaut
      const hashedPassword = await hashPassword('password');

      sqlite.prepare(`
        INSERT INTO users (username, password, email, first_name, last_name, role, points, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('admin', hashedPassword, 'admin@kodjo.english', 'Admin', 'User', UserRole.ADMIN, 100, Date.now());

      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Créer un template de message pour les rappels de cours
    const templateExists = sqlite.prepare('SELECT * FROM template_messages WHERE type = ?').get('course-reminder');

    if (!templateExists) {
      sqlite.prepare(`
        INSERT INTO template_messages (name, type, content, created_at)
        VALUES (?, ?, ?, ?)
      `).run(
        'Rappel de cours matinal',
        'course-reminder',
        `📚 *Cours du jour : {course}*
👨‍🏫 Prof : {instructor}
🕒 Heure : {time}
🔗 [👉 Lien Zoom ici]({zoom_link})

Bonne journée et soyez ponctuel·les ! 🎯`,
        Date.now()
      );

      console.log('Course reminder template created successfully');
    } else {
      console.log('Course reminder template already exists');
    }

    // Créer un cours de test si aucun cours n'existe
    const courseExists = sqlite.prepare('SELECT * FROM courses LIMIT 1').get();

    if (!courseExists) {
      const now = Date.now();
      const oneMonthLater = now + 30 * 24 * 60 * 60 * 1000;

      sqlite.prepare(`
        INSERT INTO courses (name, level, description, telegram_group_link, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'Anglais Débutant',
        CourseLevel.BBG,
        'Cours d\'anglais pour débutants',
        '@kodjo_english_test',
        Date.now()
      );

      console.log('Test course created successfully');
    }

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Exécuter l'initialisation
initializeDatabase().then(() => {
  console.log('Database setup complete');
  process.exit(0);
}).catch(error => {
  console.error('Database setup failed:', error);
  process.exit(1);
});
