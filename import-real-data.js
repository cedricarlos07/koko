// Ce script importe les données réelles dans la base de données

const fs = require('fs');
const path = require('path');
const { db } = require('./server/db');
const schema = require('./shared/schema-fixed-schedule');

// Fonction principale pour importer les données réelles
async function importRealData() {
  try {
    // Lire les données réelles
    const realDataPath = path.join(__dirname, 'data', 'real_data.json');
    if (!fs.existsSync(realDataPath)) {
      console.error(`Le fichier ${realDataPath} n'existe pas`);
      process.exit(1);
    }
    
    const realData = JSON.parse(fs.readFileSync(realDataPath, 'utf8'));
    console.log(`${realData.length} cours trouvés dans le fichier real_data.json`);
    
    // Supprimer les données existantes
    await db.delete(schema.fixedSchedules).run();
    console.log('Données existantes supprimées');
    
    // Insérer les nouvelles données
    let insertedCount = 0;
    const now = Date.now();
    
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
    
    console.log(`Importation terminée: ${insertedCount} cours insérés sur ${realData.length}`);
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  }
}

// Exécuter l'importation
importRealData()
  .then(() => {
    console.log('Importation terminée avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors de l\'importation:', error);
    process.exit(1);
  });
