import dotenv from 'dotenv';
import { zoomOAuthService } from './server/services/zoom-oauth-service.js';

// Activer les logs détaillés
console.log('Démarrage du script de test Zoom OAuth...');
console.log('Environnement NODE_ENV:', process.env.NODE_ENV);

// Charger les variables d'environnement
dotenv.config();

/**
 * Script de test pour l'intégration OAuth 2.0 Server-to-Server avec Zoom
 */
async function testZoomOAuth() {
  console.log('=== Test de l\'intégration Zoom OAuth 2.0 Server-to-Server ===');

  try {
    // 1. Vérifier les variables d'environnement
    console.log('\n1. Vérification des variables d\'environnement:');
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    const accountId = process.env.ZOOM_ACCOUNT_ID;

    if (!clientId || !clientSecret || !accountId) {
      console.error('❌ Variables d\'environnement manquantes:');
      if (!clientId) console.error('   - ZOOM_CLIENT_ID non défini');
      if (!clientSecret) console.error('   - ZOOM_CLIENT_SECRET non défini');
      if (!accountId) console.error('   - ZOOM_ACCOUNT_ID non défini');
      console.error('\nVeuillez définir ces variables dans le fichier .env');
      process.exit(1);
    }

    console.log('✅ Variables d\'environnement correctement définies');

    // 2. Obtenir un token OAuth
    console.log('\n2. Obtention d\'un token OAuth:');
    const token = await zoomOAuthService.getAccessToken();
    console.log('✅ Token OAuth obtenu avec succès');

    // 3. Vérifier les scopes
    console.log('\n3. Vérification des scopes:');
    const scopeCheck = await zoomOAuthService.checkScopes();

    if (scopeCheck.valid) {
      console.log('✅ Tous les scopes nécessaires sont disponibles');
    } else {
      console.warn('⚠️ Scopes manquants:', scopeCheck.missingScopes);
      console.log('\nVeuillez ajouter ces scopes dans la console développeur Zoom:');
      console.log('1. Connectez-vous à https://marketplace.zoom.us/');
      console.log('2. Accédez à votre application OAuth Server-to-Server');
      console.log('3. Dans "Scopes", ajoutez les scopes manquants');
      console.log('4. Enregistrez les modifications');
    }

    // 4. Tester l'API utilisateurs
    console.log('\n4. Test de l\'API utilisateurs:');
    try {
      const users = await zoomOAuthService.request('GET', '/users');
      console.log(`✅ ${users.users.length} utilisateurs récupérés`);
      console.log('   Premier utilisateur:', users.users[0].email);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error.message);
      if (error.response?.data) {
        console.error('   Détails:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // 5. Tester la création d'une réunion
    console.log('\n5. Test de création d\'une réunion:');
    try {
      const meeting = await zoomOAuthService.request(
        'POST',
        '/users/me/meetings',
        {
          topic: 'Test OAuth Server-to-Server',
          type: 2, // Réunion planifiée
          start_time: new Date(Date.now() + 3600000).toISOString(),
          duration: 30,
          timezone: 'GMT',
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: true,
            auto_recording: 'none'
          }
        }
      );

      console.log('✅ Réunion créée avec succès:');
      console.log('   ID:', meeting.id);
      console.log('   URL de participation:', meeting.join_url);
      console.log('   Mot de passe:', meeting.password);
    } catch (error) {
      console.error('❌ Erreur lors de la création de la réunion:', error.message);
      if (error.response?.data) {
        console.error('   Détails:', JSON.stringify(error.response.data, null, 2));
      }
    }

    console.log('\n=== Test terminé ===');
  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
  }
}

// Exécuter le test
testZoomOAuth().catch(console.error);
