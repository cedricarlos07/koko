import axios from 'axios';
import { automationLogsService, LogType, LogStatus } from './automation-logs-service';

/**
 * Service pour gérer l'authentification OAuth 2.0 Server-to-Server avec Zoom
 */
export class ZoomOAuthService {
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private tokenUrl: string = 'https://zoom.us/oauth/token';
  private apiBaseUrl: string = 'https://api.zoom.us/v2';
  
  // Cache pour le token OAuth
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  
  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    
    if (!this.clientId || !this.clientSecret || !this.accountId) {
      console.warn('ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET ou ZOOM_ACCOUNT_ID non définis. La fonctionnalité Zoom sera limitée.');
    }
  }
  
  /**
   * Obtient un token OAuth 2.0 valide
   * Utilise le cache si le token est encore valide, sinon en demande un nouveau
   */
  async getAccessToken(): Promise<string> {
    // Vérifier si nous avons déjà un token valide
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now + 60000) { // 1 minute de marge
      return this.accessToken;
    }
    
    try {
      // Préparer les données pour la requête de token
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      // Faire la requête pour obtenir un nouveau token
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          'grant_type': 'account_credentials',
          'account_id': this.accountId
        }).toString(),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Enregistrer le token et sa date d'expiration
      this.accessToken = response.data.access_token;
      // Convertir l'expiration en millisecondes et soustraire 5 minutes pour être sûr
      this.tokenExpiry = now + (response.data.expires_in * 1000) - 300000;
      
      // Journaliser l'obtention du token
      await automationLogsService.createLog(
        LogType.ZOOM_AUTH,
        LogStatus.SUCCESS,
        'Token OAuth Zoom obtenu avec succès',
        {
          expiresIn: response.data.expires_in,
          tokenType: response.data.token_type,
          scope: response.data.scope
        }
      );
      
      return this.accessToken;
    } catch (error) {
      // Journaliser l'erreur
      await automationLogsService.createLog(
        LogType.ZOOM_AUTH,
        LogStatus.ERROR,
        'Erreur lors de l\'obtention du token OAuth Zoom',
        {
          error: error.response?.data || error.message
        }
      );
      
      throw new Error(`Erreur lors de l'obtention du token OAuth Zoom: ${error.message}`);
    }
  }
  
  /**
   * Effectue une requête API Zoom authentifiée
   */
  async request(method: string, endpoint: string, data?: any): Promise<any> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios({
        method,
        url: `${this.apiBaseUrl}${endpoint}`,
        data,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      // Vérifier si l'erreur est due à un problème de token ou de scope
      if (error.response?.status === 401) {
        // Forcer le rafraîchissement du token
        this.accessToken = null;
        
        // Journaliser l'erreur d'authentification
        await automationLogsService.createLog(
          LogType.ZOOM_AUTH,
          LogStatus.ERROR,
          'Erreur d\'authentification Zoom: token invalide',
          {
            error: error.response?.data || error.message
          }
        );
      } else if (error.response?.status === 403) {
        // Problème de scope
        await automationLogsService.createLog(
          LogType.ZOOM_AUTH,
          LogStatus.ERROR,
          'Erreur d\'autorisation Zoom: scope insuffisant',
          {
            error: error.response?.data || error.message,
            endpoint
          }
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Vérifie si les scopes nécessaires sont disponibles
   */
  async checkScopes(): Promise<{valid: boolean, missingScopes: string[]}> {
    try {
      const token = await this.getAccessToken();
      
      // Extraire les scopes du token (ils sont inclus dans la réponse du token)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Format de token invalide');
      }
      
      // Décoder la partie payload du token JWT
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      const currentScopes = payload.scope?.split(' ') || [];
      
      // Liste des scopes nécessaires pour notre application
      const requiredScopes = [
        'user:read:admin',
        'user:write:admin',
        'meeting:read:admin',
        'meeting:write:admin'
      ];
      
      // Vérifier les scopes manquants
      const missingScopes = requiredScopes.filter(scope => !currentScopes.includes(scope));
      
      return {
        valid: missingScopes.length === 0,
        missingScopes
      };
    } catch (error) {
      console.error('Erreur lors de la vérification des scopes:', error);
      return {
        valid: false,
        missingScopes: ['Erreur lors de la vérification']
      };
    }
  }
}

// Exporter une instance du service
export const zoomOAuthService = new ZoomOAuthService();
