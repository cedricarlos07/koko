const Database = require('better-sqlite3');

// Créer une connexion à la base de données
const db = new Database('./data/kodjo-english-v2.db');

// Activer le mode transaction
db.prepare('BEGIN TRANSACTION').run();

try {
  // Trouver les groupes Telegram redondants
  const duplicateGroups = db.prepare(`
    SELECT telegram_group, COUNT(*) as count
    FROM fixed_schedules
    WHERE telegram_group IS NOT NULL AND telegram_group != ''
    GROUP BY telegram_group
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `).all();

  console.log(`Nombre de groupes Telegram redondants: ${duplicateGroups.length}`);

  // Pour chaque groupe redondant, garder un seul enregistrement et mettre à jour les autres
  duplicateGroups.forEach((group, index) => {
    console.log(`\nTraitement du groupe redondant #${index + 1}: ${group.telegram_group} (${group.count} occurrences)`);
    
    // Récupérer tous les cours qui utilisent ce groupe Telegram
    const courses = db.prepare(`
      SELECT id, course_name, teacher_name, level, day, time
      FROM fixed_schedules
      WHERE telegram_group = ?
      ORDER BY id
    `).all(group.telegram_group);
    
    // Garder le premier enregistrement et générer des noms de groupe uniques pour les autres
    courses.forEach((course, courseIndex) => {
      if (courseIndex === 0) {
        console.log(`  Garder l'enregistrement: ID=${course.id}, Cours=${course.course_name}, Coach=${course.teacher_name}`);
      } else {
        // Générer un nouveau nom de groupe Telegram unique
        const newTelegramGroup = `${group.telegram_group}_${courseIndex}`;
        
        // Mettre à jour l'enregistrement avec le nouveau nom de groupe
        db.prepare(`
          UPDATE fixed_schedules
          SET telegram_group = ?
          WHERE id = ?
        `).run(newTelegramGroup, course.id);
        
        console.log(`  Mise à jour de l'enregistrement: ID=${course.id}, Cours=${course.course_name}, Coach=${course.teacher_name}, Nouveau groupe=${newTelegramGroup}`);
      }
    });
  });

  // Valider la transaction
  db.prepare('COMMIT').run();
  console.log('\nMise à jour des groupes Telegram redondants terminée avec succès');
} catch (error) {
  // Annuler la transaction en cas d'erreur
  db.prepare('ROLLBACK').run();
  console.error('Erreur lors de la mise à jour des groupes Telegram redondants:', error);
}

// Fermer la connexion à la base de données
db.close();
