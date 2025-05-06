const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chemin vers la base de données
const dbPath = path.join(__dirname, '..', 'data', 'kodjo-english-v2.db');

// Vérifier si le fichier de base de données existe
if (!fs.existsSync(dbPath)) {
  console.error(`La base de données n'existe pas: ${dbPath}`);
  process.exit(1);
}

// Créer une connexion à la base de données
const db = new Database(dbPath);

// Activer les contraintes de clé étrangère
db.pragma('foreign_keys = ON');

// Fonction principale pour insérer des données de test
function insertTestTelegramData() {
  try {
    console.log('Insertion de données de test pour les groupes Telegram...');

    // Commencer une transaction
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // Créer une table temporaire pour les données de test
      db.exec(`
        CREATE TABLE IF NOT EXISTS telegram_test_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          course_id INTEGER NOT NULL,
          course_name TEXT NOT NULL,
          level TEXT NOT NULL,
          group_name TEXT NOT NULL,
          group_link TEXT NOT NULL,
          member_count INTEGER NOT NULL,
          message_count INTEGER NOT NULL,
          last_activity INTEGER NOT NULL,
          teacher_name TEXT NOT NULL
        )
      `);

      // Supprimer les données existantes
      db.prepare('DELETE FROM telegram_test_groups').run();

      // Insérer des données de test
      const insertStmt = db.prepare(`
        INSERT INTO telegram_test_groups (
          course_id, course_name, level, group_name, group_link,
          member_count, message_count, last_activity, teacher_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = Date.now();
      const testData = [
        {
          courseId: 1,
          courseName: 'Mina Lepsanovic (MW)',
          level: 'abg',
          groupName: '-1001668163742',
          groupLink: 'https://t.me/c/1668163742',
          memberCount: 25,
          messageCount: 150,
          lastActivity: now - 24 * 60 * 60 * 1000,
          teacherName: 'Mina Lepsanovic'
        },
        {
          courseId: 2,
          courseName: 'Maimouna Koffi (MW)',
          level: 'bbg',
          groupName: '-1001159742178',
          groupLink: 'https://t.me/c/1159742178',
          memberCount: 18,
          messageCount: 87,
          lastActivity: now - 2 * 24 * 60 * 60 * 1000,
          teacherName: 'Maimouna Koffi'
        },
        {
          courseId: 3,
          courseName: 'Wissam Eddine (MW)',
          level: 'abg',
          groupName: '-1001200673710',
          groupLink: 'https://t.me/c/1200673710',
          memberCount: 22,
          messageCount: 120,
          lastActivity: now - 3 * 24 * 60 * 60 * 1000,
          teacherName: 'Wissam Eddine'
        },
        {
          courseId: 4,
          courseName: 'Hafida Faraj (MW)',
          level: 'bbg',
          groupName: '-1001674281614',
          groupLink: 'https://t.me/c/1674281614',
          memberCount: 20,
          messageCount: 95,
          lastActivity: now - 4 * 24 * 60 * 60 * 1000,
          teacherName: 'Hafida Faraj'
        },
        {
          courseId: 5,
          courseName: 'Maryam Dannoun (MW)',
          level: 'abg',
          groupName: '-1001183569832',
          groupLink: 'https://t.me/c/1183569832',
          memberCount: 15,
          messageCount: 65,
          lastActivity: now - 5 * 24 * 60 * 60 * 1000,
          teacherName: 'Maryam Dannoun'
        }
      ];

      // Insérer les données de test
      for (const data of testData) {
        insertStmt.run(
          data.courseId,
          data.courseName,
          data.level,
          data.groupName,
          data.groupLink,
          data.memberCount,
          data.messageCount,
          data.lastActivity,
          data.teacherName
        );
      }

      // Créer une vue pour les données de test
      db.exec(`
        CREATE VIEW IF NOT EXISTS telegram_groups_view AS
        SELECT
          id,
          course_id as courseId,
          course_name as courseName,
          level,
          group_name as groupName,
          group_link as groupLink,
          member_count as memberCount,
          message_count as messageCount,
          last_activity as lastActivity,
          teacher_name as teacherName
        FROM telegram_test_groups
      `);

      // Valider la transaction
      db.prepare('COMMIT').run();

      console.log(`${testData.length} groupes Telegram de test insérés avec succès`);

      return {
        success: true,
        count: testData.length
      };
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données de test:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Exécuter la fonction d'insertion
const result = insertTestTelegramData();
if (result && result.success) {
  console.log('Insertion réussie!');
} else {
  console.error('Échec de l\'insertion:', result ? result.error : 'Erreur inconnue');
}
