import Stripe from 'stripe';
import dotenv from 'dotenv';
import pool from '../db.js';
import express from 'express';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

// Express raw body parser middleware for Stripe webhooks
export const stripeWebhookMiddleware = express.raw({ type: 'application/json' });

/**
 * Process Stripe webhook events
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log(`✅ Received Stripe webhook: ${event.type}`);
  
  try {
    // Handle different webhook events
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return 200 success response
    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook: ${error.message}`);
    // Still return 200 to acknowledge receipt (prevent Stripe from retrying)
    res.json({ 
      received: true,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error processing webhook'
    });
  }
};

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  try {
    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;
    const planId = subscription.metadata.planId;
    
    if (!userId || !planId) {
      console.error('Missing user ID or plan ID in subscription metadata');
      return;
    }
    
    // Store invoice in database
    await pool.query(
      `INSERT INTO subscription_invoices (
        subscription_id,
        stripe_invoice_id,
        amount,
        currency,
        status,
        invoice_date,
        paid_date,
        receipt_url
      ) VALUES (
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = $1),
        $2, $3, $4, $5, to_timestamp($6), to_timestamp($7), $8
      )`,
      [
        subscription.id,
        invoice.id,
        invoice.amount_paid / 100,
        invoice.currency,
        invoice.status,
        invoice.created,
        invoice.status === 'paid' ? invoice.status_transitions.paid_at : null,
        invoice.hosted_invoice_url
      ]
    );
    
    // Update user subscription
    await pool.query(
      `UPDATE users 
       SET 
         subscription_type = $1,
         subscription_start = COALESCE(subscription_start, NOW()),
         subscription_end = to_timestamp($2),
         subscription_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [planId, subscription.current_period_end, subscription.id, userId]
    );
    
    // Log subscription event
    await pool.query(
      `INSERT INTO subscription_events (
        user_id, 
        subscription_id, 
        event_type, 
        description, 
        metadata
      ) VALUES (
        $1, 
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = $2), 
        $3, 
        $4, 
        $5
      )`,
      [
        userId,
        subscription.id,
        'payment_succeeded',
        `Successfully processed payment of ${invoice.currency.toUpperCase()} ${(invoice.amount_paid / 100).toFixed(2)}`,
        JSON.stringify({ invoiceId: invoice.id })
      ]
    );
    
    console.log(`✅ Subscription payment processed for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error handling payment succeeded: ${error.message}`);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  try {
    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;
    
    if (!userId) {
      console.error('Missing user ID in subscription metadata');
      return;
    }
    
    // Log subscription event
    await pool.query(
      `INSERT INTO subscription_events (
        user_id, 
        subscription_id, 
        event_type, 
        description, 
        metadata
      ) VALUES (
        $1, 
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = $2), 
        $3, 
        $4, 
        $5
      )`,
      [
        userId,
        subscription.id,
        'payment_failed',
        `Failed payment attempt for ${invoice.currency.toUpperCase()} ${(invoice.amount_due / 100).toFixed(2)}`,
        JSON.stringify({ 
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count,
          nextPaymentAttempt: invoice.next_payment_attempt
        })
      ]
    );
    
    console.log(`⚠️ Subscription payment failed for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error handling payment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription) {
  try {
    const userId = subscription.metadata.userId;
    const planId = subscription.metadata.planId;
    
    if (!userId || !planId) {
      console.error('Missing user ID or plan ID in subscription metadata');
      return;
    }
    
    // Create subscription record in database
    await pool.query(
      `INSERT INTO subscriptions (
        user_id,
        stripe_subscription_id,
        stripe_customer_id,
        plan_type,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, to_timestamp($6), to_timestamp($7), $8, $9)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        plan_type = EXCLUDED.plan_type,
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()`,
      [
        userId,
        subscription.id,
        subscription.customer,
        planId,
        subscription.status,
        subscription.current_period_start,
        subscription.current_period_end,
        subscription.cancel_at_period_end,
        JSON.stringify(subscription.metadata)
      ]
    );
    
    console.log(`✅ New subscription created for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error handling subscription created: ${error.message}`);
    throw error;
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    if (!userId) {
      console.error('Missing user ID in subscription metadata');
      return;
    }
    
    // Update subscription in database
    await pool.query(
      `UPDATE subscriptions 
       SET 
         status = $1,
         current_period_end = to_timestamp($2),
         cancel_at_period_end = $3,
         metadata = $4,
         updated_at = NOW()
       WHERE stripe_subscription_id = $5`,
      [
        subscription.status,
        subscription.current_period_end,
        subscription.cancel_at_period_end,
        JSON.stringify(subscription.metadata),
        subscription.id
      ]
    );
    
    // Update user record
    await pool.query(
      `UPDATE users
       SET subscription_end = to_timestamp($1)
       WHERE id = $2`,
      [subscription.current_period_end, userId]
    );
    
    console.log(`✅ Subscription updated for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error handling subscription update: ${error.message}`);
    throw error;
  }
}

/**
 * Handle subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    if (!userId) {
      console.error('Missing user ID in subscription metadata');
      return;
    }
    
    // Update database records
    await pool.query(
      `UPDATE subscriptions 
       SET 
         status = 'canceled',
         updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );
    
    // Log event
    await pool.query(
      `INSERT INTO subscription_events (
        user_id, 
        subscription_id, 
        event_type, 
        description
      ) VALUES (
        $1, 
        (SELECT id FROM subscriptions WHERE stripe_subscription_id = $2), 
        $3, 
        $4
      )`,
      [
        userId,
        subscription.id,
        'subscription_deleted',
        'Subscription was canceled'
      ]
    );
    
    console.log(`✅ Subscription deleted for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error handling subscription deletion: ${error.message}`);
    throw error;
  }
}
