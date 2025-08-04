import jwt from 'jsonwebtoken';
import pool from '../db.js';

/**
 * Check if development mode bypass should be applied
 */
function shouldBypassAdminAuth(req) {
  // Only allow bypass in development mode
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  // Check if dev mode bypass is enabled
  if (process.env.DEV_MODE_AUTH_BYPASS !== 'true') {
    return false;
  }

  // If auth bypass is enabled, grant admin access
  console.log(`🔓 DEV MODE: Bypassing admin auth for ${req.path}`);
  
  // Create or enhance mock user object for bypassed requests
  if (!req.user) {
    const defaultUserId = process.env.BYPASS_AUTH_DEFAULT_USER_ID || '1';
    req.user = {
      id: parseInt(defaultUserId),
      username: 'dev-admin',
      email: 'admin@example.com',
      role: 'admin',
      isDevelopmentBypass: true
    };
  } else {
    // Ensure existing user has admin role in dev mode
    req.user.role = 'admin';
  }
  
  return true;
}

export const adminAuth = async (req, res, next) => {
  try {
    // ==== DEVELOPMENT MODE BYPASS ====
    if (shouldBypassAdminAuth(req)) {
      return next();
    }

    // Check if this is an API request
    const isApiRequest = req.path.startsWith('/api/') || 
                         req.xhr || 
                         req.headers.accept?.includes('application/json');
    
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const token = req.cookies?.token || 
                 (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
    
    if (!token) {
      console.log('No authentication token found');
      
      // For API requests, return JSON error
      if (isApiRequest) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      // For regular requests, redirect to login
      return res.redirect('/login2?returnTo=' + encodeURIComponent(req.originalUrl));
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user role from database
      const userResult = await pool.query(
        'SELECT role FROM users WHERE id = $1', [decoded.userId]
      );
      
      if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
        // Not an admin
        console.log('User is not an admin:', decoded.userId);
        
        if (isApiRequest) {
          return res.status(403).json({ 
            success: false, 
            message: 'Admin privileges required' 
          });
        }
        
        return res.status(403).render('error', { message: 'Admin access required' });
      }
      
      // User is an admin - set user data on request
      req.user = { 
        userId: decoded.userId,
        role: 'admin'
      };
      
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      
      if (isApiRequest) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication failed' 
        });
      }
      
      res.redirect('/login2?returnTo=' + encodeURIComponent(req.originalUrl));
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
    
    res.status(500).render('error', { message: 'Authentication error' });
  }
};
