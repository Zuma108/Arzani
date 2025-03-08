import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

// Price IDs for subscription plans
const SUBSCRIPTION_PRICES = {
  gold: process.env.STRIPE_PRICE_GOLD || 'price_gold',
  platinum: process.env.STRIPE_PRICE_PLATINUM || 'price_platinum'
};

// Create a checkout session
router.post('/create-subscription', async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId || !['gold', 'platinum'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Get authenticated user from token
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Extract and verify token
    const token = authHeader.split(' ')[1];
    let userId;
    try {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Find user in database
    const userQuery = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { email } = userQuery.rows[0];
    
    // Create or get customer
    let customer;
    const customerQuery = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
    
    if (customerQuery.rows[0]?.stripe_customer_id) {
      customer = await stripe.customers.retrieve(customerQuery.rows[0].stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: {
          userId: userId
        }
      });
      
      // Save customer ID to user record
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userId]
      );
    }
    
    // Determine price based on plan
    const priceId = SUBSCRIPTION_PRICES[planId];
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: priceId
        }
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
        planId: planId
      }
    });
    
    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
    
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Apply discount code
router.post('/apply-discount', async (req, res) => {
  try {
    const { code, subscriptionId } = req.body;
    
    if (!code || !subscriptionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Verify the discount code exists
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve(code.toUpperCase());
    } catch (err) {
      return res.status(404).json({ error: 'Invalid discount code' });
    }
    
    // Apply the coupon to the subscription
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      coupon: coupon.id
    });
    
    // Calculate the discounted total
    const total = subscription.items.data[0].price.unit_amount - 
                  (subscription.items.data[0].price.unit_amount * (coupon.percent_off / 100));
    
    res.json({ 
      success: true, 
      discount: coupon.percent_off,
      total: total
    });
    
  } catch (error) {
    console.error('Discount error:', error);
    res.status(500).json({ error: 'Failed to apply discount' });
  }
});

// Validate email
router.post('/validate-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.json({ error: { message: 'Email is required' } });
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ error: { message: 'Invalid email address' } });
    }
    
    // Check if email is already in use
    const userQuery = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    // If this is a login attempt with existing email, just validate format
    if (req.body.loginAttempt) {
      return res.json({ success: true });
    }
    
    // For signup, check if email exists
    if (userQuery.rows.length > 0) {
      return res.json({ error: { message: 'Email is already in use' } });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Email validation error:', error);
    res.status(500).json({ error: { message: 'Failed to validate email' } });
  }
});

// Handle Stripe webhook
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      try {
        // Get subscription
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata.userId;
        const planId = subscription.metadata.planId;
        
        if (userId && planId) {
          // Update user subscription in database
          const currentDate = new Date();
          const nextBillingDate = new Date(
            subscription.current_period_end * 1000
          );
          
          await pool.query(
            `UPDATE users 
             SET 
               subscription_type = $1, 
               subscription_start = $2,
               subscription_end = $3,
               subscription_id = $4,
               updated_at = NOW()
             WHERE id = $5`,
            [planId, currentDate, nextBillingDate, subscription.id, userId]
          );
          
          console.log(`User ${userId} subscription updated to ${planId}`);
        }
      } catch (error) {
        console.error('Error processing invoice payment:', error);
      }
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      try {
        // Handle subscription updates
        const userId = updatedSubscription.metadata.userId;
        
        if (userId) {
          const nextBillingDate = new Date(
            updatedSubscription.current_period_end * 1000
          );
          
          await pool.query(
            `UPDATE users
             SET 
               subscription_end = $1,
               updated_at = NOW()
             WHERE id = $2`,
            [nextBillingDate, userId]
          );
        }
      } catch (error) {
        console.error('Error processing subscription update:', error);
      }
      break;
      
    case 'customer.subscription.deleted':
      const cancelledSubscription = event.data.object;
      try {
        // Handle subscription cancellation
        const userId = cancelledSubscription.metadata.userId;
        
        if (userId) {
          await pool.query(
            `UPDATE users
             SET 
               subscription_type = NULL,
               subscription_id = NULL,
               updated_at = NOW()
             WHERE id = $1`,
            [userId]
          );
          
          console.log(`User ${userId} subscription cancelled`);
        }
      } catch (error) {
        console.error('Error processing subscription cancellation:', error);
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.send({ received: true });
});

// Get subscription details for user
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get subscription information from database
    const userQuery = await pool.query(
      `SELECT 
        subscription_type, 
        subscription_start, 
        subscription_end, 
        subscription_id 
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const subscriptionData = userQuery.rows[0];
    
    // If user has a Stripe subscription ID, fetch additional details
    if (subscriptionData.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionData.subscription_id);
        
        res.json({
          status: subscription.status,
          plan: subscriptionData.subscription_type,
          currentPeriodEnd: subscriptionData.subscription_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          priceId: subscription.items.data[0].price.id,
          price: subscription.items.data[0].price.unit_amount / 100,
          currency: subscription.items.data[0].price.currency
        });
      } catch (error) {
        // Fallback to basic info if Stripe retrieval fails
        console.error('Error fetching subscription from Stripe:', error);
        res.json({
          plan: subscriptionData.subscription_type,
          currentPeriodEnd: subscriptionData.subscription_end
        });
      }
    } else {
      // User has no subscription
      res.json({
        plan: 'free',
        status: 'none'
      });
    }
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's subscription ID
    const userQuery = await pool.query(
      'SELECT subscription_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0 || !userQuery.rows[0].subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const subscriptionId = userQuery.rows[0].subscription_id;
    
    // Cancel subscription in Stripe (at period end)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    
    res.json({ success: true, message: 'Subscription will be cancelled at the end of the billing period' });
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
