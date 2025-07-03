/**
 * Authentication API routes
 * Handles login, registration, token refresh, and logout
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { authenticateUser, logAuthAttempt } from '../middleware/auth.js';
import authService from '../auth/auth.js';
import pool from '../db.js';

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    // Get client IP and user agent for logging
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Authenticate user using the middleware function
    const authResult = await authenticateUser(
      email, 
      password, 
      ipAddress, 
      userAgent
    );
    
    if (authResult.success) {      // Set cookies for added security
      res.cookie('token', authResult.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
      });
      
      if (authResult.refreshToken) {
        res.cookie('refreshToken', authResult.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth/refresh',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }
      
      return res.status(200).json({
        success: true,
        token: authResult.token,
        user: authResult.user
      });
    } else {
      return res.status(401).json({
        success: false,
        error: authResult.error,
        message: 'Invalid email or password'
      });
    }
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, firstName, lastName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    
    // Check if email already exists
    const emailCheck = await pool.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email exists',
        message: 'This email is already registered'
      });
    }
    
    // Create password hash
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insert new user
    const result = await pool.query(
      `INSERT INTO users 
       (email, password, username, first_name, last_name, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, email, username`,
      [email, passwordHash, username || email.split('@')[0], firstName || '', lastName || '']
    );
    
    const newUser = result.rows[0];
    
    // Generate token for automatic login
    const token = authService.generateToken(newUser);
    const refreshToken = authService.generateRefreshToken(newUser);
    
    // Store refresh token
    await authService.storeRefreshToken(newUser.id, refreshToken);
      // Set cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Log auth attempt
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    await logAuthAttempt(
      newUser.id,
      email,
      true,
      'registration',
      ipAddress,
      userAgent
    );
    
    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      }
    });
  } catch (error) {
    console.error('Registration route error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An unexpected error occurred during registration'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh authentication token
 * @access Public (with refresh token)
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie or request body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token',
        message: 'Refresh token is required'
      });
    }
    
    // Verify the refresh token
    const tokenData = authService.verifyRefreshToken(refreshToken);
    
    if (!tokenData || !tokenData.userId) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Please log in again'
      });
    }
    
    // Check if the refresh token exists in the database
    const tokenResult = await pool.query(
      'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    
    if (tokenResult.rows.length === 0) {
      // Token not found or expired
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Please log in again'
      });
    }
    
    // Get user data
    const userResult = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [tokenData.userId]
    );
    
    if (userResult.rows.length === 0) {
      // User not found
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'Please log in again'
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate new tokens
    const newToken = authService.generateToken(user);
    const newRefreshToken = authService.generateRefreshToken(user);
    
    // Update refresh token in database    await authService.storeRefreshToken(user.id, newRefreshToken);
    
    // Set new cookies
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    return res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user and invalidate tokens
 * @access Private
 */
router.post('/logout', async (req, res) => {
  try {
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    // Get user ID from token
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = authService.verifyToken(token);
        
        if (decoded && decoded.userId) {
          // Invalidate refresh token in database
          await authService.invalidateRefreshToken(decoded.userId);
          
          // Invalidate session if using sessions
          if (req.session) {
            req.session.destroy();
          }
        }
      } catch (error) {
        // Token verification failed, but we still want to clear cookies
        console.error('Logout token verification failed:', error);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout route error:', error);
    
    // Even on error, clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * @route GET /api/auth/verify
 * @desc Verify token and get user data
 * @access Private
 */
router.get('/verify', async (req, res) => {
  try {
    // Get token from authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies.token;
    
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (cookieToken) {
      token = cookieToken;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'No token provided'
      });
    }
    
    // Verify token
    const decoded = authService.verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Invalid token'
      });
    }
    
    // Get user data
    const userResult = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      error: 'Server error'
    });
  }
});

/**
 * @route PUT /api/auth/password
 * @desc Change user password
 * @access Private
 */
router.put('/password', async (req, res) => {
  try {
    // Ensure user is authenticated
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Get user data with password
    const userResult = await pool.query(
      'SELECT id, password FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, decoded.userId]
    );
    
    // Invalidate all refresh tokens for security
    await authService.invalidateRefreshToken(decoded.userId);
    
    // Generate new tokens
    const newToken = authService.generateToken({ id: decoded.userId });
    const newRefreshToken = authService.generateRefreshToken({ id: decoded.userId });
    
    // Store new refresh token
    await authService.storeRefreshToken(decoded.userId, newRefreshToken);
      // Set new cookies
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An unexpected error occurred'
    });
  }
});

// Add a named export 'router' in addition to the default export
export { router };
export default router;