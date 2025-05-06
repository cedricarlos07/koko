-- Créer la table telegram_user_badges si elle n'existe pas
CREATE TABLE IF NOT EXISTS telegram_user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_group_id TEXT NOT NULL,
  telegram_user_id INTEGER NOT NULL,
  badge TEXT NOT NULL,
  assigned_at INTEGER NOT NULL
);

-- Créer la table scheduled_messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_group_id TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_time INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Créer la table telegram_group_stats si elle n'existe pas
CREATE TABLE IF NOT EXISTS telegram_group_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_group_id TEXT NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_activity INTEGER,
  last_updated INTEGER
);
