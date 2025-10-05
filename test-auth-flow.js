#!/usr/bin/env node

/**
 * Test script to verify the authentication flow
 * This script helps debug authentication issues
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

async function testAuthFlow() {
  console.log('🔍 Testing Authentication Flow\n');
  
  // 1. Test JWT Secret
  console.log('1. Testing JWT Configuration:');
  console.log('   JWT_SECRET exists:', JWT_SECRET ? '✅ YES' : '❌ NO');
  console.log('   JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 'N/A');
  
  // 2. Test token generation
  console.log('\n2. Testing Token Generation:');
  try {
    const testUser = { userId: 123, email: 'test@example.com' };
    const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
    console.log('   Token generation: ✅ SUCCESS');
    console.log('   Sample token:', token.substring(0, 50) + '...');
    
    // Test token verification
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('   Token verification: ✅ SUCCESS');
    console.log('   Decoded payload:', decoded);
  } catch (error) {
    console.log('   Token generation/verification: ❌ FAILED');
    console.log('   Error:', error.message);
  }
  
  // 3. Test database connection
  console.log('\n3. Testing Database Connection:');
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('   Database connection: ✅ SUCCESS');
    console.log('   Current time:', result.rows[0].current_time);
  } catch (error) {
    console.log('   Database connection: ❌ FAILED');
    console.log('   Error:', error.message);
  }
  
  // 4. Test user authentication functions
  console.log('\n4. Testing User Authentication Functions:');
  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    console.log('   Users table exists:', tableCheck.rows[0].exists ? '✅ YES' : '❌ NO');
    
    if (tableCheck.rows[0].exists) {
      // Count users
      const userCount = await pool.query('SELECT COUNT(*) FROM users');
      console.log('   Total users:', userCount.rows[0].count);
      
      // Check for recent OAuth users
      const oauthUsers = await pool.query(`
        SELECT id, email, auth_provider, last_login 
        FROM users 
        WHERE auth_provider = 'google' 
        ORDER BY last_login DESC 
        LIMIT 3
      `);
      
      console.log('   Recent Google OAuth users:', oauthUsers.rows.length);
      oauthUsers.rows.forEach(user => {
        console.log(`     - User ${user.id}: ${user.email} (last login: ${user.last_login})`);
      });
    }
  } catch (error) {
    console.log('   User authentication test: ❌ FAILED');
    console.log('   Error:', error.message);
  }
  
  // 5. Test session configuration
  console.log('\n5. Testing Session Configuration:');
  console.log('   SESSION_SECRET exists:', process.env.SESSION_SECRET ? '✅ YES' : '❌ NO');
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('   PORT:', process.env.PORT || 'not set');
  
  // 6. Test Google OAuth configuration
  console.log('\n6. Testing Google OAuth Configuration:');
  console.log('   GOOGLE_CLIENT_ID exists:', process.env.GOOGLE_CLIENT_ID ? '✅ YES' : '❌ NO');
  console.log('   GOOGLE_CLIENT_SECRET exists:', process.env.GOOGLE_CLIENT_SECRET ? '✅ YES' : '❌ NO');
  
  console.log('\n✅ Authentication flow test complete!');
  process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the test
testAuthFlow().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});