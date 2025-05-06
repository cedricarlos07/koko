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

// Créer les tables si elles n'existent pas
db.exec(`
  -- Table des étudiants Telegram
  CREATE TABLE IF NOT EXISTS telegram_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_user_id TEXT NOT NULL,
    telegram_username TEXT,
    telegram_first_name TEXT,
    telegram_last_name TEXT,
    telegram_group_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_telegram_students_telegram_user_id ON telegram_students(telegram_user_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_students_telegram_group_id ON telegram_students(telegram_group_id);
  
  -- Table des statistiques de participation des étudiants
  CREATE TABLE IF NOT EXISTS telegram_participation_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_student_id INTEGER NOT NULL,
    telegram_group_id TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    reaction_count INTEGER NOT NULL,
    media_count INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (telegram_student_id) REFERENCES telegram_students(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_telegram_participation_stats_telegram_student_id ON telegram_participation_stats(telegram_student_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_participation_stats_telegram_group_id ON telegram_participation_stats(telegram_group_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_participation_stats_period ON telegram_participation_stats(period_start, period_end);
  
  -- Table des badges
  CREATE TABLE IF NOT EXISTS telegram_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  
  -- Table des badges attribués aux étudiants
  CREATE TABLE IF NOT EXISTS telegram_student_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_student_id INTEGER NOT NULL,
    telegram_badge_id INTEGER NOT NULL,
    telegram_group_id TEXT NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    awarded_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (telegram_student_id) REFERENCES telegram_students(id),
    FOREIGN KEY (telegram_badge_id) REFERENCES telegram_badges(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_telegram_student_badges_telegram_student_id ON telegram_student_badges(telegram_student_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_student_badges_telegram_badge_id ON telegram_student_badges(telegram_badge_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_student_badges_telegram_group_id ON telegram_student_badges(telegram_group_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_student_badges_period ON telegram_student_badges(period_start, period_end);
`);

// Insérer des badges par défaut s'ils n'existent pas déjà
const badges = [
  {
    name: 'Participation Star',
    description: 'Attribué à l\'étudiant qui a le plus participé dans le groupe Telegram durant la période',
    icon: 'star',
    color: 'gold'
  },
  {
    name: 'Media Master',
    description: 'Attribué à l\'étudiant qui a partagé le plus de médias dans le groupe Telegram durant la période',
    icon: 'image',
    color: 'blue'
  },
  {
    name: 'Reaction King',
    description: 'Attribué à l\'étudiant qui a reçu le plus de réactions dans le groupe Telegram durant la période',
    icon: 'thumbs-up',
    color: 'green'
  },
  {
    name: 'Consistent Contributor',
    description: 'Attribué à l\'étudiant qui a participé de manière constante dans le groupe Telegram durant la période',
    icon: 'calendar',
    color: 'purple'
  },
  {
    name: 'Question Master',
    description: 'Attribué à l\'étudiant qui a posé le plus de questions dans le groupe Telegram durant la période',
    icon: 'help-circle',
    color: 'orange'
  }
];

// Préparer la requête d'insertion
const insertBadgeStmt = db.prepare(`
  INSERT INTO telegram_badges (name, description, icon, color, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Vérifier si des badges existent déjà
const badgeCount = db.prepare('SELECT COUNT(*) as count FROM telegram_badges').get().count;

if (badgeCount === 0) {
  // Insérer les badges par défaut
  const now = Date.now();
  badges.forEach(badge => {
    insertBadgeStmt.run(
      badge.name,
      badge.description,
      badge.icon,
      badge.color,
      now,
      now
    );
  });
  console.log(`${badges.length} badges par défaut créés avec succès`);
} else {
  console.log(`${badgeCount} badges existent déjà dans la base de données`);
}

console.log('Tables des badges et des statistiques de participation créées avec succès');

// Fermer la connexion à la base de données
db.close();
