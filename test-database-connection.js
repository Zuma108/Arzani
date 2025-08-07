#!/usr/bin/env node

import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine which environment to test
const environment = process.argv[2] || 'development';
const envFile = environment === 'production' ? '.env.production' : '.env';

console.log(`Testing database connection for: ${environment}`);
console.log(`Loading environment from: ${envFile}`);

// Load environment variables
dotenv.config({ path: path.join(__dirname, envFile) });

const { Pool } = pg;

// Create connection configuration (same logic as db.js)
function shouldUseSSL() {
  if (process.env.ENABLE_SSL === 'false' || process.env.DB_SSL === 'false') {
    return false;
  }
  
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('/cloudsql/')) {
    console.log('Google Cloud SQL proxy detected, disabling SSL');
    return false;
  }
  
  if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'))) {
    return false;
  }
  
  return environment === 'production';
}

let connectionConfig;

if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  const useSSL = shouldUseSSL();
  console.log(`SSL setting: ${useSSL ? 'Enabled' : 'Disabled'}`);
  
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
} else {
  console.log('Using individual parameters for connection');
  const useSSL = shouldUseSSL();
  
  connectionConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
}

console.log('Connection config (password hidden):');
console.log({
  ...connectionConfig,
  password: '***hidden***',
  connectionString: connectionConfig.connectionString ? 
    connectionConfig.connectionString.replace(/:([^:@]+)@/, ':***@') : undefined
});

// Test the connection
const pool = new Pool(connectionConfig);

async function testConnection() {
  try {
    console.log('\nTesting database connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query execution successful!');
    console.log('Database time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
    
    // Test businesses table exists
    try {
      const businessCheck = await client.query('SELECT COUNT(*) FROM businesses');
      console.log('✅ Businesses table found!');
      console.log(`Number of businesses: ${businessCheck.rows[0].count}`);
    } catch (err) {
      console.log('⚠️  Businesses table not found or inaccessible:', err.message);
    }
    
    // Test users table exists
    try {
      const userCheck = await client.query('SELECT COUNT(*) FROM users');
      console.log('✅ Users table found!');
      console.log(`Number of users: ${userCheck.rows[0].count}`);
    } catch (err) {
      console.log('⚠️  Users table not found or inaccessible:', err.message);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error details:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    // Suggest fixes based on error
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Suggestion: Check your database host configuration');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 Suggestion: Check your username and password');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n💡 Suggestion: Check your database name configuration');
    } else if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n💡 Suggestion: Database server may not be running or accessible');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the test
testConnection().then(() => {
  console.log('\n🎉 Database connection test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Database connection test failed:', error.message);
  process.exit(1);
});
