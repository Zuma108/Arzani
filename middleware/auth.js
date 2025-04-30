/**
 * Unified authentication middleware
 * This file combines all authentication functionality in one place
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from '../db.js';
import authService from '../auth/auth.js';

dotenv.config();

// Constants
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || crypto.randomBytes(64).toString('hex');
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '4h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Make sure JWT secrets are set
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in environment variables');
  process.exit(1);
}

// Add this helper function near the top of the file
function sanitizeRedirectUrl(url) {
  if (!url) return '/';
  
  // Decode URL in case it's URL-encoded
  url = decodeURIComponent(url);
  
  // Check if the URL is trying to redirect to a login page
  if (url.includes('/login') || 
      url.includes('/login2') || 
      url.includes('/signup') || 
      url.includes('/auth/login') ||
      url.includes('/auth/signup')) {
    
    console.log('Prevented redirect loop to:', url);
    
    // Check for deep path to preserve post-login destination
    // Example: /login?returnTo=/dashboard -> Extract /dashboard
    const match = url.match(/[?&](returnTo|returnUrl|redirect)=([^&]+)/);
    if (match && match[2]) {
      const deepReturnUrl = decodeURIComponent(match[2]);
      // Recursively sanitize the deeper URL
      return sanitizeRedirectUrl(deepReturnUrl);
    }
    
    return '/marketplace2'; // Default to marketplace if no deeper path
  }
  
  // If URL is absolute, only allow our own domain
  if (url.startsWith('http') || url.startsWith('//')) {
    const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
    if (!hostname.includes('localhost') && !hostname.includes('arzani.co.uk')) {
      console.log('Prevented redirect to external domain:', hostname);
      return '/';
    }
  }
  
  return url;
}

/**
 * Extract authentication token from various sources in the request
 * This helps standardize token extraction across different routes
 */
function extractTokenFromRequest(req) {
  const tokenSources = [];

  // Check Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    tokenSources.push({ source: 'header', token });
  }
  
  // Check cookies
  if (req.cookies && req.cookies.token) {
    tokenSources.push({ source: 'cookie', token: req.cookies.token });
  }
  
  // Check session
  if (req.session && req.session.token) {
    tokenSources.push({ source: 'session', token: req.session.token });
  }
  
  // Check query parameters (should only be used for specific callbacks)
  if (req.query && req.query.token) {
    // Only allow token in URL for specific callback routes
    if (req.path.includes('/callback') || req.path.includes('/oauth')) {
      tokenSources.push({ source: 'query', token: req.query.token });
    }
  }
  
  // Debug token sources if in development mode
  if (process.env.NODE_ENV === 'development' && tokenSources.length > 0) {
    console.log(`Token sources for ${req.path}:`, 
      tokenSources.map(s => `${s.source}: ${s.token.substring(0, 10)}...`));
  }
  
  // Return the first valid token found
  for (const source of tokenSources) {
    try {
      // Try to verify the token
      jwt.verify(source.token, JWT_SECRET);
      return source.token;
    } catch (err) {
      // Skip invalid tokens
      if (process.env.NODE_ENV === 'development') {
        console.log(`Invalid token from ${source.source}:`, err.message);
      }
    }
  }
  
  return null;
}

/**
 * Middleware to check if user is authenticated via JWT
 * Used to protect routes that require authentication
 */
const authenticateToken = (req, res, next) => {
  // Debug auth bypass analysis
  console.log('Auth check debug:', {
    path: req.path,
    method: req.method,
    hasXRequestSource: !!req.headers['x-request-source'],
    xRequestSource: req.headers['x-request-source'],
    hasXSkipAuth: !!req.headers['x-skip-auth'],
    isValuationEndpoint: req.path === '/api/business/calculate-valuation' || req.path.includes('/api/valuation')
  });

  // Critical fix: Ensure we check the headers and path properly for valuation-related endpoints
  if (req.path === '/api/business/calculate-valuation') {
    console.log('Bypassing auth for valuation endpoint:', req.path);
    return next();
  }
  
  // Also check headers without path dependency
  if (req.headers['x-request-source'] === 'valuation-calculator') {
    console.log('Bypassing auth for valuation calculator request');
    return next();
  }
  
  if (req.headers['x-skip-auth'] === 'true') {
    console.log('Bypassing auth due to x-skip-auth header');
    return next();
  }

  // Continue with regular auth checks for all other routes
  // ==== PUBLIC ENDPOINTS - NO AUTH REQUIRED ====
  
  // 1. Check specifically for valuation calculation endpoints
  if (req.path === '/api/business/calculate-valuation' || 
      req.path.includes('/api/valuation/calculate')) {
    console.log('Auth bypass: Valuation calculation endpoint', req.path);
    return next();
  }
  
  // 2. Check for valuation request source header
  if (req.headers['x-request-source'] === 'valuation-calculator') {
    console.log('Auth bypass: Valuation calculator request source header detected');
    return next();
  }
  
  // 3. Check for auth skip header
  if (req.headers['x-skip-auth'] === 'true') {
    console.log('Auth bypass: Skip auth header detected');
    return next();
  }

  // 4. Check for public api paths
  const publicApiPaths = [
    '/api/business/public', 
    '/api/business/save-questionnaire',
    '/api/questionnaire',
    '/api/valuation'
  ];
  
  if (publicApiPaths.some(path => req.path.startsWith(path))) {
    console.log('Auth bypass: Public API path detected:', req.path);
    return next();
  }
  
  // 5. Check for static assets and public pages
  const publicPatterns = [
    /^\/(css|js|images|public|favicon|fonts)/i,
    /\.(css|js|png|jpg|gif|ico|svg|woff|woff2)$/i,
    /^\/(login|signup|logout|auth)/i,
    /^\/(seller-questionnaire)/i
  ];
  
  if (publicPatterns.some(pattern => pattern.test(req.path))) {
    // No need to log static asset bypasses to reduce noise
    return next();
  }
  
  // ==== END PUBLIC ENDPOINTS SECTION ====

  // For all other routes, continue with token validation
  console.log(`Auth check for ${req.method} ${req.path}`);
  
  // Get token from multiple sources in order of preference
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const cookieToken = req.cookies?.token;
  const sessionToken = req.session?.token;
  
  // Use first valid token, checking validity in order
  let validToken = null;
  let userId = null;
  
  // Try each potential token source
  const tokenSources = [
    { name: 'header', token: headerToken },
    { name: 'cookie', token: cookieToken },
    { name: 'session', token: sessionToken }
  ];
  
  // Find first valid token
  for (const source of tokenSources) {
    if (source.token) {
      try {
        const decoded = jwt.verify(source.token, JWT_SECRET);
        validToken = source.token;
        userId = decoded.userId;
        console.log(`Valid token found in ${source.name}`);
        break;
      } catch (err) {
        console.log(`Invalid token in ${source.name}:`, err.message);
      }
    }
  }
  
  // Store token in request for later use
  if (validToken) {
    req.token = validToken;
    
    // Set user property
    req.user = { userId };
    
    // Ensure token consistency across all storage mechanisms
    // This fixes the issue where a token exists in one place but not another
    
    // 1. Always ensure token is in session
    if (req.session) {
      req.session.userId = userId;
      req.session.token = validToken;
      
      // Save session asynchronously
      req.session.save(err => {
        if (err) console.error('Error saving session:', err);
      });
    }
    
    // 2. Set/refresh the cookie if token not in cookie or different
    if (!cookieToken || cookieToken !== validToken) {
      res.cookie('token', validToken, {
        httpOnly: false, // Allow JS access for client-side auth
        maxAge: 4 * 60 * 60 * 1000, // 4 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
    
    next();
  } else {
    // No valid token found
    console.log(`No valid token found for ${req.path}`);
    
    // Clear any invalid tokens
    if (cookieToken) {
      res.clearCookie('token');
    }
    
    // Continue without auth - requireAuth or other middleware will handle redirection if needed
    next();
  }
};

/**
 * Middleware to check if user is authenticated via JWT
 * Used to protect routes that require authentication
 */
const validateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        
        if (!authHeader?.startsWith('Bearer ')) {
            console.log('Missing or invalid auth header');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Verify user exists in database
            const userCheck = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (userCheck.rows.length === 0) {
                console.log('User not found in database:', decoded.userId);
                return res.status(401).json({ error: 'User not found' });
            }

            // Set both user and session
            req.user = { userId: decoded.userId };
            req.session.userId = decoded.userId;
            await new Promise(resolve => req.session.save(resolve));

            console.log('Auth successful for validateToken middleware:', {
                userId: decoded.userId,
                sessionId: req.sessionID
            });

            next();
        } catch (error) {
            console.error('Token validation error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Enhanced auth middleware that checks for a valid user and redirects if needed
 * Use this for routes that should only be accessible to authenticated users
 */
const requireAuth = (req, res, next) => {
  // If this is an auth page, check if the user is already authenticated
  const isAuthPage = req.path.match(/^\/(login2|signup|logout|login|auth\/login|auth\/signup)/i);
  
  if (isAuthPage) {
    // Extract token and verify
    const token = extractTokenFromRequest(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // User is already authenticated, redirect to marketplace instead of auth page
        console.log('User already authenticated, redirecting from auth page to marketplace');
        return res.redirect('/marketplace2');
      } catch (error) {
        // Token invalid, continue to auth page
        console.log('Invalid token on auth page access, continuing to auth page');
      }
    }
  }

  // Skip authentication for public paths
  if (
    req.path.match(/^\/(public|css|js|images|fonts|favicon)/i) ||
    req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i)
  ) {
    return next();
  }

  // First run the token authentication
  authenticateToken(req, res, () => {
    // If user exists after token authentication, proceed
    if (req.user && req.user.userId) {
      next();
    } else {
      // For API routes, return a 401 status
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Authentication required',
          redirectTo: '/login2?returnTo=' + encodeURIComponent(req.originalUrl)
        });
      }
      
      // Track redirects in session to prevent loops
      if (!req.session.redirectHistory) {
        req.session.redirectHistory = [];
      }
      
      // Add current path to history
      req.session.redirectHistory.push(req.originalUrl);
      
      // Keep only the last 5 entries
      if (req.session.redirectHistory.length > 5) {
        req.session.redirectHistory.shift();
      }
      
      // Check for redirect loops
      const redirectCount = req.session.redirectHistory.filter(
        url => url === req.originalUrl
      ).length;
      
      if (redirectCount > 2) {
        console.log('Detected redirect loop, redirecting to marketplace');
        return res.redirect('/marketplace2');
      }
      
      // Sanitize the return URL to prevent redirect loops
      const safeReturnUrl = sanitizeRedirectUrl(req.originalUrl);
      
      // For regular routes, redirect to login page
      res.redirect('/login2?returnTo=' + encodeURIComponent(safeReturnUrl));
    }
  });
};

/**
 * Middleware to populate user from token without requiring authentication
 * This adds user info when available but doesn't block the request if not authenticated
 */
const populateUser = (req, res, next) => {
  // Run token authentication but always continue to next middleware
  authenticateToken(req, res, async () => {
    // If we have user info after token auth, expose it to templates
    if (req.user && req.user.userId) {
      try {
        // Get additional user info from database
        const userResult = await pool.query(
          `SELECT u.id, u.username, u.email, u.profile_picture, 
                  u.created_at, u.updated_at,
                  COALESCE(u.last_login, now()) as last_login,
                  COALESCE(u.role, 'user') as role
           FROM users u 
           WHERE u.id = $1`,
          [req.user.userId]
        );
        
        if (userResult.rows.length > 0) {
          // Enhance user object with database data
          req.user = {
            ...req.user,
            ...userResult.rows[0],
            isAuthenticated: true
          };
          
          // Make user info available to templates
          res.locals.user = req.user;
          res.locals.isAuthenticated = true;
        } else {
          // User ID doesn't exist in database - clear user
          req.user = null;
          res.locals.isAuthenticated = false;
        }
      } catch (error) {
        console.error('Error populating user data:', error);
        res.locals.isAuthenticated = false;
      }
    } else {
      res.locals.isAuthenticated = false;
    }
    next();
  });
};

/**
 * Enhanced auth middleware that ensures complete user profile
 * Use this for profile-related routes where complete user data is needed
 */
const enhancedAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
    
    // Check for auth token in various locations
    console.log('Auth check:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      hasTokenCookie: !!req.cookies?.token,
      hasSessionUserId: !!req.session?.userId,
      token: token ? token.substring(0, 10) + '...' : null
    });
    
    // First, make sure we have a valid authenticated user
    if (!req.user?.userId && !req.session?.userId && !token) {
      // For API routes, return 401 status
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // For regular routes, redirect to login
      return res.redirect(`/login2?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }
    
    // If we have a token but no user object, try to verify the token
    if (token && !req.user?.userId) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { userId: decoded.userId };
        
        // Store in session as well
        if (req.session) {
          req.session.userId = decoded.userId;
          await new Promise(resolve => {
            req.session.save(err => {
              if (err) console.error('Session save error:', err);
              resolve();
            });
          });
        }
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError);
        
        // Clear the invalid token
        res.clearCookie('token');
        
        // For API routes, return 401 status
        if (req.path.startsWith('/api/')) {
          return res.status(401).json({ error: 'Invalid token' });
        }
        
        // For regular routes, redirect to login
        return res.redirect(`/login2?returnTo=${encodeURIComponent(req.originalUrl)}`);
      }
    }
    
    // If we have a session userId but no user object, create one
    if (req.session?.userId && !req.user) {
      req.user = { userId: req.session.userId };
    }
    
    // At this point, we should have req.user.userId from one of the methods above
    if (!req.user?.userId) {
      console.error('No user ID found after authentication checks');
      
      // For API routes, return 401 status
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'User ID not found' });
      }
      
      // For regular routes, redirect to login
      return res.redirect(`/login2?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }
    
    // Get complete user profile data - FIX: use plan_type instead of plan_name
    const query = `
      SELECT 
        u.*,
        s.plan_type AS subscription_plan,
        s.active AS subscription_active,
        s.next_billing_date
      FROM 
        users u
      LEFT JOIN 
        subscriptions s ON u.id = s.user_id
      WHERE 
        u.id = $1
    `;
    
    const result = await pool.query(query, [req.user.userId]);
    
    if (result.rows.length === 0) {
      // User not found in database despite having valid token
      // This can happen if the user was deleted but still has a valid token
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Clear session and redirect to login
      if (req.session) {
        req.session.destroy();
      }
      
      // For regular routes, redirect to login
      return res.redirect(`/login2?returnTo=${encodeURIComponent(req.originalUrl)}`);
    }
    
    // Enhance user object with complete profile data
    const user = result.rows[0];
    
    // Remove sensitive fields
    delete user.password;
    
    // Add enhanced data to request for downstream handlers
    req.user = {
      ...req.user,
      ...user,
      hasSubscription: user.subscription_active === true,
      subscriptionPlan: user.subscription_plan || 'free'
    };
    
    next();
  } catch (error) {
    console.error('Enhanced auth error:', error);
    
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: 'Server error' });
    }
    
    // Safely pass error to the error template
    res.status(500).render('error', { 
      message: 'An error occurred while loading your profile',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

/**
 * Middleware for business routes authentication
 * Specialized version of requireAuth for business-related routes
 */
const businessAuth = (req, res, next) => {
  // First apply the regular authentication
  requireAuth(req, res, async () => {
    try {
      // Check if the user has access to this business
      const businessId = req.params.id || req.body.businessId;
      
      if (businessId) {
        // Check if user owns or has access to this business
        const query = `
          SELECT 1 FROM businesses 
          WHERE id = $1 AND (user_id = $2 OR $2 IN (
            SELECT user_id FROM business_access WHERE business_id = $1
          ))
        `;
        
        const result = await pool.query(query, [businessId, req.user.userId]);
        
        if (result.rows.length === 0) {
          // User doesn't have access to this specific business
          if (req.path.startsWith('/api/')) {
            return res.status(403).json({
              error: 'Forbidden',
              message: 'You do not have access to this business'
            });
          }
          
          // For regular routes, redirect to businesses page
          return res.redirect('/businesses?error=access');
        }
      }
      
      // Proceed if access check passes
      next();
    } catch (error) {
      console.error('Business auth error:', error);
      
      if (req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      res.status(500).render('error', { message: 'An error occurred while checking business access' });
    }
  });
};

/**
 * Middleware for admin authentication
 * Only allows access to users with admin role
 */
const adminAuth = (req, res, next) => {
  // First apply the regular authentication
  requireAuth(req, res, async () => {
    try {
      // Check if user is an admin
      const query = 'SELECT role FROM users WHERE id = $1';
      const result = await pool.query(query, [req.user.userId]);
      
      if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
        // Not an admin
        if (req.path.startsWith('/api/')) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
          });
        }
        
        // For regular routes, redirect to home
        return res.redirect('/?error=adminRequired');
      }
      
      // User is an admin, proceed
      req.user.isAdmin = true;
      next();
    } catch (error) {
      console.error('Admin auth error:', error);
      
      if (req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server error' });
      }
      
      res.status(500).render('error', { message: 'An error occurred while checking admin access' });
    }
  });
};

/**
 * Log authentication attempts for security monitoring
 * @param {string} userId - User ID or null if failed attempt
 * @param {string} email - Email used in the attempt
 * @param {boolean} success - Whether the authentication succeeded
 * @param {string} method - Authentication method (password, google, etc.)
 * @param {string} ipAddress - IP address of the client
 * @param {string} userAgent - User agent of the client
 */
const logAuthAttempt = async (userId, email, success, method, ipAddress, userAgent) => {
  try {
    const query = `
      INSERT INTO auth_logs 
      (user_id, email, success, method, ip_address, user_agent, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    
    await pool.query(query, [
      userId, 
      email, 
      success, 
      method, 
      ipAddress, 
      userAgent
    ]);
  } catch (error) {
    console.error('Error logging auth attempt:', error);
  }
};

/**
 * Authenticate a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} ipAddress - IP address of the client
 * @param {string} userAgent - User agent of the client
 * @returns {Promise<Object>} Auth result with token and user data
 */
const authenticateUser = async (email, password, ipAddress, userAgent) => {
  try {
    // Use the auth service for authentication
    const user = await authService.authenticateUser(email, password);
    
    // Generate tokens using the auth service
    const token = authService.generateToken(user);
    const refreshToken = authService.generateRefreshToken(user);
    
    // Store refresh token
    await authService.storeRefreshToken(user.id, refreshToken);
    
    // Log successful attempt
    await logAuthAttempt(user.id, email, true, 'password', ipAddress, userAgent);
    
    return {
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    };
  } catch (error) {
    // Log failed attempt - extract email from error in case user wasn't found
    await logAuthAttempt(null, email, false, 'password', ipAddress, userAgent);
    
    console.error('Authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed'
    };
  }
};

/**
 * Authentication middleware for protected routes
 * Verifies JWT tokens in Authorization header or cookie
 */
const auth = (req, res, next) => {
  try {
    // Check Authorization header first
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract token from Authorization header
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      // Try to get token from cookies
      token = req.cookies.token;
    } else if (req.session && req.session.token) {
      // Try to get token from session
      token = req.session.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. No token provided.' 
      });
    }
    
    // Verify token and extract payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user data to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user'
    };
    
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token. Please login again.' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

// Export all functions for use in other modules
export {
  authenticateToken, // Make sure this is the updated one
  validateToken,
  requireAuth,
  populateUser,
  enhancedAuth,
  businessAuth,
  adminAuth,
  logAuthAttempt,
  authenticateUser,
  extractTokenFromRequest,
  auth
};

// Default export for compatibility
export default {
  authenticateToken, // Make sure this is the updated one
  validateToken,
  requireAuth,
  populateUser,
  enhancedAuth,
  businessAuth,
  adminAuth,
  authenticateUser,
  auth
};