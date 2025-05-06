const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from './db';
import * as schema from '../shared/schema-fixed-schedule';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  if (!level) return 'bbg';

  const normalizedLevel = level.toLowerCase().trim();

  // Mapping des niveaux CECR vers les niveaux BBG/ABG/IG
  switch (normalizedLevel) {
    case 'a1':
    case 'a2':
    case 'beginner':
    case 'elementary':
    case 'bbg':
      return 'bbg';
    case 'b1':
    case 'b2':
    case 'intermediate':
    case 'abg':
      return 'abg';
    case 'c1':
    case 'c2':
    case 'advanced':
    case 'ig':
      return 'ig';
    default:
      // Par défaut, on utilise 'bbg'
      return 'bbg';
  }
}

// Fonction pour importer le planning fixe depuis un fichier Excel
async function importFromExcel(filePath: string) {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Le fichier ${filePath} n'existe pas.`);
    }

    console.log(`Lecture du fichier Excel: ${filePath}`);

    // Lire le fichier Excel
    const workbook = XLSX.readFile(filePath);

    // Obtenir le nom de la première feuille
    const sheetName = workbook.SheetNames[0];

    // Obtenir la feuille de calcul
    const worksheet = workbook.Sheets[sheetName];

    // Convertir la feuille de calcul en JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Nombre d'enregistrements trouvés: ${data.length}`);
    console.log('Premier enregistrement:', JSON.stringify(data[0], null, 2));

    // Convertir les enregistrements en objets FixedSchedule
    const fixedSchedules = data.map((record: any) => {
      // Extraire les informations pertinentes
      const courseName = record['Course Name'] || record['Topic'] || record['Cours'] || '';
      const level = record['Level'] || record['Niveau'] || '';
      const teacherName = record['Teacher Name'] || record['Coach'] || record['Professeur'] || '';
      const day = record['Day'] || record['Jour'] || '';
      const time = record['Time'] || record['Heure'] || '';
      const duration = parseInt(record['Duration (min)'] || record['Durée (min)'] || '60', 10);
      const telegramGroup = record['Telegram Group'] || record['Groupe Telegram'] || '';
      const zoomHostEmail = record['Zoom Host Email'] || record['Email Hôte Zoom'] || '';

      // Normaliser le jour de la semaine
      let normalizedDay;
      try {
        normalizedDay = normalizeDay(day);
      } catch (error) {
        console.error(`Erreur lors de la normalisation du jour: ${error.message}`);
        normalizedDay = 'monday'; // Valeur par défaut
      }

      return {
        courseName,
        level: normalizeLevel(level),
        teacherName,
        day: normalizedDay,
        time,
        duration,
        telegramGroup,
        zoomHostEmail,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }).filter(schedule => schedule.courseName && schedule.teacherName); // Filtrer les enregistrements incomplets

    console.log(`Nombre de cours planifiés valides: ${fixedSchedules.length}`);

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

// Chemin vers le fichier Excel
const excelFilePath = path.resolve(__dirname, '../Kodjo English - Classes Schedules (2).xlsx');

// Importer le planning fixe
importFromExcel(excelFilePath).then(() => {
  console.log('Script d\'importation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'importation:', error);
});
