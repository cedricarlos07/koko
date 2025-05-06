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
  const date = dateParse(dateStr, 'yyyy-MM-dd', new Date());
  return date.getTime();
}

// Fonction pour importer les cours depuis un fichier CSV
async function importCourses(filePath: string) {
  console.log(`Importation des cours depuis ${filePath}...`);

  try {
    // Lire le fichier CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    // Extraire les cours uniques
    const uniqueCourses = new Map();
    for (const record of records) {
      const courseName = record.Course;
      const courseLevel = record.Level;

      if (!uniqueCourses.has(courseName)) {
        uniqueCourses.set(courseName, {
          name: courseName,
          level: courseLevel,
          description: `${courseName} - Level ${courseLevel}`,
          createdAt: Date.now()
        });
      }
    }

    // Insérer les cours dans la base de données
    console.log(`Importation de ${uniqueCourses.size} cours...`);
    for (const course of uniqueCourses.values()) {
      // Vérifier si le cours existe déjà
      const existingCourse = db.select().from(schema.courses)
        .where(eq(schema.courses.name, course.name))
        .all();

      if (existingCourse.length === 0) {
        db.insert(schema.courses).values(course).run();
        console.log(`Cours créé: ${course.name}`);
      } else {
        console.log(`Cours existant: ${course.name}`);
      }
    }

    console.log('Importation des cours terminée avec succès');
    return Array.from(uniqueCourses.values());
  } catch (error) {
    console.error('Erreur lors de l\'importation des cours:', error);
    throw error;
  }
}

// Fonction pour importer les sessions depuis un fichier CSV
async function importSessions(filePath: string) {
  console.log(`Importation des sessions depuis ${filePath}...`);

  try {
    // Lire le fichier CSV
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    // Récupérer tous les cours
    const courses = db.select().from(schema.courses).all();
    const courseMap = new Map(courses.map(course => [course.name, course.id]));

    // Récupérer tous les professeurs
    const professors = db.select().from(schema.users)
      .where(eq(schema.users.role, 'professor'))
      .all();
    const professorMap = new Map();

    for (const prof of professors) {
      professorMap.set(prof.firstName + ' ' + prof.lastName, prof.id);
    }

    // Créer un professeur par défaut si nécessaire
    if (professorMap.size === 0) {
      const defaultProfName = 'Professor English';
      console.log(`Aucun professeur trouvé. Création d'un professeur par défaut: ${defaultProfName}`);

      // Vérifier si l'utilisateur existe déjà
      const existingUser = db.select().from(schema.users)
        .where(eq(schema.users.username, 'professor'))
        .all();

      let professorId;
      if (existingUser.length === 0) {
        // Créer un nouvel utilisateur professeur
        const result = db.insert(schema.users).values({
          username: 'professor',
          password: '$2b$10$XpC5Jgr.QQnIGKBYYBR0nOQMT7.H5uHm5rqJqZ8.Qo8ZgQ8hW3vUe', // 'password' hashé
          email: 'professor@kodjo.english',
          firstName: 'Professor',
          lastName: 'English',
          role: 'professor',
          points: 0,
          createdAt: Date.now()
        }).run();

        professorId = result.lastInsertRowid;
        console.log(`Professeur créé avec ID: ${professorId}`);
      } else {
        professorId = existingUser[0].id;
        console.log(`Professeur existant avec ID: ${professorId}`);
      }

      professorMap.set(defaultProfName, professorId);
    }

    // Insérer les sessions dans la base de données
    console.log(`Importation de ${records.length} sessions...`);
    let sessionCount = 0;

    for (const record of records) {
      const courseName = record.Course;
      const courseId = courseMap.get(courseName);

      if (!courseId) {
        console.warn(`Cours non trouvé: ${courseName}. Session ignorée.`);
        continue;
      }

      const professorName = record.Professor;
      const professorId = professorMap.get(professorName);

      if (!professorId) {
        console.warn(`Professeur non trouvé: ${professorName}. Session ignorée.`);
        continue;
      }

      // Convertir la date au format timestamp
      const scheduledDate = dateToTimestamp(record.Date);

      // Créer la session
      const session = {
        courseId,
        sessionNumber: ++sessionCount,
        professorId,
        scheduledDate,
        scheduledTime: record.Time,
        timeZone: 'GMT',
        zoomMeetingUrl: record['Zoom Link'],
        status: 'scheduled',
        createdAt: Date.now()
      };

      // Vérifier si la session existe déjà
      const existingSessions = db.select().from(schema.sessions)
        .where(eq(schema.sessions.courseId, courseId))
        .where(eq(schema.sessions.scheduledDate, scheduledDate))
        .where(eq(schema.sessions.scheduledTime, record.Time))
        .all();

      // Supprimer les sessions existantes pour éviter les doublons
      if (existingSessions.length > 0) {
        for (const existingSession of existingSessions) {
          db.delete(schema.sessions)
            .where(eq(schema.sessions.id, existingSession.id))
            .run();
          console.log(`Session supprimée: ${courseName} le ${record.Date} à ${record.Time}`);
        }
      }

      // Insérer la nouvelle session
      db.insert(schema.sessions).values(session).run();
      console.log(`Session créée: ${courseName} le ${record.Date} à ${record.Time}`);
    }

    console.log('Importation des sessions terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'importation des sessions:', error);
    throw error;
  }
}

// Fonction principale pour importer toutes les données
async function importAllData() {
  try {
    const csvFilePath = path.resolve(__dirname, '../data/csv/dynamic_schedule.csv');

    // Importer les cours
    await importCourses(csvFilePath);

    // Importer les sessions
    await importSessions(csvFilePath);

    console.log('Importation de toutes les données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'importation des données:', error);
  }
}

// Exécuter l'importation
importAllData().then(() => {
  console.log('Script d\'importation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'importation:', error);
});
