// Script pour initialiser les tables pour le planning fixe
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('Initialisation des tables pour le planning fixe...');

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Exécuter le script d'initialisation
const child = spawn('npx', ['tsx', join(__dirname, 'server/init-fixed-schedule-db.ts')], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`Processus terminé avec le code ${code}`);
  process.exit(code);
});
