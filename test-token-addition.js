#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import { addTokensToUser } from './routes/api/tokens.js';

// Use postgres user for the test
process.env.DATABASE_URL = 'postgresql://postgres:Olumide123!@localhost:5432/my-marketplace';

async function testTokenAddition() {
    try {
        console.log('🧪 Testing token addition for user 6...');
        
        // Test adding 25 tokens to user 6
        const result = await addTokensToUser(6, 25, {
            source: 'test_purchase',
            package_id: 2,
            session_id: 'test_session_123',
            package_name: 'Test Package',
            base_tokens: 20,
            bonus_tokens: 5,
            stripePaymentIntentId: 'pi_test_12345'
        });
        
        console.log('✅ Token addition successful!');
        console.log('Result:', result);
        
        // Verify the balance
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const balanceResult = await pool.query('SELECT token_balance FROM users WHERE id = 6');
        console.log('📊 Current balance for user 6:', balanceResult.rows[0]?.token_balance);
        
        // Check transaction log
        const transactionResult = await pool.query(
            'SELECT * FROM token_transactions WHERE user_id = 6 ORDER BY created_at DESC LIMIT 1'
        );
        console.log('📝 Latest transaction:', transactionResult.rows[0]);
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run the test
testTokenAddition().catch(console.error);