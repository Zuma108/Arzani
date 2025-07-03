/**
 * Authentication utility for standardized auth checking across the application
 * This provides a single consolidated interface for all authentication operations
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Constants
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '14d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';

/**
 * Unified authentication check utility
 * @param {Object} req - Request object
 * @param {boolean} requireAdmin - Whether admin role is required
 * @returns {Object} Authentication result with user info if authenticated
 */
export async function verifyAuthentication(req, requireAdmin = false) {
  try {
    // Debug info for troubleshooting
    const debugInfo = {
      hasAuthHeader: !!req.headers?.authorization,
      hasTokenCookie: !!req.cookies?.token,
      hasSessionUserId: !!req.session?.userId,
      path: req.path,
      method: req.method
    };
    
    console.log('Auth Check:', debugInfo);
    
    // Step 1: Extract token from all possible locations
    const token = extractToken(req);
    
    if (!token) {
      return {
        authenticated: false,
        error: 'No authentication token found',
        debug: debugInfo
      };
    }
    
    // Step 2: Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
      
      return {
        authenticated: false,
        error: tokenError.name === 'TokenExpiredError' 
          ? 'Token expired' 
          : 'Invalid token',
        debug: { ...debugInfo, error: tokenError.message },
        expired: tokenError.name === 'TokenExpiredError'
      };
    }
    
    if (!decoded.userId) {
      return {
        authenticated: false,
        error: 'Token missing user ID',
        debug: debugInfo
      };
    }
    
    // Step 3: Verify user exists in database
    try {
      const query = requireAdmin
        ? 'SELECT id, email, username, role FROM users WHERE id = $1 AND role = $2'
        : 'SELECT id, email, username, role FROM users WHERE id = $1';
      
      const params = requireAdmin
        ? [decoded.userId, 'admin']
        : [decoded.userId];
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          authenticated: false,
          error: requireAdmin ? 'Admin access required' : 'User not found',
          debug: debugInfo
        };
      }
      
      const user = result.rows[0];
      
      // Step 4: Sync token across storage mechanisms (if req is from client)
      syncTokenStorage(req, token);
      
      // Step 5: Return success with user data
      return {
        authenticated: true,
        user: {
          userId: user.id,
          email: user.email,
          username: user.username,
          role: user.role || 'user',
          isAdmin: user.role === 'admin'
        },
        token: token,
        debug: debugInfo
      };
    } catch (dbError) {
      console.error('Database error during auth check:', dbError);
      
      return {
        authenticated: false,
        error: 'Server error during authentication',
        debug: { ...debugInfo, dbError: dbError.message }
      };
    }
  } catch (error) {
    console.error('Unexpected error in authentication check:', error);
    
    return {
      authenticated: false,
      error: 'Unexpected authentication error',
      debug: { error: error.message }
    };
  }
}

/**
 * Extract token from request (headers, cookies, session)
 * @param {Object} req - Request object
 * @returns {string|null} Token or null if not found
 */
function extractToken(req) {
  // Try Authorization header
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  // Try session
  if (req.session?.token) {
    return req.session.token;
  }
  
  // Try query params (only for specific callback routes)
  if (req.query?.token && (req.path.includes('/callback') || req.path.includes('/oauth'))) {
    return req.query.token;
  }
  
  return null;
}

/**
 * Synchronize token across storage mechanisms
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} token - JWT token
 */
function syncTokenStorage(req, token) {
  // Save to session if available
  if (req.session) {
    req.session.token = token;
    
    // Store userId in session for quicker access
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.userId) {
        req.session.userId = decoded.userId;
      }
    } catch (error) {
      console.error('Error decoding token for session storage:', error);
    }
    
    // Save session asynchronously (fire and forget)
    req.session.save(err => {
      if (err) console.error('Error saving token to session:', err);
    });
  }
}

/**
 * Generate a new JWT token
 * @param {Object} user - User object with id field
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
export function generateToken(user, expiresIn = TOKEN_EXPIRY) {
  return jwt.sign(
    { 
      userId: user.id || user.userId,
      email: user.email,
      role: user.role || 'user',
      // Add a unique token ID to prevent reuse in case of compromise
      jti: uuidv4()
    },
    JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Generate a refresh token
 * @param {Object} user - User object with id field
 * @returns {string} Refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { 
      userId: user.id || user.userId,
      tokenType: 'refresh',
      jti: uuidv4()
    },
    process.env.REFRESH_TOKEN_SECRET || JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Express middleware for standardized authentication
 * @param {Object} options - Options object
 * @param {boolean} options.required - Whether authentication is required 
 * @param {boolean} options.adminRequired - Whether admin role is required
 * @returns {Function} Express middleware function
 */
export function authMiddleware(options = { required: true, adminRequired: false }) {
  return async (req, res, next) => {
    // Skip auth for public paths
    if (
      req.path.match(/^\/(public|css|js|images|fonts|favicon)/i) ||
      req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i)
    ) {
      return next();
    }
    
    // Skip auth for login/signup pages if not already logged in
    if (req.path.match(/^\/(login2|signup|logout|login|auth\/login|auth\/signup)/i)) {
      // Check if already authenticated
      const authResult = await verifyAuthentication(req);
      if (authResult.authenticated) {
        // User is already logged in, redirect to marketplace
        return res.redirect('/marketplace2');
      }
      return next();
    }
    
    // Perform authentication check
    const authResult = await verifyAuthentication(req, options.adminRequired);
    
    // Store user info on request object if authenticated
    if (authResult.authenticated) {
      req.user = authResult.user;
      
      // Make user info available to templates
      res.locals.user = authResult.user;
      res.locals.isAuthenticated = true;
      
      return next();
    }
    
    // If authentication not required, proceed without auth
    if (!options.required) {
      res.locals.isAuthenticated = false;
      return next();
    }
    
    // Handle failed authentication
    
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: authResult.error || 'Please log in to access this resource',
        redirectTo: '/login2?returnTo=' + encodeURIComponent(req.originalUrl)
      });
    }
    
    // For regular routes, redirect to login
    const sanitizedReturnUrl = sanitizeReturnUrl(req.originalUrl);
    return res.redirect('/login2?returnTo=' + encodeURIComponent(sanitizedReturnUrl));
  };
}

/**
 * Sanitize return URL to prevent redirect loops
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeReturnUrl(url) {
  if (!url) return '/';
  
  // Decode URL if encoded
  try {
    url = decodeURIComponent(url);
  } catch (e) {
    // If decoding fails, use as is
  }
  
  // Check for auth pages to prevent redirect loops
  if (url.match(/\/(login2|signup|login|auth\/login|auth\/signup)/i)) {
    // Check for nested returnTo parameter
    const match = url.match(/[?&](returnTo|returnUrl|redirect)=([^&]+)/);
    if (match && match[2]) {
      try {
        const nestedUrl = decodeURIComponent(match[2]);
        return sanitizeReturnUrl(nestedUrl);
      } catch (e) {
        // If nested URL is invalid, fall back to marketplace
      }
    }
    
    return '/marketplace2';
  }
  
  // If URL is absolute, only allow our own domain
  if (url.startsWith('http') || url.startsWith('//')) {
    const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
    if (!hostname.includes('localhost') && !hostname.includes('arzani.co.uk')) {
      return '/';
    }
  }
  
  return url;
}

// Export all functions
export default {
  verifyAuthentication,
  generateToken,
  generateRefreshToken,
  authMiddleware
};