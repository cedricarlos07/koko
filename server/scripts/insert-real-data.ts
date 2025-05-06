import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';

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

// Fonction pour insérer les données réelles dans la base de données
async function insertRealData() {
  try {
    console.log('Insertion des données réelles dans la base de données...');
    
    // Supprimer les données existantes
    await db.delete(schema.fixedSchedules).run();
    console.log('Données existantes supprimées');
    
    // Insérer les nouvelles données
    const now = Date.now();
    let insertedCount = 0;
    
    for (const course of realData) {
      try {
        // Insérer dans la base de données
        await db.insert(schema.fixedSchedules).values({
          courseName: course.courseName,
          level: course.level,
          teacherName: course.teacherName,
          day: course.day,
          time: course.time,
          duration: course.duration,
          telegramGroup: course.telegramGroup,
          zoomHostEmail: course.zoomHostEmail,
          isActive: true,
          createdAt: now,
          updatedAt: now
        }).run();
        
        insertedCount++;
        console.log(`Cours inséré: ${course.courseName} (${course.teacherName}) le ${course.day} à ${course.time}`);
      } catch (error) {
        console.error(`Erreur lors de l'insertion du cours ${course.courseName}:`, error);
      }
    }
    
    console.log(`Insertion terminée: ${insertedCount} cours insérés sur ${realData.length}`);
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données réelles:', error);
  }
}

// Exécuter l'insertion
insertRealData()
  .then(() => {
    console.log('Données réelles insérées avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors de l\'insertion des données réelles:', error);
    process.exit(1);
  });
