import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import pool from '../db.js';
import { 
  getUserByEmail, 
  createUser, 
  verifyUser, 
  createOrUpdateOAuthUser 
} from '../database.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendSignupAnalyticsEmail, sendVerificationSuccessAnalyticsEmail, sendVerificationFailureAnalyticsEmail } from '../utils/email.js';
import { recordAnalyticsEvent } from '../utils/analytics.js';
import { trackSignup, trackVerificationSuccess, trackVerificationFailure } from '../utils/analytics-tracker.js';
import { repairUserAccount } from '../database-repair.js';
import { authenticateUser } from '../middleware/auth.js';
import { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  verifyRefreshToken, 
  verifyEmailToken, 
  hashPassword, 
  comparePassword,
  generateVerificationCode,
  storeVerificationCode,
  verifyCode
} from '../auth/auth.js';

dotenv.config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_SECRET = process.env.EMAIL_SECRET || process.env.JWT_SECRET;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Add this helper function near the top of your file
function sanitizeRedirectUrl(url) {
  if (!url) return '/';

  // Decode URL in case it's URL-encoded
  url = decodeURIComponent(url);

  // Check if the URL is trying to redirect to a login page
  if (url.includes('/login') || 
      url.includes('/login2') || 
      url.includes('/signup') || 
      url.includes('/auth/login')) {
    console.log('Prevented redirect loop to:', url);
    return '/';
  }

  // If URL is absolute (starts with http or //), only allow our own domain
  if (url.startsWith('http') || url.startsWith('//')) {
    // Extract hostname - simplified approach
    const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
    if (!hostname.includes('localhost') && !hostname.includes('arzani.co.uk')) {
      console.log('Prevented redirect to external domain:', hostname);
      return '/';
    }
  }

  return url;
}

// System health check route
router.get('/check-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    return res.status(200).json({
      success: true,
      dbConnected: true,
      timestamp: result.rows[0].now
    });
  } catch (error) {
    console.error('Database connectivity error:', error);
    return res.status(500).json({
      success: false,
      dbConnected: false,
      error: error.message
    });
  }
});

// Standard login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Fetch user with better error handling
    let user;
    try {
      user = await getUserByEmail(email);
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error while authenticating' 
      });
    }

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // OAuth check
    if (user.auth_provider && !['local', 'email', null, undefined].includes(user.auth_provider)) {
      return res.status(401).json({
        success: false,
        message: `This account uses ${user.auth_provider} authentication. Please sign in with ${user.auth_provider}.`
      });
    }

    // Fetch auth information - changed to handle missing password hash better
    const authInfo = await pool.query(
      'SELECT password_hash, verified FROM users_auth WHERE user_id = $1',
      [user.id]
    );

    // Check if auth entry exists
    if (authInfo.rows.length === 0 || !authInfo.rows[0].password_hash) {
      console.error(`User has no password hash: ${user.id}`);

      // Attempt to repair the account
      try {
        await repairUserAccount(user.id, user.email);

        return res.status(401).json({
          success: false,
          requiresReset: true,
          message: 'Account needs setup. Please use forgot password to set your password.'
        });
      } catch (repairError) {
        console.error('Failed to repair account:', repairError);
        return res.status(401).json({
          success: false,
          message: 'Invalid account configuration'
        });
      }
    }

    // Store password hash
    const passwordHash = authInfo.rows[0].password_hash;
    const isVerified = authInfo.rows[0].verified || false;

    // Check for placeholder password that requires reset
    if (passwordHash === 'REQUIRES_RESET') {
      return res.status(401).json({
        success: false,
        requiresReset: true,
        message: 'Password reset required. Please use forgot password feature.'
      });
    }

    let passwordValid;
    try {
      passwordValid = await bcrypt.compare(password, passwordHash);
    } catch (bcryptError) {
      console.error('Password comparison error:', bcryptError);
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user's email is verified
    if (!isVerified) {
      return res.status(401).json({
        success: false,
        verificationRequired: true,
        message: 'Please verify your email before logging in'
      });
    }

    // Create tokens
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.REFRESH_TOKEN_SECRET || JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set session
    req.session.userId = user.id;
    await new Promise(resolve => {
      req.session.save(err => {
        if (err) console.error('Session save error:', err);
        resolve();
      });
    });

    // Update last login time with a conditional approach
    try {
      // Check if the last_login column exists first
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login'
      `);

      // Only update if the column exists
      if (columnCheck.rows.length > 0) {
        await pool.query(
          'UPDATE users SET last_login = NOW() WHERE id = $1',
          [user.id]
        );
      }
    } catch (error) {
      // Log but don't fail the login process
      console.warn('Failed to update last_login:', error.message);
    }

    // Response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, acceptTerms } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }
    
    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    // Use a transaction to ensure all related records are created atomically
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create user - let the database generate the ID using SERIAL
      const hashedPassword = await hashPassword(password);
      const newUserResult = await client.query(
        'INSERT INTO users (username, email, auth_provider) VALUES ($1, $2, $3) RETURNING id, email, username',
        [username, email, 'email']
      );
      
      const newUser = newUserResult.rows[0];
      
      // Create auth record
      await client.query(
        'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, $3)',
        [newUser.id, hashedPassword, false]
      );
      
      // Generate verification code
      const verificationCode = generateVerificationCode();
      
      // Store the code in database - pass the client to use the same transaction
      await storeVerificationCode(newUser.id, verificationCode, client);
      
      // Commit the transaction
      await client.query('COMMIT');
      
      // Send verification email with code
      try {
        console.log('Attempting to send verification email to:', email);
        await sendVerificationEmail(email, verificationCode);
        console.log('Verification email sent successfully to:', email);
      } catch (emailError) {
        console.error('Failed to send verification email to:', email);
        console.error(emailError);
        // Continue anyway, user can request another verification email
      }
      
      // Send analytics email to track signup
      try {
        // Send analytics email
        await sendSignupAnalyticsEmail(email, newUser.id);
        console.log('Analytics email sent for user signup:', newUser.id);
        
        // Track signup in analytics system
        await trackSignup(newUser.id, email, username);
        
        // For backward compatibility, still record in the old way
        await recordAnalyticsEvent('user_signup', newUser.id, {
          email,
          timestamp: new Date().toISOString(),
          username,
          status: 'verification_pending'
        });
      } catch (analyticsError) {
        console.error('Failed to send analytics for signup:', analyticsError);
        // Don't block signup process if analytics fails
      }
      
      // Return success with userId for verification step
      return res.status(201).json({
        success: true,
        message: 'Account created! Please check your email for verification code.',
        userId: newUser.id,
        requiresVerification: true
      });
    } catch (dbError) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      throw dbError; // Re-throw to be caught by outer try-catch
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Signup error:', error);
    
    // Check for duplicate key violation
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'This account already exists. Please try logging in or use a different email.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create account'
    });
  }
});

// Email verification
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, EMAIL_SECRET);
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      if (req.headers.accept?.includes('application/json')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }
      return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid or expired verification token'));
    }

    // Make sure we have a userId
    if (!decoded.userId) {
      console.error('Missing userId in token');
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    try {
      // Update the users_auth table directly - this is the main fix
      const updateResult = await pool.query(
        'UPDATE users_auth SET verified = true WHERE user_id = $1 RETURNING user_id',
        [decoded.userId]
      );

      // Check if any row was updated
      if (updateResult.rows.length === 0) {
        console.error('No auth record found for user ID:', decoded.userId);

        // Try to find the user to confirm they exist
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);

        if (userCheck.rows.length === 0) {
          console.error('User not found:', decoded.userId);
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // If user exists but no auth record, create one
        await pool.query(
          'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
          [decoded.userId, 'REQUIRES_RESET']
        );

        console.log('Created new auth record with verified=true for user:', decoded.userId);
      } else {
        console.log('Successfully verified user:', decoded.userId);
      }

      // Get user details to send welcome email
      const userDetails = await pool.query(
        'SELECT email, username FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userDetails.rows.length > 0) {
        // Send welcome email
        try {
          await sendWelcomeEmail(userDetails.rows[0].email, userDetails.rows[0].username);
          console.log('Welcome email sent to:', userDetails.rows[0].email);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Continue anyway, this shouldn't block the verification process
        }
      }

      // If request wants JSON
      if (req.headers.accept?.includes('application/json')) {
        return res.status(200).json({
          success: true,
          message: 'Email verified successfully'
        });
      }

      // Otherwise redirect to login page with verified=true
      res.redirect('/auth/login?verified=true');
    } catch (dbError) {
      console.error('Database error during verification:', dbError);

      if (req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          message: 'Email verification failed due to database error'
        });
      }

      res.redirect('/auth/login?verified=false&error=' + encodeURIComponent('Verification failed'));
    }
  } catch (error) {
    console.error('Email verification error:', error);

    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }

    res.redirect('/auth/login?verified=false&error=' + encodeURIComponent('Verification failed'));
  }
});

// Google OAuth sign in
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Missing Google credential'
      });
    }

    // Verify token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    // Create or update user
    const user = await createOrUpdateOAuthUser({
      email: payload.email,
      username: payload.name,
      provider: 'google',
      providerId: payload.sub
    });

    // Create token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Set session
    req.session.userId = user.id;
    await new Promise(resolve => req.session.save(resolve));

    // Return auth data
    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Google authentication failed'
    });
  }
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`/login2?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect('/login2?error=no_code');
    }

    // Get the tokens
    const { tokens } = await googleClient.getToken(code);

    // Verify token and get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    // Create or update user
    const user = await createOrUpdateOAuthUser({
      email: payload.email,
      username: payload.name,
      provider: 'google',
      providerId: payload.sub,
      googleTokens: tokens
    });

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Set session
    req.session.userId = user.id;
    await new Promise(resolve => req.session.save(resolve));

    // Redirect directly to marketplace2
    res.redirect(`/marketplace2?token=${token}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect('/login2?error=google_auth_failed');
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token is required' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.REFRESH_TOKEN_SECRET || JWT_SECRET
    );

    // Check if it's a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    res.status(200).json({
      success: true,
      token: accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }

    res.clearCookie('connect.sid');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Add UI render routes - UPDATED

// First login step - Email entry
router.get('/login', (req, res) => {
  const email = req.query.email || '';
  const verified = req.query.verified === 'true';
  const error = req.query.error || null;

  // Normalize all redirect parameters to returnTo
  let returnTo = req.query.returnTo || req.query.returnUrl || req.query.redirect || '/';
  returnTo = sanitizeRedirectUrl(returnTo);

  res.render('login', { email, verified, error, returnTo });
});

// Second login step - Password entry
router.get('/login2', (req, res) => {
  // This is the page where user enters password
  const email = req.query.email || '';
  const verified = req.query.verified === 'true';
  const error = req.query.error || null;
  const passwordReset = req.query.passwordReset === 'true';

  // Normalize all redirect parameters to returnTo
  let returnTo = req.query.returnTo || req.query.returnUrl || req.query.redirect || '/';
  returnTo = sanitizeRedirectUrl(returnTo);

  // If no email provided, redirect back to first login step
  if (!email) {
    return res.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  res.render('login2', { email, verified, error, returnTo, passwordReset });
});

router.get('/signup', (req, res) => {
  res.render('signup');
});

// Check token validity
router.get('/check-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        valid: false, 
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if user exists in database
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(401).json({
          valid: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        valid: true,
        userId: decoded.userId
      });
    } catch (tokenError) {
      return res.status(401).json({
        valid: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Token check error:', error);
    res.status(500).json({
      valid: false,
      message: 'Error validating token'
    });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await getUserByEmail(email);

    if (!user) {
      // Return success even if user doesn't exist for security reasons
      return res.status(200).json({
        success: true,
        message: 'If your email exists in our system, a verification email has been sent.'
      });
    }

    // Check if already verified
    if (user.is_verified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Your email is already verified. You can log in now.'
      });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.id },
      EMAIL_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email'
    });
  }
});

// Verify email notice page
router.get('/verify-email-notice', (req, res) => {
  let returnTo = req.query.returnTo || req.query.returnUrl || req.query.redirect || '/';
  returnTo = sanitizeRedirectUrl(returnTo);

  res.render('verify-email-notice', { returnTo });
});

// This assumes you have an auth.js file for authentication routes
// Add this route handler to your existing file

// This is a replacement for the current login endpoint to handle the two-step login flow
router.post('/login2', async (req, res) => {
  try {
    // Extract login details from request body
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Use your existing authentication logic here
    // This is just a wrapper that calls your existing login handler

    // For example, if you have a user service:
    const result = await userService.authenticateUser(email, password);

    if (!result.success) {
      return res.status(401).json({ 
        success: false, 
        message: result.message || 'Invalid credentials' 
      });
    }

    // Generate authentication tokens
    const token = generateAuthToken(result.user);
    const refreshToken = remember ? generateRefreshToken(result.user) : null;

    // Set cookies if you're using them
    if (token) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
      };

      res.cookie('auth_token', token, cookieOptions);

      if (refreshToken) {
        // Set refresh token with longer expiry
        res.cookie('refresh_token', refreshToken, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }
    }

    // Return success response with token
    return res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name
        // Add other user info as needed, but avoid sensitive data
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login'
    });
  }
});

// Page rendering routes
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    user: null
  });
});

router.get('/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect('/auth/forgot-password');
  }
  
  res.render('auth/reset-password', {
    title: 'Reset Password',
    token,
    user: null
  });
});

// Password reset API endpoints
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Check if user exists
    const user = await getUserByEmail(email);
    
    if (!user) {
      // Don't reveal whether a user exists for security reasons
      return res.status(200).json({ 
        success: true,
        message: 'If your email exists in our system, you will receive password reset instructions.'
      });
    }
    
    // Generate a JWT token for password reset
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password_reset' },
      EMAIL_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create reset URL
    const resetUrl = `${process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;
    
    // Send password reset email
    await sendPasswordResetEmail(user.email, user.username, resetUrl);
    
    // Log the event
    await recordAnalyticsEvent('password_reset_requested', user.id, { email: user.email });
    
    return res.status(200).json({
      success: true,
      message: 'Password reset instructions have been sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { password, token } = req.body;
    
    if (!password || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password and token are required' 
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, EMAIL_SECRET);
      
      // Check if token is for password reset
      if (decoded.purpose !== 'password_reset') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid reset token' 
        });
      }
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password
    await pool.query(
      'UPDATE users_auth SET password_hash = $1 WHERE user_id = $2',
      [hashedPassword, decoded.userId]
    );
    
    // Log the event
    await recordAnalyticsEvent('password_reset_completed', decoded.userId, { email: decoded.email });
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Verify email with 6-digit code
router.post('/verify-code', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'User ID and verification code are required'
      });
    }
    
    // Verify the code
    const verification = await verifyCode(userId, code);
    
    if (!verification.valid) {
      // Track verification failure
      try {
        // Get user information for analytics
        const userResult = await pool.query(
          'SELECT email, username FROM users WHERE id = $1',
          [userId]
        );
        
        if (userResult.rows.length > 0) {
          const { email, username } = userResult.rows[0];
          
          // Get attempt count from the database
          const attemptsResult = await pool.query(
            `SELECT COUNT(*) FROM analytics_events 
             WHERE event_type = 'verification_failure' AND user_id = $1`,
            [userId]
          );
          const attemptCount = parseInt(attemptsResult.rows[0].count, 10) + 1;
          
          // Send analytics email for failed verification
          await sendVerificationFailureAnalyticsEmail(
            email, 
            userId, 
            verification.message || 'Invalid verification code', 
            attemptCount
          );
          
          // Track verification failure in analytics system
          await trackVerificationFailure(
            userId, 
            email, 
            verification.message || 'Invalid verification code', 
            attemptCount
          );
          
          console.log('Verification failure analytics recorded for user:', userId);
        }
      } catch (analyticsError) {
        console.error('Failed to record verification failure analytics:', analyticsError);
        // Continue with the response regardless of analytics failure
      }
      
      return res.status(400).json({
        success: false,
        message: verification.message || 'Invalid verification code'
      });
    }
    
    // Send welcome email
    try {
      const userResult = await pool.query(
        'SELECT email, username FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        const { email, username } = userResult.rows[0];
        await sendWelcomeEmail(email, username);
        
        // Send analytics for successful verification
        try {
          // Send analytics email
          await sendVerificationSuccessAnalyticsEmail(email, userId, username);
          
          // Track verification success in analytics system
          await trackVerificationSuccess(userId, email, username);
          
          console.log('Verification success analytics recorded for user:', userId);
        } catch (analyticsError) {
          console.error('Failed to record verification analytics:', analyticsError);
          // Don't block verification process if analytics fails
        }
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue anyway, verification was successful
    }
    
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during verification'
    });
  }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Implement rate limiting to prevent abuse
    // This is a simple example - in production, use a more robust solution
    const rateLimit = req.app.locals.resendRateLimits = req.app.locals.resendRateLimits || {};
    const now = Date.now();
    const lastResend = rateLimit[userId] || 0;
    
    if (now - lastResend < 60000) { // 1 minute cooldown
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another code',
        retryAfter: Math.ceil((60000 - (now - lastResend)) / 1000)
      });
    }
    
    // Store current time as last resend timestamp
    rateLimit[userId] = now;
    
    // Get user email
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const email = userResult.rows[0].email;
    
    // Generate new verification code
    const verificationCode = generateVerificationCode();
    
    // Store the code in database
    await storeVerificationCode(userId, verificationCode);
    
    // Send verification email with code
    await sendVerificationEmail(email, verificationCode);
    
    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });
    
  } catch (error) {
    console.error('Resend code error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending verification code'
    });
  }
});


export default router;
