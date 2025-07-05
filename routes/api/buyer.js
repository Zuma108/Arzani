import express from 'express';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Test endpoint to verify buyer routes are working
 * GET /api/buyer/test
 */
router.get('/test', (req, res) => {
  console.log('🧪 Buyer test endpoint hit at:', new Date().toISOString());
  res.json({ 
    success: true, 
    message: 'Buyer API routes are working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Health check endpoint for buyer API
 * GET /api/buyer/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as current_time');
    
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      dbTime: dbTest.rows[0].current_time
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get user's premium buyer status
 * GET /api/buyer/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Buyer status endpoint hit');
    console.log('   User from token:', req.user);
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    
    if (!req.user || !req.user.userId) {
      console.log('❌ No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = req.user.userId;
    console.log('   Fetching buyer status for user ID:', userId);
    
    // Test database connection first
    const connectionTest = await pool.query('SELECT NOW()');
    console.log('   Database connection test:', connectionTest.rows[0]);
    
    const result = await pool.query(`
      SELECT 
        buyer_plan,
        buyer_plan_start,
        buyer_plan_end,
        early_access_enabled,
        ai_advisor_enabled,
        premium_alerts_enabled,
        due_diligence_reports_used,
        meetings_booked,
        email
      FROM users 
      WHERE id = $1
    `, [userId]);

    console.log('   Database query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('❌ User not found with ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log('   User buyer data:', user);
    const now = new Date();
    
    // Handle cases where buyer fields might not exist (use defaults)
    const buyerPlan = user.buyer_plan || 'free';
    const buyerPlanStart = user.buyer_plan_start || null;
    const buyerPlanEnd = user.buyer_plan_end || null;
    
    // Check if premium plan is active
    const isPremiumActive = buyerPlan === 'premium' && 
      (!buyerPlanEnd || new Date(buyerPlanEnd) > now);

    const response = {
      plan: buyerPlan,
      isPremium: isPremiumActive,
      planStart: buyerPlanStart,
      planEnd: buyerPlanEnd,
      features: {
        earlyAccess: user.early_access_enabled || false,
        aiAdvisor: user.ai_advisor_enabled || false,
        premiumAlerts: user.premium_alerts_enabled || false
      },
      usage: {
        dueDiligenceReportsUsed: user.due_diligence_reports_used || 0,
        meetingsBooked: user.meetings_booked || 0
      }
    };
    
    console.log('   Sending buyer status response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching buyer status:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Database error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Check premium access for a specific business
 * GET /api/buyer/premium-access/:businessId
 */
router.get('/premium-access/:businessId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const businessId = req.params.businessId;

    // Get user's premium status
    const userResult = await pool.query(`
      SELECT buyer_plan, buyer_plan_end, early_access_enabled
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const now = new Date();
    
    // Check if premium plan is active
    const isPremiumActive = user.buyer_plan === 'premium' && 
      (!user.buyer_plan_end || new Date(user.buyer_plan_end) > now);

    // Get business details
    const businessResult = await pool.query(`
      SELECT 
        price,
        is_premium_only,
        is_featured,
        created_at,
        date_listed
      FROM businesses 
      WHERE id = $1
    `, [businessId]);

    if (businessResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const business = businessResult.rows[0];
    
    // Determine if premium access is required
    const isHighValue = business.price && business.price >= 50000;
    const isRecentListing = business.created_at && 
      new Date(business.created_at) > new Date(Date.now() - 72 * 60 * 60 * 1000); // Last 72 hours
    
    const requiresPremium = business.is_premium_only || isHighValue || 
      (isRecentListing && user.early_access_enabled);

    // Log access attempt
    await pool.query(`
      INSERT INTO premium_access_log (user_id, business_id, access_type, access_granted, reason)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      userId,
      businessId,
      requiresPremium ? 'premium_required' : 'public',
      isPremiumActive || !requiresPremium,
      isPremiumActive ? 'Premium user' : requiresPremium ? 'Premium required but user not premium' : 'Public access'
    ]);

    res.json({
      hasAccess: isPremiumActive || !requiresPremium,
      requiresPremium,
      reason: isHighValue ? 'high_value' : 
              isRecentListing ? 'early_access' : 
              business.is_premium_only ? 'premium_only' : 'public',
      userPlan: user.buyer_plan,
      isPremiumActive
    });
  } catch (error) {
    console.error('Error checking premium access:', error);
    res.status(500).json({ error: 'Failed to check premium access' });
  }
});

/**
 * Get buyer alerts
 * GET /api/buyer/alerts
 */
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT 
        id,
        alert_name,
        criteria,
        is_active,
        created_at,
        last_triggered,
        trigger_count
      FROM buyer_alerts 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('Error fetching buyer alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * Create buyer alert
 * POST /api/buyer/alerts
 */
router.post('/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertName, criteria } = req.body;

    if (!alertName || !criteria) {
      return res.status(400).json({ error: 'Alert name and criteria are required' });
    }

    const result = await pool.query(`
      INSERT INTO buyer_alerts (user_id, alert_name, criteria)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, alertName, JSON.stringify(criteria)]);

    res.status(201).json({ alert: result.rows[0] });
  } catch (error) {
    console.error('Error creating buyer alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * Update buyer alert
 * PUT /api/buyer/alerts/:alertId
 */
router.put('/alerts/:alertId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const alertId = req.params.alertId;
    const { alertName, criteria, isActive } = req.body;

    const result = await pool.query(`
      UPDATE buyer_alerts 
      SET 
        alert_name = COALESCE($3, alert_name),
        criteria = COALESCE($4, criteria),
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [alertId, userId, alertName, criteria ? JSON.stringify(criteria) : null, isActive]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ alert: result.rows[0] });
  } catch (error) {
    console.error('Error updating buyer alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

/**
 * Delete buyer alert
 * DELETE /api/buyer/alerts/:alertId
 */
router.delete('/alerts/:alertId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const alertId = req.params.alertId;

    const result = await pool.query(`
      DELETE FROM buyer_alerts 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [alertId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting buyer alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

/**
 * Get saved searches
 * GET /api/buyer/saved-searches
 */
router.get('/saved-searches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT 
        id,
        search_name,
        search_criteria,
        alert_enabled,
        created_at,
        updated_at
      FROM saved_searches 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ savedSearches: result.rows });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

/**
 * Create saved search
 * POST /api/buyer/saved-searches
 */
router.post('/saved-searches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { searchName, searchCriteria, alertEnabled = false } = req.body;

    if (!searchName || !searchCriteria) {
      return res.status(400).json({ error: 'Search name and criteria are required' });
    }

    const result = await pool.query(`
      INSERT INTO saved_searches (user_id, search_name, search_criteria, alert_enabled)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, searchName, JSON.stringify(searchCriteria), alertEnabled]);

    res.status(201).json({ savedSearch: result.rows[0] });
  } catch (error) {
    console.error('Error creating saved search:', error);
    res.status(500).json({ error: 'Failed to create saved search' });
  }
});

/**
 * Get business meetings
 * GET /api/buyer/meetings
 */
router.get('/meetings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(`
      SELECT 
        bm.*,
        b.business_name,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        u.email as seller_email
      FROM business_meetings bm
      JOIN businesses b ON bm.business_id = b.id
      JOIN users u ON bm.seller_id = u.id
      WHERE bm.buyer_id = $1
      ORDER BY bm.scheduled_at ASC
    `, [userId]);

    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

/**
 * Book a meeting with seller
 * POST /api/buyer/meetings
 */
router.post('/meetings', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.userId;
    const { 
      businessId, 
      sellerId, 
      meetingType, 
      scheduledAt, 
      duration = 60,
      notes,
      paymentAmount = 0
    } = req.body;

    if (!businessId || !sellerId || !meetingType || !scheduledAt) {
      return res.status(400).json({ 
        error: 'Business ID, seller ID, meeting type, and scheduled time are required' 
      });
    }

    // If payment is required, create Stripe Payment Intent
    let stripePaymentIntentId = null;
    if (paymentAmount > 0) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentAmount * 100), // Convert to cents
        currency: 'gbp',
        metadata: {
          type: 'meeting_booking',
          buyer_id: buyerId,
          business_id: businessId,
          seller_id: sellerId
        }
      });
      stripePaymentIntentId = paymentIntent.id;
    }

    const result = await pool.query(`
      INSERT INTO business_meetings (
        business_id, 
        buyer_id, 
        seller_id, 
        meeting_type, 
        scheduled_at, 
        duration_minutes, 
        notes,
        payment_amount,
        stripe_payment_intent_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      businessId, 
      buyerId, 
      sellerId, 
      meetingType, 
      scheduledAt, 
      duration, 
      notes,
      paymentAmount,
      stripePaymentIntentId
    ]);

    // Update user's meetings booked count
    await pool.query(`
      UPDATE users 
      SET meetings_booked = meetings_booked + 1 
      WHERE id = $1
    `, [buyerId]);

    res.status(201).json({ 
      meeting: result.rows[0],
      clientSecret: stripePaymentIntentId ? 
        (await stripe.paymentIntents.retrieve(stripePaymentIntentId)).client_secret : null
    });
  } catch (error) {
    console.error('Error booking meeting:', error);
    res.status(500).json({ error: 'Failed to book meeting' });
  }
});

/**
 * Track buyer activity
 * POST /api/buyer/activity
 */
router.post('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activityType, businessId, metadata } = req.body;

    if (!activityType) {
      return res.status(400).json({ error: 'Activity type is required' });
    }

    await pool.query(`
      INSERT INTO buyer_activity (user_id, activity_type, business_id, metadata)
      VALUES ($1, $2, $3, $4)
    `, [userId, activityType, businessId, metadata ? JSON.stringify(metadata) : null]);

    res.json({ message: 'Activity tracked successfully' });
  } catch (error) {
    console.error('Error tracking buyer activity:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

/**
 * Get buyer dashboard stats
 * GET /api/buyer/dashboard-stats
 */
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get various stats in parallel
    const [alertsResult, searchesResult, meetingsResult, activityResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM buyer_alerts WHERE user_id = $1 AND is_active = true', [userId]),
      pool.query('SELECT COUNT(*) as count FROM saved_searches WHERE user_id = $1', [userId]),
      pool.query('SELECT COUNT(*) as count FROM business_meetings WHERE buyer_id = $1 AND scheduled_at > NOW()', [userId]),
      pool.query('SELECT COUNT(*) as count FROM buyer_activity WHERE user_id = $1 AND activity_type = \'view\'', [userId])
    ]);

    res.json({
      activeAlerts: parseInt(alertsResult.rows[0].count),
      savedSearches: parseInt(searchesResult.rows[0].count),
      upcomingMeetings: parseInt(meetingsResult.rows[0].count),
      businessesViewed: parseInt(activityResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * Upgrade to premium buyer plan
 * POST /api/buyer/upgrade-premium
 */
router.post('/upgrade-premium', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { priceId = 'price_premium_buyer_monthly' } = req.body; // Default price ID

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: req.user.email,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/buyer-dashboard?upgrade=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?upgrade=cancelled`,
      metadata: {
        user_id: userId,
        plan_type: 'premium_buyer'
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating premium upgrade session:', error);
    res.status(500).json({ error: 'Failed to create upgrade session' });
  }
});

/**
 * Upgrade user to premium buyer plan
 * POST /api/buyer/upgrade
 */
router.post('/upgrade', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { plan } = req.body;
    
    if (plan !== 'premium') {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    // Check if user is already premium
    const userResult = await pool.query(
      'SELECT buyer_plan, buyer_plan_end FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const now = new Date();
    const isPremiumActive = user.buyer_plan === 'premium' && 
      (!user.buyer_plan_end || new Date(user.buyer_plan_end) > now);
    
    if (isPremiumActive) {
      return res.status(400).json({ error: 'User already has active premium plan' });
    }
    
    // Create Stripe checkout session for premium upgrade
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PREMIUM_BUYER_PRICE_ID || 'price_premium_buyer_monthly',
        quantity: 1,
      }],
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
        upgrade_type: 'premium_buyer'
      },
      success_url: `${process.env.FRONTEND_URL}/buyer-dashboard?upgrade=success`,
      cancel_url: `${process.env.FRONTEND_URL}/profile?upgrade=cancelled`,
    });
    
    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating upgrade session:', error);
    res.status(500).json({ error: 'Failed to create upgrade session' });
  }
});

/**
 * Create billing portal session
 * POST /api/buyer/billing-portal
 */
router.post('/billing-portal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's Stripe customer ID
    const userResult = await pool.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;
    
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId.toString()
        }
      });
      
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, userId]
      );
    }
    
    // Create billing portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/profile`,
    });
    
    res.json({
      success: true,
      portalUrl: portalSession.url
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

export default router;
