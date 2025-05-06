import { db } from '../db';
import * as schema from '../../shared/schema-fixed-schedule';
import { eq } from 'drizzle-orm';

// Service pour gérer les paramètres système
export class SystemSettingsService {
  // Fonction pour récupérer tous les paramètres système
  async getAllSettings(): Promise<schema.SystemSetting[]> {
    return db.select().from(schema.systemSettings).all();
  }

  // Fonction pour récupérer un paramètre système par sa clé
  async getSettingByKey(key: string): Promise<schema.SystemSetting | undefined> {
    return db.select().from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key))
      .get();
  }

  // Fonction pour récupérer la valeur d'un paramètre système
  async getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
    const setting = await this.getSettingByKey(key);
    return setting ? setting.value : defaultValue;
  }

  // Fonction pour mettre à jour un paramètre système
  async updateSetting(key: string, value: string): Promise<schema.SystemSetting | undefined> {
    const setting = await this.getSettingByKey(key);
    
    if (setting) {
      db.update(schema.systemSettings)
        .set({ value, updatedAt: Date.now() })
        .where(eq(schema.systemSettings.key, key))
        .run();
      
      return this.getSettingByKey(key);
    }
    
    return undefined;
  }

  // Fonction pour vérifier si le mode simulation est activé
  async isSimulationModeEnabled(): Promise<boolean> {
    const value = await this.getSettingValue('simulation_mode', 'true');
    return value.toLowerCase() === 'true';
  }

  // Fonction pour récupérer le nombre de minutes avant le cours pour envoyer un rappel
  async getReminderMinutesBefore(): Promise<number> {
    const value = await this.getSettingValue('reminder_minutes_before', '30');
    return parseInt(value, 10);
  }

  // Fonction pour récupérer le fuseau horaire
  async getTimezone(): Promise<string> {
    return this.getSettingValue('timezone', 'GMT');
  }
}

// Exporter une instance du service
export const systemSettingsService = new SystemSettingsService();
