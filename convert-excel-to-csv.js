const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier Excel
const excelFilePath = 'Kodjo English - Classes Schedules (2).xlsx';

// Fonction pour convertir Excel en CSV
function convertExcelToCSV(filePath) {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier ${filePath} n'existe pas`);
      process.exit(1);
    }

    // Lire le fichier Excel
    const workbook = XLSX.readFile(filePath);
    
    // Créer le répertoire data/csv s'il n'existe pas
    const csvDir = path.join('data', 'csv');
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true });
    }
    
    // Parcourir toutes les feuilles
    workbook.SheetNames.forEach(sheetName => {
      console.log(`Traitement de la feuille: ${sheetName}`);
      
      // Convertir la feuille en CSV
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      
      // Sauvegarder le CSV
      const csvFilePath = path.join(csvDir, `${sheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
      fs.writeFileSync(csvFilePath, csv);
      
      console.log(`Feuille "${sheetName}" convertie en CSV: ${csvFilePath}`);
      
      // Afficher les premières lignes du CSV
      const csvLines = csv.split('\n').slice(0, 5).join('\n');
      console.log(`Aperçu des données:\n${csvLines}\n`);
    });
    
    console.log('Conversion terminée avec succès');
  } catch (error) {
    console.error('Erreur lors de la conversion:', error);
  }
}

// Exécuter la conversion
convertExcelToCSV(excelFilePath);
