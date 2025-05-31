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
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email.js';
import { repairUserAccount } from '../database-repair.js';
import { authenticateUser } from '../middleware/auth.js';

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

// Register new user
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Signup request for:', email);

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password are required'
      });
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user with better error handling
    let user;
    try {
      user = await createUser({ username, email, password });
    } catch (createError) {
      console.error('User creation error:', createError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create account'
      });
    }

    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.id },
      EMAIL_SECRET,
      { expiresIn: '24h' }
    );    // Send verification email
    try {
      console.log('Attempting to send verification email to:', email);
      await sendVerificationEmail(email, verificationToken);
      console.log('Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email to:', email);
      console.error('Email error details:', emailError.message);
      if (emailError.response && emailError.response.body) {
        console.error('SendGrid error response:', emailError.response.body);
      }
      // Continue anyway, user can request another verification email
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Signup error:', error);
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

  // Normalize all redirect parameters to returnTo
  let returnTo = req.query.returnTo || req.query.returnUrl || req.query.redirect || '/';
  returnTo = sanitizeRedirectUrl(returnTo);

  // If no email provided, redirect back to first login step
  if (!email) {
    return res.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  res.render('login2', { email, verified, error, returnTo });
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

// Add this new route for forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      // For security reasons, don't reveal that the email doesn't exist
      // Still return success to prevent email enumeration attacks
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive password reset instructions shortly.'
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate reset token
    const resetToken = jwt.sign(
      { 
        userId: user.id, 
        purpose: 'password_reset' 
      },
      process.env.EMAIL_SECRET || JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Store the token in the database
    try {
      // First check if users_auth table has reset_token and reset_token_expires columns
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users_auth' 
        AND column_name IN ('reset_token', 'reset_token_expires')
      `);
      
      // If both columns exist
      if (columnCheck.rows.length === 2) {
        await pool.query(`
          UPDATE users_auth 
          SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour'
          WHERE user_id = $2
        `, [resetToken, user.id]);
      } else {
        // Just store the token in memory (not ideal for production)
        console.log('Reset token columns not found in users_auth table');
      }
    } catch (dbError) {
      console.error('Error storing reset token:', dbError);
      // Continue anyway - token is still in the JWT
    }
    
    // Create reset URL
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;
    
    // Send email with reset link
    try {
      await sendPasswordResetEmail(email, user.username, resetUrl);
      console.log('Password reset email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't reveal email sending errors to the client
    }
    
    res.json({
      success: true,
      message: 'If your email is registered, you will receive password reset instructions shortly.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Reset password - POST request to process the form
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token and password are required'
    });
  }
  
  try {
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.EMAIL_SECRET || JWT_SECRET);
      
      if (decoded.purpose !== 'password_reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token'
        });
      }
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'Password reset link has expired. Please request a new one.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token. Please request a new password reset link.'
        });
      }
    }
    
    const userId = decoded.userId;
    
    // Check password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Verify user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the password
    try {
      // Check if users_auth exists for this user
      const authCheck = await pool.query(
        'SELECT user_id FROM users_auth WHERE user_id = $1',
        [userId]
      );
      
      if (authCheck.rows.length === 0) {
        // Create new auth record
        await pool.query(
          'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
          [userId, hashedPassword]
        );
      } else {
        // Update existing auth record, handle different table schemas
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users_auth' 
          AND column_name IN ('reset_token', 'reset_token_expires')
        `);
        
        if (columnCheck.rows.length === 2) {
          await pool.query(`
            UPDATE users_auth
            SET password_hash = $1, 
                reset_token = NULL,
                reset_token_expires = NULL,
                verified = true
            WHERE user_id = $2
          `, [hashedPassword, userId]);
        } else {
          await pool.query(`
            UPDATE users_auth
            SET password_hash = $1, 
                verified = true
            WHERE user_id = $2
          `, [hashedPassword, userId]);
        }
      }
    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
    
    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Add a new endpoint to manually verify a user (admin or debugging only)
router.post('/manual-verify', async (req, res) => {
  try {
    // This endpoint should be protected in production
    if (process.env.NODE_ENV === 'production' && !req.session?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find the user
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userId = userResult.rows[0].id;

    // Check if auth record exists
    const authCheck = await pool.query(
      'SELECT user_id FROM users_auth WHERE user_id = $1',
      [userId]
    );

    if (authCheck.rows.length === 0) {
      // Create auth record
      await pool.query(
        'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
        [userId, 'REQUIRES_RESET']
      );
    } else {
      // Update existing record
      await pool.query(
        'UPDATE users_auth SET verified = true WHERE user_id = $1',
        [userId]
      );
    }

    console.log(`User ${userId} (${email}) manually verified`);

    res.status(200).json({
      success: true,
      message: 'User verified successfully'
    });

  } catch (error) {
    console.error('Manual verification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during verification'
    });
  }
});

// Forgot password page - GET request to show the form
router.get('/forgot-password', (req, res) => {
  const error = req.query.error || null;
  const success = req.query.success || null;
  
  res.render('auth/forgot-password', { error, success });
});

// Reset password page - GET request to show the form
router.get('/reset-password', (req, res) => {
  const token = req.query.token || '';
  const error = req.query.error || null;
  const success = req.query.success || null;
  
  if (!token) {
    return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Reset token is missing. Please request a new password reset link.'));
  }
  
  // Verify token is valid first
  try {
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET || JWT_SECRET);
    
    if (decoded.purpose !== 'password_reset') {
      return res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Invalid reset token. Please request a new password reset link.'));
    }
    
    // Token is valid, render the reset password page
    res.render('auth/reset-password', { token, error, success });
  } catch (error) {
    // Token is invalid or expired
    console.error('Invalid reset token:', error);
    res.redirect('/auth/forgot-password?error=' + encodeURIComponent('Password reset link is invalid or has expired. Please request a new one.'));
  }
});

// Forgot password - POST request to process the form
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }
  
  try {
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, email, username FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      // For security reasons, don't reveal that the email doesn't exist
      // Still return success to prevent email enumeration attacks
      return res.json({
        success: true,
        message: 'If your email is registered, you will receive password reset instructions shortly.'
      });
    }
    
    const user = userResult.rows[0];
    
    // Generate reset token
    const resetToken = jwt.sign(
      { 
        userId: user.id, 
        purpose: 'password_reset' 
      },
      process.env.EMAIL_SECRET || JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Store the token in the database
    try {
      // First check if users_auth table has reset_token and reset_token_expires columns
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users_auth' 
        AND column_name IN ('reset_token', 'reset_token_expires')
      `);
      
      // If both columns exist
      if (columnCheck.rows.length === 2) {
        await pool.query(`
          UPDATE users_auth 
          SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour'
          WHERE user_id = $2
        `, [resetToken, user.id]);
      } else {
        // Just store the token in memory (not ideal for production)
        console.log('Reset token columns not found in users_auth table');
      }
    } catch (dbError) {
      console.error('Error storing reset token:', dbError);
      // Continue anyway - token is still in the JWT
    }
    
    // Create reset URL
    const resetUrl = `${process.env.SITE_URL || 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;
    
    // Send email with reset link
    try {
      await sendPasswordResetEmail(email, user.username, resetUrl);
      console.log('Password reset email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't reveal email sending errors to the client
    }
    
    res.json({
      success: true,
      message: 'If your email is registered, you will receive password reset instructions shortly.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Reset password - POST request to process the form
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({
      success: false,
      message: 'Token and password are required'
    });
  }
  
  try {
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.EMAIL_SECRET || JWT_SECRET);
      
      if (decoded.purpose !== 'password_reset') {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token'
        });
      }
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          message: 'Password reset link has expired. Please request a new one.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid reset token. Please request a new password reset link.'
        });
      }
    }
    
    const userId = decoded.userId;
    
    // Check password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Verify user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the password
    try {
      // Check if users_auth exists for this user
      const authCheck = await pool.query(
        'SELECT user_id FROM users_auth WHERE user_id = $1',
        [userId]
      );
      
      if (authCheck.rows.length === 0) {
        // Create new auth record
        await pool.query(
          'INSERT INTO users_auth (user_id, password_hash, verified) VALUES ($1, $2, true)',
          [userId, hashedPassword]
        );
      } else {
        // Update existing auth record, handle different table schemas
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users_auth' 
          AND column_name IN ('reset_token', 'reset_token_expires')
        `);
        
        if (columnCheck.rows.length === 2) {
          await pool.query(`
            UPDATE users_auth
            SET password_hash = $1, 
                reset_token = NULL,
                reset_token_expires = NULL,
                verified = true
            WHERE user_id = $2
          `, [hashedPassword, userId]);
        } else {
          await pool.query(`
            UPDATE users_auth
            SET password_hash = $1, 
                verified = true
            WHERE user_id = $2
          `, [hashedPassword, userId]);
        }
      }
    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }
    
    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

export default router;
