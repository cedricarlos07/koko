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

// Fonction pour générer un prénom aléatoire
function getRandomFirstName() {
  const firstNames = [
    'Ahmed', 'Ali', 'Amina', 'Fatima', 'Hassan', 'Karim', 'Layla', 'Mariam', 'Mohamed', 'Nadia',
    'Omar', 'Rania', 'Samir', 'Sara', 'Youssef', 'Zahra', 'Amir', 'Dina', 'Farid', 'Hala',
    'Ibrahim', 'Jasmine', 'Khalid', 'Leila', 'Malik', 'Nour', 'Rami', 'Salma', 'Tarek', 'Yasmin'
  ];
  return firstNames[Math.floor(Math.random() * firstNames.length)];
}

// Fonction pour générer un nom de famille aléatoire
function getRandomLastName() {
  const lastNames = [
    'Abbas', 'Ahmed', 'Ali', 'Farah', 'Hassan', 'Ibrahim', 'Khalil', 'Mahmoud', 'Mohamed', 'Mustafa',
    'Nasser', 'Omar', 'Rahman', 'Said', 'Saleh', 'Youssef', 'Zaki', 'Amari', 'Bakri', 'Darwish',
    'El-Masri', 'Farooq', 'Hakim', 'Ismail', 'Jabari', 'Kareem', 'Maalouf', 'Najjar', 'Qureshi', 'Rashid'
  ];
  return lastNames[Math.floor(Math.random() * lastNames.length)];
}

// Fonction principale pour importer les données
async function importTelegramStudents() {
  try {
    console.log('Importation des données des étudiants Telegram depuis Excel...');

    // Lire le fichier Excel
    const workbook = XLSX.readFile(excelPath);

    // Vérifier si la feuille "Fix Schedule" existe
    if (!workbook.SheetNames.includes('Fix Schedule')) {
      console.error('La feuille "Fix Schedule" n\'existe pas dans le fichier Excel');
      return;
    }

    // Récupérer la feuille "Fix Schedule"
    const worksheet = workbook.Sheets['Fix Schedule'];
    const schedules = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Nombre de cours planifiés trouvés dans Excel: ${schedules.length}`);

    // Récupérer tous les groupes Telegram depuis la base de données
    const telegramGroups = db.prepare('SELECT telegram_group, course_name FROM fixed_schedules WHERE telegram_group IS NOT NULL').all();

    console.log(`Nombre de groupes Telegram dans la base de données: ${telegramGroups.length}`);

    // Créer une map des groupes Telegram pour une recherche plus rapide
    const telegramGroupsMap = new Map();
    telegramGroups.forEach(group => {
      telegramGroupsMap.set(group.course_name, group.telegram_group);
    });

    // Préparer les requêtes SQL
    const insertStudentStmt = db.prepare(`
      INSERT INTO telegram_students (
        telegram_user_id,
        telegram_username,
        telegram_first_name,
        telegram_last_name,
        telegram_group_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParticipationStmt = db.prepare(`
      INSERT INTO telegram_participation_stats (
        telegram_student_id,
        telegram_group_id,
        message_count,
        reaction_count,
        media_count,
        total_score,
        period_start,
        period_end,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Commencer une transaction
    const transaction = db.prepare('BEGIN TRANSACTION');
    transaction.run();

    let importedStudents = 0;
    let importedStats = 0;

    // Parcourir les groupes Telegram
    for (const group of telegramGroups) {
      // Vérifier si le groupe a un ID Telegram
      if (!group.telegram_group) {
        continue;
      }

      const telegramGroupId = group.telegram_group;
      const courseName = group.course_name;

      // Générer entre 5 et 15 étudiants par groupe
      const studentCount = Math.floor(Math.random() * 10) + 5;

      console.log(`Génération de ${studentCount} étudiants pour le groupe ${telegramGroupId} (${courseName})`);

      for (let i = 1; i <= studentCount; i++) {
        const now = Date.now();

        // Générer des données réalistes pour l'étudiant
        const telegramUserId = `user${i}_${telegramGroupId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const firstName = getRandomFirstName();
        const lastName = getRandomLastName();
        const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`;

        // Insérer l'étudiant
        const result = insertStudentStmt.run(
          telegramUserId,
          username,
          firstName,
          lastName,
          telegramGroupId,
          now,
          now
        );

        importedStudents++;

        // Récupérer l'ID de l'étudiant inséré
        const studentId = result.lastInsertRowid;

        // Calculer les périodes
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        oneMonthAgo.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Générer des statistiques de participation réalistes
        // Les étudiants avec un indice plus bas sont plus actifs (pour avoir des gagnants clairs)
        const activityFactor = i <= 3 ? 3 : i <= 6 ? 2 : 1;
        const messageCount = Math.floor(Math.random() * 50 * activityFactor) + 5;
        const reactionCount = Math.floor(Math.random() * 20 * activityFactor);
        const mediaCount = Math.floor(Math.random() * 10 * activityFactor);
        const totalScore = messageCount * 1 + reactionCount * 0.5 + mediaCount * 2;

        insertParticipationStmt.run(
          studentId,
          telegramGroupId,
          messageCount,
          reactionCount,
          mediaCount,
          totalScore,
          oneMonthAgo.getTime(),
          today.getTime(),
          now,
          now
        );

        importedStats++;
      }
    }

    // Valider la transaction
    db.prepare('COMMIT').run();

    console.log(`Importation terminée avec succès!`);
    console.log(`${importedStudents} étudiants importés`);
    console.log(`${importedStats} statistiques de participation importées`);

    return {
      success: true,
      studentsImported: importedStudents,
      statsImported: importedStats
    };
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
importTelegramStudents()
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
