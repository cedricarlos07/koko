import Database from 'better-sqlite3';
import session from 'express-session';
import SQLiteStore from 'better-sqlite3-session-store';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Assurez-vous que le répertoire de données existe
const dbDir = join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Chemin vers le fichier de base de données SQLite
const dbPath = join(dbDir, 'test-session.db');
console.log(`Utilisation de la base de données SQLite: ${dbPath}`);

// Supprimer la base de données existante si elle existe
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Base de données existante supprimée');
}

// Créer une connexion à la base de données SQLite
const sqlite = new Database(dbPath);
console.log('Connexion à la base de données établie');

// Créer une instance du store de session
const SQLiteStoreFactory = SQLiteStore(session);
const sessionStore = new SQLiteStoreFactory({
  client: sqlite,
  expired: {
    clear: true,
    intervalMs: 900000 // 15min
  }
});

console.log('Store de session créé');

// Vérifier la structure de la table
const tableInfo = sqlite.prepare("PRAGMA table_info(sessions)").all();
console.log('Structure de la table sessions:');
console.log(tableInfo);

// Insérer une session de test
const sessionId = 'test-session-id';
const sessionData = {
  cookie: {
    originalMaxAge: 86400000,
    expires: new Date(Date.now() + 86400000),
    secure: false,
    httpOnly: true,
    path: '/'
  },
  user: {
    id: 1,
    username: 'admin'
  }
};

sessionStore.set(sessionId, sessionData, (err) => {
  if (err) {
    console.error('Erreur lors de l\'insertion de la session:', err);
  } else {
    console.log('Session insérée avec succès');
    
    // Vérifier les données de la table
    const sessions = sqlite.prepare("SELECT * FROM sessions").all();
    console.log('Contenu de la table sessions:');
    console.log(sessions);
    
    // Récupérer la session
    sessionStore.get(sessionId, (err, session) => {
      if (err) {
        console.error('Erreur lors de la récupération de la session:', err);
      } else {
        console.log('Session récupérée:');
        console.log(session);
      }
      
      // Fermer la connexion
      sqlite.close();
      console.log('Connexion à la base de données fermée');
    });
  }
});
