import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { getUserByEmail, getUserById, createUser } from '../../database.js';
import { authDebug } from '../../middleware/authDebug.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../../utils/email.js';

dotenv.config();
const router = express.Router();

// Add auth debugging to all routes in this router
router.use(authDebug);

/**
 * @route POST /api/auth/login
 * @desc Login a user and get token
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Create tokens
    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '4h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id }, 
      process.env.REFRESH_TOKEN_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Save user ID to session
    req.session.userId = user.id;
    
    // Set HTTP-only refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Set normal token cookie (accessible to JavaScript)
    res.cookie('token', token, {
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('API login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const newUser = await createUser({
      username,
      email,
      password: hashedPassword
    });
    
    // Generate token
    const token = jwt.sign(
      { userId: newUser.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '4h' }
    );
    
    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: newUser.id }, 
      process.env.EMAIL_SECRET || process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue anyway, don't block signup
    }
    
    // Save user ID to session
    req.session.userId = newUser.id;
    
    // Set token cookie
    res.cookie('token', token, {
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      }
    });
  } catch (error) {
    console.error('API signup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh auth token using refresh token
 * @access Public (with refresh token cookie)
 */
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    // Generate new tokens
    const newToken = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '4h' }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user.id }, 
      process.env.REFRESH_TOKEN_SECRET, 
      { expiresIn: '7d' }
    );
    
    // Set new refresh token cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Set new token cookie
    res.cookie('token', newToken, {
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout a user
 * @access Public
 */
router.post('/logout', (req, res) => {
  // Clear cookies
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

/**
 * @route GET /api/auth/verify
 * @desc Verify user's authentication status
 * @access Public
 */
router.get('/verify', async (req, res) => {
  try {
    // Get token from authorization header or cookie
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        authenticated: false, 
        message: 'No authentication token' 
      });
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ 
          authenticated: false, 
          message: 'User not found' 
        });
      }
      
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ 
        authenticated: false, 
        message: 'Invalid or expired token' 
      });
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(500).json({ 
      authenticated: false, 
      message: 'Server error' 
    });
  }
});

/**
 * @route GET /api/auth/debug
 * @desc Debug authentication information (development only)
 * @access Public
 */
router.get('/debug', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }
  
  const authHeader = req.headers.authorization;
  const tokenCookie = req.cookies?.token;
  const refreshTokenCookie = req.cookies?.refreshToken;
  const sessionUserId = req.session?.userId;
  const sessionID = req.sessionID;
  
  res.json({
    authHeader: {
      present: !!authHeader,
      value: authHeader ? `${authHeader.substring(0, 15)}...` : null
    },
    cookies: {
      token: {
        present: !!tokenCookie,
        value: tokenCookie ? `${tokenCookie.substring(0, 10)}...` : null
      },
      refreshToken: {
        present: !!refreshTokenCookie
      }
    },
    session: {
      id: sessionID,
      userId: sessionUserId
    },
    authDebugInfo: req.authDebug || 'Not available'
  });
});

export default router;
