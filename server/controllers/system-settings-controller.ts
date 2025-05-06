import { Request, Response } from 'express';
import { systemSettingsService } from '../services/system-settings-service';
import { automationLogsService } from '../services/automation-logs-service';
import { schedulerService } from '../services/scheduler-service';

// Contrôleur pour les paramètres système
export class SystemSettingsController {
  // Récupérer tous les paramètres système
  async getAllSettings(req: Request, res: Response) {
    try {
      const settings = await systemSettingsService.getAllSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer un paramètre système par sa clé
  async getSettingByKey(req: Request, res: Response) {
    try {
      const key = req.params.key;
      const setting = await systemSettingsService.getSettingByKey(key);
      
      if (!setting) {
        return res.status(404).json({ error: 'Paramètre système non trouvé' });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Mettre à jour un paramètre système
  async updateSetting(req: Request, res: Response) {
    try {
      const key = req.params.key;
      const { value } = req.body;
      
      if (typeof value !== 'string') {
        return res.status(400).json({ error: 'Le paramètre value doit être une chaîne de caractères' });
      }
      
      const setting = await systemSettingsService.updateSetting(key, value);
      
      if (!setting) {
        return res.status(404).json({ error: 'Paramètre système non trouvé' });
      }
      
      // Si le mode simulation a été modifié, réinitialiser le planificateur
      if (key === 'simulation_mode') {
        await schedulerService.initializeScheduler();
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer tous les logs d'automatisation
  async getAllLogs(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await automationLogsService.getAllLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer les logs d'automatisation par type
  async getLogsByType(req: Request, res: Response) {
    try {
      const type = req.params.type;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await automationLogsService.getLogsByType(type as any, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Récupérer les logs d'automatisation par statut
  async getLogsByStatus(req: Request, res: Response) {
    try {
      const status = req.params.status;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await automationLogsService.getLogsByStatus(status as any, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Réinitialiser le planificateur
  async resetScheduler(req: Request, res: Response) {
    try {
      await schedulerService.initializeScheduler();
      res.json({ message: 'Planificateur réinitialisé avec succès' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// Exporter une instance du contrôleur
export const systemSettingsController = new SystemSettingsController();
