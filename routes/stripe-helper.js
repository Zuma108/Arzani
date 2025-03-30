/**
 * Helper functions for Stripe integration
 */
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe with the API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

/**
 * Check if a price exists in Stripe
 * @param {string} priceId - The Stripe price ID to check
 * @returns {Promise<boolean>} True if the price exists, false otherwise
 */
export async function checkPriceExists(priceId) {
  try {
    await stripe.prices.retrieve(priceId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Create a test price in Stripe
 * @param {string} planType - The plan type ('gold' or 'platinum')
 * @returns {Promise<string>} The ID of the created price
 */
export async function createTestPrice(planType) {
  try {
    // Determine price details based on plan type
    const amount = planType === 'gold' ? 3900 : 5000; // £39 or £50
    const name = `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`;
    
    // Create product
    const product = await stripe.products.create({
      name: `Test ${name}`,
      description: `Test subscription for ${planType} plan`,
    });
    
    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'gbp',
      recurring: {
        interval: 'month',
      },
    });
    
    console.log(`Created test price: ${price.id} for ${planType}`);
    return price.id;
  } catch (error) {
    console.error(`Failed to create test price for ${planType}:`, error);
    throw error;
  }
}

/**
 * Get all prices for a product
 * @param {string} productId - The Stripe product ID
 * @returns {Promise<Array>} Array of prices
 */
export async function getProductPrices(productId) {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100
    });
    return prices.data;
  } catch (error) {
    console.error(`Failed to fetch prices for product ${productId}:`, error);
    return [];
  }
}

/**
 * Check Stripe configuration and log helpful diagnostics
 */
export async function diagnoseStripeConfiguration() {
  try {
    console.log('======= STRIPE CONFIGURATION DIAGNOSTICS =======');
    
    // Check API key type
    const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
    console.log(`API Key Type: ${isTestMode ? 'TEST' : 'LIVE'}`);
    
    // Check price IDs from environment variables
    console.log('Price IDs in environment:');
    console.log(`  Gold: ${process.env.STRIPE_PRICE_GOLD || 'Not set'}`);
    console.log(`  Platinum: ${process.env.STRIPE_PRICE_PLATINUM || process.env.STRIPE_PLATINUM_PRICE_ID || 'Not set'}`);
    
    // Try to retrieve prices
    if (process.env.STRIPE_PRICE_GOLD) {
      try {
        await stripe.prices.retrieve(process.env.STRIPE_PRICE_GOLD);
        console.log(`Gold price exists: Yes`);
      } catch (error) {
        console.log(`Gold price exists: No - ${error.message}`);
      }
    }
    
    if (process.env.STRIPE_PRICE_PLATINUM || process.env.STRIPE_PLATINUM_PRICE_ID) {
      try {
        await stripe.prices.retrieve(process.env.STRIPE_PRICE_PLATINUM || process.env.STRIPE_PLATINUM_PRICE_ID);
        console.log(`Platinum price exists: Yes`);
      } catch (error) {
        console.log(`Platinum price exists: No - ${error.message}`);
      }
    }
    
    console.log('===============================================');
    
    return {
      isTestMode,
      goldPriceId: process.env.STRIPE_PRICE_GOLD || null,
      platinumPriceId: process.env.STRIPE_PRICE_PLATINUM || process.env.STRIPE_PLATINUM_PRICE_ID || null
    };
  } catch (error) {
    console.error('Stripe configuration diagnostics failed:', error);
    return {
      error: error.message
    };
  }
}

export default {
  checkPriceExists,
  createTestPrice,
  getProductPrices,
  diagnoseStripeConfiguration
};
