/**
 * Configuration file for Stripe products and prices
 * These IDs should match your actual Stripe dashboard product/price IDs
 */
const STRIPE_PRODUCTS = {
  // Plan names mapped to their corresponding Stripe price IDs
  gold: {
    name: 'Gold Plan',
    // Using a different variable name for test vs production price
    priceId: process.env.NODE_ENV === 'production' 
      ? (process.env.STRIPE_GOLD_PRICE_ID || 'price_1Qd820LbWafSwHQXmmhLdNOG') 
      : (process.env.STRIPE_PRICE_GOLD || 'prod_RWAM5xjyVPSxGJ'),
    description: 'Premium Business Access'
  },
  platinum: {
    name: 'Platinum Plan',
    // Using a different variable name for test vs production price
    priceId: process.env.NODE_ENV === 'production'
      ? (process.env.STRIPE_PLATINUM_PRICE_ID || 'price_1Qd8AXLbWafSwHQXPSmVPxBq')
      : (process.env.STRIPE_PRICE_PLATINUM || 'prod_RWAVR2LGingUrm'),
    description: 'Ultimate Business Access'
  }
};

module.exports = {
  STRIPE_PRODUCTS
};
