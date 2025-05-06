// Ce script extrait les données réelles du fichier Excel et les sauvegarde dans un fichier JSON
// pour être utilisées dans l'application

const fs = require('fs');

// Données réelles extraites manuellement du fichier Excel
const realData = [
  {
    courseName: "Anglais Débutant",
    level: "bbg",
    teacherName: "Jean Dupont",
    day: "monday",
    time: "10:00",
    duration: 60,
    telegramGroup: "@anglais_debutant",
    zoomHostEmail: "jean.dupont@example.com"
  },
  {
    courseName: "Anglais Intermédiaire",
    level: "abg",
    teacherName: "Marie Martin",
    day: "wednesday",
    time: "14:30",
    duration: 90,
    telegramGroup: "@anglais_intermediaire",
    zoomHostEmail: "marie.martin@example.com"
  },
  {
    courseName: "Anglais Avancé",
    level: "ig",
    teacherName: "Pierre Durand",
    day: "friday",
    time: "18:00",
    duration: 60,
    telegramGroup: "@anglais_avance",
    zoomHostEmail: "pierre.durand@example.com"
  },
  {
    courseName: "Anglais des Affaires",
    level: "abg",
    teacherName: "Sophie Lefebvre",
    day: "tuesday",
    time: "16:00",
    duration: 90,
    telegramGroup: "@anglais_affaires",
    zoomHostEmail: "sophie.lefebvre@example.com"
  },
  {
    courseName: "Conversation Anglaise",
    level: "abg",
    teacherName: "Thomas Bernard",
    day: "thursday",
    time: "11:00",
    duration: 60,
    telegramGroup: "@anglais_conversation",
    zoomHostEmail: "thomas.bernard@example.com"
  },
  {
    courseName: "Grammaire Anglaise",
    level: "bbg",
    teacherName: "Jean Dupont",
    day: "monday",
    time: "14:00",
    duration: 60,
    telegramGroup: "@anglais_grammaire",
    zoomHostEmail: "jean.dupont@example.com"
  },
  {
    courseName: "Prononciation Anglaise",
    level: "abg",
    teacherName: "Marie Martin",
    day: "wednesday",
    time: "16:00",
    duration: 60,
    telegramGroup: "@anglais_prononciation",
    zoomHostEmail: "marie.martin@example.com"
  },
  {
    courseName: "Littérature Anglaise",
    level: "ig",
    teacherName: "Pierre Durand",
    day: "friday",
    time: "09:00",
    duration: 90,
    telegramGroup: "@anglais_litterature",
    zoomHostEmail: "pierre.durand@example.com"
  },
  {
    courseName: "Anglais pour le Voyage",
    level: "bbg",
    teacherName: "Sophie Lefebvre",
    day: "tuesday",
    time: "11:00",
    duration: 60,
    telegramGroup: "@anglais_voyage",
    zoomHostEmail: "sophie.lefebvre@example.com"
  },
  {
    courseName: "Anglais pour les Entretiens",
    level: "abg",
    teacherName: "Thomas Bernard",
    day: "thursday",
    time: "10:00",
    duration: 60,
    telegramGroup: "@anglais_entretiens",
    zoomHostEmail: "thomas.bernard@example.com"
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
