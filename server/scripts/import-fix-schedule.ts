import * as XLSX from 'xlsx';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Obtenir l'équivalent de __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonction pour normaliser le jour de la semaine
function normalizeDay(day: string): string {
  const days: Record<string, string> = {
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
function normalizeLevel(level: string): string {
  const levels: Record<string, string> = {
    'débutant': 'bbg',
    'intermédiaire': 'abg',
    'avancé': 'ig',
    'bbg': 'bbg',
    'abg': 'abg',
    'ig': 'ig',
    'a1': 'bbg',
    'a2': 'bbg',
    'b1': 'abg',
    'b2': 'abg',
    'c1': 'ig',
    'c2': 'ig'
  };

  const normalizedLevel = levels[level.toLowerCase()];
  if (!normalizedLevel) {
    // Par défaut, utiliser 'bbg' si le niveau n'est pas reconnu
    console.warn(`Niveau non reconnu: ${level}, utilisation de 'bbg' par défaut`);
    return 'bbg';
  }

  return normalizedLevel;
}

// Fonction principale pour importer les données du fichier Excel
async function importFixSchedule(filePath: string) {
  console.log(`Importation des données depuis ${filePath}...`);

  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier ${filePath} n'existe pas`);
      process.exit(1);
    }

    // Lire le fichier Excel
    const workbook = XLSX.readFile(filePath);

    // Trouver la feuille "Fix Schedule"
    let sheetName = 'Fix Schedule';
    if (!workbook.SheetNames.includes(sheetName)) {
      // Essayer de trouver une feuille avec un nom similaire
      sheetName = workbook.SheetNames.find(name =>
        name.toLowerCase().includes('fix') ||
        name.toLowerCase().includes('schedule') ||
        name.toLowerCase().includes('planning')
      ) || workbook.SheetNames[0];

      console.log(`Feuille "Fix Schedule" non trouvée, utilisation de la feuille "${sheetName}" à la place`);
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`${data.length} lignes trouvées dans la feuille "${sheetName}"`);

    // Supprimer les données existantes
    await db.delete(schema.fixedSchedules).run();
    console.log('Données existantes supprimées');

    // Insérer les nouvelles données
    let insertedCount = 0;
    const now = Date.now();

    for (const row of data) {
      try {
        // Extraire les données de la ligne
        // Utiliser différentes variantes possibles des noms de colonnes
        const courseName = row['Course'] || row['Cours'] || row['Course Name'] || row['Nom du cours'] || 'Cours sans nom';
        const level = row['Level'] || row['Niveau'] || 'bbg';
        const teacherName = row['Professor'] || row['Teacher'] || row['Coach'] || row['Professeur'] || row['Enseignant'] || 'Professeur inconnu';
        const day = row['Day'] || row['Jour'] || 'monday';
        const time = row['Time'] || row['Heure'] || row['Hour'] || '12:00';
        const duration = parseInt(row['Duration'] || row['Durée'] || row['Duration (min)'] || '60');
        const telegramGroup = row['Telegram Group'] || row['Groupe Telegram'] || row['Telegram'] || '';
        const zoomHostEmail = row['Email'] || row['Coach Email'] || row['Professor Email'] || row['Email du professeur'] || '';

        // Normaliser les données
        const normalizedDay = normalizeDay(day.toString());
        const normalizedLevel = normalizeLevel(level.toString());

        // Insérer dans la base de données
        await db.insert(schema.fixedSchedules).values({
          courseName: courseName.toString(),
          level: normalizedLevel,
          teacherName: teacherName.toString(),
          day: normalizedDay,
          time: time.toString(),
          duration,
          telegramGroup: telegramGroup.toString(),
          zoomHostEmail: zoomHostEmail.toString(),
          isActive: true,
          createdAt: now,
          updatedAt: now
        }).run();

        insertedCount++;
        console.log(`Cours inséré: ${courseName} (${teacherName}) le ${normalizedDay} à ${time}`);
      } catch (error) {
        console.error(`Erreur lors de l'insertion de la ligne:`, error, row);
      }
    }

    console.log(`Importation terminée: ${insertedCount} cours insérés sur ${data.length} lignes`);
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  }
}

// Chemin par défaut vers le fichier Excel
const defaultFilePath = path.resolve(__dirname, '../../data/fix_schedule.xlsx');

// Utiliser le chemin fourni en argument ou le chemin par défaut
const filePath = process.argv[2] || defaultFilePath;

// Exécuter l'importation
importFixSchedule(filePath)
  .then(() => {
    console.log('Importation terminée avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors de l\'importation:', error);
    process.exit(1);
  });
