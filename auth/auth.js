/**
 * Server-side authentication utilities
 * Consolidated authentication system for the marketplace
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

// Constants
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '14d';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const EMAIL_SECRET = process.env.EMAIL_SECRET;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration time (default: '4h')
 * @returns {string} JWT token
 */
export const generateToken = (user, expiresIn = TOKEN_EXPIRY) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }
  
  return jwt.sign(
    { 
      userId: user.id || user.userId,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate a refresh token for a user
 * @param {Object} user - User object
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (user) => {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not set in environment variables');
  }
  
  return jwt.sign(
    { 
      userId: user.id || user.userId,
      tokenType: 'refresh'
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * Generate verification token for email verification
 * @param {Object} user - User object 
 * @returns {string} Verification token
 */
export const generateVerificationToken = (user) => {
  if (!EMAIL_SECRET) {
    throw new Error('EMAIL_SECRET is not set in environment variables');
  }
  
  return jwt.sign(
    { 
      userId: user.id || user.userId,
      email: user.email,
      purpose: 'email_verification'
    },
    EMAIL_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }
  
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verify a refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  if (!REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not set in environment variables');
  }
  
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
};

/**
 * Verify an email verification token
 * @param {string} token - Email verification token
 * @returns {Object} Decoded token payload
 */
export const verifyEmailToken = (token) => {
  if (!EMAIL_SECRET) {
    throw new Error('EMAIL_SECRET is not set in environment variables');
  }
  
  return jwt.verify(token, EMAIL_SECRET);
};

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a password with a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Whether the password matches
 */
export const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Verify Google OAuth token
 * @param {string} token - Google ID token
 * @returns {Promise<Object>} Google user info
 */
export const verifyGoogleToken = async (token) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    return ticket.getPayload();
  } catch (error) {
    throw new Error('Invalid Google token');
  }
};

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null if not found
 */
export const extractTokenFromRequest = (req) => {
  // Check authorization header first
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  
  // Check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check for token in query params (useful for WebSocket connections)
  if (req.query && req.query.token) {
    return req.query.token;
  }
  
  return null;
};

/**
 * Store refresh token in database
 * @param {number} userId - User ID
 * @param {string} token - Refresh token
 * @returns {Promise<void>}
 */
export const storeRefreshToken = async (userId, token) => {
  try {
    // Check if user already has a refresh token
    const existingToken = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (existingToken.rows.length > 0) {
      // Update existing token
      await pool.query(
        'UPDATE refresh_tokens SET token = $1, created_at = NOW() WHERE user_id = $2',
        [token, userId]
      );
    } else {
      // Insert new token
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, created_at) VALUES ($1, $2, NOW())',
        [userId, token]
      );
    }
  } catch (error) {
    console.error('Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
};

/**
 * Validate refresh token from database
 * @param {number} userId - User ID
 * @param {string} token - Refresh token
 * @returns {Promise<boolean>} Whether the token is valid
 */
export const validateStoredRefreshToken = async (userId, token) => {
  try {
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error validating refresh token:', error);
    return false;
  }
};

/**
 * Delete refresh token from database
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
export const deleteRefreshToken = async (userId) => {
  try {
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error deleting refresh token:', error);
    throw new Error('Failed to delete refresh token');
  }
};

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object
 */
export const authenticateUser = async (email, password) => {
  try {
    // Get user from database
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = result.rows[0];
    
    // Check if password is correct
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a random 6-digit verification code
 * @returns {string} 6-digit code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store verification code in database
 * @param {number} userId - User ID
 * @param {string} code - 6-digit verification code
 * @returns {Promise<string>} The verification code
 */
export const storeVerificationCode = async (userId, code, client = null) => {
  try {
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    // Use the provided client (for transactions) or the pool directly
    const queryExecutor = client || pool;
    
    await queryExecutor.query(
      'UPDATE users_auth SET verification_token = $1, verification_expires = $2 WHERE user_id = $3',
      [hashedCode, expiresAt, userId]
    );
    
    return code;
  } catch (error) {
    console.error('Error storing verification code:', error);
    throw error;
  }
};

/**
 * Verify the entered verification code
 * @param {number} userId - User ID
 * @param {string} code - Verification code entered by user
 * @returns {Promise<Object>} Result of verification
 */
export const verifyCode = async (userId, code) => {
  try {
    const result = await pool.query(
      'SELECT verification_token, verification_expires FROM users_auth WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { valid: false, message: 'User not found' };
    }
    
    const { verification_token, verification_expires } = result.rows[0];
    
    if (!verification_token || !verification_expires) {
      return { valid: false, message: 'No verification code found' };
    }
    
    // Check if code has expired
    if (new Date() > new Date(verification_expires)) {
      return { valid: false, message: 'Verification code has expired' };
    }
    
    // Verify the code
    const isValid = await bcrypt.compare(code, verification_token);
    
    if (isValid) {
      // Mark user as verified
      await pool.query(
        'UPDATE users_auth SET verified = true WHERE user_id = $1',
        [userId]
      );
      return { valid: true };
    }
    
    return { valid: false, message: 'Invalid verification code' };
  } catch (error) {
    console.error('Error verifying code:', error);
    return { valid: false, message: 'Verification failed due to server error' };
  }
};

// Export all functions as a module
export default {
  generateToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyToken,
  verifyRefreshToken,
  verifyEmailToken,
  hashPassword,
  comparePassword,
  verifyGoogleToken,
  extractTokenFromRequest,
  storeRefreshToken,
  validateStoredRefreshToken,
  deleteRefreshToken,
  authenticateUser,
  generateVerificationCode,
  storeVerificationCode,
  verifyCode
};
