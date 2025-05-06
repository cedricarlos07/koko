import express from 'express';
import { fixedScheduleController, upload } from '../controllers/fixed-schedule-controller';

const router = express.Router();

// Routes pour le planning fixe
router.get('/fixed-schedules', fixedScheduleController.getAllFixedSchedules.bind(fixedScheduleController));
router.get('/fixed-schedules/:id', fixedScheduleController.getFixedScheduleById.bind(fixedScheduleController));
router.post('/fixed-schedules', fixedScheduleController.createFixedSchedule.bind(fixedScheduleController));
router.put('/fixed-schedules/:id', fixedScheduleController.updateFixedSchedule.bind(fixedScheduleController));
router.delete('/fixed-schedules/:id', fixedScheduleController.deleteFixedSchedule.bind(fixedScheduleController));
router.put('/fixed-schedules/:id/status', fixedScheduleController.toggleFixedScheduleStatus.bind(fixedScheduleController));
router.post('/fixed-schedules/import', upload.single('csv'), fixedScheduleController.importFromCSV.bind(fixedScheduleController));
router.post('/fixed-schedules/import-direct', fixedScheduleController.importFromDefaultCSV.bind(fixedScheduleController));
router.post('/fixed-schedules/insert-real-data', fixedScheduleController.insertRealData.bind(fixedScheduleController));

// Routes pour les réunions Zoom
router.post('/fixed-schedules/:id/zoom', fixedScheduleController.createZoomMeeting.bind(fixedScheduleController));
router.get('/fixed-schedules/:id/zoom', fixedScheduleController.getZoomMeetings.bind(fixedScheduleController));

// Routes pour les messages Telegram
router.post('/fixed-schedules/:id/message', fixedScheduleController.sendCourseMessage.bind(fixedScheduleController));
router.post('/fixed-schedules/:id/reminder', fixedScheduleController.sendReminderMessage.bind(fixedScheduleController));

// Routes pour les tâches planifiées
router.post('/tasks/zoom', fixedScheduleController.manuallyCreateZoomMeetings.bind(fixedScheduleController));
router.post('/tasks/messages', fixedScheduleController.manuallySendCourseMessages.bind(fixedScheduleController));

// Routes pour les logs
router.get('/fixed-schedules/:id/logs', fixedScheduleController.getAutomationLogs.bind(fixedScheduleController));

export default router;
