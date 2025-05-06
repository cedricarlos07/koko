const Database = require('better-sqlite3');

// Créer une connexion à la base de données
const db = new Database('./data/kodjo-english-v2.db');

// Récupérer la liste des tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables dans la base de données:');
tables.forEach(table => console.log(`- ${table.name}`));

// Récupérer la structure de la table fixed_schedules
console.log('\nStructure de la table fixed_schedules:');
const columns = db.prepare("PRAGMA table_info(fixed_schedules)").all();
columns.forEach(column => console.log(`- ${column.name} (${column.type})`));

// Récupérer un exemple de données
console.log('\nExemple de données de la table fixed_schedules:');
const example = db.prepare("SELECT * FROM fixed_schedules LIMIT 1").get();
console.log(example);

// Fermer la connexion à la base de données
db.close();
