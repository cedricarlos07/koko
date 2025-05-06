// Script pour insérer les données réelles dans la base de données
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.resolve(__dirname, 'data/kodjo-english-v2.db');

// Vérifier si la base de données existe
if (!fs.existsSync(dbPath)) {
  console.error(`La base de données n'existe pas: ${dbPath}`);
  process.exit(1);
}

// Ouvrir la base de données
const db = new Database(dbPath);

// Données réelles extraites du fichier Excel
const realData = [
  {
    courseName: "Mina Lepsanovic - BBG - MW - 7:30pm",
    level: "bbg",
    teacherName: "Mina Lepsanovic",
    day: "monday",
    time: "20:30",
    duration: 60,
    telegramGroup: "-1001280305339",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Mina Lepsanovic - BBG - MW - 9:00pm",
    level: "bbg",
    teacherName: "Mina Lepsanovic",
    day: "monday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001706969621",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Maimouna Koffi - ABG - MW - 8:30pm",
    level: "abg",
    teacherName: "Maimouna Koffi",
    day: "monday",
    time: "21:30",
    duration: 60,
    telegramGroup: "-1001189215986",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Maimouna Koffi - ABG - MW - 7:00pm",
    level: "abg",
    teacherName: "Maimouna Koffi",
    day: "monday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001525896262",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Wissam Eddine - ABG - MW - 9:00pm",
    level: "abg",
    teacherName: "Wissam Eddine",
    day: "monday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001200673710",
    zoomHostEmail: "wissamj8@hotmail.com"
  },
  {
    courseName: "Wissam Eddine - ABG - MW - 7:00pm",
    level: "abg",
    teacherName: "Wissam Eddine",
    day: "monday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001450960271",
    zoomHostEmail: "wissamj8@hotmail.com"
  },
  {
    courseName: "Hafida Faraj - ABG - MW - 7:30pm",
    level: "abg",
    teacherName: "Hafida Faraj",
    day: "monday",
    time: "20:30",
    duration: 60,
    telegramGroup: "-1001674281614",
    zoomHostEmail: "hafidafaraj@gmail.com"
  },
  {
    courseName: "Hafida Faraj - ABG - MW - 9:00pm",
    level: "abg",
    teacherName: "Hafida Faraj",
    day: "monday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001730425484",
    zoomHostEmail: "hafidafaraj@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - ABG - MW - 8:00pm",
    level: "abg",
    teacherName: "Maryam Dannoun",
    day: "monday",
    time: "21:00",
    duration: 60,
    telegramGroup: "-1001183569832",
    zoomHostEmail: "missmiriamou@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - ABG - MW - 7:00pm",
    level: "abg",
    teacherName: "Maryam Dannoun",
    day: "monday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001539349411",
    zoomHostEmail: "missmiriamou@gmail.com"
  },
  {
    courseName: "Jahnvi Mahtani - IG - MW- 8:30pm",
    level: "ig",
    teacherName: "Jahnvi Mahtani",
    day: "monday",
    time: "21:30",
    duration: 60,
    telegramGroup: "-1001869970621",
    zoomHostEmail: "jahnvimahtani03@gmail.com"
  },
  {
    courseName: "Mina Lepsanovic - ABG - TT - 7:30pm",
    level: "abg",
    teacherName: "Mina Lepsanovic",
    day: "tuesday",
    time: "20:30",
    duration: 60,
    telegramGroup: "-1001668163742",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Mina Lepsanovic - ABG - TT - 9:00pm",
    level: "abg",
    teacherName: "Mina Lepsanovic",
    day: "tuesday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001737172709",
    zoomHostEmail: "minalepsanovic@gmail.com"
  },
  {
    courseName: "Maimouna Koffi BBG - TT - 8:30pm",
    level: "bbg",
    teacherName: "Maimouna Koffi",
    day: "tuesday",
    time: "21:30",
    duration: 60,
    telegramGroup: "-1001159742178",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Maimouna Koffi - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Maimouna Koffi",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001605585045",
    zoomHostEmail: "keita_maimouna@ymail.com"
  },
  {
    courseName: "Aby Ndiaye - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Aby Ndiaye",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001685687091",
    zoomHostEmail: "sy_aby@yahoo.fr"
  },
  {
    courseName: "Wissam Eddine - BBG -TT - 7:00pm",
    level: "bbg",
    teacherName: "Wissam Eddine",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001268663743",
    zoomHostEmail: "wissamj8@hotmail.com"
  },
  {
    courseName: "Hafida Faraj - ABG - TT - 9:00pm",
    level: "abg",
    teacherName: "Hafida Faraj",
    day: "tuesday",
    time: "22:00",
    duration: 60,
    telegramGroup: "-1001160001497",
    zoomHostEmail: "hafidafaraj@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - IG - TT - 7:00pm",
    level: "ig",
    teacherName: "Maryam Dannoun",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001272552537",
    zoomHostEmail: "missmiriamou@gmail.com"
  },
  {
    courseName: "Maryam Dannoun - ABG - TT - 8:00pm",
    level: "abg",
    teacherName: "Maryam Dannoun",
    day: "tuesday",
    time: "21:00",
    duration: 60,
    telegramGroup: "-1001247646684",
    zoomHostEmail: "missmiriamou@gmail.com"
  }
];

try {
  // Supprimer les données existantes
  db.prepare('DELETE FROM fixed_schedules').run();
  console.log('Données existantes supprimées');

  // Insérer les nouvelles données
  const now = Date.now();
  let insertedCount = 0;

  // Préparer la requête d'insertion
  const insertStmt = db.prepare(`
    INSERT INTO fixed_schedules (
      courseName, level, teacherName, day, time, duration,
      telegramGroup, zoomHostEmail, isActive, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  // Insérer chaque cours
  for (const course of realData) {
    try {
      insertStmt.run(
        course.courseName,
        course.level,
        course.teacherName,
        course.day,
        course.time,
        course.duration,
        course.telegramGroup,
        course.zoomHostEmail,
        1, // isActive = true
        now,
        now
      );

      insertedCount++;
      console.log(`Cours inséré: ${course.courseName} (${course.teacherName}) le ${course.day} à ${course.time}`);
    } catch (error) {
      console.error(`Erreur lors de l'insertion du cours ${course.courseName}:`, error);
    }
  }

  console.log(`Insertion terminée: ${insertedCount} cours insérés sur ${realData.length}`);
} catch (error) {
  console.error('Erreur lors de l\'insertion des données réelles:', error);
} finally {
  // Fermer la base de données
  db.close();
}
