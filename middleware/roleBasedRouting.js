import pool from '../db.js';

export const detectUserRole = async (req, res, next) => {
  try {
    let userRole = null;
    
    // 1. Check authenticated user's stored role
    if (req.user?.userId) {
      const userQuery = await pool.query(
        'SELECT user_role, role_selected_at FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      if (userQuery.rows[0]?.user_role) {
        userRole = userQuery.rows[0].user_role;
      }
    }
    
    // 2. Check session-stored role preference
    if (!userRole && req.session?.userRole) {
      userRole = req.session.userRole;
    }
    
    // 3. Analyze user behavior patterns
    if (!userRole && req.user?.userId) {
      const behaviorQuery = await pool.query(`
        SELECT 
          COUNT(CASE WHEN action_type = 'business_view' THEN 1 END) as views,
          COUNT(CASE WHEN action_type = 'contact_seller' THEN 1 END) as contacts,
          COUNT(CASE WHEN action_type = 'save_business' THEN 1 END) as saves
        FROM business_history 
        WHERE user_id = $1
      `, [req.user.userId]);
      
      const behavior = behaviorQuery.rows[0];
      if (behavior.views > 0 || behavior.contacts > 0 || behavior.saves > 0) {
        userRole = 'buyer';
      }
    }
    
    // 4. Check URL parameters for explicit intent
    if (!userRole) {
      if (req.query.intent === 'buy' || req.query.type === 'buyer') {
        userRole = 'buyer';
      } else if (req.query.intent === 'sell' || req.query.type === 'seller') {
        userRole = 'seller';
      }
    }
    
    // 5. Check referrer for intent signals
    if (!userRole && req.get('Referrer')) {
      const referrer = req.get('Referrer').toLowerCase();
      if (referrer.includes('buy') || referrer.includes('acquire') || referrer.includes('invest')) {
        userRole = 'buyer';
      } else if (referrer.includes('sell') || referrer.includes('exit') || referrer.includes('valuation')) {
        userRole = 'seller';
      }
    }
    
    req.detectedRole = userRole;
    next();
  } catch (error) {
    console.error('Role detection error:', error);
    next();
  }
};

export const routeByRole = (req, res, next) => {
  const variant = req.abTestVariant;
  const detectedRole = req.detectedRole;
  
  // Store original variant for analytics
  req.originalVariant = variant;
  
  // Smart routing logic
  if (detectedRole === 'buyer' && variant === 'seller_first') {
    // Override A/B test for known buyers
    req.abTestVariant = 'buyer_first';
    req.wasOverridden = true;
    console.log('Overriding A/B test: Known buyer routed to buyer-landing');
  } else if (detectedRole === 'seller' && variant === 'buyer_first') {
    // Override A/B test for known sellers
    req.abTestVariant = 'seller_first';
    req.wasOverridden = true;
    console.log('Overriding A/B test: Known seller routed to marketplace-landing');
  } else {
    req.wasOverridden = false;
  }
  
  next();
};
