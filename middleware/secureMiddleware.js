/**
 * Secure middleware configuration
 * Sets up a comprehensive security middleware stack for Express
 */

import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { securityHeaders } from './securityHeaders.js';
import { standardLimiter, authLimiter, apiLimiter } from './rateLimiter.js';
import { sanitizeQueryParams } from './validation.js';

/**
 * Configure security middleware for Express app
 * @param {Object} app - Express app instance
 * @param {Object} options - Configuration options
 */
export function configureSecureMiddleware(app, options = {}) {
  const defaultOptions = {
    // CORS settings
    corsOptions: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://arzani.co.uk', 'https://www.arzani.co.uk'] 
        : ['http://localhost:5000', 'http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'X-CSRF-Token'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
    },
    
    // CSRF protection
    enableCSRF: process.env.NODE_ENV === 'production',
    csrfOptions: {
      cookie: {
        key: '_csrf',
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 3600 // 1 hour
      }
    },
    
    // Cookie parser secret
    cookieSecret: process.env.COOKIE_SECRET || process.env.SESSION_SECRET,
    
    // Helmet options
    helmetOptions: {
      contentSecurityPolicy: false, // We'll use our custom CSP middleware
    },
    
    // Rate limiting settings (override defaults if needed)
    rateLimiting: {
      standard: true,
      auth: true,
      api: true
    },
    
    // Routes exempt from CSRF protection
    csrfExempt: [
      '/api/webhook', 
      '/api/s3-upload', 
      '/api/upload-to-s3',
      '/auth/google/callback',
      '/auth/microsoft/callback'
    ]
  };

  const settings = { ...defaultOptions, ...options };
  
  // 1. Apply Helmet for basic security headers
  app.use(helmet(settings.helmetOptions));
  
  // 2. Apply CORS policy
  app.use(cors(settings.corsOptions));
  
  // 3. Parse cookies
  app.use(cookieParser(settings.cookieSecret));
  
  // 4. Apply custom security headers
  app.use(securityHeaders({
    // Override default CSP settings if needed
    csp: options.csp
  }));
  
  // 5. Apply basic rate limiting to all routes
  if (settings.rateLimiting.standard) {
    app.use((req, res, next) => {
      // Skip for static assets
      if (req.path.match(/\.(css|js|jpg|png|gif|svg|ico|woff|woff2)$/i)) {
        return next();
      }
      return standardLimiter(req, res, next);
    });
  }
  
  // 6. Apply strict rate limiting to auth routes
  if (settings.rateLimiting.auth) {
    app.use(['/api/auth/login', '/auth/login'], authLimiter);
  }
  
  // 7. Apply API rate limiting
  if (settings.rateLimiting.api) {
    app.use('/api/', apiLimiter);
  }
  
  // 8. Query parameter sanitization
  app.use(sanitizeQueryParams);
  
  // 9. CSRF protection for state-changing requests
  if (settings.enableCSRF) {
    const csrfProtection = csrf(settings.csrfOptions);
    
    // Apply to all routes except exempt paths
    app.use((req, res, next) => {
      // Skip CSRF for exempt routes
      if (settings.csrfExempt.some(path => req.path.startsWith(path))) {
        return next();
      }
      
      // Skip for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Apply CSRF protection
      return csrfProtection(req, res, next);
    });
    
    // Make CSRF token available to views
    app.use((req, res, next) => {
      if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
      }
      next();
    });
  }
  
  // 10. Log all security-related rejections
  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      console.error('CSRF attack detected:', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        headers: req.headers
      });
      
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing CSRF token'
      });
    }
    
    next(err);
  });
}

/**
 * Generate CSRF form field HTML
 * @returns {string} HTML for CSRF form field
 */
export function csrfField() {
  return `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`;
}

/**
 * Generate CSRF meta tag HTML
 * @returns {string} HTML for CSRF meta tag
 */
export function csrfMeta() {
  return `<meta name="csrf-token" content="<%= csrfToken %>">`;
}

export default {
  configureSecureMiddleware,
  csrfField,
  csrfMeta
};