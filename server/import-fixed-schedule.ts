import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse } from 'csv-parse/sync';
import { db } from './db';
import * as schema from '../shared/schema-fixed-schedule';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Interface pour les données du CSV
interface FixScheduleCSV {
  'Course Name': string;
  'Level': string;
  'Teacher Name': string;
  'Day': string;
  'Time': string;
  'Duration (min)': string;
  'Telegram Group': string;
  'Zoom Host Email': string;
}

// Fonction pour normaliser le jour de la semaine
function normalizeDay(day: string): string {
  const normalizedDay = day.toLowerCase().trim();

  switch (normalizedDay) {
    case 'monday':
    case 'lundi':
      return 'monday';
    case 'tuesday':
    case 'mardi':
      return 'tuesday';
    case 'wednesday':
    case 'mercredi':
      return 'wednesday';
    case 'thursday':
    case 'jeudi':
      return 'thursday';
    case 'friday':
    case 'vendredi':
      return 'friday';
    case 'saturday':
    case 'samedi':
      return 'saturday';
    case 'sunday':
    case 'dimanche':
      return 'sunday';
    default:
      throw new Error(`Jour de la semaine non reconnu: ${day}`);
  }
}

// Fonction pour normaliser le niveau de cours
function normalizeLevel(level: string): string {
  const normalizedLevel = level.toLowerCase().trim();

  // Mapping des niveaux CECR vers les niveaux BBG/ABG/IG
  switch (normalizedLevel) {
    case 'a1':
    case 'a2':
      return 'bbg';
    case 'b1':
    case 'b2':
      return 'abg';
    case 'c1':
    case 'c2':
      return 'ig';
    case 'bbg':
      return 'bbg';
    case 'abg':
      return 'abg';
    case 'ig':
      return 'ig';
    default:
      // Conserver le niveau original si non reconnu
      return level;
  }
}

// Fonction pour importer le planning fixe depuis un fichier CSV
async function importFromCSV(filePath: string) {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Le fichier ${filePath} n'existe pas.`);
    }

    // Lire le fichier CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as FixScheduleCSV[];

    console.log(`Nombre d'enregistrements trouvés: ${records.length}`);

    // Convertir les enregistrements en objets FixedSchedule
    const fixedSchedules = records.map(record => {
      // Normaliser le jour de la semaine
      const normalizedDay = normalizeDay(record.Day);

      return {
        courseName: record['Course Name'],
        level: normalizeLevel(record.Level),
        teacherName: record['Teacher Name'],
        day: normalizedDay,
        time: record.Time,
        duration: parseInt(record['Duration (min)'], 10),
        telegramGroup: record['Telegram Group'],
        zoomHostEmail: record['Zoom Host Email'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    });

    // Supprimer les anciens enregistrements
    db.delete(schema.fixedSchedules).run();
    console.log('Anciens enregistrements supprimés');

    // Insérer les nouveaux enregistrements
    for (const schedule of fixedSchedules) {
      db.insert(schema.fixedSchedules).values(schedule).run();
      console.log(`Cours planifié créé: ${schedule.courseName} le ${schedule.day} à ${schedule.time}`);
    }

    console.log('Importation du planning fixe terminée avec succès');
    return fixedSchedules;
  } catch (error) {
    console.error('Erreur lors de l\'importation du planning fixe:', error);
    throw error;
  }
}

// Chemin vers le fichier CSV
const csvFilePath = path.resolve(__dirname, '../data/csv/real_fix_schedule.csv');

// Importer le planning fixe
importFromCSV(csvFilePath).then(() => {
  console.log('Script d\'importation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'importation:', error);
});
