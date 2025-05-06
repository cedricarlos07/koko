import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { format, parse, addDays } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { parse as parseCSV } from 'csv-parse/sync';

// Charger les variables d'environnement
dotenv.config();

/**
 * Script pour importer des réunions Zoom récurrentes depuis un fichier Excel
 */
async function importZoomMeetings(excelFilePath) {
  console.log('=== Importation des réunions Zoom depuis Excel ===');

  try {
    // 1. Vérifier si le fichier existe
    if (!fs.existsSync(excelFilePath)) {
      console.error(`❌ Le fichier ${excelFilePath} n'existe pas`);
      process.exit(1);
    }

    console.log(`✅ Fichier Excel trouvé: ${excelFilePath}`);

    // 2. Lire le fichier Excel
    const workbook = XLSX.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`✅ ${data.length} lignes trouvées dans le fichier Excel`);

    // 3. Vérifier les colonnes requises
    const requiredColumns = ['Cours', 'Jour', 'Heure', 'Durée', 'Professeur', 'Email'];
    const missingColumns = requiredColumns.filter(col =>
      !data[0] || !Object.keys(data[0]).some(key => key.includes(col))
    );

    if (missingColumns.length > 0) {
      console.error(`❌ Colonnes manquantes dans le fichier Excel: ${missingColumns.join(', ')}`);
      console.log('Colonnes disponibles:', Object.keys(data[0]).join(', '));
      process.exit(1);
    }

    console.log('✅ Toutes les colonnes requises sont présentes');

    // 4. Obtenir un token OAuth
    await zoomOAuthService.getAccessToken();
    console.log('✅ Token OAuth obtenu avec succès');

    // 5. Vérifier les scopes
    const scopeCheck = await zoomOAuthService.checkScopes();
    if (!scopeCheck.valid) {
      console.error(`❌ Scopes manquants: ${scopeCheck.missingScopes.join(', ')}`);
      process.exit(1);
    }

    console.log('✅ Tous les scopes nécessaires sont disponibles');

    // 6. Créer les réunions récurrentes
    console.log('\n=== Création des réunions récurrentes ===');

    const days = {
      'lundi': 1,
      'mardi': 2,
      'mercredi': 3,
      'jeudi': 4,
      'vendredi': 5,
      'samedi': 6,
      'dimanche': 7
    };

    const results = {
      success: 0,
      error: 0,
      details: []
    };

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

        // Préparer l'heure de début (pour la première occurrence)
        const [hours, minutes] = timeStr.split(':').map(Number);
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
        console.log(`\nCréation de la réunion pour ${courseName} (${dayName} à ${timeStr})`);

        const meeting = await zoomOAuthService.request(
          'POST',
          `/users/${hostEmail ? `email:${hostEmail}` : 'me'}/meetings`,
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
          }
        );

        console.log('✅ Réunion créée avec succès:');
        console.log('   ID:', meeting.id);
        console.log('   URL de participation:', meeting.join_url);

        results.success++;
        results.details.push({
          status: 'success',
          course: courseName,
          day: dayName,
          time: timeStr,
          teacher: teacherName,
          meetingId: meeting.id,
          joinUrl: meeting.join_url
        });
      } catch (error) {
        console.error(`❌ Erreur lors de la création de la réunion:`, error.message);
        if (error.response?.data) {
          console.error('   Détails:', JSON.stringify(error.response.data, null, 2));
        }

        results.error++;
        results.details.push({
          status: 'error',
          course: row['Cours'],
          day: row['Jour'],
          time: row['Heure'],
          teacher: row['Professeur'],
          error: error.message
        });
      }
    }

    // 7. Afficher le résumé
    console.log('\n=== Résumé de l\'importation ===');
    console.log(`Total: ${data.length} réunions`);
    console.log(`Réussies: ${results.success}`);
    console.log(`Échouées: ${results.error}`);

    // 8. Sauvegarder les résultats dans un fichier
    const resultsFilePath = path.join(path.dirname(excelFilePath), 'import-results.json');
    fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
    console.log(`\nRésultats sauvegardés dans: ${resultsFilePath}`);

  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
  }
}

// Vérifier les arguments
if (process.argv.length < 3) {
  console.error('Usage: node import-zoom-meetings.js <chemin_vers_fichier_excel>');
  process.exit(1);
}

// Exécuter l'importation
const excelFilePath = process.argv[2];
importZoomMeetings(excelFilePath).catch(console.error);
