/**
 * OAuth Service for Google and Microsoft Authentication
 * Provides secure OAuth 2.0 flow implementation
 */

import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../public/js/config.js';
import { createOrUpdateOAuthUser } from '../database.js';

export class OAuthService {
  constructor() {
    try {
      // Check if OAuth configuration is available
      if (!config.oauth?.google?.clientId || !config.oauth?.google?.clientSecret) {
        console.warn('⚠️ Google OAuth credentials not configured - OAuth service will be disabled');
        this.isConfigured = false;
        return;
      }

      // Initialize Google OAuth client
      this.googleClient = new OAuth2Client(
        config.oauth.google.clientId,
        config.oauth.google.clientSecret,
        config.oauth.google.redirectUri
      );
      
      this.isConfigured = true;
      console.log('✅ OAuth service configured successfully');
    } catch (error) {
      console.error('❌ OAuth service configuration failed:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Generate a secure state parameter for OAuth flows
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify state parameter to prevent CSRF attacks
   */
  verifyState(sessionState, receivedState) {
    return sessionState && receivedState && sessionState === receivedState;
  }

  /**
   * Google OAuth Methods
   */

  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl(state) {
    return this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: state,
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  /**
   * Verify Google ID token (for Sign-In with Google)
   */
  async verifyGoogleIdToken(credential) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: config.oauth.google.clientId
      });

      const payload = ticket.getPayload();
      
      return {
        success: true,
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          email_verified: payload.email_verified
        }
      };
    } catch (error) {
      console.error('Google ID token verification failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Exchange Google authorization code for tokens
   */
  async exchangeGoogleCode(code) {
    try {
      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      // Get user info from Google
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        }
      );

      return {
        success: true,
        user: response.data,
        tokens: tokens
      };
    } catch (error) {
      console.error('Google code exchange failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Microsoft OAuth Methods
   */

  /**
   * Get Microsoft OAuth authorization URL
   */
  getMicrosoftAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: config.oauth.microsoft.clientId,
      response_type: 'code',
      redirect_uri: config.oauth.microsoft.redirectUri,
      response_mode: 'query',
      scope: 'openid profile email User.Read',
      state: state,
      prompt: 'consent'
    });

    return `https://login.microsoftonline.com/${config.oauth.microsoft.tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange Microsoft authorization code for tokens
   */
  async exchangeMicrosoftCode(code) {
    try {
      // Exchange code for tokens
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${config.oauth.microsoft.tenant}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: config.oauth.microsoft.clientId,
          client_secret: config.oauth.microsoft.clientSecret,
          code: code,
          redirect_uri: config.oauth.microsoft.redirectUri,
          grant_type: 'authorization_code'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokens = tokenResponse.data;

      // Get user profile from Microsoft Graph
      const userResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me',
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        }
      );

      return {
        success: true,
        user: {
          id: userResponse.data.id,
          email: userResponse.data.mail || userResponse.data.userPrincipalName,
          name: userResponse.data.displayName,
          first_name: userResponse.data.givenName,
          last_name: userResponse.data.surname
        },
        tokens: tokens
      };
    } catch (error) {
      console.error('Microsoft code exchange failed:', error);
      return {
        success: false,
        error: error.response?.data?.error_description || error.message
      };
    }
  }

  /**
   * Common OAuth user processing
   */
  async processOAuthUser(userData, provider, tokens = null) {
    try {
      const user = await createOrUpdateOAuthUser({
        email: userData.email,
        username: userData.name,
        provider: provider,
        providerId: userData.id,
        profile_picture: userData.picture || null,
        tokens: tokens
      });

      // Generate JWT token
      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '4h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        config.refreshTokenSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        token: jwtToken,
        refreshToken: refreshToken
      };
    } catch (error) {
      console.error('OAuth user processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new OAuthService();
