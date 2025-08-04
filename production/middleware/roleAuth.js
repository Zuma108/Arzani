/**
 * Role-based access control middleware
 * Protects routes based on user roles
 */

import pool from '../db.js';

/**
 * Check if development mode bypass should be applied for role-based auth
 */
function shouldBypassRoleAuth(req, allowedRoles) {
  // Only allow bypass in development mode
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  // Check if dev mode bypass is enabled
  if (process.env.DEV_MODE_AUTH_BYPASS !== 'true') {
    return false;
  }

  console.log(`🔓 DEV MODE: Bypassing role auth for ${req.path}, required roles: ${allowedRoles.join(', ')}`);
  
  // Create or enhance mock user object for bypassed requests
  if (!req.user) {
    const defaultUserId = process.env.BYPASS_AUTH_DEFAULT_USER_ID || '1';
    req.user = {
      id: parseInt(defaultUserId),
      userId: parseInt(defaultUserId),
      username: 'dev-user',
      email: 'dev@example.com',
      role: 'admin',
      primary_role: 'admin',
      roles: { admin: true, buyer: true, seller: true },
      isDevelopmentBypass: true
    };
  } else {
    // Ensure existing user has all required roles in dev mode
    req.user.role = 'admin';
    req.user.primary_role = 'admin';
    req.user.roles = { admin: true, buyer: true, seller: true };
  }
  
  return true;
}

/**
 * Middleware to restrict access to specific roles
 * @param {Array} allowedRoles - Array of role names that are allowed to access the route
 * @returns {Function} Middleware function
 */
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      // ==== DEVELOPMENT MODE BYPASS ====
      if (shouldBypassRoleAuth(req, allowedRoles)) {
        return next();
      }

      // Check if user exists in request (should be set by authenticateToken)
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      // Get user's roles from database
      const query = `
        SELECT primary_role, roles
        FROM users
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [req.user.userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const userData = result.rows[0];
      
      // Check if primary role is in allowed roles
      const primaryRole = userData.primary_role;
      if (primaryRole && allowedRoles.includes(primaryRole)) {
        return next();
      }
      
      // Check if any role in the JSONB roles field is in allowed roles
      const userRoles = userData.roles || {};
      
      for (const role of allowedRoles) {
        if (userRoles[role] && userRoles[role].active) {
          return next();
        }
      }
      
      // No matching role found
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Required role: ' + allowedRoles.join(' or ') 
      });
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking user roles',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to require professional verification
 * @returns {Function} Middleware function
 */
export const requireVerifiedProfessional = () => {
  return async (req, res, next) => {
    try {
      // Check if user exists in request (should be set by authenticateToken)
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      // Get user's verification status from database
      const query = `
        SELECT is_verified_professional, professional_type
        FROM users
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [req.user.userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      const userData = result.rows[0];
      
      // Check if user is a verified professional
      if (!userData.is_verified_professional) {
        return res.status(403).json({ 
          success: false, 
          message: 'This action requires professional verification' 
        });
      }
      
      // Add professional type to request for use in route handlers
      req.professionalType = userData.professional_type;
      
      next();
    } catch (error) {
      console.error('Professional verification check error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking professional verification status',
        error: error.message
      });
    }
  };
};

export default {
  requireRole,
  requireVerifiedProfessional
};