import { Request, Response } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { csvImportService } from '../services/csv-import-service';

// Contrôleur pour les métadonnées
export class MetadataController {
  // Récupérer les noms des coachs
  async getCoaches(req: Request, res: Response) {
    try {
      const coaches = await csvImportService.getCoachesFromFixedSchedule();
      res.json(coaches);
    } catch (error) {
      console.error('Erreur lors de la récupération des coachs:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Récupérer les niveaux
  async getLevels(req: Request, res: Response) {
    try {
      const levels = await csvImportService.getLevelsFromFixedSchedule();
      res.json(levels);
    } catch (error) {
      console.error('Erreur lors de la récupération des niveaux:', error);
      res.status(500).json({ error: error.message });
    }
  }
  
  // Récupérer les métadonnées (coachs et niveaux)
  async getMetadata(req: Request, res: Response) {
    try {
      const coaches = await csvImportService.getCoachesFromFixedSchedule();
      const levels = await csvImportService.getLevelsFromFixedSchedule();
      
      res.json({
        coaches,
        levels
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des métadonnées:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const metadataController = new MetadataController();
