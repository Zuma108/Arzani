import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Unified authentication middleware
export const authenticateUser = async (req, res, next) => {
  try {
    // 1. First check for session authentication
    if (req.session?.userId) {
      req.user = { userId: req.session.userId };
      return next();
    }
    
    // 2. Then check for token-based authentication
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { userId: decoded.userId };
        
        // Set session for future requests
        req.session.userId = decoded.userId;
        await new Promise(resolve => req.session.save(resolve));
        
        return next();
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError.message);
        // Fall through to handle as unauthenticated
      }
    }
    
    // 3. Check for token in query params (for redirects from OAuth)
    if (req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, JWT_SECRET);
        req.user = { userId: decoded.userId };
        
        // Set session for future requests
        req.session.userId = decoded.userId;
        await new Promise(resolve => req.session.save(resolve));
        
        // Clean URL by redirecting without the token
        if (!req.path.startsWith('/api/')) {
          const url = new URL(req.originalUrl, `http://${req.headers.host}`);
          url.searchParams.delete('token');
          return res.redirect(url.pathname + url.search);
        }
        
        return next();
      } catch (tokenError) {
        console.error('Query token verification failed:', tokenError.message);
        // Fall through to handle as unauthenticated
      }
    }
    
    // 4. No valid authentication found
    
    // For API requests, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // For web UI requests, remember the URL and redirect to login
    const returnUrl = encodeURIComponent(req.originalUrl);
    return res.redirect(`/auth/login?returnUrl=${returnUrl}`);
  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error' 
      });
    }
    
    res.redirect('/auth/login?error=internal');
  }
};
export const authenticateToken = authenticateUser; // Add this alias for backward compatibility

// Optional middleware that populates user but doesn't require authentication
export const populateUser = async (req, res, next) => {
  try {
    if (req.session?.userId) {
      req.user = { userId: req.session.userId };
    } else {
      const authHeader = req.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.user = { userId: decoded.userId };
        } catch (error) {
          // Ignore token errors for this middleware
        }
      }
    }
    next();
  } catch (error) {
    console.error('Populate user error:', error);
    next();
  }
};

// Check if user email is verified
export const requireVerifiedEmail = async (req, res, next) => {
  try {
    // Must have a user to check verification status
    if (!req.user?.userId) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      return res.redirect(`/auth/login?returnUrl=${encodeURIComponent(req.originalUrl)}`);
    }
    
    // Check verification status
    const result = await pool.query(
      'SELECT is_verified FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      // User not found
      req.session.destroy();
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid user account' 
        });
      }
      return res.redirect('/auth/login');
    }
    
    const { is_verified } = result.rows[0];
    
    if (!is_verified) {
      // User exists but email not verified
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ 
          success: false, 
          message: 'Email verification required',
          verificationRequired: true
        });
      }
      return res.redirect('/auth/verify-email-notice');
    }
    
    // User is verified, proceed
    next();
  } catch (error) {
    console.error('Verification check error:', error);
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: 'Verification check failed' 
      });
    }
    res.redirect('/auth/login');
  }
};

export default { authenticateUser, populateUser, requireVerifiedEmail };