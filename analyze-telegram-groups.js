const fs = require('fs');
const Database = require('better-sqlite3');

// Créer une connexion à la base de données
const db = new Database('./data/kodjo-english-v2.db');

// Récupérer tous les groupes Telegram
const telegramGroups = db.prepare('SELECT * FROM fixed_schedules').all();

// Créer une map pour détecter les groupes redondants
const groupsByTelegramId = new Map();
const duplicateGroups = [];

// Analyser les groupes
telegramGroups.forEach(group => {
  if (!group.telegramGroup) return;
  
  const telegramId = group.telegramGroup;
  
  if (groupsByTelegramId.has(telegramId)) {
    // Groupe redondant détecté
    duplicateGroups.push({
      original: groupsByTelegramId.get(telegramId),
      duplicate: group
    });
  } else {
    groupsByTelegramId.set(telegramId, group);
  }
});

// Afficher les statistiques
console.log(`Nombre total de groupes Telegram: ${telegramGroups.length}`);
console.log(`Nombre de groupes Telegram uniques: ${groupsByTelegramId.size}`);
console.log(`Nombre de groupes redondants: ${duplicateGroups.length}`);

// Afficher les détails des groupes redondants
if (duplicateGroups.length > 0) {
  console.log('\nDétails des groupes redondants:');
  duplicateGroups.forEach((duplicate, index) => {
    console.log(`\nGroupe redondant #${index + 1}:`);
    console.log(`Original: ID=${duplicate.original.id}, Cours=${duplicate.original.courseName}, Coach=${duplicate.original.teacherName}, Telegram=${duplicate.original.telegramGroup}`);
    console.log(`Doublon: ID=${duplicate.duplicate.id}, Cours=${duplicate.duplicate.courseName}, Coach=${duplicate.duplicate.teacherName}, Telegram=${duplicate.duplicate.telegramGroup}`);
  });
}

// Fermer la connexion à la base de données
db.close();
