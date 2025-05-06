import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Fonction principale pour initialiser les statistiques des groupes Telegram
async function initTelegramStats() {
  try {
    console.log('Initialisation des statistiques des groupes Telegram...');

    // Récupérer tous les groupes Telegram uniques
    const telegramGroups = db.prepare(`
      SELECT DISTINCT telegram_group
      FROM fixed_schedules
      WHERE telegram_group IS NOT NULL
    `).all();

    console.log(`Nombre de groupes Telegram trouvés: ${telegramGroups.length}`);

    // Vérifier si la table telegram_group_stats existe
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='telegram_group_stats'
    `).get();

    if (!tableExists) {
      console.log('Création de la table telegram_group_stats...');
      db.exec(`
        CREATE TABLE telegram_group_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_group_id TEXT NOT NULL,
          member_count INTEGER NOT NULL DEFAULT 0,
          message_count INTEGER NOT NULL DEFAULT 0,
          last_activity INTEGER NOT NULL,
          last_updated INTEGER NOT NULL
        )
      `);
    }

    // Commencer une transaction
    const transaction = db.prepare('BEGIN TRANSACTION');
    transaction.run();

    try {
      // Vérifier si la table est vide
      const statsCount = db.prepare('SELECT COUNT(*) as count FROM telegram_group_stats').get().count;

      // Supprimer toutes les statistiques existantes si nécessaire
      if (statsCount > 0) {
        console.log(`Suppression des ${statsCount} statistiques existantes...`);
        db.prepare('DELETE FROM telegram_group_stats').run();
      }

      // Insérer les statistiques pour chaque groupe
      const insertStmt = db.prepare(`
        INSERT INTO telegram_group_stats (telegram_group_id, member_count, message_count, last_activity, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `);

      const now = Date.now();
      let insertedCount = 0;

      for (const group of telegramGroups) {
        const telegramGroupId = group.telegram_group;

        // Générer des statistiques aléatoires pour la simulation
        const memberCount = Math.floor(Math.random() * 30) + 5;
        const messageCount = Math.floor(Math.random() * 100) + 10;
        const lastActivity = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);

        // Insérer les statistiques
        insertStmt.run(
          telegramGroupId,
          memberCount,
          messageCount,
          lastActivity,
          now
        );

        insertedCount++;
      }

      // Valider la transaction
      db.prepare('COMMIT').run();

      console.log(`${insertedCount} statistiques de groupes Telegram initialisées avec succès`);

      return {
        success: true,
        count: insertedCount
      };
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des statistiques des groupes Telegram:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Exécuter la fonction d'initialisation
initTelegramStats()
  .then(result => {
    if (result && result.success) {
      console.log('Initialisation réussie!');
    } else {
      console.error('Échec de l\'initialisation:', result ? result.error : 'Erreur inconnue');
    }
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
  });
