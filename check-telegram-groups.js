import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'data', 'kodjo-english-v2.db');

// Créer une connexion à la base de données
const db = new Database(dbPath);

// Récupérer tous les cours planifiés avec leurs groupes Telegram
const fixedSchedules = db.prepare('SELECT * FROM fixed_schedules').all();

// Afficher les colonnes disponibles dans la table fixed_schedules
const columns = db.prepare('PRAGMA table_info(fixed_schedules)').all();
console.log('\nColonnes de la table fixed_schedules:');
columns.forEach(column => {
  console.log(`${column.cid}. ${column.name} (${column.type})`);
});

// Filtrer les cours sans groupe Telegram
const telegramGroups = fixedSchedules.filter(schedule => schedule.telegram_group);

console.log(`Nombre total de cours planifiés: ${fixedSchedules.length}`);
console.log(`Nombre de cours avec un groupe Telegram: ${telegramGroups.length}`);

// Afficher les 10 premiers groupes Telegram
console.log('\nLes 10 premiers groupes Telegram:');
telegramGroups.slice(0, 10).forEach((schedule, index) => {
  console.log(`${index + 1}. Cours: ${schedule.course_name}, Groupe: ${schedule.telegram_group}`);
});

// Afficher les groupes Telegram uniques
const uniqueGroups = new Set();
telegramGroups.forEach(schedule => {
  uniqueGroups.add(schedule.telegram_group);
});

console.log(`\nNombre de groupes Telegram uniques: ${uniqueGroups.size}`);

// Afficher les 10 premiers groupes Telegram uniques
console.log('\nLes 10 premiers groupes Telegram uniques:');
Array.from(uniqueGroups).slice(0, 10).forEach((group, index) => {
  console.log(`${index + 1}. Groupe: ${group}`);
});

// Fermer la connexion à la base de données
db.close();
