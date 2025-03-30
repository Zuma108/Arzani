import pg from 'pg';
import dotenv from 'dotenv';
import pool, { getDbConfig } from '../config/database.js';

// Load environment variables
dotenv.config();

// Log connection configuration on import
console.log('Database module loaded with configuration:');
const config = getDbConfig();
console.log('- SSL:', config.ssl ? 'Enabled' : 'Disabled');
console.log('- Connection timeout:', config.connectionTimeoutMillis, 'ms');

// Add connection error handler
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  
  // Only exit if it's a critical error
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('Critical database connection error. Exiting process.');
    process.exit(-1);
  }
});

// Add connection success handler for one-time initialization
pool.on('connect', (client) => {
  // Only log once
  if (!pool.hasLoggedConnection) {
    console.log('✅ Successfully connected to PostgreSQL database');
    pool.hasLoggedConnection = true;
  }
});

// Connection test function with timeout
export const testConnection = async () => {
  try {
    // Set a timeout for the connection attempt
    const connectionPromise = pool.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
    );
    
    const client = await Promise.race([connectionPromise, timeoutPromise]);
    
    // Test with a simple query
    await client.query('SELECT 1');
    console.log('Database connection test successful');
    
    // Check SSL status
    try {
      const sslResult = await client.query('SHOW ssl');
      console.log('Database SSL status:', sslResult.rows[0].ssl);
    } catch (sslErr) {
      // Some database providers don't support this query
      console.log('Could not determine database SSL status');
    }
    
    client.release();
    return true;
  } catch (err) {
    console.error('Error connecting to database:', err.message);
    
    // Provide specific guidance for common errors
    if (err.message.includes('SSL')) {
      console.error('SSL ERROR: The server does not support SSL connections or SSL is misconfigured');
      console.error('SOLUTION:');
      console.error('1. For local development: Set ENABLE_SSL=false in your environment variables');
      console.error('2. For Azure/RDS: Make sure SSL is enabled on the server side');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('CONNECTION ERROR: Database server is not running or not accessible');
      console.error('SOLUTION:');
      console.error('1. Check if PostgreSQL is running');
      console.error('2. Verify host and port are correct');
      console.error('3. Check firewall rules if connecting to a remote database');
    } else if (err.code === '28P01') {
      console.error('AUTHENTICATION ERROR: Invalid username or password');
      console.error('SOLUTION:');
      console.error('1. Verify DB_USER and DB_PASSWORD environment variables');
      console.error('2. Check if the user has permission to access the database');
    }
    
    return false;
  }
};

// Export pool for use in application
export default pool;
