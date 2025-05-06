import { db } from '../../db';
import * as schema from '../../../shared/schema-fixed-schedule';

// Exporter la fonction pour qu'elle soit accessible depuis d'autres fichiers

// Fonction pour créer les tables Telegram
export async function createTelegramTables() {
  console.log('Création des tables Telegram...');

  // Vérifier si la table telegram_user_badges existe
  const tableExists = await db.select({ count: db.sql`count(*)` })
    .from(db.sql`sqlite_master`)
    .where(db.sql`type = 'table' AND name = 'telegram_user_badges'`)
    .get();

  if (tableExists.count === 0) {
    console.log('Création de la table telegram_user_badges...');

    // Créer la table telegram_user_badges
    await db.run(db.sql`
      CREATE TABLE IF NOT EXISTS telegram_user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_group_id TEXT NOT NULL,
        telegram_user_id INTEGER NOT NULL,
        badge TEXT NOT NULL,
        assigned_at INTEGER NOT NULL
      )
    `);
  }

  // Vérifier si la table scheduled_messages existe
  const scheduledMessagesExists = await db.select({ count: db.sql`count(*)` })
    .from(db.sql`sqlite_master`)
    .where(db.sql`type = 'table' AND name = 'scheduled_messages'`)
    .get();

  if (scheduledMessagesExists.count === 0) {
    console.log('Création de la table scheduled_messages...');

    // Créer la table scheduled_messages
    await db.run(db.sql`
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_group_id TEXT NOT NULL,
        message TEXT NOT NULL,
        scheduled_time INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `);
  }

  // Vérifier si la table telegram_group_stats existe
  const telegramGroupStatsExists = await db.select({ count: db.sql`count(*)` })
    .from(db.sql`sqlite_master`)
    .where(db.sql`type = 'table' AND name = 'telegram_group_stats'`)
    .get();

  if (telegramGroupStatsExists.count === 0) {
    console.log('Création de la table telegram_group_stats...');

    // Créer la table telegram_group_stats
    await db.run(db.sql`
      CREATE TABLE IF NOT EXISTS telegram_group_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_group_id TEXT NOT NULL,
        member_count INTEGER NOT NULL DEFAULT 0,
        message_count INTEGER NOT NULL DEFAULT 0,
        last_activity INTEGER,
        last_updated INTEGER
      )
    `);
  }

  console.log('Tables Telegram créées avec succès');
}

// Pour ESM, on ne peut pas utiliser require.main === module
// La fonction est déjà exportée au début du fichier
