import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
import pool from '../db.js';
import bcrypt from 'bcrypt';

/**
 * Helper functions for authentication and user management
 */

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id
 * @returns {String} JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Hash a password
 * @param {String} password - Plain text password
 * @returns {Promise<String>} Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * Compare a plain text password with a hashed password
 * @param {String} password - Plain text password
 * @param {String} hashedPassword - Hashed password
 * @returns {Promise<Boolean>} Whether the password matches
 */
export async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a random username based on email and random number
 * @param {String} email - User's email
 * @returns {String} Random username
 */
export function generateUsername(email) {
  const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomNum = Math.floor(Math.random() * 10000);
  return `${prefix}${randomNum}`;
}

export async function getUserId(req) {
    // First try to get from session
    if (req.session?.userId) {
        return req.session.userId;
    }

    // Then try to get from token
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userCheck = await pool.query(
                'SELECT id FROM users WHERE id = $1',
                [decoded.userId]
            );
            if (userCheck.rows.length > 0) {
                req.session.userId = decoded.userId;
                await new Promise(resolve => req.session.save(resolve));
                return decoded.userId;
            }
        } catch (error) {
            console.error('Token verification error:', error);
        }
    }
    return null;
}

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      console.log('No Authorization header provided');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid Authorization header format, expected Bearer token');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token format' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('No token provided in Authorization header');
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.userId) {
        console.log('Token missing userId property');
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token structure' 
        });
      }
      
      // Set user data on request object
      req.user = { 
        userId: decoded.userId,
        username: decoded.username || null,
        role: decoded.role || 'user'
      };
      
      console.log(`Authentication successful for user ID: ${decoded.userId}`);
      
      next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token' 
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication failed' 
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during authentication' 
    });
  }
};

export default {
  authenticateToken,
  generateToken,
  hashPassword,
  comparePassword,
  generateUsername
};
