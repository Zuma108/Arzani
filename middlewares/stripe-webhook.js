import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

// Middleware for handling Stripe webhooks
export const handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).send('Webhook Error: Missing Stripe signature');
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Add the parsed event to the request object
    req.stripeEvent = event;
    
    // Process the event
    await processStripeEvent(event);
    
    // Continue to the route handler
    next();
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Function to process Stripe events
async function processStripeEvent(event) {
  switch (event.type) {
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
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;
    const planId = subscription.metadata.planId;
    
    if (userId && planId) {
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
        [planId, currentDate, nextBillingDate, subscription.id, userId]
      );
      
      console.log(`User ${userId} subscription updated to ${planId}`);
    }
  } catch (error) {
    console.error('Error processing invoice payment:', error);
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
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
    }
  } catch (error) {
    console.error('Error processing subscription update:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
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

export default handleStripeWebhook;
