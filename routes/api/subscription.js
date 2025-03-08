import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../../middleware/auth.js';
import { requireSubscription, checkSubscription } from '../../middleware/subscription.js';
import pool from '../../db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

/**
 * Get current user subscription status
 */
router.get('/status', authenticateToken, checkSubscription, async (req, res) => {
  try {
    // Get full details from database
    const userQuery = await pool.query(
      `SELECT 
        u.subscription_type,
        u.subscription_start,
        u.subscription_end,
        u.subscription_id,
        s.status,
        s.plan_type,
        s.cancel_at_period_end
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE u.id = $1`,
      [req.user.userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userQuery.rows[0];
    
    // Format response
    const response = {
      status: user.status || 'none',
      plan: user.subscription_type || 'free',
      startDate: user.subscription_start,
      endDate: user.subscription_end,
      cancelAtPeriodEnd: user.cancel_at_period_end || false
    };
    
    // If subscription exists, add more Stripe details
    if (user.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
        
        response.stripeDetails = {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        };
        
        // Get upcoming invoice if subscription is active
        if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
          const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            subscription: subscription.id
          });
          
          response.nextPayment = {
            amount: upcomingInvoice.amount_due / 100,
            currency: upcomingInvoice.currency,
            date: new Date(upcomingInvoice.next_payment_attempt * 1000)
          };
        }
      } catch (error) {
        console.error('Error fetching Stripe subscription details:', error);
        // Continue with limited info
      }
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * Get subscription history/invoices
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const invoicesQuery = await pool.query(
      `SELECT 
        i.stripe_invoice_id,
        i.amount,
        i.currency,
        i.status,
        i.invoice_date,
        i.paid_date,
        i.receipt_url
      FROM subscription_invoices i
      JOIN subscriptions s ON i.subscription_id = s.id
      WHERE s.user_id = $1
      ORDER BY i.invoice_date DESC
      LIMIT 10`,
      [req.user.userId]
    );
    
    res.json(invoicesQuery.rows);
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({ error: 'Failed to fetch subscription history' });
  }
});

/**
 * Cancel subscription
 */
router.post('/cancel', authenticateToken, requireSubscription(['gold', 'platinum']), async (req, res) => {
  try {
    // Get subscription ID from database
    const userQuery = await pool.query(
      'SELECT subscription_id FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (userQuery.rows.length === 0 || !userQuery.rows[0].subscription_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    const subscriptionId = userQuery.rows[0].subscription_id;
    
    // Update subscription in Stripe (cancel at period end)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    
    // Update local database
    await pool.query(
      `UPDATE subscriptions
       SET 
         cancel_at_period_end = true,
         updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );
    
    // Log cancellation event
    await pool.query(
      `INSERT INTO subscription_events (
        user_id,
        subscription_id,
        event_type,
        description
      ) VALUES (
        $1,
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = $2),
        'subscription_cancelled',
        'User requested subscription cancellation'
      )`,
      [req.user.userId, subscriptionId]
    );
    
    res.json({
      success: true, 
      message: 'Subscription will be canceled at the end of the billing period',
      endsAt: new Date(subscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Reactivate canceled subscription (if still in current period)
 */
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    // Get subscription ID from database
    const userQuery = await pool.query(
      'SELECT subscription_id FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (userQuery.rows.length === 0 || !userQuery.rows[0].subscription_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const subscriptionId = userQuery.rows[0].subscription_id;
    
    // Check current subscription status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (!subscription.cancel_at_period_end) {
      return res.status(400).json({ error: 'Subscription is not scheduled for cancellation' });
    }
    
    // Reactivate subscription
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
    
    // Update local database
    await pool.query(
      `UPDATE subscriptions
       SET 
         cancel_at_period_end = false,
         updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscriptionId]
    );
    
    // Log reactivation event
    await pool.query(
      `INSERT INTO subscription_events (
        user_id,
        subscription_id,
        event_type,
        description
      ) VALUES (
        $1,
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = $2),
        'subscription_reactivated',
        'User reactivated subscription'
      )`,
      [req.user.userId, subscriptionId]
    );
    
    res.json({
      success: true,
      message: 'Subscription has been reactivated',
      status: updatedSubscription.status,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

/**
 * Change subscription plan (upgrade/downgrade)
 */
router.post('/change-plan', authenticateToken, async (req, res) => {
  try {
    const { newPlanId } = req.body;
    
    if (!newPlanId || !['gold', 'platinum'].includes(newPlanId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    // Get subscription ID from database
    const userQuery = await pool.query(
      'SELECT subscription_id FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const subscriptionId = userQuery.rows[0]?.subscription_id;
    
    // Determine price ID based on plan
    const priceId = newPlanId === 'gold' 
      ? process.env.STRIPE_PRICE_GOLD 
      : process.env.STRIPE_PRICE_PLATINUM;
    
    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured for selected plan' });
    }
    
    let updatedSubscription;
    
    // If user has an existing subscription, update it
    if (subscriptionId) {
      updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: priceId
        }],
        proration_behavior: 'create_prorations',
        metadata: {
          userId: req.user.userId,
          planId: newPlanId
        }
      });
    } else {
      // Create a new subscription
      // First check if customer exists
      let customerQuery = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      let customerId = customerQuery.rows[0]?.stripe_customer_id;
      
      if (!customerId) {
        // Get user email
        const userEmailQuery = await pool.query(
          'SELECT email FROM users WHERE id = $1',
          [req.user.userId]
        );
        
        if (userEmailQuery.rows.length === 0) {
          return res.status(404).json({ error: 'User email not found' });
        }
        
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmailQuery.rows[0].email,
          metadata: {
            userId: req.user.userId
          }
        });
        
        customerId = customer.id;
        
        // Save customer ID
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [customerId, req.user.userId]
        );
      }
      
      // Create new subscription
      updatedSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: req.user.userId,
          planId: newPlanId
        }
      });
      
      // Return client secret for payment collection
      return res.json({
        clientSecret: updatedSubscription.latest_invoice.payment_intent.client_secret,
        subscriptionId: updatedSubscription.id
      });
    }
    
    // Update user record with new plan
    await pool.query(
      `UPDATE users
       SET 
         subscription_type = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [newPlanId, req.user.userId]
    );
    
    res.json({
      success: true,
      planChanged: true,
      newPlan: newPlanId,
      effectiveDate: new Date(updatedSubscription.current_period_start * 1000)
    });
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    res.status(500).json({ error: 'Failed to change subscription plan' });
  }
});

export default router;
