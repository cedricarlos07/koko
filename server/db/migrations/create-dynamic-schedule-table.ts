import { db } from '../../db';
import * as schema from '../../../shared/schema-fixed-schedule';

// Fonction pour créer la table dynamic_schedule
export async function createDynamicScheduleTable() {
  console.log('Création de la table dynamic_schedule...');

  // Vérifier si la table dynamic_schedule existe
  const tableExists = await db.select({ count: db.sql`count(*)` })
    .from(db.sql`sqlite_master`)
    .where(db.sql`type = 'table' AND name = 'dynamic_schedule'`)
    .get();

  if (tableExists.count === 0) {
    console.log('Création de la table dynamic_schedule...');

    // Créer la table dynamic_schedule
    await db.run(db.sql`
      CREATE TABLE IF NOT EXISTS dynamic_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixed_schedule_id INTEGER NOT NULL,
        course_name TEXT NOT NULL,
        level TEXT NOT NULL,
        teacher_name TEXT NOT NULL,
        scheduled_date INTEGER NOT NULL,
        scheduled_time TEXT NOT NULL,
        duration INTEGER NOT NULL,
        zoom_meeting_id TEXT,
        zoom_meeting_url TEXT,
        status TEXT DEFAULT 'pending',
        telegram_group TEXT,
        created_at INTEGER NOT NULL
      )
    `);
  }

  console.log('Table dynamic_schedule créée avec succès');
}
