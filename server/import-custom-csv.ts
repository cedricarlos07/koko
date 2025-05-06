import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parse } from 'csv-parse/sync';
import { db, sqlite } from './db';
import * as schema from '../shared/schema-sqlite';
import { eq } from 'drizzle-orm';
import { format, parse as dateParse } from 'date-fns';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonction pour convertir une date au format YYYY-MM-DD en timestamp
function dateToTimestamp(dateStr: string): number {
  try {
    const date = dateParse(dateStr, 'yyyy-MM-dd', new Date());
    return date.getTime();
  } catch (error) {
    console.error(`Erreur lors de la conversion de la date ${dateStr}:`, error);
    // Utiliser la date actuelle en cas d'erreur
    return Date.now();
  }
}

// Fonction pour importer les données depuis un fichier CSV
async function importFromCSV(filePath: string) {
  console.log(`Importation des données depuis ${filePath}...`);
  
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier ${filePath} n'existe pas.`);
      return;
    }
    
    // Lire le fichier CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Nombre d'enregistrements trouvés: ${records.length}`);
    
    // Extraire les cours uniques
    const uniqueCourses = new Map();
    const uniqueProfessors = new Map();
    
    // Analyser les enregistrements pour extraire les cours et les professeurs
    for (const record of records) {
      // Extraire les informations du cours
      const courseName = record.Course || record.course || record['Course Name'] || '';
      const courseLevel = record.Level || record.level || record['Course Level'] || 'A1';
      
      if (courseName && !uniqueCourses.has(courseName)) {
        uniqueCourses.set(courseName, {
          name: courseName,
          level: courseLevel,
          description: `${courseName} - Level ${courseLevel}`,
          createdAt: Date.now()
        });
      }
      
      // Extraire les informations du professeur
      const professorName = record.Professor || record.professor || record['Professor Name'] || '';
      
      if (professorName && !uniqueProfessors.has(professorName)) {
        // Séparer le nom et le prénom
        const nameParts = professorName.split(' ');
        const firstName = nameParts[0] || 'Professor';
        const lastName = nameParts.slice(1).join(' ') || 'Unknown';
        
        uniqueProfessors.set(professorName, {
          username: professorName.toLowerCase().replace(/\\s+/g, '.'),
          password: '$2b$10$XpC5Jgr.QQnIGKBYYBR0nOQMT7.H5uHm5rqJqZ8.Qo8ZgQ8hW3vUe', // 'password' hashé
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@kodjo.english`,
          firstName,
          lastName,
          role: 'professor',
          points: 0,
          createdAt: Date.now()
        });
      }
    }
    
    // Insérer les professeurs dans la base de données
    console.log(`Importation de ${uniqueProfessors.size} professeurs...`);
    const professorIdMap = new Map();
    
    for (const [name, professor] of uniqueProfessors.entries()) {
      // Vérifier si le professeur existe déjà
      const existingProfessor = db.select().from(schema.users)
        .where(eq(schema.users.username, professor.username))
        .all();
      
      let professorId;
      if (existingProfessor.length === 0) {
        const result = db.insert(schema.users).values(professor).run();
        professorId = result.lastInsertRowid;
        console.log(`Professeur créé: ${professor.firstName} ${professor.lastName} (ID: ${professorId})`);
      } else {
        professorId = existingProfessor[0].id;
        console.log(`Professeur existant: ${professor.firstName} ${professor.lastName} (ID: ${professorId})`);
      }
      
      professorIdMap.set(name, professorId);
    }
    
    // Insérer les cours dans la base de données
    console.log(`Importation de ${uniqueCourses.size} cours...`);
    const courseIdMap = new Map();
    
    for (const [name, course] of uniqueCourses.entries()) {
      // Vérifier si le cours existe déjà
      const existingCourse = db.select().from(schema.courses)
        .where(eq(schema.courses.name, course.name))
        .all();
      
      let courseId;
      if (existingCourse.length === 0) {
        const result = db.insert(schema.courses).values(course).run();
        courseId = result.lastInsertRowid;
        console.log(`Cours créé: ${course.name} (ID: ${courseId})`);
      } else {
        courseId = existingCourse[0].id;
        console.log(`Cours existant: ${course.name} (ID: ${courseId})`);
      }
      
      courseIdMap.set(name, courseId);
    }
    
    // Insérer les sessions dans la base de données
    console.log(`Importation de ${records.length} sessions...`);
    let sessionCount = 0;
    
    for (const record of records) {
      const courseName = record.Course || record.course || record['Course Name'] || '';
      const courseId = courseIdMap.get(courseName);
      
      if (!courseId) {
        console.warn(`Cours non trouvé: ${courseName}. Session ignorée.`);
        continue;
      }
      
      const professorName = record.Professor || record.professor || record['Professor Name'] || '';
      const professorId = professorIdMap.get(professorName);
      
      if (!professorId) {
        console.warn(`Professeur non trouvé: ${professorName}. Session ignorée.`);
        continue;
      }
      
      // Extraire la date et l'heure
      const dateStr = record.Date || record.date || record['Session Date'] || '';
      const timeStr = record.Time || record.time || record['Session Time'] || '';
      
      if (!dateStr || !timeStr) {
        console.warn(`Date ou heure manquante pour la session. Session ignorée.`);
        continue;
      }
      
      // Convertir la date au format timestamp
      const scheduledDate = dateToTimestamp(dateStr);
      
      // Extraire le lien Zoom
      const zoomLink = record['Zoom Link'] || record.zoomLink || record.zoom || '';
      
      // Créer la session
      const session = {
        courseId,
        sessionNumber: ++sessionCount,
        professorId,
        scheduledDate,
        scheduledTime: timeStr,
        timeZone: 'GMT',
        zoomMeetingUrl: zoomLink,
        status: 'scheduled',
        createdAt: Date.now()
      };
      
      // Insérer la session
      db.insert(schema.sessions).values(session).run();
      console.log(`Session créée: ${courseName} le ${dateStr} à ${timeStr}`);
    }
    
    console.log('Importation des données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'importation des données:', error);
    throw error;
  }
}

// Fonction principale
async function main() {
  try {
    // Chemin vers le fichier CSV
    const csvFilePath = path.resolve(__dirname, '../data/csv/kodjo_english_schedule.csv');
    
    // Importer les données
    await importFromCSV(csvFilePath);
    
    console.log('Script d\'importation terminé avec succès');
  } catch (error) {
    console.error('Erreur dans le script d\'importation:', error);
  }
}

// Exécuter le script
main();
