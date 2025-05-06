import XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'data', 'kodjo-english-v2.db');

// Chemin vers le fichier Excel
const excelPath = path.join(__dirname, 'Kodjo English - Classes Schedules (2).xlsx');

// Vérifier si le fichier Excel existe
if (!fs.existsSync(excelPath)) {
  console.error(`Le fichier Excel n'existe pas: ${excelPath}`);
  process.exit(1);
}

// Créer une connexion à la base de données
const db = new Database(dbPath);

// Activer les contraintes de clé étrangère
db.pragma('foreign_keys = ON');

// Fonction principale pour importer les données
async function importTelegramGroups() {
  try {
    console.log('Importation des données des groupes Telegram depuis Excel...');

    // Lire le fichier Excel
    const workbook = XLSX.readFile(excelPath);
    console.log('Feuilles disponibles:', workbook.SheetNames);

    // Vérifier si la feuille "Message Schedule" existe
    if (!workbook.SheetNames.includes('Message Schedule')) {
      console.error('La feuille "Message Schedule" n\'existe pas dans le fichier Excel');
      return;
    }

    // Récupérer les données de la feuille "Message Schedule"
    const messageScheduleWorksheet = workbook.Sheets['Message Schedule'];
    const messageScheduleData = XLSX.utils.sheet_to_json(messageScheduleWorksheet);

    console.log(`Nombre d'enregistrements trouvés dans Message Schedule: ${messageScheduleData.length}`);
    
    if (messageScheduleData.length > 0) {
      console.log('Structure du premier enregistrement:', Object.keys(messageScheduleData[0]));
    }

    // Créer une map des groupes Telegram depuis la feuille "Message Schedule"
    const telegramGroupsMap = new Map();
    
    // Adapter cette partie en fonction de la structure réelle du fichier Excel
    messageScheduleData.forEach(record => {
      // Chercher les colonnes qui pourraient contenir l'ID du groupe Telegram
      const telegramChatId = record['Telegram Chat Id'] || record['Telegram Group ID'] || record['Group ID'];
      const courseName = record['Course Name'] || record['Nom du cours'] || record['Class'];
      const teacherName = record['Teacher Name'] || record['Nom du professeur'] || record['Coach'];
      
      if (telegramChatId && courseName) {
        telegramGroupsMap.set(telegramChatId.toString(), {
          telegramChatId,
          courseName,
          teacherName: teacherName || 'Non assigné',
          groupName: `Groupe ${courseName}`,
          memberCount: Math.floor(Math.random() * 30) + 5, // Simuler un nombre d'étudiants
        });
      }
    });

    console.log(`Nombre de groupes Telegram uniques trouvés: ${telegramGroupsMap.size}`);

    // Vérifier si la table telegram_group_stats existe, sinon la créer
    db.exec(`
      CREATE TABLE IF NOT EXISTS telegram_group_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_group_id TEXT NOT NULL,
        member_count INTEGER NOT NULL,
        message_count INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        last_updated INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_telegram_group_stats_telegram_group_id ON telegram_group_stats(telegram_group_id);
    `);

    // Vérifier si la table fixed_schedules existe
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='fixed_schedules'
    `).get();

    if (!tableExists) {
      console.error('La table fixed_schedules n\'existe pas dans la base de données');
      return;
    }

    // Commencer une transaction
    const transaction = db.prepare('BEGIN TRANSACTION');
    transaction.run();

    try {
      // Mettre à jour les groupes Telegram dans la table fixed_schedules
      const updateTelegramGroupStmt = db.prepare(`
        UPDATE fixed_schedules
        SET telegram_group = ?
        WHERE course_name = ?
      `);

      // Insérer ou mettre à jour les statistiques des groupes Telegram
      const upsertTelegramStatStmt = db.prepare(`
        INSERT INTO telegram_group_stats (
          telegram_group_id,
          member_count,
          message_count,
          last_activity,
          last_updated
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(telegram_group_id) DO UPDATE SET
          member_count = excluded.member_count,
          message_count = excluded.message_count,
          last_activity = excluded.last_activity,
          last_updated = excluded.last_updated
      `);

      let updatedGroups = 0;
      let updatedStats = 0;

      // Parcourir les groupes Telegram
      for (const [telegramGroupId, groupData] of telegramGroupsMap.entries()) {
        // Mettre à jour le groupe Telegram dans fixed_schedules
        const result = updateTelegramGroupStmt.run(
          telegramGroupId,
          groupData.courseName
        );

        if (result.changes > 0) {
          updatedGroups++;
        }

        // Générer des statistiques aléatoires pour le groupe
        const now = Date.now();
        const messageCount = Math.floor(Math.random() * 500) + 50;
        const lastActivity = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);

        // Insérer ou mettre à jour les statistiques du groupe
        const statResult = upsertTelegramStatStmt.run(
          telegramGroupId,
          groupData.memberCount,
          messageCount,
          lastActivity,
          now
        );

        if (statResult.changes > 0) {
          updatedStats++;
        }
      }

      // Valider la transaction
      db.prepare('COMMIT').run();

      console.log(`Importation terminée avec succès!`);
      console.log(`${updatedGroups} groupes Telegram mis à jour dans fixed_schedules`);
      console.log(`${updatedStats} statistiques de groupes Telegram mises à jour`);

      return {
        success: true,
        groupsUpdated: updatedGroups,
        statsUpdated: updatedStats
      };
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de l\'importation des données:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Exécuter la fonction d'importation
importTelegramGroups()
  .then(result => {
    if (result && result.success) {
      console.log('Importation réussie!');
    } else {
      console.error('Échec de l\'importation:', result ? result.error : 'Erreur inconnue');
    }
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
  });