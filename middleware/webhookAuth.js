import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

/**
 * Middleware to authenticate webhook requests
 * Supports multiple authentication methods:
 * 1. JWT token in Authorization Bearer header
 * 2. Plain API key in X-Webhook-Token header
 * 3. Plain API key in Authorization Bearer header
 */
export const requireWebhookAuth = (req, res, next) => {
  // Get API secret from environment variables
  const apiSecret = process.env.SITEMAP_API_SECRET;
  const jwtSecret = process.env.JWT_SECRET;
  
  // Get authorization headers
  const authHeader = req.headers.authorization;
  const webhookToken = req.headers['x-webhook-token'];
  
  console.log('[Webhook Auth] Checking authentication', { 
    hasAuthHeader: !!authHeader, 
    hasWebhookToken: !!webhookToken,
    authType: authHeader ? authHeader.split(' ')[0] : 'none'
  });

  // Method 1: Check X-Webhook-Token header (direct API key)
  if (webhookToken && webhookToken === apiSecret) {
    console.log('[Webhook Auth] Authenticated via X-Webhook-Token');
    return next();
  }
  
  // Method 2: Check Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    // First try as JWT token
    try {
      jwt.verify(token, jwtSecret);
      console.log('[Webhook Auth] Authenticated via JWT token');
      return next();
    } catch (jwtError) {
      console.log('[Webhook Auth] JWT verification failed, trying as API key');
      
      // If JWT verification fails, try as plain API key
      if (token === apiSecret) {
        console.log('[Webhook Auth] Authenticated via Bearer token as API key');
        return next();
      }
    }
  }

  // If no authentication method worked
  console.error('[Webhook Auth] Authentication failed');
  return res.status(401).json({ 
    success: false, 
    error: 'Unauthorized - Invalid webhook authentication'
  });
};
