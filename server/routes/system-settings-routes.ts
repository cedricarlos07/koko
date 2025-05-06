import express from 'express';
import { systemSettingsController } from '../controllers/system-settings-controller';

const router = express.Router();

// Routes pour les paramètres système
router.get('/settings', systemSettingsController.getAllSettings.bind(systemSettingsController));
router.get('/settings/:key', systemSettingsController.getSettingByKey.bind(systemSettingsController));
router.put('/settings/:key', systemSettingsController.updateSetting.bind(systemSettingsController));

// Routes pour les logs
router.get('/logs', systemSettingsController.getAllLogs.bind(systemSettingsController));
router.get('/logs/type/:type', systemSettingsController.getLogsByType.bind(systemSettingsController));
router.get('/logs/status/:status', systemSettingsController.getLogsByStatus.bind(systemSettingsController));

// Route pour réinitialiser le planificateur
router.post('/scheduler/reset', systemSettingsController.resetScheduler.bind(systemSettingsController));

export default router;
