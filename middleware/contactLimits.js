/**
 * Contact Limits Middleware - Token-gated contact system
 * Enforces freemium limitations and token consumption for business contacts
 */

import TokenService from '../services/tokenService.js';
import pool from '../db.js';

/**
 * Middleware to check and enforce contact limitations
 * Determines if user needs to pay tokens or can use free contact
 */
export const checkContactLimits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = parseInt(req.params.businessId || req.body.businessId);

    if (!userId || !businessId) {
      return res.status(400).json({
        error: 'User ID and Business ID are required',
        code: 'MISSING_REQUIRED_IDS'
      });
    }

    // Get user subscription info
    const userQuery = `
      SELECT 
        buyer_plan, 
        freemium_tier,
        free_contacts_used,
        free_contacts_reset_date,
        token_system_enabled
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    // If token system is disabled for this user, allow free contact
    if (!user.token_system_enabled) {
      req.contactType = 'free';
      req.tokensRequired = 0;
      return next();
    }

    // Premium users get unlimited contacts
    if (user.buyer_plan === 'premium') {
      req.contactType = 'premium';
      req.tokensRequired = 0;
      return next();
    }

    // Check contact history with this business
    const contactHistoryQuery = `
      SELECT 
        contact_count,
        first_contact_at,
        last_contact_at,
        tokens_spent,
        is_free_contact,
        monthly_free_used,
        last_free_reset
      FROM contact_limitations 
      WHERE user_id = $1 AND business_id = $2
    `;
    
    const contactResult = await pool.query(contactHistoryQuery, [userId, businessId]);
    const hasContactedBefore = contactResult.rows.length > 0;
    const contactHistory = hasContactedBefore ? contactResult.rows[0] : null;

    // Check if user can make free contact this month
    const canMakeFreeContact = await TokenService.canMakeFreeContact(userId, businessId);

    // Determine contact type and token requirements
    let tokensRequired = 0;
    let contactType = 'free';

    if (canMakeFreeContact && !hasContactedBefore) {
      // First free contact this month
      contactType = 'free';
      tokensRequired = 0;
    } else if (hasContactedBefore) {
      // Additional contact with same business - requires 1 token
      contactType = 'token';
      tokensRequired = 1;
    } else {
      // First contact with new business but already used free contact - requires 2 tokens
      contactType = 'token';
      tokensRequired = 2;
    }

    // If tokens are required, check user balance
    if (tokensRequired > 0) {
      const userBalance = await TokenService.getUserBalance(userId);
      
      if (userBalance < tokensRequired) {
        return res.status(402).json({
          error: 'Insufficient tokens for this contact',
          code: 'INSUFFICIENT_TOKENS',
          details: {
            tokensRequired,
            currentBalance: userBalance,
            tokensNeeded: tokensRequired - userBalance,
            contactType: 'token',
            businessId,
            isFirstContact: !hasContactedBefore
          }
        });
      }
    }

    // Add contact info to request for downstream processing
    req.contactInfo = {
      contactType,
      tokensRequired,
      canMakeFreeContact,
      hasContactedBefore,
      contactHistory,
      user: {
        id: userId,
        plan: user.buyer_plan,
        tier: user.freemium_tier
      }
    };

    next();

  } catch (error) {
    console.error('Contact limit check error:', error);
    res.status(500).json({
      error: 'Failed to check contact limitations',
      code: 'CONTACT_LIMIT_CHECK_ERROR',
      details: error.message
    });
  }
};

/**
 * Middleware to consume tokens after successful contact creation
 * Should be called after the contact/inquiry has been successfully created
 */
export const consumeContactTokens = async (req, res, next) => {
  try {
    const { contactInfo } = req;
    const { tokensRequired, contactType } = contactInfo;
    const userId = req.user.id;
    const businessId = parseInt(req.params.businessId || req.body.businessId);

    // If no tokens required, skip consumption
    if (tokensRequired === 0) {
      return next();
    }

    // Consume tokens
    const tokenResult = await TokenService.consumeTokens(
      userId,
      tokensRequired,
      'contact_seller',
      {
        businessId,
        contactType,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referenceId: req.inquiryId // Should be set by the contact creation handler
      }
    );

    // Record contact attempt
    const contactRecord = await TokenService.recordContactAttempt(
      userId,
      businessId,
      tokensRequired,
      contactType === 'free'
    );

    // Add token consumption info to response
    req.tokenConsumption = {
      tokensConsumed: tokensRequired,
      remainingBalance: tokenResult.remainingBalance,
      transactionId: tokenResult.transactionId,
      contactRecord
    };

    next();

  } catch (error) {
    console.error('Token consumption error:', error);
    
    // Don't fail the entire request if token consumption fails
    // Log the error and continue, but mark the issue
    req.tokenConsumptionError = {
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    next();
  }
};

/**
 * Middleware for checking seller boost features
 * Determines if user can boost their listings
 */
export const checkBoostEligibility = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { boostLevel = 1, duration = 7 } = req.body;

    // Token costs for different boost levels
    const boostCosts = {
      1: 5,  // Standard boost - 5 tokens
      2: 10, // Premium boost - 10 tokens  
      3: 20  // Featured boost - 20 tokens
    };

    const tokensRequired = boostCosts[boostLevel] || 5;
    const userBalance = await TokenService.getUserBalance(userId);

    if (userBalance < tokensRequired) {
      return res.status(402).json({
        error: 'Insufficient tokens for listing boost',
        code: 'INSUFFICIENT_TOKENS_BOOST',
        details: {
          tokensRequired,
          currentBalance: userBalance,
          boostLevel,
          duration
        }
      });
    }

    req.boostInfo = {
      tokensRequired,
      boostLevel,
      duration,
      userBalance
    };

    next();

  } catch (error) {
    console.error('Boost eligibility check error:', error);
    res.status(500).json({
      error: 'Failed to check boost eligibility',
      code: 'BOOST_ELIGIBILITY_ERROR'
    });
  }
};

/**
 * Middleware for checking premium analytics access
 * Determines if user can access premium seller analytics
 */
export const checkAnalyticsAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = parseInt(req.params.businessId);

    // Check if user owns the business
    const businessQuery = `
      SELECT user_id, premium_analytics_enabled, premium_analytics_until
      FROM businesses 
      WHERE id = $1
    `;
    
    const businessResult = await pool.query(businessQuery, [businessId]);
    
    if (businessResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Business not found',
        code: 'BUSINESS_NOT_FOUND'
      });
    }

    const business = businessResult.rows[0];
    
    if (business.user_id !== userId) {
      return res.status(403).json({
        error: 'Not authorized to access this business analytics',
        code: 'UNAUTHORIZED_BUSINESS_ACCESS'
      });
    }

    // Check if premium analytics is already enabled and not expired
    const now = new Date();
    const analyticsUntil = business.premium_analytics_until ? new Date(business.premium_analytics_until) : null;
    
    if (business.premium_analytics_enabled && analyticsUntil && analyticsUntil > now) {
      req.analyticsAccess = {
        hasAccess: true,
        accessType: 'existing',
        expiresAt: analyticsUntil
      };
      return next();
    }

    // Check if user has tokens for premium analytics (3 tokens for 30 days)
    const tokensRequired = 3;
    const userBalance = await TokenService.getUserBalance(userId);

    if (userBalance < tokensRequired) {
      return res.status(402).json({
        error: 'Insufficient tokens for premium analytics',
        code: 'INSUFFICIENT_TOKENS_ANALYTICS',
        details: {
          tokensRequired,
          currentBalance: userBalance,
          accessDuration: '30 days'
        }
      });
    }

    req.analyticsAccess = {
      hasAccess: false,
      tokensRequired,
      accessType: 'purchase_required',
      businessId
    };

    next();

  } catch (error) {
    console.error('Analytics access check error:', error);
    res.status(500).json({
      error: 'Failed to check analytics access',
      code: 'ANALYTICS_ACCESS_ERROR'
    });
  }
};

/**
 * General purpose token requirement checker
 * Can be configured for different actions and token costs
 */
export const requireTokens = (tokenCost, actionType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const userBalance = await TokenService.getUserBalance(userId);

      if (userBalance < tokenCost) {
        return res.status(402).json({
          error: `Insufficient tokens for ${actionType}`,
          code: 'INSUFFICIENT_TOKENS',
          details: {
            tokensRequired: tokenCost,
            currentBalance: userBalance,
            actionType
          }
        });
      }

      req.tokenRequirement = {
        tokensRequired: tokenCost,
        actionType,
        userBalance
      };

      next();

    } catch (error) {
      console.error(`Token requirement check error for ${actionType}:`, error);
      res.status(500).json({
        error: 'Failed to check token requirements',
        code: 'TOKEN_REQUIREMENT_ERROR'
      });
    }
  };
};

/**
 * Feature flag middleware for token system
 * Allows gradual rollout of token features
 */
export const tokenSystemEnabled = async (req, res, next) => {
  try {
    // Check global feature flag
    const globalEnabled = process.env.ENABLE_TOKEN_SYSTEM === 'true';
    
    if (!globalEnabled) {
      req.tokenSystemDisabled = true;
      return next();
    }

    // Check user-specific flag if user is authenticated
    if (req.user && req.user.id) {
      const userQuery = `
        SELECT token_system_enabled 
        FROM users 
        WHERE id = $1
      `;
      
      const result = await pool.query(userQuery, [req.user.id]);
      
      if (result.rows.length > 0 && !result.rows[0].token_system_enabled) {
        req.tokenSystemDisabled = true;
      }
    }

    next();

  } catch (error) {
    console.error('Token system flag check error:', error);
    // Don't fail the request, just disable token system for this user
    req.tokenSystemDisabled = true;
    next();
  }
};

export default {
  checkContactLimits,
  consumeContactTokens,
  checkBoostEligibility,
  checkAnalyticsAccess,
  requireTokens,
  tokenSystemEnabled
};
