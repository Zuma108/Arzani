const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { STRIPE_PRODUCTS } = require('../config/stripe-config');
const { authenticateToken } = require('../middleware/auth'); // Assuming you have an auth middleware

// Create a subscription
router.post('/create-subscription', authenticateToken, async (req, res) => {
  try {
    const { planType } = req.body;
    
    // Validate planType
    if (!planType || !STRIPE_PRODUCTS[planType]) {
      return res.status(400).json({ 
        message: `Invalid plan type. Available plans: ${Object.keys(STRIPE_PRODUCTS).join(', ')}` 
      });
    }

    // Get the price ID from configuration
    const priceId = STRIPE_PRODUCTS[planType].priceId;
    
    // Create or get the customer
    let customer;
    if (req.user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(req.user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      });
      
      // TODO: Save the customer ID to your user in the database
      // await User.findByIdAndUpdate(req.user.id, { stripeCustomerId: customer.id });
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: priceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Return the client secret
    res.json({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error('Stripe subscription error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
