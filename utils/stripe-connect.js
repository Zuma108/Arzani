import Stripe from 'stripe';
import pool from '../db.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Optimal Stripe Connect Configuration for Arzani Marketplace
 * 
 * Configuration Summary (UPDATED):
 * - Onboarding: Hosted (Stripe handles all compliance)
 * - Dashboard Access: Stripe (full dashboards, sellers pay own fees)
 * - Charge Type: Direct (lower fees, sellers handle disputes)
 * - Fee Bearer: Connected accounts (sellers pay Stripe fees directly)
 * - Negative Balance: Stripe (risk protection for platform)
 * 
 * Key Benefits:
 * - NO platform fee burden (sellers pay ~1.5% + 20p directly to Stripe)
 * - NO monthly $2 per account fees
 * - NO payout fees charged to platform
 * - Full seller autonomy with complete Stripe dashboards
 */

/**
 * Create a Stripe Connect Standard account with optimal settings
 */
export async function createStripeConnectAccount(userId, userEmail, businessInfo = {}) {
  try {
    const account = await stripe.accounts.create({
      type: 'standard', // Standard account - sellers pay own fees, get full dashboards
      country: 'GB', // UK market
      email: userEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: businessInfo.type || 'individual',
      metadata: {
        userId: userId.toString(),
        platform: 'arzani-marketplace'
      },
      // Standard accounts get full control over their settings
      // They can configure payouts, branding, etc. via their full Stripe dashboard
      // This reduces platform maintenance burden
    });

    // Store the account ID in your database
    await pool.query(
      'UPDATE users SET stripe_connect_account_id = $1 WHERE id = $2',
      [account.id, userId]
    );

    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw new Error('Failed to create payment account');
  }
}

/**
 * Generate onboarding link for Stripe-hosted flow
 */
export async function createOnboardingLink(stripeAccountId, userId) {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.BASE_URL || 'http://localhost:5000'}/professional/stripe-connect/refresh?user_id=${userId}`,
      return_url: `${process.env.BASE_URL || 'http://localhost:5000'}/professional/stripe-connect/success?user_id=${userId}`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    throw new Error('Failed to create onboarding link');
  }
}

/**
 * Check if account is fully onboarded and can accept payments
 */
export async function checkAccountStatus(stripeAccountId) {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    return {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: {
        currently_due: account.requirements.currently_due,
        eventually_due: account.requirements.eventually_due,
        past_due: account.requirements.past_due,
        pending_verification: account.requirements.pending_verification,
      },
      // Standard account specific info
      standard: {
        dashboard_available: true, // Standard accounts get full Stripe dashboards
        onboarding_complete: account.charges_enabled && account.payouts_enabled,
        pays_own_fees: true, // Key benefit - no platform fee burden
      }
    };
  } catch (error) {
    console.error('Error checking account status:', error);
    throw new Error('Failed to check account status');
  }
}

/**
 * Create full Stripe dashboard link for sellers (Standard accounts)
 */
export async function createDashboardLink(stripeAccountId) {
  try {
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return link.url;
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    throw new Error('Failed to create dashboard link');
  }
}

/**
 * Handle direct charges (recommended for early-stage marketplaces)
 */
export async function createDirectCharge(stripeAccountId, amount, currency, description, metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to pence/cents
      currency: currency.toLowerCase(),
      description,
      metadata,
      // Direct charge - goes directly to connected account
      // Connected account pays Stripe fees (optimal for platform economics)
    }, {
      stripeAccount: stripeAccountId, // This makes it a direct charge
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating direct charge:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Get account balance (for Express accounts)
 */
export async function getAccountBalance(stripeAccountId) {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    return {
      available: balance.available,
      pending: balance.pending,
      currency: balance.available[0]?.currency || 'gbp',
    };
  } catch (error) {
    console.error('Error retrieving account balance:', error);
    throw new Error('Failed to retrieve account balance');
  }
}

/**
 * Webhook handler for Connect account updates
 */
export async function handleConnectWebhook(event) {
  try {
    switch (event.type) {
      case 'account.updated':
        const account = event.data.object;
        
        // Update account status in database
        await pool.query(`
          UPDATE users 
          SET stripe_connect_verified = $1, stripe_connect_charges_enabled = $2 
          WHERE stripe_connect_account_id = $3
        `, [
          account.details_submitted,
          account.charges_enabled,
          account.id
        ]);
        
        console.log(`Account ${account.id} updated - charges_enabled: ${account.charges_enabled}`);
        break;

      case 'account.application.deauthorized':
        // Handle account disconnection
        const deauthorizedAccount = event.data.object;
        await pool.query(`
          UPDATE users 
          SET stripe_connect_account_id = NULL, stripe_connect_verified = false 
          WHERE stripe_connect_account_id = $1
        `, [deauthorizedAccount.id]);
        
        console.log(`Account ${deauthorizedAccount.id} deauthorized`);
        break;

      default:
        console.log(`Unhandled Connect event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling Connect webhook:', error);
    throw error;
  }
}

/**
 * Configuration summary for documentation
 */
export const ARZANI_STRIPE_CONFIG = {
  accountType: 'standard',
  onboarding: 'hosted',
  chargeType: 'direct',
  feeBearer: 'connected_accounts',
  negativeBalanceLiability: 'stripe',
  dashboard: 'stripe_full',
  
  benefits: {
    'Zero Platform Fee Burden': 'Sellers pay Stripe fees directly (~1.5% + 20p)',
    'No Monthly Account Fees': 'No $2/month per seller charges to platform',
    'No Payout Fees': 'No 0.25% + 10p payout fees charged to platform',
    'Full Seller Autonomy': 'Complete Stripe dashboards for seller self-management',
    'Lower Development Costs': 'Hosted onboarding eliminates custom UI development',
    'Risk Protection': 'Stripe handles negative balances and compliance',
    'Better Cash Flow': 'No fee reconciliation or advance payments required'
  },
  
  tradeoffs: {
    'Seller Learning Curve': 'Sellers need to understand full Stripe dashboard',
    'Direct Stripe Relationship': 'Sellers have direct relationship with Stripe',
    'Platform Fee Collection': 'Must implement separate mechanism if taking commission'
  },
  
  costComparison: {
    'Standard (Current)': '£0 platform fees + £0 monthly fees + sellers pay own processing',
    'Express (Alternative)': '£2/seller/month + 0.25% + 10p per payout + platform pays processing',
    'Savings on 100 sellers': '£200/month + payout fees + processing fee savings'
  }
};

export default {
  createStripeConnectAccount,
  createOnboardingLink,
  checkAccountStatus,
  createDashboardLink,
  createDirectCharge,
  getAccountBalance,
  handleConnectWebhook,
  ARZANI_STRIPE_CONFIG
};