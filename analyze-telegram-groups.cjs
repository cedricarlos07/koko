const Database = require('better-sqlite3');

// Créer une connexion à la base de données
const db = new Database('./data/kodjo-english-v2.db');

// Compter le nombre total de groupes Telegram
const totalCount = db.prepare("SELECT COUNT(*) as count FROM fixed_schedules WHERE telegram_group IS NOT NULL AND telegram_group != ''").get();

// Compter le nombre de groupes Telegram uniques
const uniqueCount = db.prepare("SELECT COUNT(DISTINCT telegram_group) as count FROM fixed_schedules WHERE telegram_group IS NOT NULL AND telegram_group != ''").get();

// Trouver les groupes Telegram redondants
const duplicateGroups = db.prepare(`
  SELECT telegram_group, COUNT(*) as count
  FROM fixed_schedules
  WHERE telegram_group IS NOT NULL AND telegram_group != ''
  GROUP BY telegram_group
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
`).all();

// Afficher les statistiques
console.log(`Nombre total de groupes Telegram: ${totalCount.count}`);
console.log(`Nombre de groupes Telegram uniques: ${uniqueCount.count}`);
console.log(`Nombre de groupes Telegram redondants: ${duplicateGroups.length}`);

// Afficher les détails des groupes redondants
if (duplicateGroups.length > 0) {
  console.log('\nDétails des groupes redondants:');
  
  duplicateGroups.forEach((group, index) => {
    console.log(`\nGroupe redondant #${index + 1}: ${group.telegram_group} (${group.count} occurrences)`);
    
    // Récupérer tous les cours qui utilisent ce groupe Telegram
    const courses = db.prepare(`
      SELECT id, course_name, teacher_name, level, day, time
      FROM fixed_schedules
      WHERE telegram_group = ?
      ORDER BY id
    `).all(group.telegram_group);
    
    courses.forEach((course, courseIndex) => {
      console.log(`  ${courseIndex + 1}. ID=${course.id}, Cours=${course.course_name}, Coach=${course.teacher_name}, Niveau=${course.level}, Jour=${course.day}, Heure=${course.time}`);
    });
  });
}

// Fermer la connexion à la base de données
db.close();
