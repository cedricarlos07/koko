import dotenv from 'dotenv';
import axios from 'axios';
import { parse as parseCSV } from 'csv-parse/sync';
import { addDays } from 'date-fns';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// Charger les variables d'environnement
dotenv.config();

// Récupérer les identifiants OAuth
const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
const accountId = process.env.ZOOM_ACCOUNT_ID;
const dbPath = process.env.DATABASE_PATH || './data/kodjo-english-v2.db';

// Vérifier les identifiants
if (!clientId || !clientSecret || !accountId) {
  console.error('Erreur: Identifiants OAuth manquants dans le fichier .env');
  process.exit(1);
}

// Connexion à la base de données SQLite
const db = new Database(dbPath);
console.log(`Connexion à la base de données: ${dbPath}`);

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

// Fonction pour récupérer les cours du planning fixe
function getFixedSchedules() {
  try {
    const query = `
      SELECT 
        id, 
        course_name as courseName, 
        level, 
        teacher_name as teacherName, 
        day, 
        time, 
        duration, 
        telegram_group as telegramGroup, 
        zoom_host_email as zoomHostEmail, 
        is_active as isActive
      FROM fixed_schedules
      WHERE is_active = 1
    `;
    
    const fixedSchedules = db.prepare(query).all();
    console.log(`${fixedSchedules.length} cours actifs trouvés dans le planning fixe`);
    return fixedSchedules;
  } catch (error) {
    console.error('Erreur lors de la récupération des cours du planning fixe:', error);
    throw error;
  }
}

// Fonction pour enregistrer une réunion Zoom dans la base de données
function saveZoomMeeting(fixedScheduleId, zoomMeetingId, zoomMeetingUrl, startTime) {
  try {
    const query = `
      INSERT INTO zoom_meetings (
        fixed_schedule_id, 
        zoom_meeting_id, 
        zoom_meeting_url, 
        start_time, 
        status, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const now = Date.now();
    const result = db.prepare(query).run(
      fixedScheduleId,
      zoomMeetingId,
      zoomMeetingUrl,
      startTime,
      'scheduled',
      now
    );
    
    console.log(`Réunion Zoom enregistrée pour le cours ${fixedScheduleId}`);
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la réunion Zoom:', error);
    throw error;
  }
}

// Fonction pour créer un log d'automatisation
function createAutomationLog(type, status, message, details, fixedScheduleId) {
  try {
    const query = `
      INSERT INTO automation_logs (
        type, 
        status, 
        message, 
        details, 
        fixed_schedule_id, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const now = Date.now();
    const result = db.prepare(query).run(
      type,
      status,
      message,
      details ? JSON.stringify(details) : null,
      fixedScheduleId,
      now
    );
    
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Erreur lors de la création du log d\'automatisation:', error);
    throw error;
  }
}

// Fonction principale pour synchroniser les réunions Zoom avec le planning fixe
async function syncZoomMeetings() {
  console.log('=== Synchronisation des réunions Zoom avec le planning fixe ===');
  
  try {
    // 1. Récupérer les cours du planning fixe
    const fixedSchedules = getFixedSchedules();
    
    if (fixedSchedules.length === 0) {
      console.log('Aucun cours actif trouvé dans le planning fixe');
      return;
    }
    
    // 2. Obtenir un token OAuth
    const token = await getOAuthToken();
    
    // 3. Mapper les jours de la semaine
    const days = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 7
    };
    
    // 4. Créer les réunions récurrentes pour chaque cours
    const results = [];
    
    for (const schedule of fixedSchedules) {
      try {
        // Convertir le jour en format Zoom (1-7)
        const dayNumber = days[schedule.day.toLowerCase()];
        if (!dayNumber) {
          throw new Error(`Jour non reconnu: ${schedule.day}`);
        }
        
        // Extraire les heures et minutes
        const [hours, minutes] = schedule.time.split(':').map(Number);
        
        // Créer la réunion récurrente
        const result = await createRecurringMeeting(token, {
          courseName: schedule.courseName,
          dayNumber,
          hours,
          minutes,
          duration: schedule.duration,
          teacherName: schedule.teacherName,
          hostEmail: schedule.zoomHostEmail
        });
        
        if (result.status === 'success') {
          // Calculer la date de début pour la première occurrence
          const today = new Date();
          const startDate = new Date(today);
          startDate.setHours(hours, minutes, 0, 0);
          
          let daysToAdd = dayNumber - (today.getDay() || 7);
          if (daysToAdd <= 0) {
            daysToAdd += 7;
          }
          
          const startTime = addDays(startDate, daysToAdd).getTime();
          
          // Enregistrer la réunion dans la base de données
          const meetingId = saveZoomMeeting(
            schedule.id,
            result.id,
            result.joinUrl,
            startTime
          );
          
          // Créer un log de succès
          createAutomationLog(
            'zoom_creation',
            'success',
            `Réunion Zoom créée pour ${schedule.courseName}`,
            {
              meetingId: result.id,
              joinUrl: result.joinUrl,
              startTime
            },
            schedule.id
          );
        } else {
          // Créer un log d'erreur
          createAutomationLog(
            'zoom_creation',
            'error',
            `Erreur lors de la création de la réunion Zoom pour ${schedule.courseName}`,
            {
              error: result.error,
              details: result.details
            },
            schedule.id
          );
        }
        
        results.push({
          id: schedule.id,
          course: schedule.courseName,
          day: schedule.day,
          time: schedule.time,
          teacher: schedule.teacherName,
          ...result
        });
      } catch (error) {
        console.error(`Erreur pour le cours ${schedule.courseName}:`, error.message);
        
        // Créer un log d'erreur
        createAutomationLog(
          'zoom_creation',
          'error',
          `Erreur lors de la création de la réunion Zoom pour ${schedule.courseName}`,
          {
            error: error.message
          },
          schedule.id
        );
        
        results.push({
          id: schedule.id,
          course: schedule.courseName,
          day: schedule.day,
          time: schedule.time,
          teacher: schedule.teacherName,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // 5. Afficher le résumé
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log('\n=== Résumé de la synchronisation ===');
    console.log(`Total: ${fixedSchedules.length} cours`);
    console.log(`Réussies: ${successCount}`);
    console.log(`Échouées: ${errorCount}`);
    
    // 6. Sauvegarder les résultats dans un fichier
    const resultsFilePath = path.join(process.cwd(), 'data/sync-results.json');
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    console.log(`\nRésultats sauvegardés dans: ${resultsFilePath}`);
    
  } catch (error) {
    console.error('Erreur générale:', error);
  } finally {
    // Fermer la connexion à la base de données
    db.close();
  }
}

// Exécuter la synchronisation
syncZoomMeetings().catch(console.error);
