import Stripe from 'stripe';
import pool from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

// Store payment statuses for validation
const paymentCache = new Map();

// Discount settings
const DISCOUNT_CODE = 'Arzani28';
const ORIGINAL_PRICE = 25000; // £250.00 in pence
const DISCOUNTED_PRICE = 18000; // £180.00 in pence

const valuationPaymentController = {
  // Render the payment page
  renderPaymentPage: async (req, res) => {
    try {
      res.render('valuation-payment', {
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      });
    } catch (error) {
      console.error('Error rendering payment page:', error);
      res.status(500).render('error', { message: 'Error loading payment page' });
    }
  },

  // Create a Stripe checkout session for valuation payment
  createCheckoutSession: async (req, res) => {
    try {
      // Create a unique client reference for this session
      const clientReference = req.body.clientReferenceId || `val_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Get details from the request
      const { useDiscount, successUrl, cancelUrl } = req.body;
      
      // Set price based on whether discount code is applied
      const amount = useDiscount ? DISCOUNTED_PRICE : ORIGINAL_PRICE;
      
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'gbp',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          clientReference,
          discountApplied: useDiscount ? 'yes' : 'no',
          discountCode: useDiscount ? DISCOUNT_CODE : 'none',
          service: 'business-valuation'
        },
        description: `Business Valuation Service ${useDiscount ? '(with discount)' : ''}`,
      });

      // Store the payment intent ID for validation
      paymentCache.set(paymentIntent.id, {
        timestamp: Date.now(),
        status: 'pending',
        clientReference,
        amount: amount
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: amount
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  },

  // Handle successful payment from Stripe and redirect to confirmation page
  handlePaymentSuccess: async (req, res) => {
    try {
      // Extract payment status from query parameters
      const { redirect_status, payment_intent, session_id } = req.query;
      const redirectStatus = redirect_status;
      
      console.log('Payment success handler called with params:', {
        redirectStatus,
        payment_intent,
        session_id,
        referer: req.headers.referer || 'none'
      });
      
      // Check if we have valid payment indicators
      if (redirectStatus === 'succeeded' || payment_intent || session_id || req.headers.referer?.includes('stripe.com')) {
        try {
          // Generate a payment ID if we don't have a session ID
          const anonymousPaymentId = `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await pool.query(
            'INSERT INTO valuation_payments (session_id, client_reference, status, amount, payment_date, metadata) VALUES ($1, $2, $3, $4, NOW(), $5)',
            [session_id || anonymousPaymentId, anonymousPaymentId, 'completed', 0, JSON.stringify({
              source: 'payment_link',
              redirect_status: redirectStatus,
              payment_intent: payment_intent || null,
              timestamp: new Date().toISOString()
            })]
          );
          
          console.log('Created payment record for payment link');
          
          // Set payment complete flag in session
          if (req.session) {
            req.session.paymentComplete = true;
            
            // Set a session flag indicating questionnaire should be next
            req.session.questionnairePending = true;
            
            await req.session.save();
          }
          
          // Add a cookie as backup verification method
          res.cookie('valuation_payment_complete', 'true', {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            sameSite: 'lax'
          });
          
          // Add the missing redirect to confirmation page
          return res.redirect('/valuation-confirmation');
        } catch (dbError) {
          console.error('Error creating payment record:', dbError);
          // Non-critical, continue with redirect even if DB operation fails
          
          // Set backup cookies to indicate payment was successful
          res.cookie('valuation_payment_complete', 'true', {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            sameSite: 'lax'
          });
          
          return res.redirect('/valuation-confirmation');
        }
      } else {
        // No payment indicators, redirect to payment page
        console.log('No payment success indicators found in request');
        return res.redirect('/valuation-payment?error=missing_payment_confirmation');
      }
    } catch (error) {
      console.error('Error in payment success handler:', error);
      return res.redirect('/valuation-payment?error=server_error');
    }
  },
  
  // Helper function to record payment in database
  async recordPaymentInDatabase(paymentData, userId = null, paymentType = 'payment_intent') {
    try {
      // Check if we've already recorded this payment
      const existingPayment = await pool.query(
        'SELECT id FROM valuation_payments WHERE session_id = $1',
        [paymentData.id]
      );
      
      if (existingPayment.rows.length > 0) {
        console.log(`Payment ${paymentData.id} already recorded`);
        return;
      }
      
      // If no user ID provided, try to find a user with matching email or Stripe customer ID
      if (!userId && paymentData.customer) {
        // Try to find a user with this Stripe customer ID
        const userCheck = await pool.query(
          'SELECT id FROM users WHERE stripe_customer_id = $1',
          [paymentData.customer]
        );
        
        if (userCheck.rows.length > 0) {
          userId = userCheck.rows[0].id;
        } else if (paymentData.receipt_email) {
          // Try to find by email if we have it
          const emailCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [paymentData.receipt_email]
          );
          
          if (emailCheck.rows.length > 0) {
            userId = emailCheck.rows[0].id;
          }
        }
      }
      
      // Store metadata for tracking
      const metadata = {
        payment_type: paymentType,
        discountApplied: paymentData.metadata?.discountApplied,
        discountCode: paymentData.metadata?.discountCode,
        timestamp: new Date().toISOString()
      };
      
      // Record the payment in database
      await pool.query(
        'INSERT INTO valuation_payments (session_id, client_reference, user_id, status, amount, payment_date, metadata) VALUES ($1, $2, $3, $4, $5, NOW(), $6)',
        [paymentData.id, paymentData.metadata?.clientReference || paymentData.id, userId, 'completed', paymentData.amount || 0, JSON.stringify(metadata)]
      );
      
      console.log(`Payment recorded with ID: ${paymentData.id}${userId ? `, linked to user: ${userId}` : ', not linked to any user'}`);
    } catch (dbError) {
      console.error('Error recording payment in database:', dbError);
      // Continue execution since this is a helper function
    }
  },
  
  // Webhook handler for Stripe events
  handleWebhook: async (req, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log('Webhook received', { 
      signatureReceived: !!sig, 
      payloadSize: payload ? payload.length || Object.keys(payload).length : 0,
      contentType: req.headers['content-type']
    });
    
    let event;
    
    try {
      if (!webhookSecret) {
        console.error('No webhook secret configured. Set STRIPE_WEBHOOK_SECRET in your .env file.');
        return res.status(500).send('Webhook secret not configured');
      }
      
      if (!sig) {
        console.error('No Stripe signature found in request headers');
        return res.status(400).send('No Stripe signature found');
      }
      
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      console.log(`Webhook event received: ${event.type}`);
    } catch (err) {
      console.error(`⚠️ Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`💰 PaymentIntent succeeded: ${paymentIntent.id}`);
        
        // Get client reference from metadata
        const clientReference = paymentIntent.metadata?.clientReference;
        
        try {
          // Get customer details to find a user
          let userId = null;
          if (paymentIntent.customer) {
            // Try to find a user with this Stripe customer ID
            const userCheck = await pool.query(
              'SELECT id FROM users WHERE stripe_customer_id = $1',
              [paymentIntent.customer]
            );
            
            if (userCheck.rows.length > 0) {
              userId = userCheck.rows[0].id;
            } else if (paymentIntent.receipt_email) {
              // Try to find by email if we have it
              const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [paymentIntent.receipt_email]
              );
              
              if (emailCheck.rows.length > 0) {
                userId = emailCheck.rows[0].id;
              }
            }
          }
          
          // Store metadata for tracking
          const metadata = {
            discountApplied: paymentIntent.metadata?.discountApplied,
            discountCode: paymentIntent.metadata?.discountCode,
          };
          
          // Insert payment record with user_id if available
          await pool.query(
            'INSERT INTO valuation_payments (session_id, client_reference, user_id, status, amount, payment_date, metadata) VALUES ($1, $2, $3, $4, $5, NOW(), $6) ON CONFLICT (session_id) DO UPDATE SET status = $4, updated_at = NOW()',
            [paymentIntent.id, clientReference, userId, 'completed', paymentIntent.amount, JSON.stringify(metadata)]
          );
          
          console.log(`Payment recorded with ID: ${paymentIntent.id}${userId ? `, linked to user: ${userId}` : ', not linked to any user'}`);
        } catch (dbError) {
          console.error('Error storing payment in database:', dbError);
        }
        break;
        
      case 'charge.succeeded':
        const charge = event.data.object;
        console.log(`💳 Charge succeeded: ${charge.id}`);
        
        // If the charge is related to a payment intent, we'll handle the payment through that event
        if (charge.payment_intent) {
          console.log(`This charge belongs to PaymentIntent: ${charge.payment_intent}`);
        } else {
          // Handle direct charges (rare in modern Stripe integrations)
          try {
            await pool.query(
              'INSERT INTO valuation_payments (session_id, status, amount, payment_date) VALUES ($1, $2, $3, NOW()) ON CONFLICT (session_id) DO NOTHING',
              [charge.id, 'completed', charge.amount]
            );
          } catch (dbError) {
            console.error('Error storing charge in database:', dbError);
          }
        }
        break;
      
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`🛒 Checkout session completed: ${session.id}`);
        
        // Handle checkout session completion (if using Checkout)
        try {
          // Extract any user information from session
          let checkoutUserId = null;
          if (session.customer) {
            const userCheck = await pool.query(
              'SELECT id FROM users WHERE stripe_customer_id = $1',
              [session.customer]
            );
            
            if (userCheck.rows.length > 0) {
              checkoutUserId = userCheck.rows[0].id;
            } else if (session.customer_email) {
              const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [session.customer_email]
              );
              
              if (emailCheck.rows.length > 0) {
                checkoutUserId = emailCheck.rows[0].id;
              }
            }
          }
          
          // Record the checkout session
          await pool.query(
            'INSERT INTO valuation_payments (session_id, user_id, status, amount, payment_date) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (session_id) DO NOTHING',
            [session.id, checkoutUserId, 'completed', session.amount_total]
          );
        } catch (dbError) {
          console.error('Error storing checkout session in database:', dbError);
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`❌ Payment failed: ${failedPayment.id}, Reason: ${failedPayment.last_payment_error?.message || 'Unknown'}`);
        
        try {
          await pool.query(
            'INSERT INTO valuation_payments (session_id, status, error_message, payment_date) VALUES ($1, $2, $3, NOW()) ON CONFLICT (session_id) DO UPDATE SET status = $2, error_message = $3, updated_at = NOW()',
            [failedPayment.id, 'failed', failedPayment.last_payment_error?.message || 'Payment failed']
          );
        } catch (dbError) {
          console.error('Error recording failed payment:', dbError);
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  },

  // Middleware to verify payment before accessing seller questionnaire
  verifyPayment: async (req, res, next) => {
    try {
      // During development and when using payment links, bypass the verification
      if (process.env.NODE_ENV === 'development' || process.env.BYPASS_PAYMENT_VERIFICATION === 'true') {
        console.log('Payment verification bypassed for development or by configuration');
        return next();
      }
      
      const paymentIntentId = req.query.payment_intent;
      const redirectResult = req.query.redirect_status;
      const sessionId = req.query.session_id;
      
      // If this is a direct redirect from a Stripe payment link, allow access
      const referrer = req.headers.referer || '';
      if (referrer.includes('stripe.com') || referrer.includes('buy.stripe.com')) {
        console.log('Detected redirect from Stripe payment link, allowing access');
        return next();
      }
      
      // Check if session indicates successful payment
      if (req.session && req.session.paymentComplete) {
        return next();
      }
      
      // If payment was successful based on redirect status
      if (redirectResult === 'succeeded') {
        return next();
      }
      
      // Check localStorage flag through cookie if available
      if (req.cookies && req.cookies.valuation_payment_complete === 'true') {
        console.log('Found payment complete cookie, allowing access');
        return next();
      }
      
      // If there's no payment intent, check if user has already paid
      if (!paymentIntentId) {
        // Check if they have an existing successful payment in database
        const userId = req.user?.userId;
        if (userId) {
          const paymentCheck = await pool.query(
            'SELECT * FROM valuation_payments WHERE user_id = $1 AND status = $2 ORDER BY payment_date DESC LIMIT 1',
            [userId, 'completed']
          );
          
          if (paymentCheck.rows.length > 0) {
            // They already paid, let them through
            return next();
          }
        }
        
        // NEW: Check if this IP has recently completed a payment 
        // This helps with payment link redirects where we lose session state
        try {
          const clientIp = req.ip || req.connection.remoteAddress;
          const recentPayment = await pool.query(
            'SELECT * FROM valuation_payments WHERE client_ip = $1 AND status = $2 AND payment_date > NOW() - INTERVAL \'1 hour\' ORDER BY payment_date DESC LIMIT 1',
            [clientIp, 'completed']
          );
          
          if (recentPayment.rows.length > 0) {
            console.log('Recent payment found for IP, allowing access');
            return next();
          }
        } catch (ipCheckError) {
          console.error('Error checking recent IP payments:', ipCheckError);
          // Continue with other verification methods
        }
        
        // NEW: Last resort for development testing - create a placeholder payment record
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: allowing access to questionnaire without payment');
          return next();
        }
        
        // For the initial testing phase, just redirect everyone to the payment page
        return res.redirect('/valuation-payment');
      }
      
      // Check database for payment status
      const dbCheck = await pool.query(
        'SELECT * FROM valuation_payments WHERE session_id = $1 AND status = $2',
        [paymentIntentId, 'completed']
      );
      
      if (dbCheck.rows.length > 0) {
        return next();
      }
      
      // If not found in DB, check with Stripe directly
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        try {
          // Get customer details to find a user
          let userId = null;
          if (paymentIntent.customer) {
            // Try to find a user with this Stripe customer ID
            const userCheck = await pool.query(
              'SELECT id FROM users WHERE stripe_customer_id = $1',
              [paymentIntent.customer]
            );
            
            if (userCheck.rows.length > 0) {
              userId = userCheck.rows[0].id;
            } else if (paymentIntent.receipt_email) {
              // Try to find by email if we have it
              const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [paymentIntent.receipt_email]
              );
              
              if (emailCheck.rows.length > 0) {
                userId = emailCheck.rows[0].id;
              }
            }
          }
          
          // Store metadata for tracking
          const metadata = {
            discountApplied: paymentIntent.metadata?.discountApplied,
            discountCode: paymentIntent.metadata?.discountCode,
          };
          
          await pool.query(
            'INSERT INTO valuation_payments (session_id, client_reference, user_id, status, amount, payment_date, metadata) VALUES ($1, $2, $3, $4, $5, NOW(), $6) ON CONFLICT (session_id) DO NOTHING',
            [paymentIntentId, paymentIntent.metadata?.clientReference, userId, 'completed', paymentIntent.amount, JSON.stringify(metadata)]
          );
        } catch (dbError) {
          console.error('Error storing verified payment in database:', dbError);
        }
        
        return next();
      }
      
      // If payment not verified, redirect to payment page
      res.redirect('/valuation-payment?payment=incomplete');
    } catch (error) {
      console.error('Error verifying payment:', error);
      // On error, still allow access in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: allowing access despite verification error');
        return next();
      }
      res.status(500).render('error', { message: 'Error verifying payment' });
    }
  },

  // Periodically clean up the payment cache (older than 24 hours)
  cleanupCache: () => {
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    for (const [key, value] of paymentCache.entries()) {
      if (now - value.timestamp > expiryTime) {
        paymentCache.delete(key);
      }
    }
  }
};

// Setup cache cleanup every hour
setInterval(valuationPaymentController.cleanupCache, 60 * 60 * 1000);

export default valuationPaymentController;