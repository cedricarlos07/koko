import express from 'express';
import { dynamicScheduleController } from '../controllers/dynamic-schedule-controller';

const router = express.Router();

// Routes pour le planning dynamique
router.get('/dynamic-schedule', dynamicScheduleController.getDynamicSchedule.bind(dynamicScheduleController));
router.get('/dynamic-schedule/:id', dynamicScheduleController.getDynamicScheduleById.bind(dynamicScheduleController));
router.post('/dynamic-schedule/generate', dynamicScheduleController.generateDynamicSchedule.bind(dynamicScheduleController));
router.post('/dynamic-schedule/:id/zoom', dynamicScheduleController.createZoomMeeting.bind(dynamicScheduleController));
router.post('/dynamic-schedule/bulk-zoom', dynamicScheduleController.createBulkZoomMeetings.bind(dynamicScheduleController));

export default router;
