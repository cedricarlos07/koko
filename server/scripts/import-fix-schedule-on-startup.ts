import { csvImportService } from '../services/csv-import-service';
import { automationLogsService, LogType, LogStatus } from '../services/automation-logs-service';
import path from 'path';
import fs from 'fs';

// Fonction pour importer le planning fixe au démarrage de l'application
export async function importFixScheduleOnStartup() {
  try {
    console.log('Vérification et importation du planning fixe au démarrage...');
    
    // Chemin vers le fichier CSV
    const csvPath = path.resolve(process.cwd(), 'data/csv/fix_schedule.csv');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(csvPath)) {
      console.log(`Le fichier ${csvPath} n'existe pas. Importation ignorée.`);
      return;
    }
    
    // Importer le planning fixe
    const fixedSchedules = await csvImportService.importFixedScheduleFromCSV(csvPath);
    
    // Créer un log de succès
    await automationLogsService.createLog(
      LogType.IMPORT,
      LogStatus.SUCCESS,
      `Planning fixe importé automatiquement au démarrage: ${fixedSchedules.length} cours importés`,
      { count: fixedSchedules.length }
    );
    
    console.log(`Planning fixe importé avec succès: ${fixedSchedules.length} cours importés`);
  } catch (error) {
    console.error('Erreur lors de l\'importation du planning fixe au démarrage:', error);
    
    // Créer un log d'erreur
    await automationLogsService.createLog(
      LogType.IMPORT,
      LogStatus.ERROR,
      'Erreur lors de l\'importation du planning fixe au démarrage',
      { error: error.message }
    );
  }
}
