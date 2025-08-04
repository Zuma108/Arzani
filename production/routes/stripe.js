import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Use a stable API version
});

// Get or create a price for a product
async function getOrCreatePrice(productId, planType) {
  try {
    // First, check if there are any active prices for this product
    const existingPrices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 1
    });

    if (existingPrices.data.length > 0) {
      console.log(`Using existing price for ${planType} plan:`, existingPrices.data[0].id);
      return existingPrices.data[0].id;
    }

    // If no price exists, create one
    console.log(`Creating new price for ${planType} plan...`);
    const amount = planType === 'gold' ? 3900 : 5000; // £39 or £50
    
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: 'gbp',
      recurring: {
        interval: 'month',
      },
    });
    
    console.log(`Created new price: ${price.id} for ${planType} plan`);
    return price.id;
  } catch (error) {
    console.error(`Error getting/creating price for ${planType}:`, error);
    throw error;
  }
}

// Create a checkout session
router.post('/create-subscription', authenticateToken, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!planType || !['gold', 'platinum'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    const userId = req.user.userId;
    
    // Find user in database
    const userQuery = await pool.query('SELECT email, stripe_customer_id FROM users WHERE id = $1', [userId]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { email, stripe_customer_id } = userQuery.rows[0];
    
    // Create or get customer
    let customer;
    
    if (stripe_customer_id) {
      try {
        customer = await stripe.customers.retrieve(stripe_customer_id);
      } catch (error) {
        console.log(`Could not retrieve customer: ${error.message}. Creating a new one.`);
        customer = await stripe.customers.create({
          email,
          metadata: { userId }
        });
        
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [customer.id, userId]
        );
      }
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { userId }
      });
      
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, userId]
      );
    }
    
    // Determine product ID based on plan
    const productId = planType === 'gold' 
      ? process.env.STRIPE_GOLD_PRODUCT_ID
      : process.env.STRIPE_PLATINUM_PRODUCT_ID;
      
    if (!productId) {
      return res.status(400).json({ 
        error: `Product ID for ${planType} plan is not configured properly`,
        details: `Make sure STRIPE_GOLD_PRODUCT_ID and STRIPE_PLATINUM_PRODUCT_ID are set correctly in your .env file`
      });
    }
    
    // Get or create a price for the product
    const priceId = await getOrCreatePrice(productId, planType);
    
    console.log(`Creating subscription with price ID: ${priceId} for plan: ${planType}`);
    
    // Create a checkout session instead of a direct subscription
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.protocol}://${req.get('host')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment/cancel`,
      metadata: {
        userId,
        planType
      }
    });
    
    res.json({
      sessionId: session.id,
      url: session.url
    });
    
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription', 
      message: error.message,
      hint: "If you're seeing a 'no such price' error, check your product configuration in Stripe" 
    });
  }
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
        subscription_id,
        stripe_customer_id
      FROM users 
      WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userQuery.rows[0];
    
    // If user has a Stripe subscription ID, fetch additional details
    if (userData.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userData.subscription_id);
        
        // Get the product details for additional info
        const price = subscription.items.data[0].price;
        const product = await stripe.products.retrieve(price.product);
        
        res.json({
          status: subscription.status,
          plan: userData.subscription_type,
          planName: product.name,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          priceId: price.id,
          price: price.unit_amount / 100,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          description: product.description || ''
        });
      } catch (error) {
        console.error('Error fetching subscription from Stripe:', error);
        res.json({
          plan: userData.subscription_type,
          currentPeriodEnd: userData.subscription_end
        });
      }
    } else if (userData.stripe_customer_id) {
      // Check for active subscriptions directly in Stripe
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripe_customer_id,
          status: 'active',
          limit: 1
        });
        
        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          
          // Update the database with this subscription
          await pool.query(
            `UPDATE users 
             SET 
               subscription_id = $1, 
               subscription_start = $2,
               subscription_end = $3,
               updated_at = NOW()
             WHERE id = $4`,
            [
              subscription.id, 
              new Date(subscription.start_date * 1000), 
              new Date(subscription.current_period_end * 1000),
              userId
            ]
          );
          
          // Get product details
          const price = subscription.items.data[0].price;
          const product = await stripe.products.retrieve(price.product);
          
          res.json({
            status: subscription.status,
            plan: product.metadata.planType || 'premium',
            planName: product.name,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            priceId: price.id,
            price: price.unit_amount / 100,
            currency: price.currency,
            interval: price.recurring?.interval || 'month',
            description: product.description || ''
          });
        } else {
          // No active subscription found
          res.json({
            plan: 'free',
            status: 'none'
          });
        }
      } catch (error) {
        console.error('Error checking Stripe subscriptions:', error);
        res.json({
          plan: 'free',
          status: 'none',
          error: 'Failed to check subscriptions'
        });
      }
    } else {
      // User has no subscription and no Stripe customer ID
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

// Customer portal session for managing subscriptions
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user's Stripe customer ID
    const userQuery = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0 || !userQuery.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found' });
    }
    
    const customerId = userQuery.rows[0].stripe_customer_id;
    
    // Create a portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.protocol}://${req.get('host')}/profile`,
    });
    
    // Return the URL to redirect the customer to
    res.json({ url: session.url });
    
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create subscription management portal' });
  }
});

// Diagnostic endpoint (secure this in production)
router.get('/diagnose', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Diagnostics not available in production' });
  }
  
  try {
    // List all products
    const products = await stripe.products.list({
      active: true,
      limit: 100
    });
    
    // List all prices
    const prices = await stripe.prices.list({
      active: true,
      limit: 100
    });
    
    // Check specific products and prices from env
    const goldProductId = process.env.STRIPE_GOLD_PRODUCT_ID;
    const platinumProductId = process.env.STRIPE_PLATINUM_PRODUCT_ID;
    
    const diagnostics = {
      apiMode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
      products: products.data.map(p => ({
        id: p.id,
        name: p.name,
        active: p.active,
        description: p.description,
        isGold: p.id === goldProductId,
        isPlatinum: p.id === platinumProductId
      })),
      prices: prices.data.map(p => ({
        id: p.id,
        product: p.product,
        amount: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval
      })),
      config: {
        goldProductId,
        platinumProductId,
        goldPriceId: process.env.STRIPE_GOLD_PRICE_ID,
        platinumPriceId: process.env.STRIPE_PLATINUM_PRICE_ID
      }
    };
    
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler using Express Raw body parser
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
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(session) {
  // Extract userId and plan from metadata
  const { userId, planType } = session.metadata;
  
  if (!userId || !planType) {
    console.log('Missing metadata in session:', session.id);
    return;
  }
  
  // If this is a subscription, get the subscription ID
  if (session.mode === 'subscription' && session.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Update user subscription in database
      const currentDate = new Date();
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      
      await pool.query(
        `UPDATE users 
         SET 
           subscription_type = $1, 
           subscription_start = $2,
           subscription_end = $3,
           subscription_id = $4,
           updated_at = NOW()
         WHERE id = $5`,
        [planType, currentDate, nextBillingDate, subscription.id, userId]
      );
      
      console.log(`User ${userId} subscription created: ${planType} plan, subscription ID: ${subscription.id}`);
    } catch (error) {
      console.error('Error processing checkout session completion:', error);
    }
  }
}

// Handle invoice.payment_succeeded event
async function handleInvoicePaymentSucceeded(invoice) {
  // Only process subscription invoice payments
  if (!invoice.subscription) return;
  
  try {
    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const metadata = subscription.metadata;
    const userId = metadata.userId;
    const planType = metadata.planType;
    
    if (userId && planType) {
      // Update user subscription in database
      const currentDate = new Date();
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      
      await pool.query(
        `UPDATE users 
         SET 
           subscription_type = $1, 
           subscription_start = $2,
           subscription_end = $3,
           subscription_id = $4,
           updated_at = NOW()
         WHERE id = $5`,
        [planType, currentDate, nextBillingDate, subscription.id, userId]
      );
      
      console.log(`User ${userId} subscription renewed: ${planType} plan, subscription ID: ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error processing invoice payment:', error);
  }
}

// Handle customer.subscription.updated event
async function handleSubscriptionUpdated(subscription) {
  try {
    const metadata = subscription.metadata;
    const userId = metadata.userId;
    
    if (userId) {
      const nextBillingDate = new Date(subscription.current_period_end * 1000);
      
      await pool.query(
        `UPDATE users
         SET 
           subscription_end = $1,
           updated_at = NOW()
         WHERE id = $2`,
        [nextBillingDate, userId]
      );
      
      console.log(`User ${userId} subscription updated, next billing: ${nextBillingDate}`);
    }
  } catch (error) {
    console.error('Error processing subscription update:', error);
  }
}

// Handle customer.subscription.deleted event
async function handleSubscriptionDeleted(subscription) {
  try {
    const metadata = subscription.metadata;
    const userId = metadata.userId;
    
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
}

export default router;
