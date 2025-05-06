import { db } from './server/db';
import { templateMessages } from './shared/schema';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function createCourseReminderTemplate() {
  try {
    // Vérifier si un template de rappel de cours existe déjà
    const existingTemplates = await db.select()
      .from(templateMessages)
      .where({ type: 'course-reminder' });

    if (existingTemplates.length > 0) {
      console.log('Un template de rappel de cours existe déjà.');
      return;
    }

    // Créer le template de rappel de cours
    const template = {
      name: 'Rappel de cours matinal',
      type: 'course-reminder',
      content: `📚 *Cours du jour : {course}*
👨‍🏫 Prof : {instructor}
🕒 Heure : {time}
🔗 [👉 Lien Zoom ici]({zoom_link})

Bonne journée et soyez ponctuel·les ! 🎯`,
      createdAt: new Date()
    };

    const result = await db.insert(templateMessages)
      .values(template)
      .returning();

    console.log('Template de rappel de cours créé avec succès:', result[0]);
  } catch (error) {
    console.error('Erreur lors de la création du template de rappel de cours:', error);
  } finally {
    process.exit(0);
  }
}

// Exécuter la fonction
createCourseReminderTemplate();
