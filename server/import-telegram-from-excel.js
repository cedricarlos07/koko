import XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

console.log('Démarrage du script d\'importation...');

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, '..', 'data', 'kodjo-english-v2.db');

// Chemin vers le fichier Excel
const excelPath = path.join(__dirname, '..', 'Kodjo English - Classes Schedules (2).xlsx');

// Vérifier si les fichiers existent
if (!fs.existsSync(dbPath)) {
  console.error(`La base de données n'existe pas: ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(excelPath)) {
  console.error(`Le fichier Excel n'existe pas: ${excelPath}`);
  process.exit(1);
}

// Créer une connexion à la base de données
const db = new Database(dbPath);

// Activer les contraintes de clé étrangère
db.pragma('foreign_keys = ON');

// Fonction principale pour importer les données des groupes Telegram
function importTelegramFromExcel() {
  try {
    console.log('Importation des données des groupes Telegram depuis Excel...');

    // Lire le fichier Excel
    const workbook = XLSX.readFile(excelPath);

    // Vérifier si les feuilles nécessaires existent
    if (!workbook.SheetNames.includes('Fix Schedule') || !workbook.SheetNames.includes('Message Schedule')) {
      console.error('Les feuilles "Fix Schedule" ou "Message Schedule" n\'existent pas dans le fichier Excel');
      return { success: false, error: 'Feuilles manquantes dans le fichier Excel' };
    }

    // Récupérer les données des feuilles
    const fixScheduleData = XLSX.utils.sheet_to_json(workbook.Sheets['Fix Schedule']);
    const messageScheduleData = XLSX.utils.sheet_to_json(workbook.Sheets['Message Schedule']);

    console.log(`Nombre de cours planifiés trouvés: ${fixScheduleData.length}`);
    console.log(`Nombre de messages planifiés trouvés: ${messageScheduleData.length}`);

    // Créer une table temporaire pour les données des groupes Telegram
    db.exec(`
      CREATE TABLE IF NOT EXISTS telegram_groups_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER,
        course_name TEXT NOT NULL,
        level TEXT,
        group_name TEXT NOT NULL,
        group_link TEXT,
        member_count INTEGER DEFAULT 0,
        message_count INTEGER DEFAULT 0,
        last_activity INTEGER,
        teacher_name TEXT NOT NULL,
        day TEXT,
        time_gmt TEXT,
        time_france TEXT
      )
    `);

    // Commencer une transaction
    db.prepare('BEGIN TRANSACTION').run();

    try {
      // Supprimer les données existantes
      db.prepare('DELETE FROM telegram_groups_temp').run();

      // Préparer la requête d'insertion
      const insertStmt = db.prepare(`
        INSERT INTO telegram_groups_temp (
          course_name, level, group_name, group_link, teacher_name, day, time_gmt, time_france
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Insérer les données des groupes Telegram
      let insertedCount = 0;
      const processedGroups = new Set();

      for (const schedule of fixScheduleData) {
        if (schedule['TELEGRAM GROUP ID'] && schedule['Salma Choufani'] && schedule['Salma Choufani - ABG - SS - 2:00pm']) {
          const telegramGroupId = schedule['TELEGRAM GROUP ID'].toString();

          // Éviter les doublons
          if (processedGroups.has(telegramGroupId)) {
            continue;
          }

          processedGroups.add(telegramGroupId);

          // Extraire le niveau du cours
          const courseName = schedule['Salma Choufani - ABG - SS - 2:00pm'];
          let level = 'bbg'; // Niveau par défaut

          if (courseName.includes('BBG')) level = 'bbg';
          if (courseName.includes('ABG')) level = 'abg';
          if (courseName.includes('IG')) level = 'ig';
          if (courseName.includes('ZBG')) level = 'zbg';
          if (courseName.includes('IAG')) level = 'iag';

          // Générer un lien Telegram
          const groupLink = telegramGroupId.startsWith('@')
            ? `https://t.me/${telegramGroupId.replace('@', '')}`
            : `https://t.me/c/${telegramGroupId.replace('-100', '')}`;

          // Insérer les données
          insertStmt.run(
            courseName,
            level,
            telegramGroupId,
            groupLink,
            schedule['Salma Choufani'],
            schedule['DAY'],
            schedule['TIME (GMT) '],
            schedule['TIME (France)']
          );

          insertedCount++;
        }
      }

      // Mettre à jour les statistiques des groupes
      const now = Date.now();
      const updateStatsStmt = db.prepare(`
        UPDATE telegram_groups_temp
        SET member_count = ?, message_count = ?, last_activity = ?
        WHERE group_name = ?
      `);

      // Générer des statistiques aléatoires pour chaque groupe
      for (const group of processedGroups) {
        const memberCount = Math.floor(Math.random() * 30) + 5;
        const messageCount = Math.floor(Math.random() * 100) + 10;
        const lastActivity = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);

        updateStatsStmt.run(memberCount, messageCount, lastActivity, group);
      }

      // Créer une vue pour les données des groupes Telegram
      db.exec(`
        DROP VIEW IF EXISTS telegram_groups_view;
        CREATE VIEW telegram_groups_view AS
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
          teacher_name as teacherName,
          day,
          time_gmt as timeGmt,
          time_france as timeFrance
        FROM telegram_groups_temp
      `);

      // Valider la transaction
      db.prepare('COMMIT').run();

      console.log(`${insertedCount} groupes Telegram importés avec succès`);

      // Afficher quelques exemples de groupes importés
      const importedGroups = db.prepare('SELECT * FROM telegram_groups_temp LIMIT 5').all();
      console.log('Exemples de groupes importés:');
      importedGroups.forEach(group => {
        console.log(`ID: ${group.id}, Cours: ${group.course_name}, Coach: ${group.teacher_name}, Telegram: ${group.group_name}`);
      });

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
const result = importTelegramFromExcel();
if (result && result.success) {
  console.log('Importation réussie!');
} else {
  console.error('Échec de l\'importation:', result ? result.error : 'Erreur inconnue');
}
