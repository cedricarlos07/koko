import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';

/**
 * Interface pour la création d'un log d'automatisation
 */
interface CreateAutomationLogParams {
  type: string;
  status: string;
  message: string;
  details?: string;
  fixedScheduleId?: number;
}

/**
 * Service pour la gestion des logs d'automatisation
 */
export class AutomationLogService {
  /**
   * Crée un log d'automatisation
   * @param params Les paramètres du log
   * @returns L'ID du log créé
   */
  async createLog(params: CreateAutomationLogParams): Promise<number> {
    try {
      const result = db.insert(schema.automationLogs)
        .values({
          type: params.type,
          status: params.status,
          message: params.message,
          details: params.details,
          fixedScheduleId: params.fixedScheduleId,
          createdAt: Date.now(),
        })
        .run();
      
      return result.lastInsertRowid as number;
    } catch (error) {
      console.error('Erreur lors de la création du log d\'automatisation:', error);
      throw error;
    }
  }
  
  /**
   * Récupère tous les logs d'automatisation
   * @returns Les logs d'automatisation
   */
  async getLogs(): Promise<any[]> {
    try {
      return db.select()
        .from(schema.automationLogs)
        .order(schema.automationLogs.createdAt, 'desc')
        .all();
    } catch (error) {
      console.error('Erreur lors de la récupération des logs d\'automatisation:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les logs d'automatisation pour un cours
   * @param fixedScheduleId L'ID du cours
   * @returns Les logs d'automatisation pour le cours
   */
  async getLogsByCourse(fixedScheduleId: number): Promise<any[]> {
    try {
      return db.select()
        .from(schema.automationLogs)
        .where(schema.automationLogs.fixedScheduleId == fixedScheduleId)
        .order(schema.automationLogs.createdAt, 'desc')
        .all();
    } catch (error) {
      console.error(`Erreur lors de la récupération des logs d'automatisation pour le cours ${fixedScheduleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les logs d'automatisation par type
   * @param type Le type de log
   * @returns Les logs d'automatisation du type spécifié
   */
  async getLogsByType(type: string): Promise<any[]> {
    try {
      return db.select()
        .from(schema.automationLogs)
        .where(schema.automationLogs.type == type)
        .order(schema.automationLogs.createdAt, 'desc')
        .all();
    } catch (error) {
      console.error(`Erreur lors de la récupération des logs d'automatisation de type ${type}:`, error);
      throw error;
    }
  }
}

// Créer une instance du service
const automationLogService = new AutomationLogService();

export { automationLogService };
