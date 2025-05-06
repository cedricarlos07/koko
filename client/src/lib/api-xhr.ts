/**
 * Fonction pour effectuer des requêtes API avec XMLHttpRequest
 * @param method Méthode HTTP (GET, POST, PUT, DELETE, etc.)
 * @param endpoint Point d'entrée de l'API
 * @param data Données à envoyer (pour POST, PUT, etc.)
 * @returns Promise avec la réponse
 */
export function apiRequestXHR(
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open(method, endpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true; // Pour inclure les cookies dans les requêtes
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else if (xhr.status === 401) {
        // Si la réponse est un 401 (non autorisé), rediriger vers la page de connexion
        window.location.href = '/auth';
        reject('Non autorisé');
      } else {
        console.error(`Erreur API (${xhr.status}):`, endpoint);
        console.error('Détails de l\'erreur:', xhr.responseText);
        reject(new Error(`Erreur ${xhr.status}: ${xhr.responseText}`));
      }
    };
    
    xhr.onerror = function() {
      console.error(`Erreur réseau lors de la requête ${method} ${endpoint}`);
      reject(new Error('Erreur réseau'));
    };
    
    xhr.ontimeout = function() {
      console.error(`Timeout lors de la requête ${method} ${endpoint}`);
      reject(new Error('Timeout'));
    };
    
    console.log(`Requête API: ${method} ${endpoint}`, data ? data : '');
    
    if (data) {
      xhr.send(JSON.stringify(data));
    } else {
      xhr.send();
    }
  });
}
