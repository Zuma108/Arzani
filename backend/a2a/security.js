/**
 * Security utilities for A2A protocol
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Generate a secure API key for A2A authentication
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create JWT token for A2A authentication
 */
function createToken(payload = {}, expiresIn = '1h') {
  try {
    return jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000)
      },
      config.a2a.jwtSecret,
      { expiresIn }
    );
  } catch (error) {
    logger.error('Error creating JWT token:', error);
    throw error;
  }
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.a2a.jwtSecret);
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.split(' ')[1];
}

/**
 * Authentication middleware for A2A routes
 */
function authMiddleware(req, res, next) {
  // Skip auth check if in development mode
  if (config.env === 'development' && config.a2a.skipAuthInDev) {
    return next();
  }
  
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
  
  // Attach decoded payload to request object
  req.user = decoded;
  
  next();
}

/**
 * HMAC signature verification for webhook callbacks
 */
function verifyWebhookSignature(signature, payload, secret) {
  if (!signature || !payload || !secret) {
    return false;
  }
  
  try {
    const calculatedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    return false;
  }
}

module.exports = {
  generateApiKey,
  createToken,
  verifyToken,
  extractToken,
  authMiddleware,
  verifyWebhookSignature
};
