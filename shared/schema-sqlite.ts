import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
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
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().$type<UserRoleType>(),
  avatarUrl: text("avatar_url"),
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id"),
  points: integer("points").default(0),
  lastLogin: integer("last_login"),
  createdAt: integer("created_at").notNull(),
});

export const userInsertSchema = createInsertSchema(users).omit({
  id: true,
  points: true,
  lastLogin: true,
});

export type InsertUser = z.infer<typeof userInsertSchema>;
export type User = typeof users.$inferSelect;

// Courses table
export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  level: text("level").notNull().$type<CourseLevelType>(),
  description: text("description"),
  telegramGroupLink: text("telegram_group_link"),
  createdAt: integer("created_at").notNull(),
});

export const courseInsertSchema = createInsertSchema(courses).omit({
  id: true,
});

export type InsertCourse = z.infer<typeof courseInsertSchema>;
export type Course = typeof courses.$inferSelect;

// Course Sessions table
export const sessions = sqliteTable("course_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseId: integer("course_id").notNull(),
  sessionNumber: integer("session_number").notNull(),
  professorId: integer("professor_id"),
  coachId: integer("coach_id"),
  scheduledDate: integer("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  timeZone: text("time_zone").default("GMT"),
  zoomMeetingId: text("zoom_meeting_id"),
  zoomMeetingUrl: text("zoom_meeting_url"),
  status: text("status").default("scheduled"),
  createdAt: integer("created_at").notNull(),
});

export const sessionInsertSchema = createInsertSchema(sessions).omit({
  id: true,
});

export type InsertSession = z.infer<typeof sessionInsertSchema>;
export type Session = typeof sessions.$inferSelect;

// Attendance table
export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull(),
  userId: integer("user_id").notNull(),
  joinTime: integer("join_time"),
  leaveTime: integer("leave_time"),
  duration: integer("duration"),
  present: integer("present", { mode: "boolean" }).default(false),
  createdAt: integer("created_at").notNull(),
});

export const attendanceInsertSchema = createInsertSchema(attendance).omit({
  id: true,
});

export type InsertAttendance = z.infer<typeof attendanceInsertSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Telegram activity table
export const telegramActivity = sqliteTable("telegram_activity", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  messageType: text("message_type"),
  messageCount: integer("message_count").default(0),
  date: integer("date").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const telegramActivityInsertSchema = createInsertSchema(telegramActivity).omit({
  id: true,
});

export type InsertTelegramActivity = z.infer<typeof telegramActivityInsertSchema>;
export type TelegramActivity = typeof telegramActivity.$inferSelect;

// Badges table
export const badges = sqliteTable("badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  criteria: text("criteria").notNull(),
  iconName: text("icon_name").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const badgeInsertSchema = createInsertSchema(badges).omit({
  id: true,
});

export type InsertBadge = z.infer<typeof badgeInsertSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badges table
export const userBadges = sqliteTable("user_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  badgeId: integer("badge_id").notNull(),
  awardedAt: integer("awarded_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const userBadgeInsertSchema = createInsertSchema(userBadges).omit({
  id: true,
});

export type InsertUserBadge = z.infer<typeof userBadgeInsertSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// Automation Rules table
export const automationRules = sqliteTable("automation_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(),
  triggerData: text("trigger_data").notNull(),
  actionType: text("action_type").notNull(),
  actionData: text("action_data").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  // Champs spécifiques pour les messages matinaux
  sendTime: text("send_time"), // Format HH:MM pour l'heure d'envoi
  timeZone: text("time_zone"), // Fuseau horaire pour l'envoi
  lastSent: integer("last_sent"), // Dernière date d'envoi
  nextSend: integer("next_send"), // Prochaine date d'envoi prévue
  createdAt: integer("created_at").notNull(),
});

export const automationRuleInsertSchema = createInsertSchema(automationRules).omit({
  id: true,
});

export type InsertAutomationRule = z.infer<typeof automationRuleInsertSchema>;
export type AutomationRule = typeof automationRules.$inferSelect;

// Template Messages table
export const templateMessages = sqliteTable("template_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // course-reminder, announcement, badge-award
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const templateMessageInsertSchema = createInsertSchema(templateMessages).omit({
  id: true,
});

export type InsertTemplateMessage = z.infer<typeof templateMessageInsertSchema>;
export type TemplateMessage = typeof templateMessages.$inferSelect;

// Activity Log table
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  type: text("type").notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at").notNull(),
});

export const activityLogInsertSchema = createInsertSchema(activityLogs).omit({
  id: true,
});

export type InsertActivityLog = z.infer<typeof activityLogInsertSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// Message Logs table
export const messageLogs = sqliteTable("message_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: integer("date").notNull(),
  time: text("time").notNull(),
  courseId: integer("course_id").notNull(),
  sessionId: integer("session_id"),
  message: text("message").notNull(),
  status: text("status").notNull(), // sent, error, cancelled
  telegramGroupId: text("telegram_group_id"),
  zoomLink: text("zoom_link"),
  createdAt: integer("created_at").notNull(),
});
