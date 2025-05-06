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

// Fonction principale pour restaurer les données
async function restoreTelegramCoachData() {
  try {
    console.log('Restauration des données des coachs et leurs IDs Telegram depuis Excel...');

    // Lire le fichier Excel
    const workbook = XLSX.readFile(excelPath);

    // Vérifier si les feuilles nécessaires existent
    if (!workbook.SheetNames.includes('Fix Schedule') || !workbook.SheetNames.includes('Message Schedule')) {
      console.error('Les feuilles "Fix Schedule" ou "Message Schedule" n\'existent pas dans le fichier Excel');
      return;
    }

    // Récupérer les données de la feuille "Fix Schedule"
    const fixScheduleWorksheet = workbook.Sheets['Fix Schedule'];
    const fixScheduleData = XLSX.utils.sheet_to_json(fixScheduleWorksheet);

    console.log(`Nombre de cours planifiés trouvés dans Excel: ${fixScheduleData.length}`);

    // Récupérer les données de la feuille "Message Schedule"
    const messageScheduleWorksheet = workbook.Sheets['Message Schedule'];
    const messageScheduleData = XLSX.utils.sheet_to_json(messageScheduleWorksheet);

    console.log(`Nombre de messages planifiés trouvés dans Excel: ${messageScheduleData.length}`);

    // Créer une map des coachs et leurs groupes Telegram
    const coachTelegramMap = new Map();

    // Parcourir les données de Fix Schedule pour extraire les informations des coachs
    fixScheduleData.forEach(schedule => {
      if (schedule['TELEGRAM GROUP ID'] && schedule['Salma Choufani']) {
        const coachName = schedule['Salma Choufani'];
        const courseName = schedule['Salma Choufani - ABG - SS - 2:00pm'];
        const telegramGroupId = schedule['TELEGRAM GROUP ID'];
        const day = schedule['DAY'];
        const timeGMT = schedule['TIME (GMT) '];

        // Ajouter ou mettre à jour les informations du coach
        if (!coachTelegramMap.has(coachName)) {
          coachTelegramMap.set(coachName, {
            name: coachName,
            groups: []
          });
        }

        // Ajouter le groupe Telegram à la liste des groupes du coach
        coachTelegramMap.get(coachName).groups.push({
          courseName,
          telegramGroupId,
          day,
          timeGMT
        });
      }
    });

    console.log(`Nombre de coachs trouvés: ${coachTelegramMap.size}`);

    // Afficher les coachs et leurs groupes
    for (const [coachName, coachData] of coachTelegramMap.entries()) {
      console.log(`Coach: ${coachName}`);
      console.log(`Nombre de groupes: ${coachData.groups.length}`);
      console.log('Groupes:');
      coachData.groups.slice(0, 3).forEach((group, index) => {
        console.log(`  ${index + 1}. ${group.courseName} (${group.telegramGroupId})`);
      });
      if (coachData.groups.length > 3) {
        console.log(`  ... et ${coachData.groups.length - 3} autres groupes`);
      }
      console.log('');
    }

    // Commencer une transaction
    const transaction = db.prepare('BEGIN TRANSACTION');
    transaction.run();

    try {
      // Mettre à jour les groupes Telegram dans la base de données
      const updateTelegramGroupStmt = db.prepare(`
        UPDATE fixed_schedules
        SET telegram_group = ?
        WHERE teacher_name LIKE ? AND telegram_group IS NULL
      `);

      let updatedGroups = 0;

      // Parcourir les groupes Telegram de la feuille "Fix Schedule"
      for (const [coachName, coachData] of coachTelegramMap.entries()) {
        // Compter combien de groupes ce coach a dans la base de données
        const coachGroupsCount = db.prepare(`
          SELECT COUNT(*) as count FROM fixed_schedules WHERE teacher_name LIKE ?
        `).get(`%${coachName}%`).count;

        console.log(`Coach ${coachName} a ${coachGroupsCount} groupes dans la base de données`);

        // Si le coach a moins de groupes dans la base de données que dans Excel, on ne fait rien
        if (coachGroupsCount < coachData.groups.length) {
          console.log(`Coach ${coachName} a moins de groupes dans la base de données (${coachGroupsCount}) que dans Excel (${coachData.groups.length}). Ignoré.`);
          continue;
        }

        // Récupérer tous les groupes de ce coach dans la base de données
        const coachGroups = db.prepare(`
          SELECT id, course_name, telegram_group FROM fixed_schedules WHERE teacher_name LIKE ? ORDER BY id
        `).all(`%${coachName}%`);

        // Mettre à jour les groupes Telegram pour ce coach
        for (let i = 0; i < Math.min(coachGroups.length, coachData.groups.length); i++) {
          const dbGroup = coachGroups[i];
          const excelGroup = coachData.groups[i];

          // Mettre à jour le groupe Telegram
          const result = db.prepare(`
            UPDATE fixed_schedules
            SET telegram_group = ?
            WHERE id = ?
          `).run(
            excelGroup.telegramGroupId.toString(),
            dbGroup.id
          );

          if (result.changes > 0) {
            updatedGroups++;
            console.log(`Groupe mis à jour: ID ${dbGroup.id}, Cours: ${dbGroup.course_name}, Telegram: ${excelGroup.telegramGroupId}`);
          }
        }
      }

      console.log(`${updatedGroups} groupes Telegram mis à jour dans la base de données`);

      // Valider la transaction
      db.prepare('COMMIT').run();

      console.log(`Restauration terminée avec succès!`);
      console.log(`${updatedGroups} groupes Telegram mis à jour`);

      return {
        success: true,
        groupsUpdated: updatedGroups
      };
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la restauration des données:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Exécuter la fonction de restauration
restoreTelegramCoachData()
  .then(result => {
    if (result && result.success) {
      console.log('Restauration réussie!');
    } else {
      console.error('Échec de la restauration:', result ? result.error : 'Erreur inconnue');
    }
  })
  .catch(error => {
    console.error('Erreur non gérée:', error);
  });
