import { pgTable, text, serial, integer, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export const UserRole = {
  ADMIN: "admin",
  STUDENT: "student",
  COACH: "coach",
  PROFESSOR: "professor",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// Course levels
export const CourseLevel = {
  BBG: "bbg",
  ABG: "abg",
  IG: "ig",
} as const;

export type CourseLevelType = (typeof CourseLevel)[keyof typeof CourseLevel];

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().$type<UserRoleType>(),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  telegramUsername: varchar("telegram_username", { length: 100 }),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),
  points: integer("points").default(0),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userInsertSchema = createInsertSchema(users).omit({
  id: true,
  points: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof userInsertSchema>;
export type User = typeof users.$inferSelect;

// Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  level: varchar("level", { length: 20 }).notNull().$type<CourseLevelType>(),
  description: text("description"),
  telegramGroupLink: varchar("telegram_group_link", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const courseInsertSchema = createInsertSchema(courses).omit({
  id: true,
});

export type InsertCourse = z.infer<typeof courseInsertSchema>;
export type Course = typeof courses.$inferSelect;

// Sessions table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  sessionNumber: integer("session_number").notNull(),
  professorId: integer("professor_id"),
  coachId: integer("coach_id"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time", { length: 10 }).notNull(),
  timeZone: varchar("time_zone", { length: 50 }).default("GMT"),
  zoomMeetingId: varchar("zoom_meeting_id", { length: 100 }),
  zoomMeetingUrl: varchar("zoom_meeting_url", { length: 255 }),
  status: varchar("status", { length: 20 }).default("scheduled"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessionInsertSchema = createInsertSchema(sessions).omit({
  id: true,
});

export type InsertSession = z.infer<typeof sessionInsertSchema>;
export type Session = typeof sessions.$inferSelect;

// Attendance table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  userId: integer("user_id").notNull(),
  joinTime: timestamp("join_time"),
  leaveTime: timestamp("leave_time"),
  duration: integer("duration"),
  present: boolean("present").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const attendanceInsertSchema = createInsertSchema(attendance).omit({
  id: true,
});

export type InsertAttendance = z.infer<typeof attendanceInsertSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Telegram activity table
export const telegramActivity = pgTable("telegram_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  messageType: varchar("message_type", { length: 50 }),
  messageCount: integer("message_count").default(0),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const telegramActivityInsertSchema = createInsertSchema(telegramActivity).omit({
  id: true,
});

export type InsertTelegramActivity = z.infer<typeof telegramActivityInsertSchema>;
export type TelegramActivity = typeof telegramActivity.$inferSelect;

// Badges table
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  criteria: text("criteria").notNull(),
  iconName: varchar("icon_name", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const badgeInsertSchema = createInsertSchema(badges).omit({
  id: true,
});

export type InsertBadge = z.infer<typeof badgeInsertSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badges table
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  awardedAt: timestamp("awarded_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userBadgeInsertSchema = createInsertSchema(userBadges).omit({
  id: true,
});

export type InsertUserBadge = z.infer<typeof userBadgeInsertSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// Automation Rules table
export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  triggerData: text("trigger_data").notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionData: text("action_data").notNull(),
  isActive: boolean("is_active").default(true),
  // Champs spécifiques pour les messages matinaux
  sendTime: varchar("send_time", { length: 10 }), // Format HH:MM pour l'heure d'envoi
  timeZone: varchar("time_zone", { length: 50 }), // Fuseau horaire pour l'envoi
  lastSent: timestamp("last_sent"), // Dernière date d'envoi
  nextSend: timestamp("next_send"), // Prochaine date d'envoi prévue
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const automationRuleInsertSchema = createInsertSchema(automationRules).omit({
  id: true,
});

export type InsertAutomationRule = z.infer<typeof automationRuleInsertSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;

// Template Messages table
export const templateMessages = pgTable("template_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // course-reminder, announcement, badge-award
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const templateMessageInsertSchema = createInsertSchema(templateMessages).omit({
  id: true,
});

export type InsertTemplateMessage = z.infer<typeof templateMessageInsertSchema>;
export type TemplateMessage = typeof templateMessages.$inferSelect;

// Activity Log table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityLogInsertSchema = createInsertSchema(activityLogs).omit({
  id: true,
});

export type InsertActivityLog = z.infer<typeof activityLogInsertSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Message Logs table
export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  time: varchar("time", { length: 10 }).notNull(),
  courseId: integer("course_id").notNull(),
  sessionId: integer("session_id"),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // sent, error, cancelled
  telegramGroupId: varchar("telegram_group_id", { length: 100 }),
  zoomLink: varchar("zoom_link", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageLogInsertSchema = createInsertSchema(messageLogs).omit({
  id: true,
});

export type InsertMessageLog = z.infer<typeof messageLogInsertSchema>;
export type MessageLog = typeof messageLogs.$inferSelect;
