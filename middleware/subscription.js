import pool from '../db.js';

/**
 * Middleware to verify if user has a valid subscription
 * @param {Array} allowedPlans - List of subscription levels that can access the resource
 */
export const requireSubscription = (allowedPlans = ['gold', 'platinum']) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get user's subscription info
      const result = await pool.query(
        `SELECT 
          subscription_type, 
          subscription_end
        FROM users 
        WHERE id = $1`,
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      const subscriptionType = user.subscription_type?.toLowerCase();
      
      // Check if user has any subscription
      if (!subscriptionType) {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: 'This feature requires a paid subscription'
        });
      }
      
      // Check if subscription is in the allowed plans
      if (!allowedPlans.includes(subscriptionType)) {
        return res.status(403).json({
          error: 'Subscription level insufficient',
          message: `This feature requires ${allowedPlans.join(' or ')} plan`
        });
      }
      
      // Check if subscription is expired
      if (user.subscription_end && new Date(user.subscription_end) < new Date()) {
        return res.status(403).json({
          error: 'Subscription expired',
          message: 'Your subscription has expired'
        });
      }
      
      // Add subscription info to request
      req.subscription = {
        type: subscriptionType,
        expiresAt: user.subscription_end
      };
      
      next();
    } catch (error) {
      console.error('Subscription verification error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to check subscription but allow free users with limited access
 */
export const checkSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      req.subscription = { type: 'none' };
      return next();
    }

    // Get user's subscription info
    const result = await pool.query(
      `SELECT 
        subscription_type, 
        subscription_end
      FROM users 
      WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      req.subscription = { type: 'none' };
      return next();
    }

    const user = result.rows[0];
    const subscriptionType = user.subscription_type?.toLowerCase() || 'free';
    
    // Check if subscription is expired
    const isExpired = user.subscription_end && new Date(user.subscription_end) < new Date();
    
    // Add subscription info to request
    req.subscription = {
      type: isExpired ? 'expired' : subscriptionType,
      expiresAt: user.subscription_end,
      isExpired
    };
    
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    req.subscription = { type: 'error', error };
    next();
  }
};
