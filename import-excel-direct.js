// Script pour importer directement le planning fixe depuis un fichier Excel
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Importation directe du planning fixe depuis le fichier Excel...');

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Exécuter le script d'importation
const child = spawn('node', [join(__dirname, 'server/import-excel-direct.js')], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`Processus terminé avec le code ${code}`);
  process.exit(code);
});
