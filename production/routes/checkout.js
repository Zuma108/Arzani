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
  
  // Redirect to the specific plan page
  res.redirect(`/checkout/${planId.toLowerCase()}`);
});

// Route for gold subscription
router.get('/gold', (req, res) => {
  res.render('checkout-gold', {
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Route for platinum subscription
router.get('/platinum', (req, res) => {
  res.render('checkout-platinum', {
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Handle checkout completion
router.get('/complete', authenticateToken, async (req, res) => {
  try {
    // Get query parameters
    const { session_id } = req.query;
    
    // Render success page
    res.redirect(`/payment/success?session_id=${session_id}`);
  } catch (error) {
    console.error('Checkout completion error:', error);
    res.redirect('/payment/cancel');
  }
});

export default router;
