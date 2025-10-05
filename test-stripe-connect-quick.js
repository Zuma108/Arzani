#!/usr/bin/env node
/**
 * Quick Stripe Connect Test
 * Tests if the account creation works after fixing the database schema
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover'
});

async function testStripeConnect() {
  console.log('🧪 Testing Stripe Connect after database fix...\n');
  
  try {
    // Test 1: Verify Connect is enabled
    console.log('1️⃣ Testing Connect availability...');
    const accounts = await stripe.accounts.list({ limit: 1 });
    console.log('✅ Stripe Connect is enabled and accessible\n');
    
    // Test 2: Create a test account
    console.log('2️⃣ Creating test Connect account...');
    const testAccount = await stripe.accounts.create({
      type: 'standard',
      country: 'US',
      email: 'test-connect@example.com',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      }
    });
    
    console.log('✅ Test account created successfully!');
    console.log(`   Account ID: ${testAccount.id}`);
    console.log(`   Type: ${testAccount.type}`);
    console.log(`   Country: ${testAccount.country}`);
    console.log(`   Created: ${new Date(testAccount.created * 1000).toISOString()}\n`);
    
    // Test 3: Create onboarding link
    console.log('3️⃣ Creating onboarding link...');
    const onboardingLink = await stripe.accountLinks.create({
      account: testAccount.id,
      refresh_url: 'http://localhost:5000/stripe-connect/onboarding/refresh',
      return_url: 'http://localhost:5000/stripe-connect/onboarding/success',
      type: 'account_onboarding'
    });
    
    console.log('✅ Onboarding link created successfully!');
    console.log(`   URL: ${onboardingLink.url}`);
    console.log(`   Expires: ${new Date(onboardingLink.expires_at * 1000).toISOString()}\n`);
    
    // Test 4: Clean up
    console.log('4️⃣ Cleaning up test account...');
    await stripe.accounts.del(testAccount.id);
    console.log('✅ Test account cleaned up\n');
    
    console.log('🎉 All Stripe Connect tests passed!');
    console.log('✅ Your integration is ready to use');
    
  } catch (error) {
    console.error('❌ Stripe Connect test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Type: ${error.type}`);
    
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    
    console.log('\n🔧 Next steps:');
    if (error.message.includes('signed up for Connect')) {
      console.log('   - Complete Stripe Connect setup in your dashboard');
      console.log('   - Visit: https://dashboard.stripe.com/test/connect');
    } else {
      console.log('   - Check your Stripe secret key in .env file');
      console.log('   - Ensure you\'re using test keys for development');
      console.log('   - Review the error details above');
    }
  }
}

// Run the test
testStripeConnect()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });