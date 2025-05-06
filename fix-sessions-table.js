import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chemin vers le fichier de base de données SQLite
const dbPath = process.env.DATABASE_PATH || './data/kodjo-english-v2.db';
console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

// Vérifier si le fichier existe
if (!fs.existsSync(dbPath)) {
  console.error(`La base de données ${dbPath} n'existe pas.`);
  process.exit(1);
}

// Créer une connexion à la base de données SQLite
const db = new Database(dbPath);
console.log('Connexion à la base de données établie');

try {
  // Vérifier si la table sessions existe
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
  
  if (tableExists) {
    console.log('La table sessions existe');
    
    // Vérifier la structure de la table
    const tableInfo = db.prepare("PRAGMA table_info(sessions)").all();
    console.log('Structure actuelle de la table sessions:');
    console.log(tableInfo);
    
    // Vérifier si les colonnes nécessaires existent
    const hasSid = tableInfo.some(col => col.name === 'sid');
    const hasSess = tableInfo.some(col => col.name === 'sess');
    const hasExpire = tableInfo.some(col => col.name === 'expire');
    
    if (hasSid && hasSess && hasExpire) {
      console.log('La table sessions a la structure correcte');
    } else {
      console.log('La table sessions n\'a pas la structure correcte');
      
      // Supprimer la table existante
      db.prepare("DROP TABLE sessions").run();
      console.log('Table sessions supprimée');
      
      // Créer la table avec la structure correcte
      db.prepare(`
        CREATE TABLE sessions (
          sid TEXT PRIMARY KEY,
          sess TEXT NOT NULL,
          expire TEXT NOT NULL
        )
      `).run();
      console.log('Table sessions recréée avec la structure correcte');
    }
  } else {
    console.log('La table sessions n\'existe pas');
    
    // Créer la table avec la structure correcte
    db.prepare(`
      CREATE TABLE sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire TEXT NOT NULL
      )
    `).run();
    console.log('Table sessions créée avec la structure correcte');
  }
  
  // Vérifier la structure finale
  const finalTableInfo = db.prepare("PRAGMA table_info(sessions)").all();
  console.log('Structure finale de la table sessions:');
  console.log(finalTableInfo);
  
  console.log('Opération terminée avec succès');
} catch (error) {
  console.error('Erreur lors de la vérification/correction de la table sessions:', error);
} finally {
  // Fermer la connexion
  db.close();
  console.log('Connexion à la base de données fermée');
}
