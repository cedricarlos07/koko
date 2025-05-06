import cron from 'node-cron';
import { db } from './db';
import { automationRules, templateMessages, sessions, courses, users } from '@shared/schema';
import { eq, and, gt, lte, gte, lt } from 'drizzle-orm';
import { sendCourseReminder, sendAnnouncement, sendBadgeNotification, sendCourseMessage } from './telegram';
import { createZoomMeeting } from './zoom';
import { storage } from './storage';
import { format } from 'date-fns';

// Initialisation du moteur d'automatisation
export function initAutomationEngine() {
  console.log("Initialisation du moteur d'automatisation...");

  // Planifier les tâches CRON
  scheduleCronTasks();

  // Planifier les autres automatisations (session-before, etc.)
  scheduleSessionBasedTasks();

  // Planifier l'envoi matinal des messages de cours
  scheduleDailyCoursesMessages();

  console.log("Moteur d'automatisation initialisé avec succès!");
}

// Planifier les tâches CRON
async function scheduleCronTasks() {
  try {
    // Récupérer toutes les règles d'automatisation basées sur CRON
    const cronRules = await db.select()
      .from(automationRules)
      .where(and(
        eq(automationRules.triggerType, 'cron-schedule'),
        eq(automationRules.isActive, true)
      ));

    console.log(`Planification de ${cronRules.length} tâches CRON`);

    // Planifier chaque tâche CRON
    cronRules.forEach(rule => {
      const cronExpression = rule.triggerData;

      if (cron.validate(cronExpression)) {
        cron.schedule(cronExpression, async () => {
          console.log(`Exécution de la tâche CRON: ${rule.name}`);
          await executeAutomationRule(rule);
        });
        console.log(`Tâche CRON planifiée: ${rule.name} (${cronExpression})`);
      } else {
        console.error(`Expression CRON invalide pour la règle ${rule.name}: ${cronExpression}`);
      }
    });
  } catch (error) {
    console.error("Erreur lors de la planification des tâches CRON:", error);
  }
}

// Planifier les automatisations basées sur les sessions
function scheduleSessionBasedTasks() {
  // Vérifier toutes les 5 minutes les sessions à venir
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Récupérer les règles d'automatisation basées sur les sessions
      const sessionRules = await db.select()
        .from(automationRules)
        .where(and(
          eq(automationRules.triggerType, 'session-before'),
          eq(automationRules.isActive, true)
        ));

      if (sessionRules.length === 0) return;

      // Récupérer les sessions à venir dans les prochaines 24 heures
      const now = new Date();
      const in24Hours = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      const upcomingSessions = await db.select()
        .from(sessions)
        .where(and(
          gt(sessions.scheduledDate, now),
          lte(sessions.scheduledDate, in24Hours)
        ));

      for (const session of upcomingSessions) {
        for (const rule of sessionRules) {
          // Temps avant la session en secondes
          const secondsBefore = parseInt(rule.triggerData);
          if (isNaN(secondsBefore)) continue;

          const sessionTime = new Date(session.scheduledDate).getTime();
          const triggerTime = sessionTime - (secondsBefore * 1000);
          const currentTime = now.getTime();

          // Si c'est le moment d'exécuter l'automatisation (dans un intervalle de 5 minutes)
          if (triggerTime <= currentTime && triggerTime >= (currentTime - 5 * 60 * 1000)) {
            console.log(`Exécution de l'automatisation "${rule.name}" pour la session #${session.sessionNumber}`);
            await executeSessionAutomation(rule, session);
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des sessions à venir:", error);
    }
  });

  console.log("Automatisations basées sur les sessions planifiées");
}

// Exécuter une règle d'automatisation CRON
async function executeAutomationRule(rule: typeof automationRules.$inferSelect) {
  try {
    // Si l'action est d'envoyer un message Telegram
    if (rule.actionType === 'send-telegram') {
      await executeTelegramMessageAction(rule);
    }
    // Si l'action est de créer une réunion Zoom
    else if (rule.actionType === 'create-zoom') {
      await executeZoomMeetingCreation(rule);
    }

    // Enregistrer l'exécution de l'automatisation
    await storage.logActivity({
      type: "automation_executed",
      description: `Automatisation "${rule.name}" exécutée avec succès`,
      metadata: JSON.stringify(rule),
      createdAt: new Date()
    });
  } catch (error) {
    console.error(`Erreur lors de l'exécution de l'automatisation "${rule.name}":`, error);

    // Enregistrer l'erreur
    await storage.logActivity({
      type: "automation_error",
      description: `Erreur lors de l'exécution de l'automatisation "${rule.name}"`,
      metadata: JSON.stringify({ rule, error: error.message }),
      createdAt: new Date()
    });
  }
}

// Exécuter une automatisation basée sur une session
async function executeSessionAutomation(rule: typeof automationRules.$inferSelect, session: typeof sessions.$inferSelect) {
  try {
    // Si l'action est d'envoyer un message Telegram
    if (rule.actionType === 'send-telegram') {
      await executeTelegramSessionMessage(rule, session);
    }
    // Si l'action est de créer une réunion Zoom
    else if (rule.actionType === 'create-zoom') {
      await executeZoomSessionCreation(rule, session);
    }

    // Enregistrer l'exécution de l'automatisation
    await storage.logActivity({
      type: "automation_executed",
      description: `Automatisation "${rule.name}" exécutée pour la session #${session.sessionNumber}`,
      metadata: JSON.stringify({ rule, sessionId: session.id }),
      createdAt: new Date()
    });
  } catch (error) {
    console.error(`Erreur lors de l'exécution de l'automatisation "${rule.name}" pour la session #${session.sessionNumber}:`, error);

    // Enregistrer l'erreur
    await storage.logActivity({
      type: "automation_error",
      description: `Erreur lors de l'exécution de l'automatisation "${rule.name}" pour la session #${session.sessionNumber}`,
      metadata: JSON.stringify({ rule, sessionId: session.id, error: error.message }),
      createdAt: new Date()
    });
  }
}

// Exécuter une action d'envoi de message Telegram pour une tâche CRON
async function executeTelegramMessageAction(rule: typeof automationRules.$inferSelect) {
  // Récupérer le template de message
  const templateId = parseInt(rule.actionData);
  if (isNaN(templateId)) {
    throw new Error(`ID de template invalide: ${rule.actionData}`);
  }

  const template = await db.select()
    .from(templateMessages)
    .where(eq(templateMessages.id, templateId))
    .then(rows => rows[0]);

  if (!template) {
    throw new Error(`Template avec l'ID ${templateId} non trouvé`);
  }

  // Récupérer les cours et les sessions pour aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySessions = await db.select({
    session: sessions,
    course: courses,
  })
  .from(sessions)
  .leftJoin(courses, eq(sessions.courseId, courses.id))
  .where(and(
    gte(sessions.scheduledDate, today),
    lt(sessions.scheduledDate, tomorrow)
  ));

  // Pour chaque session, envoyer un message dans le groupe Telegram correspondant
  for (const { session, course } of todaySessions) {
    if (!course.telegramGroupLink) continue;

    // Récupérer l'instructeur
    let instructor = "Instructeur";
    if (session.professorId) {
      const professor = await storage.getUser(session.professorId);
      if (professor) {
        instructor = `${professor.firstName} ${professor.lastName}`;
      }
    }

    // Préparer les données pour le template
    const sessionTime = `${session.scheduledTime} ${session.timeZone || 'GMT'}`;
    const sessionDate = new Date(session.scheduledDate).toLocaleDateString();

    // Remplacer les variables dans le template
    let messageContent = template.content
      .replace(/{course}/g, course.name)
      .replace(/{instructor}/g, instructor)
      .replace(/{time}/g, sessionTime)
      .replace(/{date}/g, sessionDate)
      .replace(/{zoom_link}/g, session.zoomMeetingUrl || "#");

    // Envoyer le message via Telegram
    await sendCourseReminder(course.telegramGroupLink, course.name, messageContent);

    console.log(`Message envoyé pour le cours ${course.name} dans le groupe Telegram`);
  }
}

// Exécuter une action d'envoi de message Telegram pour une session spécifique
async function executeTelegramSessionMessage(rule: typeof automationRules.$inferSelect, session: typeof sessions.$inferSelect) {
  // Récupérer le template de message
  const templateId = parseInt(rule.actionData);
  if (isNaN(templateId)) {
    throw new Error(`ID de template invalide: ${rule.actionData}`);
  }

  const template = await db.select()
    .from(templateMessages)
    .where(eq(templateMessages.id, templateId))
    .then(rows => rows[0]);

  if (!template) {
    throw new Error(`Template avec l'ID ${templateId} non trouvé`);
  }

  // Récupérer le cours
  const course = await db.select()
    .from(courses)
    .where(eq(courses.id, session.courseId))
    .then(rows => rows[0]);

  if (!course || !course.telegramGroupLink) {
    throw new Error(`Cours non trouvé ou lien Telegram manquant pour la session #${session.sessionNumber}`);
  }

  // Récupérer l'instructeur
  let instructor = "Instructeur";
  if (session.professorId) {
    const professor = await storage.getUser(session.professorId);
    if (professor) {
      instructor = `${professor.firstName} ${professor.lastName}`;
    }
  }

  // Préparer les données pour le template
  const sessionTime = `${session.scheduledTime} ${session.timeZone || 'GMT'}`;
  const sessionDate = new Date(session.scheduledDate).toLocaleDateString();

  // Remplacer les variables dans le template
  let messageContent = template.content
    .replace(/{course}/g, course.name)
    .replace(/{instructor}/g, instructor)
    .replace(/{time}/g, sessionTime)
    .replace(/{date}/g, sessionDate)
    .replace(/{zoom_link}/g, session.zoomMeetingUrl || "#");

  // Envoyer le message via Telegram
  await sendCourseReminder(course.telegramGroupLink, course.name, messageContent);

  console.log(`Message envoyé pour la session #${session.sessionNumber} du cours ${course.name}`);
}

// Créer des réunions Zoom pour toutes les sessions du jour
async function executeZoomMeetingCreation(rule: typeof automationRules.$inferSelect) {
  // Récupérer les sessions pour aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySessions = await db.select({
    session: sessions,
    course: courses,
  })
  .from(sessions)
  .leftJoin(courses, eq(sessions.courseId, courses.id))
  .where(and(
    gte(sessions.scheduledDate, today),
    lt(sessions.scheduledDate, tomorrow),
    eq(sessions.zoomMeetingId, null)
  ));

  // Pour chaque session, créer une réunion Zoom
  for (const { session, course } of todaySessions) {
    // Récupérer l'instructeur
    let instructorName = "Instructeur";
    if (session.professorId) {
      const professor = await storage.getUser(session.professorId);
      if (professor) {
        instructorName = `${professor.firstName} ${professor.lastName}`;
      }
    }

    // Créer une réunion Zoom
    const meetingTime = new Date(session.scheduledDate);
    const topic = `${course.name} - Session #${session.sessionNumber}`;
    const duration = 60; // Durée par défaut: 60 minutes

    try {
      const meeting = await createZoomMeeting(topic, meetingTime, duration, instructorName);

      // Mettre à jour la session avec les informations de la réunion Zoom
      await db.update(sessions)
        .set({
          zoomMeetingId: meeting.id,
          zoomMeetingUrl: meeting.join_url
        })
        .where(eq(sessions.id, session.id));

      console.log(`Réunion Zoom créée pour la session #${session.sessionNumber} du cours ${course.name}`);
    } catch (error) {
      console.error(`Erreur lors de la création de la réunion Zoom pour la session #${session.sessionNumber}:`, error);
    }
  }
}

// Créer une réunion Zoom pour une session spécifique
async function executeZoomSessionCreation(rule: typeof automationRules.$inferSelect, session: typeof sessions.$inferSelect) {
  // Vérifier si la session a déjà une réunion Zoom
  if (session.zoomMeetingId) {
    console.log(`La session #${session.sessionNumber} a déjà une réunion Zoom`);
    return;
  }

  // Récupérer le cours
  const course = await db.select()
    .from(courses)
    .where(eq(courses.id, session.courseId))
    .then(rows => rows[0]);

  if (!course) {
    throw new Error(`Cours non trouvé pour la session #${session.sessionNumber}`);
  }

  // Récupérer l'instructeur
  let instructorName = "Instructeur";
  if (session.professorId) {
    const professor = await storage.getUser(session.professorId);
    if (professor) {
      instructorName = `${professor.firstName} ${professor.lastName}`;
    }
  }

  // Créer une réunion Zoom
  const meetingTime = new Date(session.scheduledDate);
  const topic = `${course.name} - Session #${session.sessionNumber}`;
  const duration = 60; // Durée par défaut: 60 minutes

  const meeting = await createZoomMeeting(topic, meetingTime, duration, instructorName);

  // Mettre à jour la session avec les informations de la réunion Zoom
  await db.update(sessions)
    .set({
      zoomMeetingId: meeting.id,
      zoomMeetingUrl: meeting.join_url
    })
    .where(eq(sessions.id, session.id));

  console.log(`Réunion Zoom créée pour la session #${session.sessionNumber} du cours ${course.name}`);
}

// Planifier l'envoi matinal des messages de cours
function scheduleDailyCoursesMessages() {
  // Par défaut, planifier l'envoi à 6h GMT tous les jours
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log("Exécution de l'envoi matinal des messages de cours...");
      await sendDailyCoursesMessages();
    } catch (error) {
      console.error("Erreur lors de l'envoi matinal des messages de cours:", error);
    }
  });

  // Vérifier s'il existe des règles d'automatisation spécifiques pour l'envoi matinal
  checkForCustomDailyMessageRules();

  console.log("Envoi matinal des messages de cours planifié");
}

// Vérifier s'il existe des règles d'automatisation spécifiques pour l'envoi matinal
async function checkForCustomDailyMessageRules() {
  try {
    // Récupérer les règles d'automatisation pour l'envoi matinal
    const dailyMessageRules = await db.select()
      .from(automationRules)
      .where(and(
        eq(automationRules.triggerType, 'daily-courses-message'),
        eq(automationRules.isActive, true)
      ));

    // Pour chaque règle, planifier l'envoi à l'heure spécifiée
    for (const rule of dailyMessageRules) {
      if (rule.sendTime) {
        const [hours, minutes] = rule.sendTime.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const cronExpression = `${minutes} ${hours} * * *`;

          if (cron.validate(cronExpression)) {
            cron.schedule(cronExpression, async () => {
              console.log(`Exécution de l'envoi matinal des messages de cours selon la règle "${rule.name}"...`);
              await sendDailyCoursesMessages(rule);
            });
            console.log(`Envoi matinal des messages de cours planifié selon la règle "${rule.name}" (${cronExpression})`);

            // Mettre à jour la prochaine date d'envoi
            const nextSend = getNextExecutionTime(cronExpression);
            await db.update(automationRules)
              .set({ nextSend })
              .where(eq(automationRules.id, rule.id));
          } else {
            console.error(`Expression CRON invalide pour la règle ${rule.name}: ${cronExpression}`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des règles d'envoi matinal:", error);
  }
}

// Obtenir la prochaine date d'exécution d'une expression CRON
function getNextExecutionTime(cronExpression: string): Date {
  const interval = cron.schedule(cronExpression, () => {});
  const nextDate = interval.nextDate().toDate();
  interval.stop();
  return nextDate;
}

// Envoyer les messages de cours du jour
export async function sendDailyCoursesMessages(rule?: typeof automationRules.$inferSelect) {
  try {
    // Récupérer la date du jour
    const today = new Date();

    // Récupérer les cours du jour
    const dailyCourses = await storage.getDailyCoursesForDate(today);

    if (dailyCourses.length === 0) {
      console.log("Aucun cours prévu aujourd'hui");
      return;
    }

    console.log(`${dailyCourses.length} cours prévus aujourd'hui`);

    // Récupérer le template de message pour les rappels de cours
    const templates = await storage.listTemplateMessages();
    const courseReminderTemplate = templates.find(t => t.type === 'course-reminder');

    if (!courseReminderTemplate) {
      console.error("Aucun template de message pour les rappels de cours n'a été trouvé");
      return;
    }

    // Pour chaque cours, envoyer un message dans le groupe Telegram correspondant
    for (const courseData of dailyCourses) {
      const { session, course, professorFirstName, professorLastName } = courseData;

      // Vérifier si le cours a un groupe Telegram
      if (!course.telegramGroupLink) {
        console.log(`Le cours ${course.name} n'a pas de groupe Telegram configuré`);
        continue;
      }

      // Préparer les données pour le message
      const instructorName = professorFirstName && professorLastName
        ? `${professorFirstName} ${professorLastName}`
        : "Instructeur";

      const sessionTime = `${session.scheduledTime} ${session.timeZone || 'GMT'}`;
      const sessionDate = format(new Date(session.scheduledDate), 'dd/MM/yyyy');

      // Créer une réunion Zoom si nécessaire
      if (!session.zoomMeetingUrl) {
        try {
          const meetingTime = new Date(session.scheduledDate);
          const topic = `${course.name} - Session #${session.sessionNumber}`;
          const duration = 60; // Durée par défaut: 60 minutes

          const meeting = await createZoomMeeting(topic, meetingTime, duration, instructorName);

          // Mettre à jour la session avec les informations de la réunion Zoom
          await db.update(sessions)
            .set({
              zoomMeetingId: meeting.id,
              zoomMeetingUrl: meeting.join_url
            })
            .where(eq(sessions.id, session.id));

          session.zoomMeetingUrl = meeting.join_url;
          console.log(`Réunion Zoom créée pour la session #${session.sessionNumber} du cours ${course.name}`);
        } catch (error) {
          console.error(`Erreur lors de la création de la réunion Zoom pour la session #${session.sessionNumber}:`, error);
        }
      }

      // Remplacer les variables dans le template
      let messageContent = courseReminderTemplate.content
        .replace(/{course}/g, course.name)
        .replace(/{instructor}/g, instructorName)
        .replace(/{time}/g, sessionTime)
        .replace(/{date}/g, sessionDate)
        .replace(/{zoom_link}/g, session.zoomMeetingUrl || "#");

      // Envoyer le message via Telegram
      try {
        // Utiliser la nouvelle fonction pour envoyer un message avec contenu personnalisé
        await sendCourseMessage(
          course.telegramGroupLink,
          messageContent
        );

        // Enregistrer le message envoyé
        await storage.createMessageLog({
          date: today,
          time: session.scheduledTime,
          courseId: course.id,
          sessionId: session.id,
          message: messageContent,
          status: "sent",
          telegramGroupId: course.telegramGroupLink,
          zoomLink: session.zoomMeetingUrl || "",
          createdAt: new Date()
        });

        console.log(`Message envoyé pour le cours ${course.name} dans le groupe Telegram`);
      } catch (error) {
        console.error(`Erreur lors de l'envoi du message pour le cours ${course.name}:`, error);

        // Enregistrer l'erreur
        await storage.createMessageLog({
          date: today,
          time: session.scheduledTime,
          courseId: course.id,
          sessionId: session.id,
          message: messageContent,
          status: "error",
          telegramGroupId: course.telegramGroupLink,
          zoomLink: session.zoomMeetingUrl || "",
          createdAt: new Date()
        });
      }
    }

    // Si une règle spécifique a été utilisée, mettre à jour sa dernière date d'exécution
    if (rule) {
      await db.update(automationRules)
        .set({ lastSent: new Date() })
        .where(eq(automationRules.id, rule.id));
    }

    // Enregistrer l'activité
    await storage.logActivity({
      type: "daily_messages_sent",
      description: `Messages de rappel envoyés pour ${dailyCourses.length} cours`,
      metadata: JSON.stringify({ date: today.toISOString() }),
      createdAt: new Date()
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi des messages de cours du jour:", error);

    // Enregistrer l'erreur
    await storage.logActivity({
      type: "daily_messages_error",
      description: "Erreur lors de l'envoi des messages de cours du jour",
      metadata: JSON.stringify({ error: error.message }),
      createdAt: new Date()
    });
  }
}