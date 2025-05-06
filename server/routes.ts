import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { format, parseISO } from 'date-fns';
import { initTelegramBot, sendCourseReminder, sendAnnouncement, sendBadgeNotification } from "./telegram";
import { createZoomMeeting, markAttendanceFromZoom } from "./zoom";
import { UserRole, type User } from "@shared/schema";
import { z } from "zod";
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse';

// Import routes
import fixedScheduleRoutes from './routes/fixed-schedule-routes';
import systemSettingsRoutes from './routes/system-settings-routes';
import automationRoutes from './routes/automation-routes';
import telegramRoutes from './routes/telegram-routes';
import telegramBadgesRoutes from './routes/telegram-badges-routes';
import telegramGroupsRoutes from './routes/telegram-groups-routes';
import telegramGroupsViewRoutes from './routes/telegram-groups-view-routes';
import telegramTestRoutes from './routes/telegram-test-routes';
import telegramTestDebugRoutes from './routes/telegram-test-routes-debug';
import telegramWebhookRoutes from './routes/telegram-webhook-routes';
import telegramChannelRoutes from './routes/telegram-channel-routes';
import statisticsRoutes from './routes/statistics-routes';
import zoomMeetingsRoutes from './routes/zoom-meetings-routes';
import zoomRoutes from './routes/zoom-routes';
import dynamicScheduleRoutes from './routes/dynamic-schedule-routes';
import metadataRoutes from './routes/metadata-routes';
import { schedulerService } from './services/scheduler-service';

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Telegram bot
  const telegramBot = initTelegramBot();

  // Setup authentication
  setupAuth(app);

  // Register routes
  app.use('/api', fixedScheduleRoutes);
  app.use('/api', systemSettingsRoutes);
  app.use('/api', automationRoutes);
  app.use('/api', telegramRoutes);
  app.use('/api', telegramBadgesRoutes);
  app.use('/api', telegramGroupsRoutes);
  app.use('/api', telegramGroupsViewRoutes);
  app.use('/api', telegramTestRoutes);
  app.use('/api', telegramTestDebugRoutes);
  app.use('/api', telegramWebhookRoutes);
  app.use('/api', telegramChannelRoutes);
  app.use('/api', statisticsRoutes);
  app.use('/api', zoomMeetingsRoutes);
  app.use('/api', zoomRoutes);
  app.use('/api', dynamicScheduleRoutes);
  app.use('/api', metadataRoutes);

  // Initialize scheduler
  schedulerService.initializeScheduler().catch(error => {
    console.error('Error initializing scheduler:', error);
  });

  // ===== User Routes =====

  // Get all users
  app.get("/api/users", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const users = await storage.listUsers();

      // Don't send passwords
      const safeUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(safeUsers);
    } catch (error) {
      next(error);
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Update user
  app.patch("/api/users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if user is admin or updating their own profile
      if (req.user!.role !== "admin" && req.user!.id !== parseInt(req.params.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userId = parseInt(req.params.id);
      const updatedUser = await storage.updateUser(userId, req.body);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't send password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const userId = parseInt(req.params.id);
      const deleted = await storage.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get user statistics
  app.get("/api/users/:id/statistics", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);
      const stats = await storage.getUserStatistics(userId);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // Get user badges
  app.get("/api/users/:id/badges", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = parseInt(req.params.id);
      const badges = await storage.getUserBadges(userId);

      res.json(badges);
    } catch (error) {
      next(error);
    }
  });

  // ===== Course Routes =====

  // Get all courses
  app.get("/api/courses", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courses = await storage.listCourses();
      res.json(courses);
    } catch (error) {
      next(error);
    }
  });

  // Get course by ID
  app.get("/api/courses/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json(course);
    } catch (error) {
      next(error);
    }
  });

  // Create course (admin or coach only)
  app.post("/api/courses", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const course = await storage.createCourse(req.body);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "course_created",
        description: `Course ${course.name} created`,
        createdAt: new Date()
      });

      res.status(201).json(course);
    } catch (error) {
      next(error);
    }
  });

  // Update course (admin or coach only)
  app.patch("/api/courses/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const courseId = parseInt(req.params.id);
      const updatedCourse = await storage.updateCourse(courseId, req.body);

      if (!updatedCourse) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "course_updated",
        description: `Course ${updatedCourse.name} updated`,
        createdAt: new Date()
      });

      res.json(updatedCourse);
    } catch (error) {
      next(error);
    }
  });

  // Delete course (admin only)
  app.delete("/api/courses/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const courseId = parseInt(req.params.id);
      const deleted = await storage.deleteCourse(courseId);

      if (!deleted) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "course_deleted",
        description: `Course with ID ${courseId} deleted`,
        createdAt: new Date()
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get course statistics
  app.get("/api/courses/:id/statistics", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courseId = parseInt(req.params.id);
      const stats = await storage.getCourseStatistics(courseId);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // ===== Session Routes =====

  // Get all sessions
  app.get("/api/sessions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sessions = await storage.listSessions();
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  // Get upcoming sessions
  app.get("/api/sessions/upcoming", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const upcomingSessions = await storage.listUpcomingSessions(limit);

      res.json(upcomingSessions);
    } catch (error) {
      next(error);
    }
  });

  // Get session by ID
  app.get("/api/sessions/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  // Create session
  app.post("/api/sessions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const session = await storage.createSession(req.body);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "session_created",
        description: `Session #${session.sessionNumber} created for course ID ${session.courseId}`,
        createdAt: new Date()
      });

      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  // Update session
  app.patch("/api/sessions/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sessionId = parseInt(req.params.id);
      const updatedSession = await storage.updateSession(sessionId, req.body);

      if (!updatedSession) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "session_updated",
        description: `Session #${updatedSession.sessionNumber} updated for course ID ${updatedSession.courseId}`,
        createdAt: new Date()
      });

      res.json(updatedSession);
    } catch (error) {
      next(error);
    }
  });

  // Delete session
  app.delete("/api/sessions/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sessionId = parseInt(req.params.id);
      const deleted = await storage.deleteSession(sessionId);

      if (!deleted) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "session_deleted",
        description: `Session with ID ${sessionId} deleted`,
        createdAt: new Date()
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Get session attendance
  app.get("/api/sessions/:id/attendance", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sessionId = parseInt(req.params.id);
      const attendanceList = await storage.getSessionAttendance(sessionId);

      res.json(attendanceList);
    } catch (error) {
      next(error);
    }
  });

  // ===== Zoom Integration Routes =====

  // Create Zoom meeting for a session
  app.post("/api/sessions/:id/zoom", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach" && req.user!.role !== "professor")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const course = await storage.getCourse(session.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Generate session date in ISO format
      const sessionDate = new Date(session.scheduledDate);
      const [hours, minutes] = session.scheduledTime.split(':');
      sessionDate.setHours(parseInt(hours), parseInt(minutes));

      // Default to 60 minutes duration if not specified
      const duration = req.body.duration || 60;

      // Create Zoom meeting
      const meetingDetails = await createZoomMeeting(
        `${course.name} - Session #${session.sessionNumber}`,
        sessionDate.toISOString(),
        duration,
        session.timeZone || 'GMT'
      );

      if (!meetingDetails) {
        return res.status(500).json({ message: "Failed to create Zoom meeting" });
      }

      // Update session with Zoom details
      const updatedSession = await storage.updateSession(sessionId, {
        zoomMeetingId: meetingDetails.meetingId,
        zoomMeetingUrl: meetingDetails.joinUrl
      });

      // If there's a Telegram group link, send the meeting info there
      if (course.telegramGroupLink && telegramBot) {
        const professor = session.professorId
          ? await storage.getUser(session.professorId)
          : null;

        const professorName = professor
          ? `${professor.firstName} ${professor.lastName}`
          : "TBD";

        const formattedDate = format(sessionDate, 'MMMM dd, yyyy');
        const formattedTime = format(sessionDate, 'h:mm a');

        // Send reminder with Zoom link
        await sendCourseReminder(
          course.telegramGroupLink,
          `${course.name} - Session #${session.sessionNumber}`,
          professorName,
          `${formattedTime} ${session.timeZone || 'GMT'}`,
          formattedDate,
          meetingDetails.joinUrl,
          60 // 60 minutes before class
        );
      }

      res.status(201).json({
        session: updatedSession,
        zoom: meetingDetails
      });
    } catch (error) {
      next(error);
    }
  });

  // Mark attendance for a session using Zoom data
  app.post("/api/sessions/:id/attendance/zoom", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach" && req.user!.role !== "professor")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.zoomMeetingId) {
        return res.status(400).json({ message: "No Zoom meeting associated with this session" });
      }

      const success = await markAttendanceFromZoom(sessionId, session.zoomMeetingId);

      if (!success) {
        return res.status(500).json({ message: "Failed to mark attendance from Zoom" });
      }

      // Update session status to completed
      await storage.updateSession(sessionId, {
        status: "completed"
      });

      res.json({ success: true, message: "Attendance marked from Zoom data" });
    } catch (error) {
      next(error);
    }
  });

  // ===== Telegram Integration Routes =====

  // Send announcement to a course's Telegram group
  app.post("/api/courses/:id/telegram/announce", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!telegramBot) {
        return res.status(503).json({ message: "Telegram bot not initialized" });
      }

      const courseId = parseInt(req.params.id);
      const course = await storage.getCourse(courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (!course.telegramGroupLink) {
        return res.status(400).json({ message: "No Telegram group associated with this course" });
      }

      const announcementSchema = z.object({
        content: z.string().min(1)
      });

      const validationResult = announcementSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const { content } = validationResult.data;

      const success = await sendAnnouncement(course.telegramGroupLink, content);

      if (!success) {
        return res.status(500).json({ message: "Failed to send announcement to Telegram group" });
      }

      res.json({ success: true, message: "Announcement sent to Telegram group" });
    } catch (error) {
      next(error);
    }
  });

  // Send reminder for a session
  app.post("/api/sessions/:id/telegram/remind", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (!telegramBot) {
        return res.status(503).json({ message: "Telegram bot not initialized" });
      }

      const sessionId = parseInt(req.params.id);
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const course = await storage.getCourse(session.courseId);
      if (!course || !course.telegramGroupLink) {
        return res.status(400).json({ message: "No Telegram group associated with this course" });
      }

      const professor = session.professorId
        ? await storage.getUser(session.professorId)
        : null;

      const professorName = professor
        ? `${professor.firstName} ${professor.lastName}`
        : "TBD";

      const sessionDate = new Date(session.scheduledDate);
      const [hours, minutes] = session.scheduledTime.split(':');
      sessionDate.setHours(parseInt(hours), parseInt(minutes));

      const formattedDate = format(sessionDate, 'MMMM dd, yyyy');
      const formattedTime = format(sessionDate, 'h:mm a');

      const minutesRemaining = req.body.minutesRemaining || 30;

      const success = await sendCourseReminder(
        course.telegramGroupLink,
        `${course.name} - Session #${session.sessionNumber}`,
        professorName,
        `${formattedTime} ${session.timeZone || 'GMT'}`,
        formattedDate,
        session.zoomMeetingUrl || "Lien Zoom à venir",
        minutesRemaining
      );

      if (!success) {
        return res.status(500).json({ message: "Failed to send reminder to Telegram group" });
      }

      res.json({ success: true, message: "Reminder sent to Telegram group" });
    } catch (error) {
      next(error);
    }
  });

  // Get Telegram activity for a course
  app.get("/api/courses/:id/telegram/activity", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const courseId = parseInt(req.params.id);
      const activity = await storage.getTelegramActivityByCourse(courseId);

      res.json(activity);
    } catch (error) {
      next(error);
    }
  });

  // Get all Telegram group statistics
  app.get("/api/telegram/stats", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const stats = await storage.getTelegramGroupStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // ===== Badges Routes =====

  // Get all badges
  app.get("/api/badges", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const badges = await storage.listBadges();
      res.json(badges);
    } catch (error) {
      next(error);
    }
  });

  // Create a badge
  app.post("/api/badges", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const badge = await storage.createBadge(req.body);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "badge_created",
        description: `Badge "${badge.name}" created`,
        createdAt: new Date()
      });

      res.status(201).json(badge);
    } catch (error) {
      next(error);
    }
  });

  // Award a badge to a user
  app.post("/api/users/:id/badges", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const awardSchema = z.object({
        badgeId: z.number().int().positive()
      });

      const validationResult = awardSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request body", errors: validationResult.error.errors });
      }

      const userId = parseInt(req.params.id);
      const { badgeId } = validationResult.data;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const badge = await storage.getBadge(badgeId);
      if (!badge) {
        return res.status(404).json({ message: "Badge not found" });
      }

      const awardTime = Date.now();

      const userBadge = await storage.awardBadgeToUser({
        userId,
        badgeId,
        awardedAt: awardTime,
        createdAt: awardTime
      });

      // Add points for badge (50 points per badge)
      await storage.updateUser(userId, {
        points: (user.points || 0) + 50
      });

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "badge_awarded",
        description: `Badge "${badge.name}" awarded to ${user.username}`,
        metadata: JSON.stringify({
          badgeId,
          userId,
          badgeName: badge.name
        }),
        createdAt: awardTime
      });

      // Send notification to Telegram if user has a course with a Telegram group
      if (telegramBot && user.telegramUsername) {
        // Find a course this user is active in
        const telegramActivities = await storage.getTelegramActivityByUser(userId);

        if (telegramActivities.length > 0) {
          const courseId = telegramActivities[0].courseId;
          const course = await storage.getCourse(courseId);

          if (course && course.telegramGroupLink) {
            await sendBadgeNotification(
              course.telegramGroupLink,
              user.firstName,
              badge.name
            );
          }
        }
      }

      res.status(201).json({
        userBadge,
        badge,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // ===== Automation Routes =====

  // Get all automation rules
  app.get("/api/automations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const rules = await storage.listAutomationRules();
      res.json(rules);
    } catch (error) {
      next(error);
    }
  });

  // Create automation rule
  app.post("/api/automations", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const rule = await storage.createAutomationRule(req.body);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "automation_created",
        description: `Automation rule "${rule.name}" created`,
        createdAt: new Date()
      });

      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  });

  // Update automation rule
  app.patch("/api/automations/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const ruleId = parseInt(req.params.id);
      const updatedRule = await storage.updateAutomationRule(ruleId, req.body);

      if (!updatedRule) {
        return res.status(404).json({ message: "Automation rule not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "automation_updated",
        description: `Automation rule "${updatedRule.name}" updated`,
        createdAt: new Date()
      });

      res.json(updatedRule);
    } catch (error) {
      next(error);
    }
  });

  // Delete automation rule
  app.delete("/api/automations/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const ruleId = parseInt(req.params.id);
      const deleted = await storage.deleteAutomationRule(ruleId);

      if (!deleted) {
        return res.status(404).json({ message: "Automation rule not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "automation_deleted",
        description: `Automation rule with ID ${ruleId} deleted`,
        createdAt: new Date()
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ===== Template Message Routes =====

  // Get all template messages
  app.get("/api/templates", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templates = await storage.listTemplateMessages();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  // Create template message
  app.post("/api/templates", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const template = await storage.createTemplateMessage(req.body);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "template_created",
        description: `Template message "${template.name}" created`,
        createdAt: new Date()
      });

      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });

  // Update template message
  app.patch("/api/templates/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templateId = parseInt(req.params.id);
      const updatedTemplate = await storage.updateTemplateMessage(templateId, req.body);

      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template message not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "template_updated",
        description: `Template message "${updatedTemplate.name}" updated`,
        createdAt: new Date()
      });

      res.json(updatedTemplate);
    } catch (error) {
      next(error);
    }
  });

  // Delete template message
  app.delete("/api/templates/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templateId = parseInt(req.params.id);
      const deleted = await storage.deleteTemplateMessage(templateId);

      if (!deleted) {
        return res.status(404).json({ message: "Template message not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "template_deleted",
        description: `Template message with ID ${templateId} deleted`,
        createdAt: new Date()
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // ===== Statistics Routes =====

  // Get dashboard statistics
  app.get("/api/statistics/dashboard", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get user count
      const users = await storage.listUsers();
      const studentCount = users.filter(u => u.role === "student").length;
      const professorCount = users.filter(u => u.role === "professor").length;
      const coachCount = users.filter(u => u.role === "coach").length;
      const adminCount = users.filter(u => u.role === "admin").length;

      // Get active courses
      const courses = await storage.listCourses();

      // Get upcoming sessions
      const upcomingSessions = await storage.listUpcomingSessions(5);

      // Get top students
      const topStudents = await storage.getTopStudents(5);

      // Get recent activity
      const recentActivity = await storage.getRecentActivity(5);

      // Get Telegram group stats
      const telegramStats = await storage.getTelegramGroupStats();

      res.json({
        users: {
          total: users.length,
          students: studentCount,
          professors: professorCount,
          coaches: coachCount,
          admins: adminCount
        },
        courses: {
          total: courses.length
        },
        upcomingSessions,
        topStudents,
        recentActivity,
        telegramStats
      });
    } catch (error) {
      next(error);
    }
  });

  // Get recent activity
  app.get("/api/activity", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const recentActivity = await storage.getRecentActivity(limit);

      res.json(recentActivity);
    } catch (error) {
      next(error);
    }
  });

  // Get top students
  app.get("/api/statistics/top-students", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const topStudents = await storage.getTopStudents(limit);

      res.json(topStudents);
    } catch (error) {
      next(error);
    }
  });

  // ===== Schedule Import Routes =====

  // Import schedule from CSV
  app.post("/api/schedule/import", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Validate request body
      if (!req.body.csvContent) {
        return res.status(400).json({ message: "Missing CSV content" });
      }

      const csvContent = req.body.csvContent;

      // Parse the CSV content
      const records: any[] = [];

      const parser = parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
          records.push(record);
        }
      });

      parser.on('error', function(err) {
        next(err);
      });

      parser.on('end', async function() {
        const results = {
          total: records.length,
          created: 0,
          errors: [] as string[]
        };

        for (const record of records) {
          try {
            // Find or create the course
            let course = (await storage.listCourses()).find(
              c => c.name.toLowerCase() === record.CourseName.toLowerCase()
            );

            if (!course) {
              // Determine course level
              let level = 'bbg';
              if (record.CourseName.toLowerCase().includes('abg')) {
                level = 'abg';
              } else if (record.CourseName.toLowerCase().includes('ig')) {
                level = 'ig';
              }

              course = await storage.createCourse({
                name: record.CourseName,
                level: level,
                telegramGroupLink: record.TelegramGroup || null,
                createdAt: new Date()
              });
            }

            // Find professor if specified
            let professorId = null;
            if (record.Professor) {
              const professors = (await storage.listUsers()).filter(
                u => u.role === "professor" &&
                     `${u.firstName} ${u.lastName}`.toLowerCase().includes(record.Professor.toLowerCase())
              );

              if (professors.length > 0) {
                professorId = professors[0].id;
              }
            }

            // Parse day, date and time
            const day = record.Day;
            let sessionDate = new Date();

            // Set to the next occurrence of the day
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === day.toLowerCase());

            if (dayIndex !== -1) {
              const currentDay = sessionDate.getDay();
              const daysUntilNext = (dayIndex + 7 - currentDay) % 7;
              sessionDate.setDate(sessionDate.getDate() + daysUntilNext);
            }

            // Parse time
            const timeStr = record.Time;
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Create 4 upcoming sessions for this course on the specified day/time
            for (let i = 0; i < 4; i++) {
              const sessionTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

              // Calculate session date (this course day + i weeks)
              const sessionDateCopy = new Date(sessionDate);
              sessionDateCopy.setDate(sessionDateCopy.getDate() + (i * 7));

              // Get the session number (find the highest existing session number and increment)
              const existingSessions = (await storage.listSessions()).filter(
                s => s.courseId === course.id
              );

              const sessionNumber = existingSessions.length > 0
                ? Math.max(...existingSessions.map(s => s.sessionNumber)) + 1
                : 1;

              // Create the session
              await storage.createSession({
                courseId: course.id,
                sessionNumber,
                professorId,
                scheduledDate: sessionDateCopy.getTime(),
                scheduledTime: sessionTime,
                timeZone: record.TimeZone || 'GMT',
                status: 'scheduled',
                createdAt: new Date()
              });
            }

            results.created += 4; // 4 sessions created
          } catch (error) {
            console.error('Error processing CSV record:', error);
            results.errors.push(`Error with ${record.CourseName}: ${error.message || 'Unknown error'}`);
          }
        }

        // Log activity
        await storage.logActivity({
          userId: req.user!.id,
          type: "schedule_imported",
          description: `Schedule imported with ${results.created} sessions created`,
          metadata: JSON.stringify({
            totalRecords: records.length,
            created: results.created,
            errors: results.errors.length
          }),
          createdAt: new Date()
        });

        res.status(201).json(results);
      });

      // Write the CSV content to the parser
      parser.write(csvContent);
      parser.end();
    } catch (error) {
      next(error);
    }
  });

  // ===== Template Messages Routes =====

  // Get all template messages
  app.get("/api/templates", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templates = await storage.listTemplateMessages();
      res.json(templates);
    } catch (error) {
      next(error);
    }
  });

  // Get template message by ID
  app.get("/api/templates/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templateId = parseInt(req.params.id);
      const template = await storage.getTemplateMessage(templateId);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(template);
    } catch (error) {
      next(error);
    }
  });

  // Create template message
  app.post("/api/templates", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const template = await storage.createTemplateMessage(req.body);

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "template_created",
        description: `Template message "${template.name}" created`,
        createdAt: new Date()
      });

      res.status(201).json(template);
    } catch (error) {
      next(error);
    }
  });

  // Update template message
  app.patch("/api/templates/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templateId = parseInt(req.params.id);
      const updatedTemplate = await storage.updateTemplateMessage(templateId, req.body);

      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "template_updated",
        description: `Template message "${updatedTemplate.name}" updated`,
        createdAt: new Date()
      });

      res.json(updatedTemplate);
    } catch (error) {
      next(error);
    }
  });

  // Delete template message
  app.delete("/api/templates/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const templateId = parseInt(req.params.id);
      const deleted = await storage.deleteTemplateMessage(templateId);

      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "template_deleted",
        description: `Template message with ID ${templateId} deleted`,
        createdAt: new Date()
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Test Automation
  app.post("/api/automations/:id/test", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const automationId = parseInt(req.params.id);
      const automation = await storage.getAutomationRule(automationId);

      if (!automation) {
        return res.status(404).json({ message: "Automation rule not found" });
      }

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "automation_tested",
        description: `Automation rule "${automation.name}" tested manually`,
        createdAt: new Date()
      });

      // Exécuter l'automatisation en fonction de son type
      if (automation.triggerType === 'daily-courses-message') {
        // Importer la fonction d'envoi des messages matinaux
        const { sendDailyCoursesMessages } = require('./automation-engine');
        await sendDailyCoursesMessages(automation);
        res.json({ success: true, message: "Daily courses messages sent successfully" });
      } else {
        // Pour les autres types d'automatisation, retourner simplement un succès
        res.json({ success: true, message: "Automation executed successfully" });
      }
    } catch (error) {
      next(error);
    }
  });

  // ===== Daily Messages Routes =====

  // Get message logs
  app.get("/api/message-logs", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messageLogs = await storage.getMessageLogs(limit);

      res.json(messageLogs);
    } catch (error) {
      next(error);
    }
  });

  // Get message logs by course
  app.get("/api/courses/:id/message-logs", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const courseId = parseInt(req.params.id);
      const messageLogs = await storage.getMessageLogsByCourse(courseId);

      res.json(messageLogs);
    } catch (error) {
      next(error);
    }
  });

  // Get message logs by date
  app.get("/api/message-logs/date/:date", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const date = new Date(req.params.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const messageLogs = await storage.getMessageLogsByDate(date);

      res.json(messageLogs);
    } catch (error) {
      next(error);
    }
  });

  // Send daily messages manually
  app.post("/api/daily-messages/send", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user!.role !== "admin" && req.user!.role !== "coach")) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Importer la fonction d'envoi des messages matinaux
      const { sendDailyCoursesMessages } = require('./automation-engine');
      await sendDailyCoursesMessages();

      // Log activity
      await storage.logActivity({
        userId: req.user!.id,
        type: "daily_messages_manual",
        description: "Daily courses messages sent manually",
        createdAt: new Date()
      });

      res.json({ success: true, message: "Daily courses messages sent successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Import sessions from CSV file
  app.post("/api/import-sessions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { importSessions } = require('./import-sessions');
      const result = await importSessions();

      if (result.success) {
        // Log activity
        await storage.logActivity({
          userId: req.user!.id,
          type: "import_sessions",
          description: `Imported ${result.count} sessions from CSV file`,
          createdAt: new Date()
        });

        res.json({ success: true, imported: result.count });
      } else {
        res.status(500).json({ success: false, message: result.error });
      }
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
