import { db } from './db';
import * as schema from '../shared/schema-sqlite';
import { eq } from 'drizzle-orm';

// Fonction pour importer les templates de messages
async function importTemplates() {
  console.log('Importation des templates de messages...');
  
  const templates = [
    {
      name: 'Rappel de cours matinal',
      type: 'course-reminder',
      content: `📚 *Cours du jour : {course}*
👨‍🏫 Prof : {instructor}
🕒 Heure : {time}
🔗 [👉 Lien Zoom ici]({zoom_link})

Bonne journée et soyez ponctuel·les ! 🎯`,
      createdAt: Date.now()
    },
    {
      name: 'Rappel 1h avant le cours',
      type: 'course-reminder',
      content: `⏰ *Rappel : Cours dans 1 heure*
📚 Cours : {course}
👨‍🏫 Prof : {instructor}
🕒 Heure : {time}
🔗 [👉 Lien Zoom ici]({zoom_link})

À tout de suite ! 🚀`,
      createdAt: Date.now()
    },
    {
      name: 'Message de bienvenue',
      type: 'welcome',
      content: `👋 *Bienvenue sur KODJO ENGLISH BOT !*

Nous sommes ravis de vous accueillir dans notre plateforme d'apprentissage d'anglais.

📚 Vous pouvez consulter vos cours programmés
🔔 Vous recevrez des notifications pour vos sessions
🏆 Gagnez des points et des badges en participant

N'hésitez pas à nous contacter si vous avez des questions !`,
      createdAt: Date.now()
    },
    {
      name: 'Annonce importante',
      type: 'announcement',
      content: `📢 *ANNONCE IMPORTANTE*

{message}

Merci de votre attention.`,
      createdAt: Date.now()
    }
  ];
  
  for (const template of templates) {
    // Vérifier si le template existe déjà
    const existingTemplate = db.select().from(schema.templateMessages)
      .where(eq(schema.templateMessages.name, template.name))
      .all();
    
    if (existingTemplate.length === 0) {
      db.insert(schema.templateMessages).values(template).run();
      console.log(`Template créé: ${template.name}`);
    } else {
      console.log(`Template existant: ${template.name}`);
    }
  }
  
  console.log('Importation des templates terminée avec succès');
}

// Fonction pour importer les règles d'automatisation
async function importAutomationRules() {
  console.log('Importation des règles d\'automatisation...');
  
  // Récupérer les templates
  const templates = db.select().from(schema.templateMessages).all();
  const templateMap = new Map(templates.map(t => [t.type, t.id]));
  
  const automationRules = [
    {
      name: 'Envoi matinal des messages de cours',
      description: 'Envoie automatiquement les messages de rappel pour les cours du jour',
      triggerType: 'daily-courses-message',
      triggerData: '0 6 * * *', // Tous les jours à 6h
      actionType: 'send-telegram',
      actionData: templateMap.get('course-reminder')?.toString() || '',
      isActive: true,
      sendTime: '06:00',
      timeZone: 'GMT',
      createdAt: Date.now()
    },
    {
      name: 'Rappel 1h avant chaque session',
      description: 'Envoie un rappel Telegram 1h avant chaque session',
      triggerType: 'session-before',
      triggerData: '3600', // 1 heure en secondes
      actionType: 'send-telegram',
      actionData: templateMap.get('course-reminder')?.toString() || '',
      isActive: true,
      createdAt: Date.now()
    },
    {
      name: 'Création automatique des réunions Zoom',
      description: 'Crée automatiquement les réunions Zoom 24h avant chaque session',
      triggerType: 'session-before',
      triggerData: '86400', // 24 heures en secondes
      actionType: 'create-zoom',
      actionData: 'topic={course}, duration=60, timezone=GMT',
      isActive: true,
      createdAt: Date.now()
    }
  ];
  
  for (const rule of automationRules) {
    // Vérifier si la règle existe déjà
    const existingRule = db.select().from(schema.automationRules)
      .where(eq(schema.automationRules.name, rule.name))
      .all();
    
    if (existingRule.length === 0) {
      db.insert(schema.automationRules).values(rule).run();
      console.log(`Règle d'automatisation créée: ${rule.name}`);
    } else {
      console.log(`Règle d'automatisation existante: ${rule.name}`);
    }
  }
  
  console.log('Importation des règles d\'automatisation terminée avec succès');
}

// Fonction principale pour importer toutes les données
async function importAllData() {
  try {
    // Importer les templates de messages
    await importTemplates();
    
    // Importer les règles d'automatisation
    await importAutomationRules();
    
    console.log('Importation de toutes les données terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'importation des données:', error);
  }
}

// Exécuter l'importation
importAllData().then(() => {
  console.log('Script d\'importation terminé');
}).catch(error => {
  console.error('Erreur dans le script d\'importation:', error);
});
