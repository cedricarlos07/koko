-- Créer la table telegram_messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS telegram_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_group_id TEXT NOT NULL,
  telegram_user_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  message_text TEXT,
  timestamp INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
