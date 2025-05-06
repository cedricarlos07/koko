import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Niveaux de cours
export const CourseLevel = {
  BBG: "bbg",
  ABG: "abg",
  IG: "ig",
} as const;

export type CourseLevelType = (typeof CourseLevel)[keyof typeof CourseLevel];

// Jours de la semaine
export const WeekDay = {
  MONDAY: "monday",
  TUESDAY: "tuesday",
  WEDNESDAY: "wednesday",
  THURSDAY: "thursday",
  FRIDAY: "friday",
  SATURDAY: "saturday",
  SUNDAY: "sunday",
} as const;

export type WeekDayType = (typeof WeekDay)[keyof typeof WeekDay];

// Table des cours planifiés (planning fixe)
export const fixedSchedules = sqliteTable("fixed_schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  courseName: text("course_name").notNull(),
  level: text("level").notNull().$type<CourseLevelType>(),
  teacherName: text("teacher_name").notNull(),
  day: text("day").notNull().$type<WeekDayType>(),
  time: text("time").notNull(), // Format HH:MM
  duration: integer("duration").notNull(), // En minutes
  telegramGroup: text("telegram_group").default(""),
  zoomHostEmail: text("zoom_host_email").default(""),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const fixedScheduleInsertSchema = createInsertSchema(fixedSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFixedSchedule = z.infer<typeof fixedScheduleInsertSchema>;
export type FixedSchedule = typeof fixedSchedules.$inferSelect;

// Table des logs d'automatisation
export const automationLogs = sqliteTable("automation_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'zoom_creation', 'telegram_message', 'reminder'
  status: text("status").notNull(), // 'success', 'error', 'simulated'
  message: text("message").notNull(),
  details: text("details"), // JSON stringifié pour les détails supplémentaires
  fixedScheduleId: integer("fixed_schedule_id"),
  createdAt: integer("created_at").notNull(),
});

export const automationLogInsertSchema = createInsertSchema(automationLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAutomationLog = z.infer<typeof automationLogInsertSchema>;
export type AutomationLog = typeof automationLogs.$inferSelect;

// Table des réunions Zoom générées
export const zoomMeetings = sqliteTable("zoom_meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fixedScheduleId: integer("fixed_schedule_id").notNull(),
  zoomMeetingId: text("zoom_meeting_id").notNull(),
  zoomMeetingUrl: text("zoom_meeting_url").notNull(),
  startTime: integer("start_time").notNull(), // Timestamp
  status: text("status").notNull(), // 'scheduled', 'started', 'ended', 'cancelled'
  createdAt: integer("created_at").notNull(),
});

export const zoomMeetingInsertSchema = createInsertSchema(zoomMeetings).omit({
  id: true,
  createdAt: true,
});

export type InsertZoomMeeting = z.infer<typeof zoomMeetingInsertSchema>;
export type ZoomMeeting = typeof zoomMeetings.$inferSelect;

// Table des configurations système
export const systemSettings = sqliteTable("system_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const systemSettingInsertSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof systemSettingInsertSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Table des statistiques des groupes Telegram
export const telegramGroupStats = sqliteTable("telegram_group_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramGroupId: text("telegram_group_id").notNull(),
  memberCount: integer("member_count").notNull(),
  messageCount: integer("message_count").notNull(),
  lastActivity: integer("last_activity").notNull(), // Timestamp
  lastUpdated: integer("last_updated").notNull(), // Timestamp
});

export const telegramGroupStatInsertSchema = createInsertSchema(telegramGroupStats).omit({
  id: true,
});

export type InsertTelegramGroupStat = z.infer<typeof telegramGroupStatInsertSchema>;
export type TelegramGroupStat = typeof telegramGroupStats.$inferSelect;

// Table des étudiants Telegram
export const telegramStudents = sqliteTable("telegram_students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramUserId: text("telegram_user_id").notNull(),
  telegramUsername: text("telegram_username"),
  telegramFirstName: text("telegram_first_name"),
  telegramLastName: text("telegram_last_name"),
  telegramGroupId: text("telegram_group_id").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const telegramStudentInsertSchema = createInsertSchema(telegramStudents).omit({
  id: true,
});

export type InsertTelegramStudent = z.infer<typeof telegramStudentInsertSchema>;
export type TelegramStudent = typeof telegramStudents.$inferSelect;

// Table des statistiques de participation des étudiants
export const telegramParticipationStats = sqliteTable("telegram_participation_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramStudentId: integer("telegram_student_id").notNull().references(() => telegramStudents.id),
  telegramGroupId: text("telegram_group_id").notNull(),
  messageCount: integer("message_count").notNull(),
  reactionCount: integer("reaction_count").notNull(),
  mediaCount: integer("media_count").notNull(),
  totalScore: integer("total_score").notNull(),
  periodStart: integer("period_start").notNull(), // Timestamp du début de la période
  periodEnd: integer("period_end").notNull(), // Timestamp de fin de la période
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const telegramParticipationStatInsertSchema = createInsertSchema(telegramParticipationStats).omit({
  id: true,
});

export type InsertTelegramParticipationStat = z.infer<typeof telegramParticipationStatInsertSchema>;
export type TelegramParticipationStat = typeof telegramParticipationStats.$inferSelect;

// Table des badges
export const telegramBadges = sqliteTable("telegram_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const telegramBadgeInsertSchema = createInsertSchema(telegramBadges).omit({
  id: true,
});

export type InsertTelegramBadge = z.infer<typeof telegramBadgeInsertSchema>;
export type TelegramBadge = typeof telegramBadges.$inferSelect;

// Table des badges attribués aux étudiants
export const telegramStudentBadges = sqliteTable("telegram_student_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramStudentId: integer("telegram_student_id").notNull().references(() => telegramStudents.id),
  telegramBadgeId: integer("telegram_badge_id").notNull().references(() => telegramBadges.id),
  telegramGroupId: text("telegram_group_id").notNull(),
  periodStart: integer("period_start").notNull(), // Timestamp du début de la période
  periodEnd: integer("period_end").notNull(), // Timestamp de fin de la période
  awardedAt: integer("awarded_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const telegramStudentBadgeInsertSchema = createInsertSchema(telegramStudentBadges).omit({
  id: true,
});

export type InsertTelegramStudentBadge = z.infer<typeof telegramStudentBadgeInsertSchema>;
export type TelegramStudentBadge = typeof telegramStudentBadges.$inferSelect;

// Table des badges des utilisateurs Telegram
export const telegramUserBadges = sqliteTable("telegram_user_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramGroupId: text("telegram_group_id").notNull(),
  telegramUserId: integer("telegram_user_id").notNull(),
  badge: text("badge").notNull(),
  assignedAt: integer("assigned_at").notNull()
});

export const telegramUserBadgeInsertSchema = createInsertSchema(telegramUserBadges).omit({
  id: true,
});

export type InsertTelegramUserBadge = z.infer<typeof telegramUserBadgeInsertSchema>;
export type TelegramUserBadge = typeof telegramUserBadges.$inferSelect;

// Table des messages planifiés
export const scheduledMessages = sqliteTable("scheduled_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramGroupId: text("telegram_group_id").notNull(),
  message: text("message").notNull(),
  scheduledTime: integer("scheduled_time").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: integer("sent_at"),
  createdAt: integer("created_at").notNull()
});

export const scheduledMessageInsertSchema = createInsertSchema(scheduledMessages).omit({
  id: true,
});

export type InsertScheduledMessage = z.infer<typeof scheduledMessageInsertSchema>;
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;

// Table des messages Telegram
export const telegramMessages = sqliteTable("telegram_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramGroupId: text("telegram_group_id").notNull(),
  telegramUserId: integer("telegram_user_id").notNull(),
  messageId: integer("message_id").notNull(),
  messageText: text("message_text"),
  timestamp: integer("timestamp").notNull(),
  createdAt: integer("created_at").notNull()
});

export const telegramMessageInsertSchema = createInsertSchema(telegramMessages).omit({
  id: true,
});

export type InsertTelegramMessage = z.infer<typeof telegramMessageInsertSchema>;
export type TelegramMessage = typeof telegramMessages.$inferSelect;

// Table pour le planning dynamique
export const dynamicSchedule = sqliteTable("dynamic_schedule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fixedScheduleId: integer("fixed_schedule_id").notNull(),
  courseName: text("course_name").notNull(),
  level: text("level").notNull(),
  teacherName: text("teacher_name").notNull(),
  scheduledDate: integer("scheduled_date").notNull(), // timestamp de la date
  scheduledTime: text("scheduled_time").notNull(), // format HH:MM
  duration: integer("duration").notNull(),
  zoomMeetingId: text("zoom_meeting_id"),
  zoomMeetingUrl: text("zoom_meeting_url"),
  status: text("status").default("pending"),
  telegramGroup: text("telegram_group"),
  createdAt: integer("created_at").notNull()
});

export const dynamicScheduleInsertSchema = createInsertSchema(dynamicSchedule).omit({
  id: true,
  createdAt: true,
});

export type InsertDynamicSchedule = z.infer<typeof dynamicScheduleInsertSchema>;
export type DynamicSchedule = typeof dynamicSchedule.$inferSelect;

// Table des participants aux réunions Zoom
export const zoomParticipants = sqliteTable("zoom_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  zoomMeetingId: text("zoom_meeting_id").notNull(),
  participantId: text("participant_id"),
  participantName: text("participant_name").notNull(),
  participantEmail: text("participant_email"),
  joinTime: integer("join_time").notNull(), // Timestamp
  leaveTime: integer("leave_time"), // Timestamp
  duration: integer("duration"), // En minutes
  attentionScore: integer("attention_score"), // Score d'attention (0-100)
  createdAt: integer("created_at").notNull(),
});

export const zoomParticipantInsertSchema = createInsertSchema(zoomParticipants).omit({
  id: true,
  createdAt: true,
});

export type InsertZoomParticipant = z.infer<typeof zoomParticipantInsertSchema>;
export type ZoomParticipant = typeof zoomParticipants.$inferSelect;

// Table des statistiques de réunions Zoom
export const zoomMeetingStats = sqliteTable("zoom_meeting_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  zoomMeetingId: text("zoom_meeting_id").notNull(),
  participantCount: integer("participant_count").notNull(),
  averageDuration: integer("average_duration").notNull(), // En minutes
  maxParticipants: integer("max_participants").notNull(),
  startTime: integer("start_time").notNull(), // Timestamp
  endTime: integer("end_time"), // Timestamp
  createdAt: integer("created_at").notNull(),
});

export const zoomMeetingStatInsertSchema = createInsertSchema(zoomMeetingStats).omit({
  id: true,
  createdAt: true,
});

export type InsertZoomMeetingStat = z.infer<typeof zoomMeetingStatInsertSchema>;
export type ZoomMeetingStat = typeof zoomMeetingStats.$inferSelect;

// Table pour la configuration des transferts de messages Telegram
export const telegramChannelForwards = sqliteTable("telegram_channel_forwards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceChannelId: text("source_channel_id").notNull(),
  sourceChannelName: text("source_channel_name").notNull(),
  targetGroupId: text("target_group_id").notNull(),
  targetGroupName: text("target_group_name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastForwardedMessageId: integer("last_forwarded_message_id"),
  lastForwardedAt: integer("last_forwarded_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const telegramChannelForwardInsertSchema = createInsertSchema(telegramChannelForwards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTelegramChannelForward = z.infer<typeof telegramChannelForwardInsertSchema>;
export type TelegramChannelForward = typeof telegramChannelForwards.$inferSelect;
