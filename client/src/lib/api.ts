/**
 * Fonction pour effectuer des requêtes API
 * @param method Méthode HTTP (GET, POST, PUT, DELETE, etc.)
 * @param endpoint Point d'entrée de l'API
 * @param data Données à envoyer (pour POST, PUT, etc.)
 * @returns Promise avec la réponse
 */
export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Pour inclure les cookies dans les requêtes
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    console.log(`Requête API: ${method} ${endpoint}`, data ? data : '');
    const response = await fetch(endpoint, options);

    // Si la réponse est un 401 (non autorisé), rediriger vers la page de connexion
    if (response.status === 401) {
      console.error('Erreur d\'authentification (401):', endpoint);
      window.location.href = '/auth';
      return Promise.reject('Non autorisé');
    }

    // Vérifier si la réponse est OK (statut 2xx)
    if (!response.ok) {
      console.error(`Erreur API (${response.status}):`, endpoint);
      const errorText = await response.text();
      console.error('Détails de l\'erreur:', errorText);
      return Promise.reject(new Error(`Erreur ${response.status}: ${errorText}`));
    }

    return response;
  } catch (error) {
    console.error(`Erreur lors de la requête ${method} ${endpoint}:`, error);
    return Promise.reject(error);
  }
}
