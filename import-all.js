// Script pour importer toutes les données dans la base de données SQLite
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Importation de toutes les données dans la base de données SQLite...');

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fonction pour exécuter un script
async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Le script a échoué avec le code ${code}`));
      }
    });
  });
}

// Exécuter tous les scripts d'importation
async function runAllImports() {
  try {
    // 1. Importer les données CSV
    console.log('\n=== ÉTAPE 1: Importation des données CSV ===\n');
    await runScript(join(__dirname, 'import-data.js'));
    
    // 2. Importer les templates et les règles d'automatisation
    console.log('\n=== ÉTAPE 2: Importation des templates et des règles d\'automatisation ===\n');
    await runScript(join(__dirname, 'import-templates.js'));
    
    console.log('\n=== IMPORTATION TERMINÉE AVEC SUCCÈS ===\n');
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
    process.exit(1);
  }
}

// Exécuter toutes les importations
runAllImports();
