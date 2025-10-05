import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * STRIPE CONNECT WEB ROUTES
 * 
 * These routes serve the UI pages for the Stripe Connect integration
 */

// ==================== DASHBOARD ROUTES ====================

/**
 * Stripe Connect Dashboard - Main management interface
 * GET /stripe-connect/dashboard
 */
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    res.render('stripe-connect-dashboard', {
      title: 'Stripe Connect Dashboard',
      user: req.user,
      layout: false // Don't use default layout for this specialized page
    });
  } catch (error) {
    console.error('Error rendering Stripe Connect dashboard:', error);
    res.status(500).render('error', {
      message: 'Failed to load dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// ==================== ONBOARDING ROUTES ====================

/**
 * Onboarding success callback
 * GET /stripe-connect/onboarding/success
 */
router.get('/onboarding/success', authenticateToken, (req, res) => {
  try {
    const userId = req.query.user_id;
    
    // Verify the user_id matches the authenticated user
    if (userId !== req.user.userId.toString()) {
      return res.status(403).render('error', {
        message: 'Unauthorized access',
        error: { status: 403 }
      });
    }

    res.render('stripe-connect-success', {
      title: 'Account Setup Complete',
      user: req.user,
      message: 'Your payment account has been successfully set up! You can now start accepting payments.',
      layout: false
    });
  } catch (error) {
    console.error('Error handling onboarding success:', error);
    res.status(500).render('error', {
      message: 'Failed to complete onboarding process',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * Onboarding refresh callback (when user needs to complete more requirements)
 * GET /stripe-connect/onboarding/refresh
 */
router.get('/onboarding/refresh', authenticateToken, (req, res) => {
  try {
    const userId = req.query.user_id;
    
    // Verify the user_id matches the authenticated user
    if (userId !== req.user.userId.toString()) {
      return res.status(403).render('error', {
        message: 'Unauthorized access',
        error: { status: 403 }
      });
    }

    // Redirect back to dashboard where they can retry onboarding
    res.redirect('/stripe-connect/dashboard?message=Please complete the account setup process');
  } catch (error) {
    console.error('Error handling onboarding refresh:', error);
    res.status(500).render('error', {
      message: 'Failed to refresh onboarding process',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// ==================== STOREFRONT ROUTES ====================

/**
 * Public storefront for a connected account
 * GET /stripe-connect/storefront/:accountId
 * 
 * NOTE: In production, you should use a custom identifier (like username or business slug)
 * instead of the Stripe account ID in the URL for better UX and security
 */
router.get('/storefront/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;

    // Basic validation of account ID format
    if (!accountId || !accountId.startsWith('acct_')) {
      return res.status(400).render('error', {
        message: 'Invalid store URL',
        error: { status: 400 }
      });
    }

    // Render the storefront page
    // The page will load data via API calls to maintain separation of concerns
    res.render('stripe-connect-storefront', {
      title: 'Professional Storefront',
      accountId: accountId,
      layout: false // Don't use default layout for storefront
    });
  } catch (error) {
    console.error('Error rendering storefront:', error);
    res.status(500).render('error', {
      message: 'Failed to load storefront',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// ==================== PAYMENT SUCCESS ROUTES ====================

/**
 * Payment success page
 * GET /stripe-connect/success
 */
router.get('/success', (req, res) => {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.status(400).render('error', {
        message: 'Invalid payment session',
        error: { status: 400 }
      });
    }

    // Render success page
    res.render('stripe-connect-payment-success', {
      title: 'Payment Successful',
      sessionId: sessionId,
      layout: false
    });
  } catch (error) {
    console.error('Error rendering payment success:', error);
    res.status(500).render('error', {
      message: 'Failed to load payment confirmation',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * Payment cancelled page
 * GET /stripe-connect/cancelled
 */
router.get('/cancelled', (req, res) => {
  try {
    res.render('stripe-connect-payment-cancelled', {
      title: 'Payment Cancelled',
      layout: false
    });
  } catch (error) {
    console.error('Error rendering payment cancelled:', error);
    res.status(500).render('error', {
      message: 'Failed to load cancellation page',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

export default router;