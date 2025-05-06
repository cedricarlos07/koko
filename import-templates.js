// Script pour importer les templates et les règles d'automatisation
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Importation des templates et des règles d\'automatisation...');

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Exécuter le script d'importation
const child = spawn('npx', ['tsx', join(__dirname, 'server/import-templates.ts')], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`Processus terminé avec le code ${code}`);
  process.exit(code);
});
