import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';

// Initialize the bot with token from environment variables
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
let telegramBot: TelegramBot | null = null;

// Template placeholders
const TEMPLATE_PLACEHOLDERS = {
  COURSE_NAME: /\[Nom du cours\]/g,
  PROFESSOR_NAME: /\[Nom du prof\]/g,
  TIME: /\[Heure GMT\]/g,
  DATE: /\[Date\]/g,
  ZOOM_LINK: /\[Lien Zoom\]/g,
  MINUTES: /\[x\]/g,
  ANNOUNCEMENT: /\[Contenu de l'annonce depuis la chaîne Telegram\]/g,
  STUDENT_NAME: /\[Prénom\]/g,
  BADGE_NAME: /\[Nom du Badge\]/g,
};

// Initialize the Telegram bot
export const initTelegramBot = () => {
  if (!telegramToken) {
    console.warn('TELEGRAM_BOT_TOKEN not set. Telegram functionality will be disabled.');
    return null;
  }

  try {
    telegramBot = new TelegramBot(telegramToken, { polling: true });
    console.log('Telegram bot initialized successfully');

    // Listen for messages in groups
    telegramBot.on('message', handleMessage);

    return telegramBot;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    return null;
  }
};

// Handle incoming messages
const handleMessage = async (msg: TelegramBot.Message) => {
  // Skip messages from channels or non-group chats
  if (!msg.chat || msg.chat.type !== 'group' && msg.chat.type !== 'supergroup') {
    return;
  }

  // Skip messages from the bot itself
  if (msg.from?.is_bot) {
    return;
  }

  try {
    // Find the user by Telegram username
    const telegramUsername = msg.from?.username;
    if (!telegramUsername) return;

    const user = await storage.getUserByUsername(telegramUsername);
    if (!user) return;

    // Find which course this chat belongs to
    const courses = await storage.listCourses();
    const course = courses.find(c => c.telegramGroupLink?.includes(msg.chat.id.toString()));
    if (!course) return;

    // Determine message type
    let messageType = 'text';
    if (msg.photo) messageType = 'photo';
    if (msg.video) messageType = 'video';
    if (msg.voice) messageType = 'voice';
    if (msg.document) messageType = 'document';

    // Log the message activity
    await storage.createTelegramActivity({
      userId: user.id,
      courseId: course.id,
      messageType,
      messageCount: 1,
      date: Date.now(),
      createdAt: Date.now()
    });

    // Update user points (1 point per message)
    await storage.updateUser(user.id, {
      points: (user.points || 0) + 1
    });

    // Log the activity
    await storage.logActivity({
      userId: user.id,
      type: 'telegram_message',
      description: `User sent a ${messageType} message in ${course.name} group`,
      metadata: JSON.stringify({
        chatId: msg.chat.id,
        messageId: msg.message_id,
        courseId: course.id
      }),
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Error handling Telegram message:', error);
  }
};

// Send a course reminder
export const sendCourseReminder = async (
  chatId: string,
  courseName: string,
  professorName: string,
  time: string,
  date: string,
  zoomLink: string,
  minutesRemaining: number
) => {
  if (!telegramBot) {
    console.warn('Telegram bot not initialized. Cannot send reminder.');
    return false;
  }

  try {
    // Get the course reminder template
    const templates = await storage.listTemplateMessages();
    const reminderTemplate = templates.find(t => t.type === 'course-reminder');

    if (!reminderTemplate) {
      // Use default template if none is found
      const defaultTemplate = `📚 *Rappel de cours !*\n\n👨‍🏫 *Cours* : [Nom du cours]  \n🧑‍🏫 *Professeur* : [Nom du prof]  \n🕒 *Heure* : [Heure GMT]  \n📅 *Date* : [Date]  \n🔗 *Lien Zoom* : [Lien Zoom]\n\n⏰ Rappel : Commence dans [x] minutes. Sois à l'heure !`;

      let message = defaultTemplate
        .replace(TEMPLATE_PLACEHOLDERS.COURSE_NAME, courseName)
        .replace(TEMPLATE_PLACEHOLDERS.PROFESSOR_NAME, professorName)
        .replace(TEMPLATE_PLACEHOLDERS.TIME, time)
        .replace(TEMPLATE_PLACEHOLDERS.DATE, date)
        .replace(TEMPLATE_PLACEHOLDERS.ZOOM_LINK, zoomLink)
        .replace(TEMPLATE_PLACEHOLDERS.MINUTES, minutesRemaining.toString());

      await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      // Use the stored template
      let message = reminderTemplate.content
        .replace(TEMPLATE_PLACEHOLDERS.COURSE_NAME, courseName)
        .replace(TEMPLATE_PLACEHOLDERS.PROFESSOR_NAME, professorName)
        .replace(TEMPLATE_PLACEHOLDERS.TIME, time)
        .replace(TEMPLATE_PLACEHOLDERS.DATE, date)
        .replace(TEMPLATE_PLACEHOLDERS.ZOOM_LINK, zoomLink)
        .replace(TEMPLATE_PLACEHOLDERS.MINUTES, minutesRemaining.toString());

      await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Log the activity
    await storage.logActivity({
      userId: null,
      type: 'telegram_reminder',
      description: `Course reminder sent for ${courseName}`,
      metadata: JSON.stringify({
        chatId,
        courseName,
        time,
        date
      }),
      createdAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Error sending course reminder:', error);
    return false;
  }
};

// Send an announcement
export const sendAnnouncement = async (
  chatId: string,
  announcement: string
) => {
  if (!telegramBot) {
    console.warn('Telegram bot not initialized. Cannot send announcement.');
    return false;
  }

  try {
    // Get the announcement template
    const templates = await storage.listTemplateMessages();
    const announcementTemplate = templates.find(t => t.type === 'announcement');

    if (!announcementTemplate) {
      // Use default template if none is found
      const defaultTemplate = `🚀 *Annonce importante !*\n\n[Contenu de l'annonce depuis la chaîne Telegram]\n\n📢 Partagez dans vos groupes respectifs !`;

      let message = defaultTemplate
        .replace(TEMPLATE_PLACEHOLDERS.ANNOUNCEMENT, announcement);

      await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      // Use the stored template
      let message = announcementTemplate.content
        .replace(TEMPLATE_PLACEHOLDERS.ANNOUNCEMENT, announcement);

      await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Log the activity
    await storage.logActivity({
      userId: null,
      type: 'telegram_announcement',
      description: `Announcement sent to chat`,
      metadata: JSON.stringify({
        chatId,
        announcement: announcement.substring(0, 100) + (announcement.length > 100 ? '...' : '')
      }),
      createdAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Error sending announcement:', error);
    return false;
  }
};

// Send a badge award notification
export const sendBadgeNotification = async (
  chatId: string,
  studentName: string,
  badgeName: string
) => {
  if (!telegramBot) {
    console.warn('Telegram bot not initialized. Cannot send badge notification.');
    return false;
  }

  try {
    // Get the badge award template
    const templates = await storage.listTemplateMessages();
    const badgeTemplate = templates.find(t => t.type === 'badge-award');

    if (!badgeTemplate) {
      // Use default template if none is found
      const defaultTemplate = `🏅 *Félicitations [Prénom] !*  \nTu viens de recevoir le badge *[Nom du Badge]* pour ta participation exceptionnelle cette semaine !  \nContinue comme ça !`;

      let message = defaultTemplate
        .replace(TEMPLATE_PLACEHOLDERS.STUDENT_NAME, studentName)
        .replace(TEMPLATE_PLACEHOLDERS.BADGE_NAME, badgeName);

      await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      // Use the stored template
      let message = badgeTemplate.content
        .replace(TEMPLATE_PLACEHOLDERS.STUDENT_NAME, studentName)
        .replace(TEMPLATE_PLACEHOLDERS.BADGE_NAME, badgeName);

      await telegramBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }

    // Log the activity
    await storage.logActivity({
      userId: null,
      type: 'telegram_badge_notification',
      description: `Badge notification sent for ${studentName}`,
      metadata: JSON.stringify({
        chatId,
        studentName,
        badgeName
      }),
      createdAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Error sending badge notification:', error);
    return false;
  }
};

// Get the members of a group
export const getGroupMembers = async (chatId: string) => {
  if (!telegramBot) {
    console.warn('Telegram bot not initialized. Cannot get group members.');
    return [];
  }

  try {
    const chatMembers = await telegramBot.getChatMembersCount(chatId);
    return chatMembers;
  } catch (error) {
    console.error('Error getting group members:', error);
    return 0;
  }
};

// Export the bot instance for use in other parts of the application
export const getTelegramBot = () => telegramBot;

// Send a course message with custom content
export const sendCourseMessage = async (
  chatId: string,
  messageContent: string
) => {
  if (!telegramBot) {
    console.warn('Telegram bot not initialized. Cannot send course message.');
    return false;
  }

  try {
    await telegramBot.sendMessage(chatId, messageContent, { parse_mode: 'Markdown' });

    // Log the activity
    await storage.logActivity({
      userId: null,
      type: 'telegram_course_message',
      description: `Course message sent to chat`,
      metadata: JSON.stringify({
        chatId,
        messagePreview: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : '')
      }),
      createdAt: Date.now()
    });

    return true;
  } catch (error) {
    console.error('Error sending course message:', error);
    return false;
  }
};
