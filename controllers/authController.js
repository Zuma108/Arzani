/**
 * Authentication controller for user registration, login, and OAuth
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { linkUserData } from '../middleware/userDataLinking.js';
import { linkQuestionnaireData as linkQuestionnaire, linkQuestionnaireSubmissionById } from '../controllers/valuationController.js';

/**
 * Link questionnaire data if available (based on email or cookie)
 */
async function linkQuestionnaireData(userId, email, req) {
  try {
    // Try to get submission ID from cookie first
    const submissionId = req.cookies?.questionnaireSubmissionId;
    let linked = false;
    
    if (submissionId) {
      console.log(`Attempting to link questionnaire submission ${submissionId} to user ${userId}`);
      
      // Use the enhanced function to link all tables by submission ID
      const result = await linkQuestionnaireSubmissionById(userId, submissionId);
      linked = Boolean(result);
      
      if (linked) {
        console.log(`Successfully linked questionnaire data by submission ID: ${submissionId}`);
      }
    }
    
    // If no cookie or linking by ID failed, try by email
    if (!linked && email) {
      console.log(`Attempting to link questionnaire data for email: ${email}`);
      
      // Use the enhanced function to link all tables by email
      const result = await linkQuestionnaire(userId, email);
      linked = Boolean(result);
      
      if (linked) {
        console.log(`Successfully linked questionnaire data by email for user ${userId}`);
      }
    }
    
    return linked;
  } catch (error) {
    console.error('Error linking questionnaire data:', error);
    return false;
  }
}

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { username, email, password, anonymousId } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    // Check if user already exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'User already exists with this email' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const result = await pool.query(
      'INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, username',
      [username, email, hashedPassword]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Link questionnaire data if anonymousId is provided
    if (anonymousId) {
      await pool.query(
        'UPDATE questionnaire_submissions SET user_id = $1, converted_to_business = true WHERE anonymous_id = $2',
        [user.id, anonymousId]
      );
    }
    
    // After successful signup, link any questionnaire data
    await linkUserData(req, res, () => {});
    await linkQuestionnaireData(user.id, user.email, req);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Login a user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Set token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // After successful login, link any questionnaire data
    await linkUserData(req, res, () => {});
    await linkQuestionnaireData(user.id, user.email, req);
    
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
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Logout a user
 */
export const logout = (req, res) => {
  // Clear token cookie
  res.clearCookie('token');
  
  // Destroy session if exists
  if (req.session) {
    req.session.destroy();
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * Refresh JWT token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Check if refresh token exists in database
    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2',
      [decoded.userId, refreshToken]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    
    // Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      accessToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).render('error', { message: 'Verification token is missing' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    
    // Update user email verification status
    await pool.query(
      'UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1',
      [decoded.userId]
    );
    
    res.redirect('/login?verified=true');
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).render('error', { message: 'Invalid or expired verification token' });
  }
};

/**
 * Resend verification email
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Check if user exists and needs verification
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND email_verified = FALSE',
      [email]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if user exists or is already verified
      return res.json({ success: true, message: 'Verification email sent if needed' });
    }
    
    const user = result.rows[0];
    
    // Send verification email (implementation omitted for brevity)
    
    res.json({ success: true, message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Get user data
    const result = await pool.query(
      'SELECT id, username, email, email_verified, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Check if user is authenticated
 */
export const checkAuth = (req, res) => {
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.json({ authenticated: false });
  }
  
  res.json({ authenticated: true, userId });
};

/**
 * Google OAuth authentication
 */
export const googleAuth = (req, res) => {
  // Implementation omitted for brevity
  res.redirect('/auth/google/callback');
};

/**
 * Google OAuth callback
 */
export const googleCallback = async (req, res) => {
  // Implementation omitted for brevity
  res.redirect('/');
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password, anonymousId, questionnaireSubmissionId, questionnaireData } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if email already exists
    const emailCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
        emailExists: true,
        emailNotVerified: !emailCheck.rows[0].email_verified
      });
    }
    
    // Check if username is taken
    const usernameCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create new user with questionnaire data if available
      const insertUserQuery = `
        INSERT INTO users (
          username, 
          email, 
          password,
          verification_token,
          anonymous_id,
          questionnaire_submission_id,
          questionnaire_data,
          data_collected_at,
          created_at, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
        RETURNING id, email, username, anonymous_id
      `;
      
      const userResult = await client.query(insertUserQuery, [
        username.toLowerCase(),
        email.toLowerCase(),
        hashedPassword,
        verificationToken,
        anonymousId || null,
        questionnaireSubmissionId || null,
        questionnaireData ? JSON.stringify(questionnaireData) : null
      ]);
      
      const user = userResult.rows[0];
      
      // Link all questionnaire data using our enhanced functions
      let linkedData = false;
      
      // First try linking by submission ID if provided
      if (questionnaireSubmissionId) {
        const result = await linkQuestionnaireSubmissionById(user.id, questionnaireSubmissionId);
        linkedData = Boolean(result);
      }
      
      // If that didn't work or wasn't provided, try linking by anonymous ID
      if (!linkedData && anonymousId) {
        // Update using transaction for consistency
        const updateBQQuery = `
          UPDATE business_questionnaires
          SET user_id = $1, conversion_status = 'converted', updated_at = NOW()
          WHERE anonymous_id = $2
        `;
        await client.query(updateBQQuery, [user.id, anonymousId]);
        
        // Update other tables that may use anonymous_id
        const updateEmailsQuery = `
          UPDATE customer_emails
          SET user_id = $1, updated_at = NOW()
          WHERE anonymous_id = $2
        `;
        await client.query(updateEmailsQuery, [user.id, anonymousId]);
        
        const updateValuationsQuery = `
          UPDATE valuation_requests
          SET user_id = $1, updated_at = NOW()
          WHERE anonymous_id = $2
        `;
        await client.query(updateValuationsQuery, [user.id, anonymousId]);
        
        // Also update questionnaire_submissions table
        const updateQSQuery = `
          UPDATE questionnaire_submissions
          SET user_id = $1, is_linked = TRUE, status = 'linked', updated_at = NOW()
          WHERE anonymous_id = $2
        `;
        await client.query(updateQSQuery, [user.id, anonymousId]);
        
        // Update business_valuations table
        const updateBVQuery = `
          UPDATE business_valuations
          SET user_id = $1, updated_at = NOW()
          WHERE anonymous_id = $2 OR email = $3
        `;
        await client.query(updateBVQuery, [user.id, anonymousId, email.toLowerCase()]);
        
        console.log(`Associated anonymous ID ${anonymousId} with new user ${user.id}`);
        linkedData = true;
      }
      
      // If still no linking happened, try by email as a last resort
      if (!linkedData) {
        const result = await linkQuestionnaire(user.id, email);
        linkedData = Boolean(result);
      }
      
      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please verify your email to continue.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during signup. Please try again.'
    });
  }
};
