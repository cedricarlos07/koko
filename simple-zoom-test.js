import dotenv from 'dotenv';
import axios from 'axios';

// Charger les variables d'environnement
dotenv.config();

// Récupérer les identifiants OAuth
const clientId = process.env.ZOOM_CLIENT_ID;
const clientSecret = process.env.ZOOM_CLIENT_SECRET;
const accountId = process.env.ZOOM_ACCOUNT_ID;

console.log('=== Test simple de l\'intégration Zoom OAuth 2.0 ===');
console.log('Client ID:', clientId ? '✓ Défini' : '✗ Non défini');
console.log('Client Secret:', clientSecret ? '✓ Défini' : '✗ Non défini');
console.log('Account ID:', accountId ? '✓ Défini' : '✗ Non défini');

if (!clientId || !clientSecret || !accountId) {
  console.error('Erreur: Identifiants OAuth manquants dans le fichier .env');
  process.exit(1);
}

// Fonction pour obtenir un token OAuth
async function getOAuthToken() {
  try {
    console.log('\nObtention du token OAuth...');
    
    // Encoder les identifiants en Base64
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Faire la requête pour obtenir un token
    const response = await axios.post(
      'https://zoom.us/oauth/token',
      new URLSearchParams({
        'grant_type': 'account_credentials',
        'account_id': accountId
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✓ Token obtenu avec succès!');
    console.log('Type de token:', response.data.token_type);
    console.log('Expire dans:', response.data.expires_in, 'secondes');
    console.log('Scopes:', response.data.scope);
    
    return response.data.access_token;
  } catch (error) {
    console.error('✗ Erreur lors de l\'obtention du token:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    throw error;
  }
}

// Fonction pour tester l'API Zoom
async function testZoomAPI(token) {
  try {
    console.log('\nTest de l\'API Zoom (liste des utilisateurs)...');
    
    const response = await axios.get('https://api.zoom.us/v2/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✓ API Zoom accessible!');
    console.log('Nombre d\'utilisateurs:', response.data.users.length);
    console.log('Premier utilisateur:', response.data.users[0].email);
    
    return response.data;
  } catch (error) {
    console.error('✗ Erreur lors de l\'accès à l\'API Zoom:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    throw error;
  }
}

// Fonction pour créer une réunion de test
async function createTestMeeting(token) {
  try {
    console.log('\nCréation d\'une réunion de test...');
    
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: 'Réunion de test OAuth',
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
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✓ Réunion créée avec succès!');
    console.log('ID de la réunion:', response.data.id);
    console.log('URL de la réunion:', response.data.join_url);
    
    return response.data;
  } catch (error) {
    console.error('✗ Erreur lors de la création de la réunion:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    throw error;
  }
}

// Exécuter les tests
async function runTests() {
  try {
    const token = await getOAuthToken();
    const users = await testZoomAPI(token);
    const meeting = await createTestMeeting(token);
    
    console.log('\n=== Tests terminés avec succès! ===');
  } catch (error) {
    console.error('\n=== Tests échoués ===');
  }
}

runTests();
