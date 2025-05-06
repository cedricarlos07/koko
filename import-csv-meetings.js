import dotenv from 'dotenv';
import axios from 'axios';
import { parse as parseCSV } from 'csv-parse/sync';
import { addDays } from 'date-fns';
import fs from 'fs';
import path from 'path';

// Charger les variables d'environnement
dotenv.config();

// Récupérer les identifiants OAuth
const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
const accountId = process.env.ZOOM_ACCOUNT_ID;

// Vérifier les identifiants
if (!clientId || !clientSecret || !accountId) {
  console.error('Erreur: Identifiants OAuth manquants dans le fichier .env');
  process.exit(1);
}

// Fonction pour obtenir un token OAuth
async function getOAuthToken() {
  try {
    console.log('Obtention du token OAuth...');

    // Encoder les identifiants en Base64
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Faire la requête pour obtenir un token
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        'grant_type': 'account_credentials',
        'account_id': accountId
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✓ Token obtenu avec succès!');
    return response.data.access_token;
  } catch (error) {
    console.error('✗ Erreur lors de l\'obtention du token:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    throw error;
  }
}

// Fonction pour créer une réunion récurrente
async function createRecurringMeeting(token, meetingData) {
  try {
    const { courseName, dayNumber, hours, minutes, duration, teacherName, hostEmail } = meetingData;

    console.log(`Création de la réunion récurrente pour ${courseName} (${teacherName})...`);

    // Préparer l'heure de début (pour la première occurrence)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(hours, minutes, 0, 0);

    // Si le jour est déjà passé cette semaine, ajouter une semaine
    const currentDayNumber = today.getDay() || 7; // 0 = dimanche, donc on le transforme en 7
    let daysToAdd = dayNumber - currentDayNumber;
    if (daysToAdd < 0 || (daysToAdd === 0 && today.getHours() > hours)) {
      daysToAdd += 7;
    }

    const startTime = addDays(startDate, daysToAdd);

    // Créer la réunion récurrente
    const response = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic: `${courseName} - ${teacherName}`,
        type: 8, // Réunion récurrente avec heure fixe
        start_time: startTime.toISOString(),
        duration,
        timezone: 'GMT',
        recurrence: {
          type: 2, // Hebdomadaire
          repeat_interval: 1, // Toutes les semaines
          weekly_days: dayNumber.toString(), // Jour de la semaine
          end_times: 12 // 12 occurrences (environ 3 mois)
        },
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          mute_upon_entry: true,
          auto_recording: 'none'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✓ Réunion créée avec succès!');
    console.log('  ID:', response.data.id);
    console.log('  URL:', response.data.join_url);

    return {
      id: response.data.id,
      joinUrl: response.data.join_url,
      status: 'success'
    };
  } catch (error) {
    console.error('✗ Erreur lors de la création de la réunion:', error.message);
    if (error.response?.data) {
      console.error('  Détails:', JSON.stringify(error.response.data, null, 2));
    }

    return {
      status: 'error',
      error: error.message,
      details: error.response?.data
    };
  }
}

// Fonction principale pour importer les réunions depuis un fichier CSV
async function importMeetingsFromCSV(csvFilePath) {
  console.log(`=== Importation des réunions Zoom depuis ${csvFilePath} ===`);

  try {
    // 1. Vérifier si le fichier existe
    if (!fs.existsSync(csvFilePath)) {
      console.error(`Le fichier ${csvFilePath} n'existe pas`);
      process.exit(1);
    }

    // 2. Lire le fichier CSV
    const content = fs.readFileSync(csvFilePath, 'utf8');
    const data = parseCSV(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`${data.length} cours trouvés dans le fichier CSV`);

    // 3. Obtenir un token OAuth
    const token = await getOAuthToken();

    // 4. Mapper les jours de la semaine
    const days = {
      'lundi': 1,
      'mardi': 2,
      'mercredi': 3,
      'jeudi': 4,
      'vendredi': 5,
      'samedi': 6,
      'dimanche': 7
    };

    // 5. Créer les réunions récurrentes
    const results = [];

    for (const row of data) {
      try {
        // Extraire les données de la ligne
        const courseName = row['Cours'];
        const dayName = row['Jour'];
        const timeStr = row['Heure'];
        const duration = parseInt(row['Durée'] || '60');
        const teacherName = row['Professeur'];
        const hostEmail = row['Email'];

        // Vérifier les données
        if (!courseName || !dayName || !timeStr || !teacherName) {
          throw new Error('Données manquantes dans la ligne');
        }

        // Convertir le jour en format Zoom (1-7)
        const dayNumber = days[dayName.toLowerCase()];
        if (!dayNumber) {
          throw new Error(`Jour non reconnu: ${dayName}`);
        }

        // Extraire les heures et minutes
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Créer la réunion récurrente
        const result = await createRecurringMeeting(token, {
          courseName,
          dayNumber,
          hours,
          minutes,
          duration,
          teacherName,
          hostEmail
        });

        results.push({
          course: courseName,
          day: dayName,
          time: timeStr,
          teacher: teacherName,
          ...result
        });
      } catch (error) {
        console.error(`Erreur pour le cours ${row['Cours']}:`, error.message);
        results.push({
          course: row['Cours'],
          day: row['Jour'],
          time: row['Heure'],
          teacher: row['Professeur'],
          status: 'error',
          error: error.message
        });
      }
    }

    // 6. Afficher le résumé
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log('\n=== Résumé de l\'importation ===');
    console.log(`Total: ${data.length} réunions`);
    console.log(`Réussies: ${successCount}`);
    console.log(`Échouées: ${errorCount}`);

    // 7. Sauvegarder les résultats dans un fichier
    const resultsFilePath = path.join(path.dirname(csvFilePath), 'import-results.json');
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    console.log(`\nRésultats sauvegardés dans: ${resultsFilePath}`);

  } catch (error) {
    console.error('Erreur générale:', error);
  }
}

// Vérifier les arguments
if (process.argv.length < 3) {
  console.error('Usage: node import-csv-meetings.js <chemin_vers_fichier_csv>');
  process.exit(1);
}

// Exécuter l'importation
const csvFilePath = process.argv[2];
importMeetingsFromCSV(csvFilePath).catch(console.error);
