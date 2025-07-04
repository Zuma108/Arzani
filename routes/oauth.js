/**
 * OAuth Authentication Routes
 * Handles Google and Microsoft OAuth flows
 */

import express from 'express';
import oauthService from '../services/oauthService.js';

const router = express.Router();

// Handle preflight requests for all OAuth routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
  res.status(200).end();
});

/**
 * Google OAuth Sign-In with Google (ID Token flow)
 * This is for the modern "Sign in with Google" button
 */
router.post('/google', async (req, res) => {
  console.log('Google OAuth POST endpoint hit');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  // Set CORS headers explicitly for this endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Content-Type', 'application/json');
  
  try {
    const { credential, returnTo } = req.body;

    if (!credential) {
      console.log('Missing Google credential in request');
      return res.status(400).json({
        success: false,
        message: 'Missing Google credential'
      });
    }

    console.log('Attempting to verify Google ID token');
    
    // Verify the Google ID token
    const result = await oauthService.verifyGoogleIdToken(credential);
    
    console.log('Google ID token verification result:', result);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: 'Google authentication failed'
      });
    }

    console.log('Processing OAuth user for:', result.user.email);

    // Process the user
    const authResult = await oauthService.processOAuthUser(
      result.user,
      'google'
    );

    console.log('OAuth user processing result:', authResult.success ? 'Success' : 'Failed');

    if (!authResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process user authentication'
      });
    }

    // Set session
    req.session.userId = authResult.user.id;
    await new Promise(resolve => req.session.save(resolve));

    // Set secure cookies
    res.cookie('token', authResult.token, {
      httpOnly: false, // Allow JS access for client-side use
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    console.log('Sending successful OAuth response');

    res.json({
      success: true,
      token: authResult.token,
      user: authResult.user,
      redirectTo: returnTo || '/marketplace2'
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Google OAuth traditional flow (authorization code)
 */
router.get('/google', (req, res) => {
  try {
    const state = oauthService.generateState();
    const returnTo = req.query.returnTo || '/marketplace2';
    
    // Store state and returnTo in session
    req.session.oauthState = state;
    req.session.oauthReturnTo = returnTo;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/login?error=session_error');
      }
      
      const authUrl = oauthService.getGoogleAuthUrl(state);
      res.redirect(authUrl);
    });
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    res.redirect('/login?error=oauth_error');
  }
});

/**
 * Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect('/login?error=no_authorization_code');
    }

    // Verify state parameter
    if (!oauthService.verifyState(req.session.oauthState, state)) {
      return res.redirect('/login?error=invalid_state');
    }

    // Exchange code for tokens and user info
    const result = await oauthService.exchangeGoogleCode(code);
    
    if (!result.success) {
      return res.redirect(`/login?error=${encodeURIComponent(result.error)}`);
    }

    // Process the user
    const authResult = await oauthService.processOAuthUser(
      result.user,
      'google',
      result.tokens
    );

    if (!authResult.success) {
      return res.redirect('/login?error=user_processing_failed');
    }

    // Set session
    req.session.userId = authResult.user.id;
    delete req.session.oauthState; // Clean up
    
    // Set secure cookies
    res.cookie('token', authResult.token, {
      httpOnly: false,
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Redirect to return URL
    const returnTo = req.session.oauthReturnTo || '/marketplace2';
    delete req.session.oauthReturnTo;
    
    await new Promise(resolve => req.session.save(resolve));
    res.redirect(returnTo);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect('/login?error=callback_error');
  }
});

/**
 * Microsoft OAuth flow
 */
router.get('/microsoft', (req, res) => {
  try {
    const state = oauthService.generateState();
    const returnTo = req.query.returnTo || '/marketplace2';
    
    // Store state and returnTo in session
    req.session.oauthState = state;
    req.session.oauthReturnTo = returnTo;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/login?error=session_error');
      }
      
      const authUrl = oauthService.getMicrosoftAuthUrl(state);
      res.redirect(authUrl);
    });
  } catch (error) {
    console.error('Microsoft OAuth redirect error:', error);
    res.redirect('/login?error=oauth_error');
  }
});

/**
 * Microsoft OAuth callback
 */
router.get('/microsoft/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const errorMsg = error_description || error;
      return res.redirect(`/login?error=${encodeURIComponent(errorMsg)}`);
    }

    if (!code) {
      return res.redirect('/login?error=no_authorization_code');
    }

    // Verify state parameter
    if (!oauthService.verifyState(req.session.oauthState, state)) {
      return res.redirect('/login?error=invalid_state');
    }

    // Exchange code for tokens and user info
    const result = await oauthService.exchangeMicrosoftCode(code);
    
    if (!result.success) {
      return res.redirect(`/login?error=${encodeURIComponent(result.error)}`);
    }

    // Process the user
    const authResult = await oauthService.processOAuthUser(
      result.user,
      'microsoft',
      result.tokens
    );

    if (!authResult.success) {
      return res.redirect('/login?error=user_processing_failed');
    }

    // Set session
    req.session.userId = authResult.user.id;
    delete req.session.oauthState; // Clean up
    
    // Set secure cookies
    res.cookie('token', authResult.token, {
      httpOnly: false,
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.cookie('refreshToken', authResult.refreshToken, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    // Redirect to return URL
    const returnTo = req.session.oauthReturnTo || '/marketplace2';
    delete req.session.oauthReturnTo;
    
    await new Promise(resolve => req.session.save(resolve));
    res.redirect(returnTo);

  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    res.redirect('/login?error=callback_error');
  }
});

export default router;
