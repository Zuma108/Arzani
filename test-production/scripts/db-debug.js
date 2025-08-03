import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getDbConfig, shouldUseSSL } from '../config/database.js';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
console.log('Loading environment variables...');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Override with environment-specific file if exists
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;
if (fs.existsSync(path.join(__dirname, '..', envFile))) {
  console.log(`Loading ${envFile}...`);
  dotenv.config({ path: path.join(__dirname, '..', envFile) });
}

// Display current environment settings
console.log('\n=== Environment Settings ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

// Database connection settings (masked for security)
console.log('\n=== Database Configuration ===');
if (process.env.DATABASE_URL) {
  // Mask password in connection string
  const maskedUrl = process.env.DATABASE_URL.replace(
    /(postgres:\/\/[^:]+:)([^@]+)(@.+)/,
    '$1****$3'
  );
  console.log('DATABASE_URL:', maskedUrl);
} else {
  console.log('DB_HOST:', process.env.DB_HOST || 'not set');
  console.log('DB_NAME:', process.env.DB_NAME || 'not set');
  console.log('DB_USER:', process.env.DB_USER || 'not set');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '****' : 'not set');
  console.log('DB_PORT:', process.env.DB_PORT || 'not set');
}

// SSL settings
console.log('\n=== SSL Configuration ===');
console.log('ENABLE_SSL:', process.env.ENABLE_SSL || 'not set');
console.log('DB_SSL:', process.env.DB_SSL || 'not set');
console.log('Calculated SSL setting:', shouldUseSSL() ? 'Enabled' : 'Disabled');

// Get full database configuration
const dbConfig = getDbConfig();
console.log('\n=== Effective Database Settings ===');
const safePrintConfig = { ...dbConfig };
if (safePrintConfig.password) safePrintConfig.password = '****';
if (safePrintConfig.connectionString) {
  safePrintConfig.connectionString = safePrintConfig.connectionString.replace(
    /(postgres:\/\/[^:]+:)([^@]+)(@.+)/,
    '$1****$3'
  );
}
console.log(JSON.stringify(safePrintConfig, null, 2));

// Test database connection
console.log('\n=== Connection Test ===');
console.log('Connecting to database...');

async function testConnection() {
  const client = new pg.Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('Server version:', versionResult.rows[0].version);
    
    // Get SSL status
    const sslResult = await client.query('SHOW ssl');
    console.log('SSL enabled on server:', sslResult.rows[0].ssl);
    
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    
    // Specific error handling
    if (err.message.includes('SSL')) {
      console.error('\nSSL ERROR DETAILS:');
      console.error('- The server may not support SSL connections');
      console.error('- Try setting ENABLE_SSL=false and DB_SSL=false');
      console.error('- For local development, disable SSL');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('\nCONNECTION REFUSED:');
      console.error('- Check if PostgreSQL is running');
      console.error('- Verify hostname and port are correct');
      console.error('- Check if there are any firewall rules blocking the connection');
    } else if (err.code === '28P01') {
      console.error('\nAUTHENTICATION ERROR:');
      console.error('- Username or password is incorrect');
      console.error('- Verify DB_USER and DB_PASSWORD environment variables');
    }
    
    return false;
  } finally {
    try {
      await client.end();
    } catch (err) {
      // Ignore errors when closing the connection
    }
  }
}

// Run the connection test
await testConnection();
console.log('\n=== Debug Complete ===');
