import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../../middleware/auth.js';
import pool from '../../db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a new quote
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const professionalId = req.user.userId;
    const {
      conversationId,
      clientId,
      title,
      description,
      amount,
      items,
      validUntil,
      paymentTerms,
      notes
    } = req.body;

    // Validate required fields
    if (!conversationId || !clientId || !title || !description || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: conversationId, clientId, title, description, amount' 
      });
    }

    // Verify the professional is verified
    const professionalCheck = await pool.query(
      'SELECT is_verified_professional, stripe_connect_account_id FROM users WHERE id = $1',
      [professionalId]
    );

    if (!professionalCheck.rows[0]?.is_verified_professional) {
      return res.status(403).json({ error: 'Only verified professionals can create quotes' });
    }

    const stripeAccountId = professionalCheck.rows[0].stripe_connect_account_id;

    // Verify the conversation exists and the professional has access
    const conversationCheck = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp ON c.id = cp.conversation_id
       WHERE c.id = $1 AND cp.user_id = $2`,
      [conversationId, professionalId]
    );

    if (conversationCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Create quote in database
    const quoteQuery = `
      INSERT INTO quotes (
        professional_id, client_id, conversation_id, title, description,
        total_amount, items, valid_until, payment_terms, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING *
    `;

    const quoteResult = await pool.query(quoteQuery, [
      professionalId,
      clientId,
      conversationId,
      title,
      description,
      parseFloat(amount),
      JSON.stringify(items || []),
      validUntil || null,
      paymentTerms || 'full_upfront',
      notes || null
    ]);

    const quote = quoteResult.rows[0];

    // Create Stripe payment intent (Direct charge - optimal for early stage)
    let paymentIntent = null;
    if (stripeAccountId) {
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(parseFloat(amount) * 100), // Convert to pence
          currency: 'gbp',
          description: `Quote: ${title}`,
          metadata: {
            quoteId: quote.id.toString(),
            professionalId: professionalId.toString(),
            clientId: clientId.toString()
          },
          // Direct charge configuration - professional receives full amount minus Stripe fees
          // No platform fee - sellers pay Stripe processing fees directly
        }, {
          stripeAccount: stripeAccountId, // This makes it a direct charge
        });

        // Update quote with payment intent ID
        await pool.query(
          'UPDATE quotes SET stripe_payment_intent_id = $1 WHERE id = $2',
          [paymentIntent.id, quote.id]
        );

        quote.stripe_payment_intent_id = paymentIntent.id;
      } catch (stripeError) {
        console.error('Stripe payment intent creation failed:', stripeError);
        // Continue without payment intent - can be created later
      }
    }

    // Send quote message to the conversation
    const messageQuery = `
      INSERT INTO messages (conversation_id, sender_id, content, message_type, quote_id)
      VALUES ($1, $2, $3, 'quote', $4)
      RETURNING *
    `;

    const quoteMessageContent = `📋 **Quote Sent: ${title}**\n\n**Amount:** £${parseFloat(amount).toFixed(2)}\n**Description:** ${description}\n\n*Click to view full quote details*`;

    const messageResult = await pool.query(messageQuery, [
      conversationId,
      professionalId,
      quoteMessageContent,
      quote.id
    ]);

    // Get professional info for the response
    const professionalInfo = await pool.query(
      'SELECT username, professional_profiles.professional_picture_url FROM users LEFT JOIN professional_profiles ON users.id = professional_profiles.user_id WHERE users.id = $1',
      [professionalId]
    );

    const quoteResponse = {
      ...quote,
      professional_name: professionalInfo.rows[0]?.username,
      professional_avatar: professionalInfo.rows[0]?.professional_picture_url
    };

    // Emit WebSocket event for real-time updates
    if (global.io) {
      const roomName = `conversation:${conversationId}`;
      
      // Emit quote created event to conversation room
      global.io.to(roomName).emit('quote_created', {
        quote: quoteResponse,
        message: messageResult.rows[0],
        conversationId: conversationId,
        professionalId: professionalId,
        clientId: clientId
      });

      // Emit to individual users as well
      global.io.to(`user:${professionalId}`).emit('quote_created', {
        quote: quoteResponse,
        message: messageResult.rows[0],
        conversationId: conversationId,
        type: 'professional'
      });

      global.io.to(`user:${clientId}`).emit('quote_created', {
        quote: quoteResponse,
        message: messageResult.rows[0],
        conversationId: conversationId,
        type: 'client'
      });
    }

    res.json({
      success: true,
      message: 'Quote created successfully',
      quote: quoteResponse,
      messageId: messageResult.rows[0].id,
      paymentIntentId: paymentIntent?.id
    });

  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote', details: error.message });
  }
});

// Get quote details
router.get('/:quoteId', authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const userId = req.user.userId;

    const query = `
      SELECT 
        q.*,
        u1.username as professional_name,
        u1.email as professional_email,
        pp.professional_picture_url as professional_avatar,
        u2.username as client_name,
        u2.email as client_email
      FROM quotes q
      JOIN users u1 ON q.professional_id = u1.id
      JOIN users u2 ON q.client_id = u2.id
      LEFT JOIN professional_profiles pp ON u1.id = pp.user_id
      WHERE q.id = $1 AND (q.professional_id = $2 OR q.client_id = $2)
    `;

    const result = await pool.query(query, [quoteId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or access denied' });
    }

    const quote = result.rows[0];

    // Parse items if they exist
    if (quote.items) {
      try {
        quote.items = JSON.parse(quote.items);
      } catch (e) {
        quote.items = [];
      }
    }

    res.json({
      success: true,
      quote: quote
    });

  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Accept quote and create payment
router.post('/:quoteId/accept', authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const clientId = req.user.userId;

    // Get quote details
    const quoteQuery = `
      SELECT * FROM quotes 
      WHERE id = $1 AND client_id = $2 AND status = 'pending'
    `;

    const quoteResult = await pool.query(quoteQuery, [quoteId, clientId]);

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or already processed' });
    }

    const quote = quoteResult.rows[0];
    
    // Ensure total_amount is a number for calculations
    quote.total_amount = parseFloat(quote.total_amount);
    
    // Validate that total_amount is a valid number
    if (isNaN(quote.total_amount) || quote.total_amount <= 0) {
      console.error(`Invalid quote amount for quote ${quoteId}: ${quote.total_amount} (original: ${quoteResult.rows[0].total_amount})`);
      return res.status(400).json({ error: 'Invalid quote amount' });
    }
    
    console.log(`Quote ${quoteId} total amount converted: ${quoteResult.rows[0].total_amount} (string) -> ${quote.total_amount} (number)`);

    // Check if quote is still valid
    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return res.status(400).json({ error: 'Quote has expired' });
    }

    // Get or create Stripe customer for client
    const clientResult = await pool.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [clientId]
    );

    const { email, stripe_customer_id } = clientResult.rows[0];

    let customer;
    if (stripe_customer_id) {
      customer = await stripe.customers.retrieve(stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { userId: clientId.toString() }
      });

      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, clientId]
      );
    }

    // Create Stripe Checkout Session for payment
    let sessionId = quote.stripe_payment_intent_id;
    let checkoutUrl;

    // Get professional's Stripe Connect account
    const professionalResult = await pool.query(
      'SELECT stripe_connect_account_id FROM users WHERE id = $1',
      [quote.professional_id]
    );

    const stripeAccountId = professionalResult.rows[0]?.stripe_connect_account_id;

    if (sessionId) {
      try {
        // Try to retrieve existing checkout session
        const existingSession = await stripe.checkout.sessions.retrieve(sessionId);
        if (existingSession.status === 'open') {
          checkoutUrl = existingSession.url;
          console.log(`Using existing Checkout Session: ${sessionId}`);
        } else {
          console.log(`Checkout Session ${sessionId} is ${existingSession.status}, creating new one`);
          sessionId = null; // Force creation of new session
        }
      } catch (error) {
        console.log(`Checkout Session ${sessionId} not found, creating new one`);
        sessionId = null; // Force creation of new session
      }
    }

    if (!sessionId || !checkoutUrl) {
      // Create new Stripe Checkout Session
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: quote.title,
                description: quote.description || 'Professional service quote',
              },
              unit_amount: Math.round(quote.total_amount * 100), // Convert to pence
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer: customer.id,
        success_url: `${process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`}/payment-success?session_id={CHECKOUT_SESSION_ID}&quote_id=${quoteId}`,
        cancel_url: `${process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 5000}`}/chat/${quote.conversation_id}?payment_cancelled=true`,
        metadata: {
          quoteId: quoteId.toString(),
          clientId: clientId.toString(),
          professionalId: quote.professional_id.toString()
        },
        payment_intent_data: {
          description: `Quote payment: ${quote.title}`,
          transfer_data: stripeAccountId ? {
            destination: stripeAccountId,
          } : undefined,
          application_fee_amount: stripeAccountId ? Math.round(quote.total_amount * 100 * 0.05) : undefined,
        }
      });

      sessionId = checkoutSession.id;
      checkoutUrl = checkoutSession.url;

      console.log(`Created new Checkout Session: ${sessionId}`);
      console.log(`Checkout URL: ${checkoutUrl}`);

      // Update quote with checkout session ID
      await pool.query(
        'UPDATE quotes SET stripe_payment_intent_id = $1 WHERE id = $2',
        [sessionId, quoteId]
      );
    }

    // Update quote status to accepted
    await pool.query(
      'UPDATE quotes SET status = $1, accepted_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['accepted', quoteId]
    );

    // Send acceptance message to conversation
    const messageQuery = `
      INSERT INTO messages (conversation_id, sender_id, content, message_type, quote_id)
      VALUES ($1, $2, $3, 'quote_accepted', $4)
      RETURNING *
    `;

    const acceptanceMessage = `✅ **Quote Accepted: ${quote.title}**\n\n**Amount:** £${quote.total_amount.toFixed(2)}\n\n*Proceeding to payment...*`;

    const messageResult = await pool.query(messageQuery, [
      quote.conversation_id,
      clientId,
      acceptanceMessage,
      quoteId
    ]);

    // Emit WebSocket event for quote acceptance
    if (global.io) {
      const roomName = `conversation:${quote.conversation_id}`;
      
      // Emit to conversation room
      global.io.to(roomName).emit('quote_accepted', {
        quoteId: quoteId,
        quote: quote,
        message: messageResult.rows[0],
        clientId: clientId,
        professionalId: quote.professional_id,
        conversationId: quote.conversation_id
      });

      // Emit to professional specifically
      global.io.to(`user:${quote.professional_id}`).emit('quote_accepted', {
        quoteId: quoteId,
        quote: quote,
        message: messageResult.rows[0],
        type: 'professional_notification'
      });
    }

    res.json({
      success: true,
      message: 'Quote accepted successfully',
      checkoutUrl: checkoutUrl,
      sessionId: sessionId,
      // Keep clientSecret for backward compatibility - now contains checkout URL
      clientSecret: checkoutUrl
    });

  } catch (error) {
    console.error('Error accepting quote:', error);
    
    // If it's a Stripe error, provide more specific error message
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        // Clear the invalid payment intent ID and suggest retry
        await pool.query(
          'UPDATE quotes SET stripe_payment_intent_id = NULL WHERE id = $1',
          [req.params.quoteId]
        );
        res.status(400).json({ 
          error: 'Payment setup expired. Please try accepting the quote again.',
          shouldRetry: true 
        });
      } else {
        res.status(400).json({ 
          error: 'Payment setup failed: ' + error.message,
          stripeError: true 
        });
      }
    } else {
      res.status(500).json({ error: 'Failed to accept quote', details: error.message });
    }
  }
});

// Decline quote
router.post('/:quoteId/decline', authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const clientId = req.user.userId;
    const { reason } = req.body;

    // Update quote status
    const updateResult = await pool.query(
      `UPDATE quotes 
       SET status = 'declined', declined_at = CURRENT_TIMESTAMP, decline_reason = $3
       WHERE id = $1 AND client_id = $2 AND status = 'pending'
       RETURNING *`,
      [quoteId, clientId, reason || null]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found or already processed' });
    }

    const quote = updateResult.rows[0];

    // Send decline message to conversation
    const messageQuery = `
      INSERT INTO messages (conversation_id, sender_id, content, message_type, quote_id)
      VALUES ($1, $2, $3, 'quote_declined', $4)
      RETURNING *
    `;

    const declineMessage = `❌ **Quote Declined: ${quote.title}**\n\n${reason ? `**Reason:** ${reason}\n\n` : ''}*The professional can send a revised quote if needed.*`;

    const messageResult = await pool.query(messageQuery, [
      quote.conversation_id,
      clientId,
      declineMessage,
      quoteId
    ]);

    // Emit WebSocket event for quote decline
    if (global.io) {
      const roomName = `conversation:${quote.conversation_id}`;
      
      // Emit to conversation room
      global.io.to(roomName).emit('quote_declined', {
        quoteId: quoteId,
        quote: quote,
        message: messageResult.rows[0],
        reason: reason,
        clientId: clientId,
        professionalId: quote.professional_id,
        conversationId: quote.conversation_id
      });

      // Emit to professional specifically
      global.io.to(`user:${quote.professional_id}`).emit('quote_declined', {
        quoteId: quoteId,
        quote: quote,
        message: messageResult.rows[0],
        reason: reason,
        type: 'professional_notification'
      });
    }

    res.json({
      success: true,
      message: 'Quote declined successfully'
    });

  } catch (error) {
    console.error('Error declining quote:', error);
    res.status(500).json({ error: 'Failed to decline quote' });
  }
});

// Get quotes for a user (professional or client)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, type, limit = 20, offset = 0 } = req.query;

    let whereConditions = [];
    let queryParams = [userId];

    // Base query
    let query = `
      SELECT 
        q.*,
        u1.username as professional_name,
        pp.professional_picture_url as professional_avatar,
        u2.username as client_name
      FROM quotes q
      JOIN users u1 ON q.professional_id = u1.id
      JOIN users u2 ON q.client_id = u2.id
      LEFT JOIN professional_profiles pp ON u1.id = pp.user_id
      WHERE (q.professional_id = $1 OR q.client_id = $1)
    `;

    // Add filters
    if (status) {
      queryParams.push(status);
      query += ` AND q.status = $${queryParams.length}`;
    }

    if (type === 'sent') {
      query += ` AND q.professional_id = $1`;
    } else if (type === 'received') {
      query += ` AND q.client_id = $1`;
    }

    // Add ordering and pagination
    query += ` ORDER BY q.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    // Parse items for each quote
    const quotes = result.rows.map(quote => {
      if (quote.items) {
        try {
          quote.items = JSON.parse(quote.items);
        } catch (e) {
          quote.items = [];
        }
      }
      return quote;
    });

    res.json({
      success: true,
      quotes: quotes,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: quotes.length === parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Webhook to handle successful payments
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
  
  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const quoteId = paymentIntent.metadata.quoteId;
      
      if (quoteId) {
        // Update quote status to paid
        const updateResult = await pool.query(
          `UPDATE quotes 
           SET status = 'paid', paid_at = CURRENT_TIMESTAMP, stripe_payment_intent_id = $2
           WHERE id = $1
           RETURNING *`,
          [quoteId, paymentIntent.id]
        );

        if (updateResult.rows.length > 0) {
          const quote = updateResult.rows[0];
          
          // Ensure total_amount is a number for the payment message
          quote.total_amount = parseFloat(quote.total_amount);
          
          // Safety check for payment message formatting
          if (isNaN(quote.total_amount)) {
            console.error(`Invalid quote amount in payment confirmation for quote ${quoteId}: ${quote.total_amount}`);
            quote.total_amount = 0; // Fallback to prevent crash
          }

          // Send payment confirmation message
          const messageQuery = `
            INSERT INTO messages (conversation_id, sender_id, content, message_type, quote_id)
            VALUES ($1, $2, $3, 'quote_paid', $4)
          `;

          const paymentMessage = `💰 **Payment Received: ${quote.title}**\n\n**Amount:** £${quote.total_amount.toFixed(2)}\n\n*Work can now begin!*`;

          const messageResult = await pool.query(messageQuery, [
            quote.conversation_id,
            quote.client_id, // Message from client
            paymentMessage,
            quoteId
          ]);

          // Emit WebSocket event for quote payment
          if (global.io) {
            const roomName = `conversation:${quote.conversation_id}`;
            
            // Emit to conversation room
            global.io.to(roomName).emit('quote_paid', {
              quoteId: quoteId,
              quote: quote,
              message: messageResult.rows[0],
              paymentIntent: paymentIntent,
              clientId: quote.client_id,
              professionalId: quote.professional_id,
              conversationId: quote.conversation_id
            });

            // Emit to professional specifically (they get the money!)
            global.io.to(`user:${quote.professional_id}`).emit('quote_paid', {
              quoteId: quoteId,
              quote: quote,
              message: messageResult.rows[0],
              paymentIntent: paymentIntent,
              amount: quote.total_amount,
              type: 'professional_payment_received'
            });

            // Emit to client as well
            global.io.to(`user:${quote.client_id}`).emit('quote_paid', {
              quoteId: quoteId,
              quote: quote,
              message: messageResult.rows[0],
              paymentIntent: paymentIntent,
              type: 'client_payment_confirmed'
            });
          }

          console.log(`Quote ${quoteId} marked as paid`);
        }
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

export default router;