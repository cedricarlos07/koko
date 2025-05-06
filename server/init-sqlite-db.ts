import { db, sqlite } from './db-sqlite';
import * as schema from '../shared/schema-sqlite';
import { UserRole } from '../shared/schema-sqlite';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

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
        role TEXT NOT NULL DEFAULT 'student',
        avatar_url TEXT,
        telegram_username TEXT,
        telegram_chat_id TEXT,
        points INTEGER NOT NULL DEFAULT 0,
        last_login INTEGER,
        created_at INTEGER NOT NULL
      )
    `);

    // Cours
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        start_date INTEGER NOT NULL,
        end_date INTEGER NOT NULL,
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
        title TEXT NOT NULL,
        description TEXT,
        scheduled_date INTEGER NOT NULL,
        scheduled_time TEXT NOT NULL,
        time_zone TEXT DEFAULT 'GMT',
        duration INTEGER NOT NULL DEFAULT 60,
        professor_id INTEGER,
        zoom_meeting_id TEXT,
        zoom_meeting_url TEXT,
        recording_url TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (course_id) REFERENCES courses (id),
        FOREIGN KEY (professor_id) REFERENCES users (id)
      )
    `);

    // Inscriptions
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        enrollment_date INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (course_id) REFERENCES courses (id)
      )
    `);

    // Présences
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        join_time INTEGER,
        leave_time INTEGER,
        duration INTEGER,
        notes TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (session_id) REFERENCES sessions (id)
      )
    `);

    // Activité Telegram
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS telegram_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        message_type TEXT NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 1,
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
        image_url TEXT,
        criteria TEXT NOT NULL,
        points_value INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);

    // Badges utilisateurs
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        badge_id INTEGER NOT NULL,
        awarded_date INTEGER NOT NULL,
        awarded_by INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (badge_id) REFERENCES badges (id),
        FOREIGN KEY (awarded_by) REFERENCES users (id)
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
        is_active INTEGER NOT NULL DEFAULT 1,
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

    // Table de session pour express-session
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      )
    `);

    console.log('Tables created successfully');

    // Vérifier si l'utilisateur admin existe déjà
    const adminExists = db.select().from(schema.users).where({ username: 'admin' }).all();
    
    if (adminExists.length === 0) {
      // Créer un utilisateur admin par défaut
      const hashedPassword = await hashPassword('password');
      
      db.insert(schema.users).values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@kodjo.english',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        points: 100,
        createdAt: Date.now()
      }).run();
      
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Créer un template de message pour les rappels de cours
    const templateExists = db.select().from(schema.templateMessages).where({ type: 'course-reminder' }).all();
    
    if (templateExists.length === 0) {
      db.insert(schema.templateMessages).values({
        name: 'Rappel de cours matinal',
        type: 'course-reminder',
        content: `📚 *Cours du jour : {course}*
👨‍🏫 Prof : {instructor}
🕒 Heure : {time}
🔗 [👉 Lien Zoom ici]({zoom_link})

Bonne journée et soyez ponctuel·les ! 🎯`,
        createdAt: Date.now()
      }).run();
      
      console.log('Course reminder template created successfully');
    } else {
      console.log('Course reminder template already exists');
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
