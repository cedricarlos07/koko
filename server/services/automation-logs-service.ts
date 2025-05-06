import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq, desc } from 'drizzle-orm';

// Types de logs
export enum LogType {
  ZOOM_CREATION = 'zoom_creation',
  ZOOM_AUTH = 'zoom_auth',
  TELEGRAM_MESSAGE = 'telegram_message',
  TELEGRAM_INFO = 'telegram_info',
  TELEGRAM_BADGES = 'telegram_badges',
  SCHEDULED_MESSAGE = 'scheduled_message',
  TEST = 'test',
  CLEANUP = 'cleanup',
  REMINDER = 'reminder'
}

// Statuts de logs
export enum LogStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  SIMULATED = 'simulated'
}

// Service pour gérer les logs d'automatisation
export class AutomationLogsService {
  // Fonction pour créer un nouveau log
  async createLog(
    type: LogType,
    status: LogStatus,
    message: string,
    details?: any,
    fixedScheduleId?: number
  ): Promise<schema.AutomationLog> {
    const log: schema.InsertAutomationLog = {
      type,
      status,
      message,
      details: details ? JSON.stringify(details) : undefined,
      fixedScheduleId,
      createdAt: Date.now()
    };

    const result = db.insert(schema.automationLogs).values(log).run();
    const insertedId = result.lastInsertRowid as number;

    const insertedLog = db.select().from(schema.automationLogs)
      .where(eq(schema.automationLogs.id, insertedId))
      .get();

    if (!insertedLog) {
      throw new Error('Erreur lors de la création du log');
    }

    return insertedLog;
  }

  // Fonction pour récupérer tous les logs
  async getAllLogs(limit: number = 100): Promise<schema.AutomationLog[]> {
    return db.select().from(schema.automationLogs)
      .orderBy(desc(schema.automationLogs.createdAt))
      .limit(limit)
      .all();
  }

  // Fonction pour récupérer les logs par type
  async getLogsByType(type: LogType, limit: number = 100): Promise<schema.AutomationLog[]> {
    return db.select().from(schema.automationLogs)
      .where(eq(schema.automationLogs.type, type))
      .orderBy(desc(schema.automationLogs.createdAt))
      .limit(limit)
      .all();
  }

  // Fonction pour récupérer les logs par statut
  async getLogsByStatus(status: LogStatus, limit: number = 100): Promise<schema.AutomationLog[]> {
    return db.select().from(schema.automationLogs)
      .where(eq(schema.automationLogs.status, status))
      .orderBy(desc(schema.automationLogs.createdAt))
      .limit(limit)
      .all();
  }

  // Fonction pour récupérer les logs par cours planifié
  async getLogsByFixedSchedule(fixedScheduleId: number, limit: number = 100): Promise<schema.AutomationLog[]> {
    return db.select().from(schema.automationLogs)
      .where(eq(schema.automationLogs.fixedScheduleId, fixedScheduleId))
      .orderBy(desc(schema.automationLogs.createdAt))
      .limit(limit)
      .all();
  }
}

// Exporter une instance du service
export const automationLogsService = new AutomationLogsService();
