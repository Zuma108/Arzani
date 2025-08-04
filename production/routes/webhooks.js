import express from 'express';
import Stripe from 'stripe';
import pool from '../db.js';
import TokenService from '../services/tokenService.js';

const router = express.Router();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Your webhook endpoint secret from Stripe dashboard
const endpointSecret = 'whsec_FaLVKfpv6IvNcSSSfS2MbEdTVqVMkXkv';

/**
 * Stripe Webhook Handler
 * Handles: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed
 */
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log(`✅ Webhook signature verified for event: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Check if we've already processed this event (idempotency)
  const existingEvent = await checkEventProcessed(event.id);
  if (existingEvent) {
    console.log(`🔄 Event ${event.id} already processed, skipping`);
    return res.json({received: true, status: 'already_processed'});
  }

  console.log(`🎯 Processing webhook event: ${event.type} (${event.id})`);

  try {
    // Process the webhook event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event);
        break;
        
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
        await logWebhookEvent(event, 'success', null, 0);
    }

    // Log successful processing
    console.log(`✅ Successfully processed ${event.type} event`);
    res.json({received: true, status: 'processed'});

  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    
    // Log the error
    await logWebhookEvent(event, 'failed', error.message, 0);
    
    // Return 500 to trigger Stripe retry
    res.status(500).json({
      error: 'Webhook processing failed',
      event_id: event.id,
      retry: true
    });
  }
});

/**
 * Handle successful checkout session completion
 * This is where we add tokens to the user's account
 */
async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  console.log(`💳 Processing checkout completion for session: ${session.id}`);

  try {
    // Use the existing TokenService method to process the purchase
    const result = await TokenService.processTokenPurchase(event);
    
    console.log(`✅ Successfully processed token purchase:`, result);

    // Log successful webhook processing
    await pool.query(`
      INSERT INTO stripe_webhook_events 
      (stripe_event_id, event_type, processing_status, raw_data, user_id, tokens_added)
      VALUES ($1, $2, 'success', $3, $4, $5)
    `, [
      event.id, 
      event.type, 
      JSON.stringify(event.data), 
      result.userId, 
      result.tokensAdded
    ]);

  } catch (error) {
    // Log the failed purchase for manual review
    await logFailedPurchase(session, error);
    throw error;
  }
}

/**
 * Handle successful payment intent
 * This is mainly for logging and additional verification
 */
async function handlePaymentSucceeded(event) {
  const paymentIntent = event.data.object;
  console.log(`💰 Payment succeeded: ${paymentIntent.id} (${paymentIntent.amount} ${paymentIntent.currency})`);

  // Update any existing transaction records with payment confirmation
  await pool.query(`
    UPDATE token_transactions 
    SET metadata = metadata || $1
    WHERE stripe_payment_intent_id = $2
  `, [
    JSON.stringify({ 
      payment_status: 'succeeded',
      payment_confirmed_at: new Date().toISOString()
    }),
    paymentIntent.id
  ]);

  // Log the webhook event
  await logWebhookEvent(event, 'success', null, 0);
  
  console.log(`✅ Payment intent ${paymentIntent.id} confirmed and logged`);
}

/**
 * Handle failed payment intent
 * Log the failure for potential retry or customer support
 */
async function handlePaymentFailed(event) {
  const paymentIntent = event.data.object;
  const errorMessage = paymentIntent.last_payment_error?.message || 'Unknown payment error';
  
  console.log(`❌ Payment failed: ${paymentIntent.id} - ${errorMessage}`);

  // Log the failed payment
  await pool.query(`
    INSERT INTO failed_token_purchases 
    (session_id, stripe_payment_intent_id, error_message, session_data, created_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
  `, [
    paymentIntent.id, // Using payment intent ID as session reference
    paymentIntent.id,
    errorMessage,
    JSON.stringify(paymentIntent)
  ]);

  // Log the webhook event
  await logWebhookEvent(event, 'success', null, 0);
  
  console.log(`📝 Payment failure logged for intent: ${paymentIntent.id}`);
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
async function checkEventProcessed(eventId) {
  const result = await pool.query(
    'SELECT id FROM stripe_webhook_events WHERE stripe_event_id = $1',
    [eventId]
  );
  return result.rows.length > 0;
}

/**
 * Log webhook event processing
 */
async function logWebhookEvent(event, status, errorMessage = null, tokensAdded = 0) {
  try {
    await pool.query(`
      INSERT INTO stripe_webhook_events 
      (stripe_event_id, event_type, processing_status, error_message, raw_data, tokens_added)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      event.id,
      event.type,
      status,
      errorMessage,
      JSON.stringify(event.data),
      tokensAdded
    ]);
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}

/**
 * Log failed purchase for manual review
 */
async function logFailedPurchase(session, error) {
  try {
    const userId = parseInt(session.metadata?.user_id);
    const tokenAmount = parseInt(session.metadata?.token_amount || 0);
    const bonusTokens = parseInt(session.metadata?.bonus_tokens || 0);
    const totalTokens = tokenAmount + bonusTokens;

    await pool.query(`
      INSERT INTO failed_token_purchases 
      (session_id, user_id, error_message, session_data, tokens_intended, amount_intended, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [
      session.id,
      userId,
      error.message,
      JSON.stringify(session),
      totalTokens,
      session.amount_total || 0
    ]);
    
    console.log(`📝 Failed purchase logged for session: ${session.id}`);
  } catch (logError) {
    console.error('Failed to log failed purchase:', logError);
  }
}

/**
 * Health check endpoint for webhook
 */
router.get('/webhook/health', (req, res) => {
  res.json({
    status: 'healthy',
    webhook_url: 'https://arzani.co.uk/webhook',
    events_listening: [
      'checkout.session.completed',
      'payment_intent.succeeded', 
      'payment_intent.payment_failed'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
