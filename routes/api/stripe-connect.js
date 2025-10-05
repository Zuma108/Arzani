import express from 'express';
import Stripe from 'stripe';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Initialize Stripe with latest API version
// TODO: Replace with your actual Stripe secret key
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required for Stripe Connect integration');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover' // Latest API version as requested
});

/**
 * STRIPE CONNECT INTEGRATION FOR ARZANI MARKETPLACE
 * 
 * This integration implements the optimal configuration:
 * - Controller properties with 'account' fee payer (sellers pay their own fees)
 * - Stripe handles losses and disputes (risk protection for platform)
 * - Full Stripe dashboard access for connected accounts
 * - Direct charges with application fees for platform monetization
 */

// ==================== CREATING CONNECTED ACCOUNTS ====================

/**
 * Create a new connected account for a seller/professional
 * POST /api/stripe-connect/create-account
 */
router.post('/create-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, country = 'GB', business_type = 'individual' } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required to create a connected account'
      });
    }

    console.log(`Creating Stripe Connect account for user ${userId} with email ${email}`);

    // Create connected account using controller properties (NOT top-level type)
    const account = await stripe.accounts.create({
      // Use controller properties for optimal marketplace configuration
      controller: {
        // Connected account pays their own Stripe processing fees
        // This is optimal for platform economics - no fee burden on marketplace
        fees: {
          payer: 'account' // Seller pays ~1.5% + 20p directly to Stripe
        },
        // Stripe handles payment disputes and losses (risk protection)
        losses: {
          payments: 'stripe' // Stripe absorbs chargeback/dispute losses
        },
        // Connected account gets full access to Stripe dashboard
        stripe_dashboard: {
          type: 'full' // Complete dashboard for seller self-management
        }
      },
      country: country,
      email: email,
      business_type: business_type,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        userId: userId.toString(),
        platform: 'arzani-marketplace',
        created_via: 'api'
      }
    });

    // Store the Stripe account ID in database
    await pool.query(
      'UPDATE users SET stripe_connect_account_id = $1, stripe_connect_created_at = NOW() WHERE id = $2',
      [account.id, userId]
    );

    console.log(`Successfully created Stripe Connect account ${account.id} for user ${userId}`);

    res.json({
      success: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        business_type: account.business_type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      }
    });

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create connected account',
      details: error.message
    });
  }
});

// ==================== ONBOARDING CONNECTED ACCOUNTS ====================

/**
 * Create onboarding link for connected account
 * POST /api/stripe-connect/create-onboarding-link
 */
router.post('/create-onboarding-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's Stripe account ID from database
    const userResult = await pool.query(
      'SELECT stripe_connect_account_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe Connect account found. Please create an account first.'
      });
    }

    const stripeAccountId = userResult.rows[0].stripe_connect_account_id;

    // TODO: Replace with your actual domain
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // Create Account Link for Stripe-hosted onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/stripe-connect/onboarding/refresh?user_id=${userId}`,
      return_url: `${baseUrl}/stripe-connect/onboarding/success?user_id=${userId}`,
      type: 'account_onboarding',
      collect: 'eventually_due' // Collect all required information
    });

    console.log(`Created onboarding link for account ${stripeAccountId}`);

    res.json({
      success: true,
      onboarding_url: accountLink.url,
      expires_at: accountLink.expires_at
    });

  } catch (error) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create onboarding link',
      details: error.message
    });
  }
});

/**
 * Get account status for onboarding progress
 * GET /api/stripe-connect/account-status
 */
router.get('/account-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's Stripe account ID from database
    const userResult = await pool.query(
      'SELECT stripe_connect_account_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_connect_account_id) {
      return res.json({
        success: true,
        has_account: false,
        message: 'No Stripe Connect account found'
      });
    }

    const stripeAccountId = userResult.rows[0].stripe_connect_account_id;

    // Retrieve account status directly from Stripe API (as requested)
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // Determine onboarding status
    const isOnboardingComplete = account.charges_enabled && account.payouts_enabled;
    const hasRequirements = account.requirements.currently_due.length > 0 || 
                           account.requirements.past_due.length > 0;

    res.json({
      success: true,
      has_account: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        business_type: account.business_type,
        // Onboarding status
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        onboarding_complete: isOnboardingComplete,
        // Requirements for onboarding
        requirements: {
          currently_due: account.requirements.currently_due,
          eventually_due: account.requirements.eventually_due,
          past_due: account.requirements.past_due,
          pending_verification: account.requirements.pending_verification
        },
        has_outstanding_requirements: hasRequirements
      }
    });

  } catch (error) {
    console.error('Error retrieving account status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve account status',
      details: error.message
    });
  }
});

// ==================== CREATE PRODUCTS ====================

/**
 * Create a product on the connected account
 * POST /api/stripe-connect/create-product
 */
router.post('/create-product', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, price, currency = 'gbp' } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Product name and price are required'
      });
    }

    // Convert price to cents (Stripe expects amounts in smallest currency unit)
    const priceInCents = Math.round(parseFloat(price) * 100);

    if (priceInCents <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be greater than 0'
      });
    }

    // Get user's Stripe account ID
    const userResult = await pool.query(
      'SELECT stripe_connect_account_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_connect_account_id) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe Connect account found. Please complete onboarding first.'
      });
    }

    const stripeAccountId = userResult.rows[0].stripe_connect_account_id;

    // Verify account is ready to accept payments
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.charges_enabled) {
      return res.status(400).json({
        success: false,
        error: 'Account onboarding not complete. Cannot create products yet.'
      });
    }

    // Create product on connected account using Stripe-Account header
    const product = await stripe.products.create({
      name: name,
      description: description || '',
      default_price_data: {
        unit_amount: priceInCents,
        currency: currency.toLowerCase(),
      },
      metadata: {
        created_by_user: userId.toString(),
        platform: 'arzani-marketplace'
      }
    }, {
      stripeAccount: stripeAccountId // This sets the Stripe-Account header
    });

    console.log(`Created product ${product.id} on account ${stripeAccountId} for user ${userId}`);

    res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        default_price: {
          id: product.default_price,
          unit_amount: priceInCents,
          currency: currency
        },
        created: product.created
      }
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      details: error.message
    });
  }
});

/**
 * List products for a connected account
 * GET /api/stripe-connect/products
 */
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user's Stripe account ID
    const userResult = await pool.query(
      'SELECT stripe_connect_account_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_connect_account_id) {
      return res.json({
        success: true,
        products: [],
        message: 'No Stripe Connect account found'
      });
    }

    const stripeAccountId = userResult.rows[0].stripe_connect_account_id;

    // List products from connected account
    const products = await stripe.products.list({
      limit: 100,
      active: true
    }, {
      stripeAccount: stripeAccountId // Use connected account header
    });

    // Enrich with price information
    const enrichedProducts = await Promise.all(
      products.data.map(async (product) => {
        if (product.default_price) {
          try {
            const price = await stripe.prices.retrieve(product.default_price, {
              stripeAccount: stripeAccountId
            });
            return {
              ...product,
              price_info: {
                amount: price.unit_amount,
                currency: price.currency,
                formatted: formatPrice(price.unit_amount, price.currency)
              }
            };
          } catch (err) {
            console.warn(`Could not retrieve price for product ${product.id}:`, err.message);
            return product;
          }
        }
        return product;
      })
    );

    res.json({
      success: true,
      products: enrichedProducts
    });

  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list products',
      details: error.message
    });
  }
});

// ==================== DISPLAY PRODUCTS (STOREFRONT) ====================

/**
 * Get storefront products for a specific connected account
 * GET /api/stripe-connect/storefront/:accountId
 * 
 * NOTE: In production, you should use a custom identifier (like username or business slug)
 * instead of the Stripe account ID in the URL for better UX and security
 */
router.get('/storefront/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Validate account ID format (Stripe account IDs start with 'acct_')
    if (!accountId || !accountId.startsWith('acct_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format'
      });
    }

    // Verify account exists and is active
    try {
      const account = await stripe.accounts.retrieve(accountId);
      if (!account.charges_enabled) {
        return res.status(400).json({
          success: false,
          error: 'This store is not yet ready to accept payments'
        });
      }
    } catch (err) {
      return res.status(404).json({
        success: false,
        error: 'Store not found'
      });
    }

    // Get products from the connected account
    const products = await stripe.products.list({
      limit: 50,
      active: true
    }, {
      stripeAccount: accountId // Use connected account header
    });

    // Enrich with price information
    const enrichedProducts = await Promise.all(
      products.data.map(async (product) => {
        if (product.default_price) {
          try {
            const price = await stripe.prices.retrieve(product.default_price, {
              stripeAccount: accountId
            });
            return {
              id: product.id,
              name: product.name,
              description: product.description,
              images: product.images,
              price: {
                id: price.id,
                amount: price.unit_amount,
                currency: price.currency,
                formatted: formatPrice(price.unit_amount, price.currency)
              }
            };
          } catch (err) {
            console.warn(`Could not retrieve price for product ${product.id}:`, err.message);
            return null;
          }
        }
        return null;
      })
    );

    // Filter out products without valid prices
    const validProducts = enrichedProducts.filter(product => product !== null);

    res.json({
      success: true,
      account_id: accountId,
      products: validProducts
    });

  } catch (error) {
    console.error('Error fetching storefront products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load storefront',
      details: error.message
    });
  }
});

// ==================== PROCESS CHARGES ====================

/**
 * Create checkout session for direct charge with application fee
 * POST /api/stripe-connect/create-checkout
 */
router.post('/create-checkout', async (req, res) => {
  try {
    const { account_id, product_id, quantity = 1 } = req.body;

    // Validate required parameters
    if (!account_id || !product_id) {
      return res.status(400).json({
        success: false,
        error: 'Account ID and Product ID are required'
      });
    }

    // Validate account ID format
    if (!account_id.startsWith('acct_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format'
      });
    }

    // Get product details from connected account
    const product = await stripe.products.retrieve(product_id, {
      stripeAccount: account_id
    });

    if (!product.default_price) {
      return res.status(400).json({
        success: false,
        error: 'Product does not have a default price'
      });
    }

    // Get price details
    const price = await stripe.prices.retrieve(product.default_price, {
      stripeAccount: account_id
    });

    // Calculate application fee (platform commission)
    // Example: 5% platform fee (adjust based on your business model)
    const applicationFeePercent = 0.05; // 5%
    const totalAmount = price.unit_amount * quantity;
    const applicationFeeAmount = Math.round(totalAmount * applicationFeePercent);

    // TODO: Replace with your actual domain
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // Create Checkout Session with Direct Charge and Application Fee
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: product.default_price,
          quantity: quantity,
        },
      ],
      payment_intent_data: {
        // Application fee for platform monetization
        application_fee_amount: applicationFeeAmount,
        metadata: {
          platform: 'arzani-marketplace',
          product_id: product_id,
          account_id: account_id
        }
      },
      mode: 'payment',
      success_url: `${baseUrl}/stripe-connect/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/stripe-connect/storefront/${account_id}`,
      metadata: {
        account_id: account_id,
        product_id: product_id,
        application_fee_amount: applicationFeeAmount.toString()
      }
    }, {
      stripeAccount: account_id // Direct charge to connected account
    });

    console.log(`Created checkout session ${session.id} for account ${account_id}, product ${product_id}`);
    console.log(`Application fee: ${formatPrice(applicationFeeAmount, price.currency)}`);

    res.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      fee_info: {
        total_amount: formatPrice(totalAmount, price.currency),
        application_fee: formatPrice(applicationFeeAmount, price.currency),
        seller_receives: formatPrice(totalAmount - applicationFeeAmount, price.currency)
      }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
});

/**
 * Handle successful payment
 * GET /api/stripe-connect/payment-success/:sessionId
 */
router.get('/payment-success/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Note: We need to know which connected account this session belongs to
    // In a real application, you'd store this information when creating the session
    // For now, we'll extract it from the session metadata

    // First, let's try to retrieve the session to get the connected account
    // This is a limitation of this demo - in production, store account mapping
    
    res.json({
      success: true,
      message: 'Payment successful!',
      session_id: sessionId,
      note: 'In production, retrieve full session details and update order status'
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment success',
      details: error.message
    });
  }
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format price for display
 */
function formatPrice(amountInCents, currency) {
  if (!amountInCents) return 'Free';
  
  const amount = amountInCents / 100;
  
  switch (currency.toLowerCase()) {
    case 'gbp':
      return `£${amount.toFixed(2)}`;
    case 'usd':
      return `$${amount.toFixed(2)}`;
    case 'eur':
      return `€${amount.toFixed(2)}`;
    default:
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export default router;