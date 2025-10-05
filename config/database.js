import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to determine if SSL should be enabled
export function shouldUseSSL() {
  // First check for explicit boolean settings
  if (process.env.ENABLE_SSL === 'false' || process.env.DB_SSL === 'false') {
    console.log('SSL explicitly disabled via environment variables');
    return false;
  }
  
  if (process.env.ENABLE_SSL === 'true' || process.env.DB_SSL === 'true') {
    console.log('SSL explicitly enabled via environment variables');
    return true;
  }
  
  // Automatically disable SSL for localhost connections
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')) {
    console.log('Localhost detected in DATABASE_URL, disabling SSL');
    return false;
  }
  
  // Check for DATABASE_URL patterns that typically require SSL
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.includes('azure.com') || 
        process.env.DATABASE_URL.includes('rds.amazonaws.com')) {
      console.log('Cloud database detected, enabling SSL by default');
      return true;
    }
  }
  
  // Default to SSL in production only
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment detected, enabling SSL by default');
    return true;
  }
  
  // Disable SSL by default in development
  console.log('Development environment detected, disabling SSL by default');
  return false;
}

// Get database configuration with safe SSL settings
export function getDbConfig() {
  // Determine if SSL should be used
  const useSSL = shouldUseSSL();
  console.log(`Database SSL setting: ${useSSL ? 'Enabled' : 'Disabled'}`);
  
  // Create SSL configuration object if needed
  let sslConfig = useSSL ? { rejectUnauthorized: false } : false;
  
  // Check for direct database URL first
  if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL for connection');
    const config = {
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig
    };
    
    return config;
  }
  
  // Otherwise, use individual parameters
  console.log('Using individual parameters for connection');
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'my-marketplace',
    ssl: sslConfig,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000
  };
}

// Create database pool with proper configuration
const pool = new pg.Pool(getDbConfig());

// Add a connection error handler for better debugging
pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
  
  // Additional troubleshooting for SSL errors
  if (err.message.includes('SSL')) {
    console.error('SSL ERROR DETAILS:');
    console.error('- Check if your database supports SSL connections');
    console.error('- For local development, set ENABLE_SSL=false');
    console.error('- For RDS or Azure, SSL is typically required');
  }
});

// Export the pool for use in the application
export default pool;