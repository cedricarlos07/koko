import { db, sqlite } from './db';
import * as schema from '../shared/schema-sqlite';

// Fonction pour nettoyer la base de données
async function cleanDatabase() {
  console.log('Nettoyage de la base de données...');

  try {
    // Supprimer toutes les sessions
    console.log('Suppression des sessions...');
    db.delete(schema.sessions).run();

    // Supprimer tous les cours
    console.log('Suppression des cours...');
    db.delete(schema.courses).run();

    // Supprimer les utilisateurs (sauf admin)
    console.log('Suppression des utilisateurs (sauf admin)...');

    // Utiliser une requête SQL directe pour trouver l'admin
    const adminUser = sqlite.prepare('SELECT * FROM users WHERE username = ?').get('admin');

    if (adminUser) {
      // Supprimer tous les utilisateurs sauf l'admin
      sqlite.exec(`DELETE FROM users WHERE id != ${adminUser.id}`);
      console.log(`Utilisateurs supprimés (sauf admin ID: ${adminUser.id})`);
    } else {
      console.log('Utilisateur admin non trouvé. Aucun utilisateur supprimé.');
    }

    console.log('Nettoyage de la base de données terminé avec succès');
  } catch (error) {
    console.error('Erreur lors du nettoyage de la base de données:', error);
    throw error;
  }
}

// Exécuter le nettoyage
cleanDatabase().then(() => {
  console.log('Script de nettoyage terminé');
}).catch(error => {
  console.error('Erreur dans le script de nettoyage:', error);
});
