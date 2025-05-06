import {
  User, InsertUser,
  Course, InsertCourse,
  Session, InsertSession,
  Attendance, InsertAttendance,
  TelegramActivity, InsertTelegramActivity,
  Badge, InsertBadge,
  UserBadge, InsertUserBadge,
  AutomationRule, InsertAutomationRule,
  TemplateMessage, InsertTemplateMessage,
  ActivityLog, InsertActivityLog,
  MessageLog, InsertMessageLog,
  users, courses, sessions, attendance, telegramActivity,
  badges, userBadges, automationRules, templateMessages, activityLogs, messageLogs
} from "@shared/schema-sqlite";
import { db, sqlite } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import SQLiteStore from "better-sqlite3-session-store";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const SQLiteStoreFactory = SQLiteStore(session);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Course operations
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, courseData: Partial<Course>): Promise<Course | undefined>;
  listCourses(): Promise<Course[]>;
  deleteCourse(id: number): Promise<boolean>;

  // Session operations
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, sessionData: Partial<Session>): Promise<Session | undefined>;
  listSessions(): Promise<Session[]>;
  listUpcomingSessions(limit?: number): Promise<any[]>;
  deleteSession(id: number): Promise<boolean>;

  // Attendance operations
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getSessionAttendance(sessionId: number): Promise<Attendance[]>;
  getUserAttendance(userId: number): Promise<Attendance[]>;

  // Telegram operations
  createTelegramActivity(activity: InsertTelegramActivity): Promise<TelegramActivity>;
  getTelegramActivityByUser(userId: number): Promise<TelegramActivity[]>;
  getTelegramActivityByCourse(courseId: number): Promise<TelegramActivity[]>;
  getTelegramGroupStats(): Promise<any[]>;

  // Badge operations
  getBadge(id: number): Promise<Badge | undefined>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  listBadges(): Promise<Badge[]>;
  awardBadgeToUser(userBadge: InsertUserBadge): Promise<UserBadge>;
  getUserBadges(userId: number): Promise<any[]>;

  // Automation operations
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  getAutomationRule(id: number): Promise<AutomationRule | undefined>;
  listAutomationRules(): Promise<AutomationRule[]>;
  updateAutomationRule(id: number, ruleData: Partial<AutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: number): Promise<boolean>;

  // Template operations
  createTemplateMessage(template: InsertTemplateMessage): Promise<TemplateMessage>;
  getTemplateMessage(id: number): Promise<TemplateMessage | undefined>;
  listTemplateMessages(): Promise<TemplateMessage[]>;
  updateTemplateMessage(id: number, templateData: Partial<TemplateMessage>): Promise<TemplateMessage | undefined>;
  deleteTemplateMessage(id: number): Promise<boolean>;

  // Activity log operations
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivity(limit?: number): Promise<any[]>;

  // Message log operations
  createMessageLog(messageLog: InsertMessageLog): Promise<MessageLog>;
  getMessageLogs(limit?: number): Promise<MessageLog[]>;
  getMessageLogsByCourse(courseId: number): Promise<MessageLog[]>;
  getMessageLogsByDate(date: Date): Promise<MessageLog[]>;
  getMessageLogsByStatus(status: string): Promise<MessageLog[]>;

  // Statistics operations
  getTopStudents(limit?: number): Promise<any[]>;
  getUserStatistics(userId: number): Promise<any>;
  getCourseStatistics(courseId: number): Promise<any>;

  // Daily courses operations
  getDailyCoursesForDate(date: Date): Promise<any[]>;

  // Session store for auth
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new SQLiteStoreFactory({
      client: sqlite,
      expired: {
        clear: true,
        intervalMs: 900000 // 15min
      }
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(userData.password);

    const result = await db.insert(users).values({
      ...userData,
      password: hashedPassword,
    }).returning();

    return result[0];
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }

    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: number): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Course operations
  async getCourse(id: number): Promise<Course | undefined> {
    const result = await db.select().from(courses).where(eq(courses.id, id));
    return result[0];
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    const now = Date.now();
    const result = await db.insert(courses).values({
      ...courseData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async updateCourse(id: number, courseData: Partial<Course>): Promise<Course | undefined> {
    const result = await db.update(courses)
      .set(courseData)
      .where(eq(courses.id, id))
      .returning();

    return result[0];
  }

  async listCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async deleteCourse(id: number): Promise<boolean> {
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  // Session operations
  async getSession(id: number): Promise<Session | undefined> {
    const result = await db.select().from(sessions).where(eq(sessions.id, id));
    return result[0];
  }

  async createSession(sessionData: InsertSession): Promise<Session> {
    const now = Date.now();
    const result = await db.insert(sessions).values({
      ...sessionData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async updateSession(id: number, sessionData: Partial<Session>): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set(sessionData)
      .where(eq(sessions.id, id))
      .returning();

    return result[0];
  }

  async listSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }

  async listUpcomingSessions(limit: number = 5): Promise<any[]> {
    const now = Date.now();

    const query = db.select({
      session: sessions,
      courseName: courses.name,
      courseLevel: courses.level,
      professorFirstName: users.firstName,
      professorLastName: users.lastName,
    })
    .from(sessions)
    .innerJoin(courses, eq(sessions.courseId, courses.id))
    .innerJoin(users, eq(sessions.professorId, users.id))
    .where(
      sql`${sessions.scheduledDate} >= ${now}`
    )
    .orderBy(sessions.scheduledDate)
    .limit(limit);

    return await query;
  }

  async deleteSession(id: number): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.id, id));
    return true;
  }

  // Attendance operations
  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const now = Date.now();
    const result = await db.insert(attendance).values({
      ...attendanceData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getSessionAttendance(sessionId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.sessionId, sessionId));
  }

  async getUserAttendance(userId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.userId, userId));
  }

  // Telegram operations
  async createTelegramActivity(activityData: InsertTelegramActivity): Promise<TelegramActivity> {
    const now = Date.now();
    const result = await db.insert(telegramActivity).values({
      ...activityData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getTelegramActivityByUser(userId: number): Promise<TelegramActivity[]> {
    return await db.select().from(telegramActivity).where(eq(telegramActivity.userId, userId));
  }

  async getTelegramActivityByCourse(courseId: number): Promise<TelegramActivity[]> {
    return await db.select().from(telegramActivity).where(eq(telegramActivity.courseId, courseId));
  }

  async getTelegramGroupStats(): Promise<any[]> {
    // Get telegram activity by course grouped by date (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const query = db.select({
      courseId: telegramActivity.courseId,
      courseName: courses.name,
      courseLevel: courses.level,
      memberCount: sql`COUNT(DISTINCT ${telegramActivity.userId})`,
      messageCount: sql`SUM(${telegramActivity.messageCount})`,
      groupLink: courses.telegramGroupLink
    })
    .from(telegramActivity)
    .innerJoin(courses, eq(telegramActivity.courseId, courses.id))
    .where(
      sql`${telegramActivity.date} >= ${sevenDaysAgo}`
    )
    .groupBy(telegramActivity.courseId, courses.name, courses.level, courses.telegramGroupLink);

    return await query;
  }

  // Badge operations
  async getBadge(id: number): Promise<Badge | undefined> {
    const result = await db.select().from(badges).where(eq(badges.id, id));
    return result[0];
  }

  async createBadge(badgeData: InsertBadge): Promise<Badge> {
    const now = Date.now();
    const result = await db.insert(badges).values({
      ...badgeData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async listBadges(): Promise<Badge[]> {
    return await db.select().from(badges);
  }

  async awardBadgeToUser(userBadgeData: InsertUserBadge): Promise<UserBadge> {
    const now = Date.now();
    const result = await db.insert(userBadges).values({
      ...userBadgeData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getUserBadges(userId: number): Promise<any[]> {
    const query = db.select({
      userBadgeId: userBadges.id,
      badgeId: badges.id,
      badgeName: badges.name,
      badgeDescription: badges.description,
      badgeIcon: badges.iconName,
      awardedAt: userBadges.awardedAt
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.awardedAt));

    return await query;
  }

  // Automation operations
  async createAutomationRule(ruleData: InsertAutomationRule): Promise<AutomationRule> {
    const now = Date.now();
    const result = await db.insert(automationRules).values({
      ...ruleData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getAutomationRule(id: number): Promise<AutomationRule | undefined> {
    const result = await db.select().from(automationRules).where(eq(automationRules.id, id));
    return result[0];
  }

  async listAutomationRules(): Promise<AutomationRule[]> {
    return await db.select().from(automationRules);
  }

  async updateAutomationRule(id: number, ruleData: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const result = await db.update(automationRules)
      .set(ruleData)
      .where(eq(automationRules.id, id))
      .returning();

    return result[0];
  }

  async deleteAutomationRule(id: number): Promise<boolean> {
    await db.delete(automationRules).where(eq(automationRules.id, id));
    return true;
  }

  // Template operations
  async createTemplateMessage(templateData: InsertTemplateMessage): Promise<TemplateMessage> {
    const now = Date.now();
    const result = await db.insert(templateMessages).values({
      ...templateData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getTemplateMessage(id: number): Promise<TemplateMessage | undefined> {
    const result = await db.select().from(templateMessages).where(eq(templateMessages.id, id));
    return result[0];
  }

  async listTemplateMessages(): Promise<TemplateMessage[]> {
    return await db.select().from(templateMessages);
  }

  async updateTemplateMessage(id: number, templateData: Partial<TemplateMessage>): Promise<TemplateMessage | undefined> {
    const result = await db.update(templateMessages)
      .set(templateData)
      .where(eq(templateMessages.id, id))
      .returning();

    return result[0];
  }

  async deleteTemplateMessage(id: number): Promise<boolean> {
    await db.delete(templateMessages).where(eq(templateMessages.id, id));
    return true;
  }

  // Activity log operations
  async logActivity(activityData: InsertActivityLog): Promise<ActivityLog> {
    const now = Date.now();
    const result = await db.insert(activityLogs).values({
      ...activityData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getRecentActivity(limit: number = 5): Promise<any[]> {
    const query = db.select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      username: db.select().from(users).where(eq(users.id, activityLogs.userId)).get().username,
      firstName: db.select().from(users).where(eq(users.id, activityLogs.userId)).get().firstName,
      lastName: db.select().from(users).where(eq(users.id, activityLogs.userId)).get().lastName,
      type: activityLogs.type,
      description: activityLogs.description,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt
    })
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

    return await query;
  }

  // Statistics operations
  async getTopStudents(limit: number = 5): Promise<any[]> {
    const query = db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      points: users.points,
      badgeCount: sql`(SELECT COUNT(*) FROM ${userBadges} WHERE ${userBadges.userId} = ${users.id})`
    })
    .from(users)
    .where(eq(users.role, 'student'))
    .orderBy(desc(users.points))
    .limit(limit);

    return await query;
  }

  async getUserStatistics(userId: number): Promise<any> {
    // Get attendance stats
    const attendanceQuery = db.select({
      totalSessions: sql`COUNT(DISTINCT ${attendance.sessionId})`,
      totalPresent: sql`SUM(CASE WHEN ${attendance.present} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(attendance)
    .where(eq(attendance.userId, userId));

    // Get telegram stats
    const telegramQuery = db.select({
      totalMessages: sql`SUM(${telegramActivity.messageCount})`,
      activeDays: sql`COUNT(DISTINCT ${telegramActivity.date})`
    })
    .from(telegramActivity)
    .where(eq(telegramActivity.userId, userId));

    // Get badge stats
    const badgeQuery = db.select({
      totalBadges: sql`COUNT(*)`
    })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

    const [attendanceStats] = await attendanceQuery;
    const [telegramStats] = await telegramQuery;
    const [badgeStats] = await badgeQuery;

    return {
      attendanceStats,
      telegramStats,
      badgeStats,
    };
  }

  async getCourseStatistics(courseId: number): Promise<any> {
    // Get enrollment stats
    const enrollmentQuery = db.select({
      studentCount: sql`COUNT(DISTINCT ${attendance.userId})`
    })
    .from(attendance)
    .innerJoin(sessions, eq(attendance.sessionId, sessions.id))
    .where(eq(sessions.courseId, courseId));

    // Get session stats
    const sessionQuery = db.select({
      totalSessions: sql`COUNT(*)`,
      completedSessions: sql`SUM(CASE WHEN ${sessions.status} = 'completed' THEN 1 ELSE 0 END)`,
      upcomingSessions: sql`SUM(CASE WHEN ${sessions.status} = 'scheduled' THEN 1 ELSE 0 END)`
    })
    .from(sessions)
    .where(eq(sessions.courseId, courseId));

    // Get attendance rate
    const attendanceRateQuery = db.select({
      totalAttendance: sql`SUM(CASE WHEN ${attendance.present} = 1 THEN 1 ELSE 0 END)`,
      totalPossible: sql`COUNT(*)`
    })
    .from(attendance)
    .innerJoin(sessions, eq(attendance.sessionId, sessions.id))
    .where(eq(sessions.courseId, courseId));

    const [enrollmentStats] = await enrollmentQuery;
    const [sessionStats] = await sessionQuery;
    const [attendanceStats] = await attendanceRateQuery;

    const attendanceRate = attendanceStats.totalPossible > 0
      ? (attendanceStats.totalAttendance / attendanceStats.totalPossible) * 100
      : 0;

    return {
      enrollmentStats,
      sessionStats,
      attendanceRate: Math.round(attendanceRate)
    };
  }

  // Message log operations
  async createMessageLog(messageLogData: InsertMessageLog): Promise<MessageLog> {
    const now = Date.now();
    const result = await db.insert(messageLogs).values({
      ...messageLogData,
      createdAt: now
    }).returning();

    return result[0];
  }

  async getMessageLogs(limit: number = 50): Promise<MessageLog[]> {
    return await db.select()
      .from(messageLogs)
      .orderBy(desc(messageLogs.createdAt))
      .limit(limit);
  }

  async getMessageLogsByCourse(courseId: number): Promise<MessageLog[]> {
    return await db.select()
      .from(messageLogs)
      .where(eq(messageLogs.courseId, courseId))
      .orderBy(desc(messageLogs.createdAt));
  }

  async getMessageLogsByDate(date: Date): Promise<MessageLog[]> {
    // Convertir la date en début et fin de journée
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db.select()
      .from(messageLogs)
      .where(
        and(
          sql`${messageLogs.date} >= ${startOfDay.getTime()}`,
          sql`${messageLogs.date} <= ${endOfDay.getTime()}`
        )
      )
      .orderBy(messageLogs.time);
  }

  async getMessageLogsByStatus(status: string): Promise<MessageLog[]> {
    return await db.select()
      .from(messageLogs)
      .where(eq(messageLogs.status, status))
      .orderBy(desc(messageLogs.createdAt));
  }

  // Daily courses operations
  async getDailyCoursesForDate(date: Date): Promise<any[]> {
    // Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, etc.)
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    // Convertir la date en début et fin de journée
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les sessions prévues pour ce jour
    const query = db.select({
      session: sessions,
      course: courses,
      professorFirstName: users.firstName,
      professorLastName: users.lastName,
    })
    .from(sessions)
    .innerJoin(courses, eq(sessions.courseId, courses.id))
    .leftJoin(users, eq(sessions.professorId, users.id))
    .where(
      and(
        sql`${sessions.scheduledDate} >= ${startOfDay.getTime()}`,
        sql`${sessions.scheduledDate} <= ${endOfDay.getTime()}`
      )
    )
    .orderBy(sessions.scheduledTime);

    return await query;
  }
}

export const storage = new DatabaseStorage();
