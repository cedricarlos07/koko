// Script pour nettoyer la base de données et importer les données du fichier CSV personnalisé
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Réinitialisation et importation des données personnalisées...');

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

// Exécuter les scripts dans l'ordre
async function runAllScripts() {
  try {
    // 1. Nettoyer la base de données
    console.log('\n=== ÉTAPE 1: Nettoyage de la base de données ===\n');
    await runScript(join(__dirname, 'clean-db.js'));
    
    // 2. Importer les données du fichier CSV personnalisé
    console.log('\n=== ÉTAPE 2: Importation des données du fichier CSV personnalisé ===\n');
    await runScript(join(__dirname, 'import-custom.js'));
    
    // 3. Importer les templates et les règles d'automatisation
    console.log('\n=== ÉTAPE 3: Importation des templates et des règles d\'automatisation ===\n');
    await runScript(join(__dirname, 'import-templates.js'));
    
    console.log('\n=== RÉINITIALISATION ET IMPORTATION TERMINÉES AVEC SUCCÈS ===\n');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation et de l\'importation:', error);
    process.exit(1);
  }
}

// Exécuter tous les scripts
runAllScripts();
