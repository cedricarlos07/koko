import XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, '..', 'data', 'kodjo-english-v2.db');

// Chemin vers le fichier Excel
const excelPath = path.join(__dirname, '..', 'Kodjo English - Classes Schedules (2).xlsx');

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
async function importAllTelegramGroups() {
  try {
    console.log('Importation de tous les groupes Telegram depuis Excel...');

    // Lire le fichier Excel
    const workbook = XLSX.readFile(excelPath);

    // Vérifier si la feuille "Fix Schedule" existe
    if (!workbook.SheetNames.includes('Fix Schedule')) {
      console.error('La feuille "Fix Schedule" n\'existe pas dans le fichier Excel');
      return;
    }

    // Récupérer la feuille "Fix Schedule"
    const fixScheduleWorksheet = workbook.Sheets['Fix Schedule'];
    const fixScheduleData = XLSX.utils.sheet_to_json(fixScheduleWorksheet);

    console.log(`Nombre de cours planifiés trouvés dans Excel: ${fixScheduleData.length}`);

    // Créer une map des groupes Telegram depuis la feuille "Fix Schedule"
    const telegramGroups = [];
    fixScheduleData.forEach(schedule => {
      if (schedule['TELEGRAM GROUP ID'] && schedule['Salma Choufani'] && schedule['Salma Choufani - ABG - SS - 2:00pm']) {
        telegramGroups.push({
          courseName: schedule['Salma Choufani - ABG - SS - 2:00pm'],
          teacherName: schedule['Salma Choufani'],
          day: schedule['DAY'],
          timeGMT: schedule['TIME (GMT) '],
          timeFrance: schedule['TIME (France)'],
          telegramGroupId: schedule['TELEGRAM GROUP ID']
        });
      }
    });

    console.log(`Nombre de groupes Telegram trouvés dans Excel: ${telegramGroups.length}`);

    // Récupérer les groupes Telegram existants dans la base de données
    const existingGroups = db.prepare(`
      SELECT id, course_name, teacher_name, telegram_group
      FROM fixed_schedules
      WHERE telegram_group IS NOT NULL
    `).all();

    console.log(`Nombre de groupes Telegram existants dans la base de données: ${existingGroups.length}`);

    // Créer une map des groupes Telegram existants pour une recherche plus rapide
    const existingGroupsMap = new Map();
    existingGroups.forEach(group => {
      existingGroupsMap.set(group.telegram_group, group);
    });

    // Commencer une transaction
    const transaction = db.prepare('BEGIN TRANSACTION');
    transaction.run();

    try {
      // Insérer les groupes Telegram manquants
      const insertGroupStmt = db.prepare(`
        INSERT INTO fixed_schedules (
          course_name,
          level,
          teacher_name,
          day,
          time,
          duration,
          telegram_group,
          zoom_host_email,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let insertedGroups = 0;
      let updatedGroups = 0;

      // Parcourir les groupes Telegram de la feuille "Fix Schedule"
      for (const group of telegramGroups) {
        const telegramGroupId = group.telegramGroupId.toString();
        
        // Vérifier si le groupe existe déjà
        if (existingGroupsMap.has(telegramGroupId)) {
          // Mettre à jour le groupe existant
          const existingGroup = existingGroupsMap.get(telegramGroupId);
          
          const result = db.prepare(`
            UPDATE fixed_schedules
            SET course_name = ?, teacher_name = ?, day = ?, time = ?, updated_at = ?
            WHERE id = ?
          `).run(
            group.courseName,
            group.teacherName,
            convertDayToLowerCase(group.day),
            extractTime(group.timeGMT),
            Date.now(),
            existingGroup.id
          );
          
          if (result.changes > 0) {
            updatedGroups++;
            console.log(`Groupe mis à jour: ID ${existingGroup.id}, Cours: ${group.courseName}, Telegram: ${telegramGroupId}`);
          }
        } else {
          // Insérer un nouveau groupe
          const now = Date.now();
          
          const result = insertGroupStmt.run(
            group.courseName,
            extractLevel(group.courseName),
            group.teacherName,
            convertDayToLowerCase(group.day),
            extractTime(group.timeGMT),
            60, // Durée par défaut
            telegramGroupId,
            '', // Email de l'hôte Zoom
            1, // Actif par défaut
            now,
            now
          );
          
          if (result.lastInsertRowid) {
            insertedGroups++;
            console.log(`Groupe inséré: ID ${result.lastInsertRowid}, Cours: ${group.courseName}, Telegram: ${telegramGroupId}`);
          }
        }
      }

      // Valider la transaction
      db.prepare('COMMIT').run();

      console.log(`Importation terminée avec succès!`);
      console.log(`${insertedGroups} groupes Telegram insérés`);
      console.log(`${updatedGroups} groupes Telegram mis à jour`);

      return {
        success: true,
        groupsInserted: insertedGroups,
        groupsUpdated: updatedGroups
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

// Fonction pour extraire le niveau à partir du nom du cours
function extractLevel(courseName) {
  if (courseName.includes('BBG')) return 'bbg';
  if (courseName.includes('ABG')) return 'abg';
  if (courseName.includes('IG')) return 'ig';
  if (courseName.includes('ZBG')) return 'zbg';
  if (courseName.includes('IAG')) return 'iag';
  return 'bbg'; // Niveau par défaut
}

// Fonction pour extraire l'heure à partir de la chaîne GMT
function extractTime(timeGMT) {
  if (!timeGMT) return '00:00';
  
  const match = timeGMT.match(/(\d+)h\s+(\d+)/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const minutes = match[2].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  return '00:00';
}

// Fonction pour convertir le jour en minuscules
function convertDayToLowerCase(day) {
  if (!day) return 'monday';
  
  const dayMap = {
    'Monday': 'monday',
    'Tuesday': 'tuesday',
    'Wednesday': 'wednesday',
    'Thursday': 'thursday',
    'Friday': 'friday',
    'Saturday': 'saturday',
    'Sunday': 'sunday'
  };
  
  return dayMap[day] || 'monday';
}

// Exécuter la fonction d'importation
importAllTelegramGroups()
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
