import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();

// Handle GET request to /checkout
router.get('/', (req, res) => {
  // Get plan from query parameter or default to 'gold'
  const planId = req.query.plan || 'gold';
  
  // Set plan details based on planId
  let planName, planPrice;
  
  if (planId === 'platinum') {
    planName = 'Platinum';
    planPrice = 50;
  } else {
    // Default to gold
    planName = 'Gold';
    planPrice = 39;
  }
  
  // Render checkout page with plan details
  res.render('payment/checkout', {
    planId,
    planName,
    planPrice,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Route for gold subscription
router.get('/gold', (req, res) => {
  res.render('payment/checkout', {
    planId: 'gold',
    planName: 'Gold',
    planPrice: 39,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Route for platinum subscription
router.get('/platinum', (req, res) => {
  res.render('payment/checkout', {
    planId: 'platinum',
    planName: 'Platinum',
    planPrice: 50,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Handle checkout completion
router.get('/complete', authenticateToken, async (req, res) => {
  try {
    // Get query parameters
    const { session_id } = req.query;
    
    // Render success page
    res.redirect(`/subscription-complete`);
  } catch (error) {
    console.error('Checkout completion error:', error);
    res.redirect('/error?message=checkout-failed');
  }
});

export default router;
