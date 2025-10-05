/**
 * Debug script to check Stripe API key validity
 * Run this to test if your Stripe key is working
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
dotenv.config();

async function testStripeKey() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    
    console.log('🔍 Testing Stripe API Key...');
    console.log('Key format:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}` : 'NOT FOUND');
    console.log('Key length:', apiKey ? apiKey.length : 'N/A');
    
    if (!apiKey) {
        console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
        return;
    }
    
    if (!apiKey.startsWith('sk_test_') && !apiKey.startsWith('sk_live_')) {
        console.error('❌ Invalid Stripe key format. Should start with sk_test_ or sk_live_');
        return;
    }
    
    try {
        const stripe = new Stripe(apiKey);
        
        // Test the key by making a simple API call
        const account = await stripe.accounts.retrieve();
        
        console.log('✅ Stripe API key is valid!');
        console.log('Account ID:', account.id);
        console.log('Account type:', account.type);
        console.log('Charges enabled:', account.charges_enabled);
        console.log('Payouts enabled:', account.payouts_enabled);
        
    } catch (error) {
        console.error('❌ Stripe API key test failed:');
        console.error('Error type:', error.type);
        console.error('Error message:', error.message);
        
        if (error.type === 'StripeAuthenticationError') {
            console.log('\n🔧 How to fix:');
            console.log('1. Go to https://dashboard.stripe.com/test/apikeys');
            console.log('2. Copy the "Secret key" (starts with sk_test_)');
            console.log('3. Update STRIPE_SECRET_KEY in your .env file');
            console.log('4. Restart your server');
        }
    }
}

testStripeKey().catch(console.error);