/**
 * Token API Routes - RESTful endpoints for freemium token system
 * Handles token purchases, balance queries, and consumption tracking
 */

import express from 'express';
import Stripe from 'stripe';
import { authenticateToken, requireAuth } from '../../middleware/auth.js';
import TokenService from '../../services/tokenService.js';
import rateLimit from 'express-rate-limit';
import pool from '../../db.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Rate limiting for token operations - RELAXED FOR TESTING
const tokenPurchaseLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 purchases per minute (very relaxed for testing)
  message: {
    error: 'Too many token purchases. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60 // 1 minute in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

const tokenOperationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 operations per minute
  message: {
    error: 'Rate limit exceeded for token operations.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
});

/**
 * GET /api/tokens/balance
 * Get user's current token balance
 */
router.get('/balance', requireAuth, tokenOperationLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await TokenService.getUserBalance(userId);
    
    res.json({
      success: true,
      balance,
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Failed to retrieve token balance',
      code: 'BALANCE_RETRIEVAL_ERROR'
    });
  }
});

/**
 * GET /api/tokens/summary
 * Get comprehensive user token summary
 */
router.get('/summary', requireAuth, tokenOperationLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await TokenService.getUserTokenSummary(userId);
    
    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      error: 'Failed to retrieve token summary',
      code: 'SUMMARY_RETRIEVAL_ERROR'
    });
  }
});

/**
 * GET /api/tokens/packages
 * Get available token packages for purchase
 */
router.get('/packages', async (req, res) => {
  try {
    const packages = await TokenService.getTokenPackages(true);
    
    res.json({
      success: true,
      packages,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      error: 'Failed to retrieve token packages',
      code: 'PACKAGES_RETRIEVAL_ERROR'
    });
  }
});

/**
 * POST /api/tokens/purchase
 * Create Stripe checkout session for token purchase
 */
router.post('/purchase', requireAuth, tokenPurchaseLimit, async (req, res) => {
  let packageId, userId; // Declare variables in outer scope for error handling
  
  try {
    userId = req.user.id;
    packageId = req.body.packageId;

    if (!packageId) {
      return res.status(400).json({
        error: 'Package ID is required',
        code: 'MISSING_PACKAGE_ID'
      });
    }

    // Ensure packageId is a valid number
    const numericPackageId = parseInt(packageId);
    if (isNaN(numericPackageId)) {
      return res.status(400).json({
        error: 'Invalid package ID',
        code: 'INVALID_PACKAGE_ID'
      });
    }
    packageId = numericPackageId;

    // Get package details
    const packages = await TokenService.getTokenPackages(true);
    const selectedPackage = packages.find(pkg => pkg.id === packageId);

    if (!selectedPackage) {
      return res.status(404).json({
        error: 'Token package not found',
        code: 'PACKAGE_NOT_FOUND'
      });
    }

    // Debug: Log the selected package to see what properties are available (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Selected package for purchase:', JSON.stringify(selectedPackage, null, 2));
    }

    // Ensure all required properties exist with fallbacks
    const safePackage = {
      ...selectedPackage,
      token_amount: selectedPackage.token_amount || 0,
      bonus_tokens: selectedPackage.bonus_tokens || 0,
      total_tokens: selectedPackage.total_tokens || (selectedPackage.token_amount + selectedPackage.bonus_tokens) || 0,
      name: selectedPackage.name || 'Token Package',
      description: selectedPackage.description || `${selectedPackage.total_tokens || 0} tokens`,
      price_gbp: selectedPackage.price_gbp || 0
    };

    // Get frontend URL with fallback for development
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Using frontend URL:', frontendUrl);
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: safePackage.name,
            description: safePackage.description,
            images: [], // Add token system branding images if available
          },
          unit_amount: safePackage.price_gbp,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/tokens/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/tokens/cancelled`,
      client_reference_id: String(userId || 0),
      metadata: {
        package_id: String(packageId || 0),
        token_amount: String(safePackage.token_amount || 0),
        bonus_tokens: String(safePackage.bonus_tokens || 0),
        package_type: (safePackage.name || 'unknown').toLowerCase().replace(/\s+/g, '_'),
        user_id: String(userId || 0),
        total_tokens: String(safePackage.total_tokens || 0)
      },
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      package: {
        name: safePackage.name,
        tokens: safePackage.total_tokens,
        price: safePackage.price_gbp_formatted || (safePackage.price_gbp / 100).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Token purchase error:', error);
    console.error('Error stack:', error.stack);
    console.error('Package ID received:', packageId || 'undefined');
    console.error('User ID:', userId || 'undefined');
    
    res.status(500).json({
      error: 'Failed to create purchase session',
      code: 'PURCHASE_SESSION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/tokens/consume
 * Manually consume tokens (for admin or special operations)
 */
router.post('/consume', requireAuth, tokenOperationLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, actionType, metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Valid token amount is required',
        code: 'INVALID_AMOUNT'
      });
    }

    if (!actionType) {
      return res.status(400).json({
        error: 'Action type is required',
        code: 'MISSING_ACTION_TYPE'
      });
    }

    // Add request context to metadata
    const enrichedMetadata = {
      ...metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id || Date.now().toString()
    };

    const result = await TokenService.consumeTokens(
      userId,
      amount,
      actionType,
      enrichedMetadata
    );

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Token consumption error:', error);
    
    if (error.message.includes('Insufficient token balance')) {
      return res.status(402).json({
        error: error.message,
        code: 'INSUFFICIENT_BALANCE',
        currentBalance: await TokenService.getUserBalance(req.user.id)
      });
    }

    res.status(500).json({
      error: 'Failed to consume tokens',
      code: 'CONSUMPTION_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/tokens/transactions
 * Get user's token transaction history with pagination
 */
router.get('/transactions', requireAuth, tokenOperationLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      limit = 20,
      offset = 0,
      type,
      action,
      startDate,
      endDate
    } = req.query;

    // Validate and sanitize pagination parameters
    const parsedLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 per request
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    const options = {
      limit: parsedLimit,
      offset: parsedOffset,
      transactionType: type || null,
      actionType: action || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    const result = await TokenService.getUserTransactions(userId, options);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to retrieve transaction history',
      code: 'TRANSACTIONS_RETRIEVAL_ERROR'
    });
  }
});

/**
 * GET /api/tokens/contact-requirements/:businessId
 * Check token requirements for contacting a specific business
 */
router.get('/contact-requirements/:businessId', requireAuth, tokenOperationLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const businessId = parseInt(req.params.businessId);

    if (!businessId || isNaN(businessId)) {
      return res.status(400).json({
        error: 'Valid business ID is required',
        code: 'INVALID_BUSINESS_ID'
      });
    }

    // Check if user can make free contact
    const canMakeFreeContact = await TokenService.canMakeFreeContact(userId, businessId);
    
    // Get current user balance
    const currentBalance = await TokenService.getUserBalance(userId);

    // Determine token requirements
    let tokensRequired = 0;
    let contactType = 'free';
    let canContact = true;

    if (!canMakeFreeContact) {
      // Check if this is a first contact (2 tokens) or additional contact (1 token)
      // This logic could be enhanced based on your specific business rules
      tokensRequired = 2; // Assume first contact for now
      contactType = 'token';
      canContact = currentBalance >= tokensRequired;
    }

    res.json({
      success: true,
      requirements: {
        tokensRequired,
        contactType,
        canContact,
        currentBalance,
        canMakeFreeContact,
        businessId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Contact requirements error:', error);
    res.status(500).json({
      error: 'Failed to check contact requirements',
      code: 'CONTACT_REQUIREMENTS_ERROR'
    });
  }
});

/**
 * POST /api/tokens/initialize
 * Initialize user token record if it doesn't exist
 */
router.post('/initialize', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user token record exists
    const existingRecord = await pool.query(
      'SELECT id, token_balance FROM user_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (existingRecord.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User token record already exists',
        balance: existingRecord.rows[0].token_balance
      });
    }
    
    // Create new user token record
    const newRecord = await pool.query(
      `INSERT INTO user_tokens (user_id, token_balance, tokens_purchased, tokens_consumed, lifetime_purchased)
       VALUES ($1, 0, 0, 0, 0)
       RETURNING id, token_balance`,
      [userId]
    );
    
    res.json({
      success: true,
      message: 'User token record initialized',
      balance: newRecord.rows[0].token_balance,
      recordId: newRecord.rows[0].id
    });
    
  } catch (error) {
    console.error('Token initialization error:', error);
    res.status(500).json({
      error: 'Failed to initialize user token record',
      code: 'INITIALIZATION_ERROR'
    });
  }
});

/**
 * POST /api/tokens/verify-purchase
 * Verify Stripe checkout session and update tokens
 */
router.post('/verify-purchase', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required',
        code: 'MISSING_SESSION_ID'
      });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        error: 'Payment not completed',
        code: 'PAYMENT_NOT_COMPLETED',
        paymentStatus: session.payment_status
      });
    }

    if (session.client_reference_id !== userId.toString()) {
      return res.status(403).json({
        error: 'Session does not belong to this user',
        code: 'SESSION_MISMATCH'
      });
    }

    // Check if tokens were already processed for this session
    const existingTransaction = await pool.query(
      'SELECT id FROM token_transactions WHERE stripe_payment_intent_id = $1',
      [session.payment_intent]
    );

    if (existingTransaction.rows.length > 0) {
      return res.json({
        success: true,
        alreadyProcessed: true,
        message: 'Tokens already added for this purchase'
      });
    }

    // Process the token addition
    const {
      package_id: packageId,
      token_amount,
      bonus_tokens
    } = session.metadata;

    const totalTokens = parseInt(token_amount) + parseInt(bonus_tokens || 0);
    
    const result = await TokenService.addTokens(
      userId,
      totalTokens,
      'purchase',
      {
        stripePaymentIntentId: session.payment_intent,
        packageId: parseInt(packageId),
        sessionId,
        amountPaid: session.amount_total,
        bonusTokens: parseInt(bonus_tokens || 0),
        baseTokens: parseInt(token_amount)
      }
    );

    res.json({
      success: true,
      tokensAdded: totalTokens,
      newBalance: result.newBalance,
      purchaseDetails: {
        baseTokens: parseInt(token_amount),
        bonusTokens: parseInt(bonus_tokens || 0),
        totalTokens,
        amountPaid: (session.amount_total / 100).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Purchase verification error:', error);
    res.status(500).json({
      error: 'Failed to verify purchase',
      code: 'PURCHASE_VERIFICATION_ERROR',
      details: error.message
    });
  }
});

/**
 * GET /api/tokens/analytics (Admin only)
 * Get token system analytics and metrics
 */
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // This would include comprehensive analytics queries
    // For now, return basic structure
    res.json({
      success: true,
      analytics: {
        totalUsers: 0,
        totalTokensSold: 0,
        totalRevenue: 0,
        conversionRate: 0
      },
      message: 'Analytics endpoint - implementation in progress'
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analytics',
      code: 'ANALYTICS_ERROR'
    });
  }
});

/**
 * Add tokens to a user's account
 * @param {number} userId - The user ID
 * @param {number} tokenAmount - Number of tokens to add
 * @param {object} metadata - Additional metadata (source, package_id, etc.)
 * @returns {Promise<object>} - Result with new balance
 */
export async function addTokensToUser(userId, tokenAmount, metadata = {}) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current balance
    const currentBalanceResult = await client.query(
      'SELECT token_balance FROM users WHERE id = $1',
      [userId]
    );
    
    if (currentBalanceResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const currentBalance = currentBalanceResult.rows[0].token_balance || 0;
    const newBalance = currentBalance + tokenAmount;
    
    // Update user's token balance
    await client.query(
      'UPDATE users SET token_balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, userId]
    );
    
    // Log the transaction using correct table structure
    await client.query(
      `INSERT INTO token_transactions 
       (user_id, tokens_amount, transaction_type, stripe_payment_intent_id, metadata, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        userId,
        tokenAmount,
        'purchase',
        metadata.stripePaymentIntentId || null,
        JSON.stringify(metadata)
      ]
    );
    
    // Update user_tokens table if it exists
    const userTokensResult = await client.query(
      'SELECT id FROM user_tokens WHERE user_id = $1',
      [userId]
    );
    
    if (userTokensResult.rows.length > 0) {
      // Update existing record
      await client.query(
        `UPDATE user_tokens 
         SET token_balance = token_balance + $1, 
             tokens_purchased = tokens_purchased + $1,
             lifetime_purchased = lifetime_purchased + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [tokenAmount, userId]
      );
    } else {
      // Create new record
      await client.query(
        `INSERT INTO user_tokens (user_id, token_balance, tokens_purchased, lifetime_purchased)
         VALUES ($1, $2, $2, $2)`,
        [userId, tokenAmount]
      );
    }
    
    await client.query('COMMIT');
    
    console.log(`Added ${tokenAmount} tokens to user ${userId}. New balance: ${newBalance}`);
    
    return {
      success: true,
      newBalance,
      previousBalance: currentBalance,
      tokensAdded: tokenAmount,
      metadata
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding tokens to user:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default router;
