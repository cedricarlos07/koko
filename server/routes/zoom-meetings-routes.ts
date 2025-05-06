import express from 'express';
import { zoomMeetingsController } from '../controllers/zoom-meetings-controller';

const router = express.Router();

// Routes pour les réunions Zoom
router.get('/zoom-meetings', zoomMeetingsController.getAllZoomMeetings.bind(zoomMeetingsController));
router.get('/zoom-meetings/:id', zoomMeetingsController.getZoomMeetingById.bind(zoomMeetingsController));
router.get('/fixed-schedules/:fixedScheduleId/zoom-meetings', zoomMeetingsController.getZoomMeetingsByFixedSchedule.bind(zoomMeetingsController));
router.post('/fixed-schedules/:fixedScheduleId/zoom', zoomMeetingsController.createZoomMeeting.bind(zoomMeetingsController));
router.delete('/zoom-meetings/:id', zoomMeetingsController.deleteZoomMeeting.bind(zoomMeetingsController));
router.put('/zoom-meetings/:id/status', zoomMeetingsController.updateZoomMeetingStatus.bind(zoomMeetingsController));
router.post('/zoom-meetings/bulk', zoomMeetingsController.createBulkZoomMeetings.bind(zoomMeetingsController));

export default router;
