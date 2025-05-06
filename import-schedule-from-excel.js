import dotenv from 'dotenv';
import { parse as parseCSV } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// Charger les variables d'environnement
dotenv.config();

// Chemin vers la base de données
const dbPath = process.env.DATABASE_PATH || './data/kodjo-english-v2.db';

// Connexion à la base de données SQLite
const db = new Database(dbPath);
console.log(`Connexion à la base de données: ${dbPath}`);

// Fonction pour normaliser le jour de la semaine
function normalizeDay(day) {
  const days = {
    'lundi': 'monday',
    'mardi': 'tuesday',
    'mercredi': 'wednesday',
    'jeudi': 'thursday',
    'vendredi': 'friday',
    'samedi': 'saturday',
    'dimanche': 'sunday',
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday'
  };
  
  const normalizedDay = days[day.toLowerCase()];
  if (!normalizedDay) {
    throw new Error(`Jour non reconnu: ${day}`);
  }
  
  return normalizedDay;
}

// Fonction pour normaliser le niveau du cours
function normalizeLevel(level) {
  const levels = {
    'débutant': 'bbg',
    'intermédiaire': 'abg',
    'avancé': 'ig',
    'bbg': 'bbg',
    'abg': 'abg',
    'ig': 'ig'
  };
  
  const normalizedLevel = levels[level.toLowerCase()];
  if (!normalizedLevel) {
    throw new Error(`Niveau non reconnu: ${level}`);
  }
  
  return normalizedLevel;
}

// Fonction pour lire les données du fichier (Excel ou CSV)
function readDataFile(filePath) {
  const fileExt = path.extname(filePath).toLowerCase();
  
  if (fileExt === '.xlsx' || fileExt === '.xls') {
    // Lire un fichier Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } else if (fileExt === '.csv') {
    // Lire un fichier CSV
    const content = fs.readFileSync(filePath, 'utf8');
    return parseCSV(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } else {
    throw new Error(`Format de fichier non supporté: ${fileExt}. Utilisez .xlsx, .xls ou .csv`);
  }
}

// Fonction pour importer les données dans la table fixed_schedules
function importFixedSchedules(data) {
  try {
    // Commencer une transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    // Supprimer les anciens enregistrements
    db.prepare('DELETE FROM fixed_schedules').run();
    console.log('Anciens enregistrements supprimés');
    
    // Préparer la requête d'insertion
    const insertStmt = db.prepare(`
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
    
    // Insérer les nouveaux enregistrements
    const now = Date.now();
    let insertedCount = 0;
    
    for (const row of data) {
      try {
        // Extraire les données de la ligne
        const courseName = row['Cours'] || row['Course Name'] || row['course_name'];
        const level = row['Niveau'] || row['Level'] || row['level'];
        const teacherName = row['Professeur'] || row['Teacher Name'] || row['teacher_name'];
        const day = row['Jour'] || row['Day'] || row['day'];
        const time = row['Heure'] || row['Time'] || row['time'];
        const duration = parseInt(row['Durée'] || row['Duration'] || row['Duration (min)'] || row['duration'] || '60');
        const telegramGroup = row['Groupe Telegram'] || row['Telegram Group'] || row['telegram_group'] || '';
        const zoomHostEmail = row['Email'] || row['Zoom Host Email'] || row['zoom_host_email'] || '';
        
        // Vérifier les données obligatoires
        if (!courseName || !level || !teacherName || !day || !time) {
          throw new Error('Données obligatoires manquantes');
        }
        
        // Normaliser les données
        const normalizedDay = normalizeDay(day);
        const normalizedLevel = normalizeLevel(level);
        
        // Insérer l'enregistrement
        insertStmt.run(
          courseName,
          normalizedLevel,
          teacherName,
          normalizedDay,
          time,
          duration,
          telegramGroup,
          zoomHostEmail,
          1, // is_active
          now,
          now
        );
        
        insertedCount++;
        console.log(`Cours planifié créé: ${courseName} le ${normalizedDay} à ${time}`);
      } catch (error) {
        console.error(`Erreur lors de l'insertion de la ligne:`, error.message, row);
      }
    }
    
    // Valider la transaction
    db.prepare('COMMIT').run();
    
    return insertedCount;
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    db.prepare('ROLLBACK').run();
    console.error('Erreur lors de l\'importation des cours planifiés:', error);
    throw error;
  }
}

// Fonction principale pour importer le planning fixe depuis un fichier
function importFixedScheduleFromFile(filePath) {
  console.log(`=== Importation du planning fixe depuis ${filePath} ===`);
  
  try {
    // 1. Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier ${filePath} n'existe pas`);
      process.exit(1);
    }
    
    // 2. Lire le fichier
    const data = readDataFile(filePath);
    console.log(`${data.length} lignes trouvées dans le fichier`);
    
    // 3. Importer les données
    const insertedCount = importFixedSchedules(data);
    
    console.log(`\n=== Importation terminée ===`);
    console.log(`${insertedCount} cours planifiés importés avec succès`);
    
  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Vérifier les arguments
if (process.argv.length < 3) {
  console.error('Usage: node import-schedule-from-excel.js <chemin_vers_fichier>');
  process.exit(1);
}

// Exécuter l'importation
const filePath = process.argv[2];
importFixedScheduleFromFile(filePath);
