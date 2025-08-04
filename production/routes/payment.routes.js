import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Ensure we're using test keys in development
const stripeSecretKey = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY 
  : process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

// Constants for plan details
const PLAN_DETAILS = {
  gold: {
    name: 'Gold',
    price: 39,
    stripePriceId: process.env.STRIPE_PRICE_GOLD
  },
  platinum: {
    name: 'Platinum',
    price: 50,
    stripePriceId: process.env.STRIPE_PRICE_PLATINUM
  }
};

// Create PaymentIntent for checkout
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const prices = {
      gold: { 
        price: process.env.STRIPE_GOLD_PRICE_ID,
        product: process.env.STRIPE_GOLD_PRODUCT_ID,
        amount: 3900
      },
      platinum: { 
        price: process.env.STRIPE_PLATINUM_PRICE_ID,
        product: process.env.STRIPE_PLATINUM_PRODUCT_ID,
        amount: 5000
      }
    };

    if (!prices[plan]) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // First check if customer exists
    let customer;
    if (req.user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      });
      // Save customer ID to database
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, req.user.id]
      );
    }

    // Create subscription session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customer.id,
      line_items: [{
        price: prices[plan].price,
        quantity: 1,
      }],
      success_url: `${process.env.SERVER_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SERVER_URL}/payment/cancel`,
      metadata: {
        userId: req.user.id,
        plan: plan
      },
      subscription_data: {
        metadata: {
          userId: req.user.id,
          plan: plan
        }
      }
    });

    res.json({ 
      clientSecret: session.client_secret,
      customerId: customer.id 
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Webhook handler with proper validation
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
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleSuccessfulPayment(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleFailedPayment(event.data.object);
        break;
    }

    res.json({received: true});
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Send 200 to acknowledge receipt but log the error
    res.json({received: true, error: err.message});
  }
});

// Success route - redirect from Stripe checkout
router.get('/success', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.query;
    const userId = req.user.userId;
    
    if (!session_id) {
      return res.redirect('/payment/success-generic');
    }
    
    // Get session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // Verify the session belongs to this user
    if (session.metadata?.userId && session.metadata.userId !== userId.toString()) {
      console.log('Session user ID mismatch:', {
        sessionUserId: session.metadata.userId,
        requestUserId: userId
      });
      return res.status(403).redirect('/payment/error');
    }
    
    // Get user subscription data
    const userQuery = await pool.query(
      `SELECT 
        subscription_type, 
        subscription_end 
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).redirect('/payment/error');
    }
    
    const { subscription_type, subscription_end } = userQuery.rows[0];
    
    // Format plan name
    let planName = 'Free Plan';
    if (subscription_type === 'gold') {
      planName = 'Gold Plan';
    } else if (subscription_type === 'platinum') {
      planName = 'Platinum Plan';
    }
    
    // Format next billing date
    const nextBillingDate = subscription_end 
      ? new Date(subscription_end).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'N/A';
    
    // Render success page with subscription details
    res.render('payment/success', {
      planName,
      nextBillingDate,
      sessionId: session_id
    });
  } catch (error) {
    console.error('Payment success error:', error);
    res.redirect('/payment/success-generic');
  }
});

// Generic success route (when session_id is missing)
router.get('/success-generic', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user subscription data
    const userQuery = await pool.query(
      `SELECT 
        subscription_type, 
        subscription_end 
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).redirect('/payment/error');
    }
    
    const { subscription_type, subscription_end } = userQuery.rows[0];
    
    // Format plan name
    let planName = 'Free Plan';
    if (subscription_type === 'gold') {
      planName = 'Gold Plan';
    } else if (subscription_type === 'platinum') {
      planName = 'Platinum Plan';
    }
    
    // Format next billing date
    const nextBillingDate = subscription_end 
      ? new Date(subscription_end).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'N/A';
    
    // Render success page with subscription details
    res.render('payment/success', {
      planName,
      nextBillingDate,
      sessionId: null
    });
  } catch (error) {
    console.error('Generic success error:', error);
    res.status(500).render('error', { message: 'Failed to load subscription details' });
  }
});

// Cancel route - redirect from Stripe checkout
router.get('/cancel', (req, res) => {
  res.render('payment/cancel');
});

// Error route
router.get('/error', (req, res) => {
  res.status(500).render('error', {
    message: 'There was a problem processing your payment',
    error: { status: 500, stack: '' } // Empty stack to avoid exposing sensitive info
  });
});

// Manage subscription route
router.get('/manage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user subscription data
    const userQuery = await pool.query(
      `SELECT 
        stripe_customer_id,
        subscription_id,
        subscription_type
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).redirect('/payment/error');
    }
    
    const { stripe_customer_id, subscription_id } = userQuery.rows[0];
    
    if (!stripe_customer_id) {
      return res.redirect('/profile');
    }
    
    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripe_customer_id,
      return_url: `${req.protocol}://${req.get('host')}/profile`,
    });
    
    // Redirect to the portal
    res.redirect(session.url);
  } catch (error) {
    console.error('Manage subscription error:', error);
    res.status(500).render('error', { message: 'Failed to access subscription management' });
  }
});

// Gold plan checkout page
router.get('/checkout-gold', authenticateToken, (req, res) => {
  try {
    // Calculate next billing date (30 days from now)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    
    // Render the checkout page with Gold plan details
    res.render('payment/checkout', {
      planId: 'gold',
      planName: 'Gold',
      planPrice: 39,
      stripePriceId: PLAN_DETAILS.gold.stripePriceId,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`
    });
  } catch (error) {
    console.error('Error rendering gold checkout:', error);
    res.status(500).send('Error loading checkout page');
  }
});

// Platinum plan checkout page
router.get('/checkout-platinum', authenticateToken, (req, res) => {
  try {
    // Calculate next billing date (30 days from now)
    const nextBillingDate = new Date();
    nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    
    // Render the checkout page with Platinum plan details
    res.render('payment/checkout', {
      planId: 'platinum',
      planName: 'Platinum',
      planPrice: 50,
      stripePriceId: PLAN_DETAILS.platinum.stripePriceId,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`
    });
  } catch (error) {
    console.error('Error rendering platinum checkout:', error);
    res.status(500).send('Error loading checkout page');
  }
});

// Subscription complete page
router.get('/subscription-complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get subscription details from database
    const userQuery = await pool.query(
      `SELECT 
        subscription_type,
        subscription_end
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.redirect('/profile');
    }
    
    const user = userQuery.rows[0];
    const plan = user.subscription_type;
    
    // Format the next billing date
    const nextBillingDate = user.subscription_end 
      ? new Date(user.subscription_end).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'Not available';
    
    // Get price based on plan
    const planPrice = plan === 'platinum' ? 50 : 39;
    
    res.render('subscription-complete', {
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      planPrice: planPrice,
      nextBillingDate: nextBillingDate,
      user: req.user
    });
  } catch (error) {
    console.error('Error rendering subscription complete:', error);
    res.redirect('/profile');
  }
});

// Add API route to check subscription status
router.get('/api/check-subscription', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get subscription type from database
    const userQuery = await pool.query(
      'SELECT subscription_type FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const subscriptionType = userQuery.rows[0].subscription_type;
    res.json({ subscriptionType });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
async function handleSubscriptionChange(subscription) {
  const { userId, plan } = subscription.metadata;
  
  await pool.query(`
    UPDATE subscriptions 
    SET status = $1, 
        current_period_end = to_timestamp($2),
        updated_at = NOW()
    WHERE user_id = $3
  `, [subscription.status, subscription.current_period_end, userId]);
}

// ... other helper functions

export default router;
