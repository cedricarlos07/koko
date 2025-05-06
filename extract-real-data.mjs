// Ce script extrait les données réelles du fichier Excel et les sauvegarde dans un fichier JSON
// pour être utilisées dans l'application

import fs from 'fs';

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
    courseName: "Hanae El Kraid - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Hanae El Kraid",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001793277539",
    zoomHostEmail: "hanaeelkraid@gmail.com"
  },
  {
    courseName: "Nassiba Faiq - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Nassiba Faiq",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001821946148",
    zoomHostEmail: "nfaiq89@gmail.com"
  },
  {
    courseName: "Rasha Alaoui - BBG - TT - 7:00pm",
    level: "bbg",
    teacherName: "Rasha Alaoui",
    day: "tuesday",
    time: "20:00",
    duration: 60,
    telegramGroup: "-1001887667328",
    zoomHostEmail: "rasha.alasou@gmail.com"
  },
  {
    courseName: "Salma Choufani - ABG - SS - 2:00pm",
    level: "abg",
    teacherName: "Salma Choufani",
    day: "saturday",
    time: "15:00",
    duration: 60,
    telegramGroup: "-1002023369621",
    zoomHostEmail: "s.choufani98@gmail.com"
  },
  {
    courseName: "Farida Kelle - ABG - SS - 10:30am",
    level: "abg",
    teacherName: "Farida Kelle",
    day: "saturday",
    time: "11:30",
    duration: 60,
    telegramGroup: "-1001729177792",
    zoomHostEmail: "faridakelle@gmail.com"
  }
];

// Créer le répertoire data s'il n'existe pas
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// Sauvegarder les données dans un fichier JSON
fs.writeFileSync('data/real_data.json', JSON.stringify(realData, null, 2));

console.log('Données réelles extraites et sauvegardées dans data/real_data.json');

// Afficher les noms des professeurs uniques
const uniqueTeachers = [...new Set(realData.map(course => course.teacherName))];
console.log('\nProfesseurs uniques:');
uniqueTeachers.forEach(teacher => console.log(`- ${teacher}`));

// Afficher les niveaux uniques
const uniqueLevels = [...new Set(realData.map(course => course.level))];
console.log('\nNiveaux uniques:');
uniqueLevels.forEach(level => console.log(`- ${level}`));

// Afficher les jours uniques
const uniqueDays = [...new Set(realData.map(course => course.day))];
console.log('\nJours uniques:');
uniqueDays.forEach(day => console.log(`- ${day}`));
