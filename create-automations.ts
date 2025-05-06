import { db } from "./server/db";
import { eq } from "drizzle-orm";
import { templateMessages, automationRules } from "./shared/schema";

/**
 * Script pour créer des templates de messages et des automatisations préconfigurées
 */
async function createAutomations() {
  console.log("Création des templates de messages et des automatisations préconfigurées...");

  try {
    // Vérifier si des templates existent déjà
    const existingTemplates = await db.select().from(templateMessages);
    if (existingTemplates.length > 0) {
      console.log(`${existingTemplates.length} templates de messages existent déjà.`);
    } else {
      // Créer les templates de messages prédéfinis
      await db.insert(templateMessages).values([
        {
          name: "Rappel de cours quotidien",
          type: "course-reminder",
          content: `📚 *Cours du jour : {course}*
👨‍🏫 Prof : {instructor}
🕒 Heure : {time} GMT
🔗 [👉 Lien Zoom ici]({zoom_link})

Bonne journée et soyez ponctuel·les ! 🎯`
        },
        {
          name: "Annonce de devoir",
          type: "announcement",
          content: `📝 *Devoir pour le cours {course}*
Un nouveau devoir a été assigné par {instructor}.

📅 Date limite : {deadline}
📋 Description : {description}

N'hésitez pas à poser des questions si nécessaire.`
        },
        {
          name: "Attribution de badge",
          type: "badge-award",
          content: `🏆 *Félicitations, {name}!*
Vous avez obtenu un nouveau badge: **{badge_name}**

"{badge_description}"

Continuez votre excellent travail! 💪`
        },
        {
          name: "Message de bienvenue",
          type: "welcome",
          content: `👋 *Bienvenue dans le cours {course}!*

Nous sommes ravis de vous accueillir dans notre communauté d'apprentissage.
Voici quelques informations importantes :

📚 Niveau : {level}
👨‍🏫 Instructeur : {instructor}
📅 Jours de cours : {schedule}

Pour toute question, n'hésitez pas à contacter votre instructeur ou l'administration.
Bon apprentissage ! 🌟`
        },
      ]);

      console.log("✅ Templates de messages créés avec succès!");
    }

    // Vérifier si des automatisations existent déjà
    const existingAutomations = await db.select().from(automationRules);
    if (existingAutomations.length > 0) {
      console.log(`${existingAutomations.length} règles d'automatisation existent déjà.`);
    } else {
      // Récupérer l'ID du template de rappel de cours
      const [reminderTemplate] = await db.select()
        .from(templateMessages)
        .where(eq(templateMessages.name, "Rappel de cours quotidien"));
      
      const [welcomeTemplate] = await db.select()
        .from(templateMessages)
        .where(eq(templateMessages.name, "Message de bienvenue"));
        
      const [badgeTemplate] = await db.select()
        .from(templateMessages)
        .where(eq(templateMessages.name, "Attribution de badge"));

      // Créer les règles d'automatisation prédéfinies
      await db.insert(automationRules).values([
        {
          name: "Envoi matinal des cours du jour",
          description: "Envoie automatiquement un message à 6h GMT chaque jour pour les cours du jour dans les groupes Telegram",
          triggerType: "cron-schedule",
          triggerData: "0 6 * * *", // Tous les jours à 6h GMT
          actionType: "send-telegram",
          actionData: reminderTemplate ? reminderTemplate.id.toString() : "1",
          isActive: true
        },
        {
          name: "Création automatique des réunions Zoom",
          description: "Crée automatiquement des réunions Zoom pour les sessions à venir",
          triggerType: "session-before",
          triggerData: "86400", // 24 heures avant (en secondes)
          actionType: "create-zoom",
          actionData: "topic={course}, duration=60, timezone=GMT",
          isActive: true
        },
        {
          name: "Message de bienvenue aux nouveaux étudiants",
          description: "Envoie un message de bienvenue aux nouveaux étudiants inscrits à un cours",
          triggerType: "new-user",
          triggerData: "role=student",
          actionType: "send-telegram",
          actionData: welcomeTemplate ? welcomeTemplate.id.toString() : "4",
          isActive: true
        },
        {
          name: "Rappel 15 minutes avant le cours",
          description: "Envoie un rappel 15 minutes avant le début d'un cours",
          triggerType: "session-before",
          triggerData: "900", // 15 minutes avant (en secondes)
          actionType: "send-telegram",
          actionData: reminderTemplate ? reminderTemplate.id.toString() : "1",
          isActive: true
        },
        {
          name: "Notification de badge attribué",
          description: "Envoie une notification quand un badge est attribué à un utilisateur",
          triggerType: "badge-awarded",
          triggerData: "any",
          actionType: "send-telegram",
          actionData: badgeTemplate ? badgeTemplate.id.toString() : "3",
          isActive: true
        },
      ]);

      console.log("✅ Règles d'automatisation créées avec succès!");
    }

    console.log("Opération terminée avec succès!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de la création des automatisations:", error);
    process.exit(1);
  }
}

// Exécuter la fonction principale
createAutomations();