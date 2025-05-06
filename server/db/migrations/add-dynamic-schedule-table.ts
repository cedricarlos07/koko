import { Database } from 'better-sqlite3';

export function addDynamicScheduleTable(db: Database) {
  // Vérifier si la table existe déjà
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='dynamic_schedule'
  `).get();

  if (tableExists) {
    console.log('La table dynamic_schedule existe déjà');
    return;
  }

  // Créer la table dynamic_schedule
  db.prepare(`
    CREATE TABLE dynamic_schedule (
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
  `).run();

  console.log('Table dynamic_schedule créée avec succès');
}
