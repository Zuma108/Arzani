// Improved Azure startup script with better error handling

// Add support for both module systems
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import core modules
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { testConnection } from './db/index.js';
import { ensureAITables } from './startup-helpers/ensure-ai-tables.js';

// Fix __dirname and __filename in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables in order of precedence
function loadEnvironmentVariables() {
  console.log('Loading environment variables...');
  
  // .env.local takes precedence (for local overrides)
  if (fs.existsSync(path.join(__dirname, '.env.local'))) {
    console.log('Loading .env.local');
    dotenv.config({ path: path.join(__dirname, '.env.local') });
  }
  
  // Then load environment specific file
  const nodeEnv = process.env.NODE_ENV || 'production';
  const envFile = `.env.${nodeEnv}`;
  if (fs.existsSync(path.join(__dirname, envFile))) {
    console.log(`Loading ${envFile}`);
    dotenv.config({ path: path.join(__dirname, envFile) });
  }
  
  // Finally load default .env file
  console.log('Loading .env');
  dotenv.config({ path: path.join(__dirname, '.env') });
  
  // Only override settings for local development, not for production/Azure
  if (process.env.NODE_ENV === 'development' || !process.env.DATABASE_URL) {
    console.log('Setting local development database parameters...');
    
    // Set development variables only if DATABASE_URL isn't already set
    const localDevVariables = {
      DB_USER: 'marketplace_user',
      DB_PASSWORD: 'Olumide123!',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'my-marketplace',
      // Explicitly disable SSL for local development
      DB_SSL: 'false',
      ENABLE_SSL: 'false',
    };
    
    Object.entries(localDevVariables).forEach(([key, value]) => {
      // Only set if not already defined
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
    
    console.log('Local database configuration set');
  } else {
    console.log('Using provided DATABASE_URL for connection');
    
    // If DATABASE_URL is set (e.g., in Azure), make sure SSL is properly configured
    if (process.env.DATABASE_URL && !process.env.ENABLE_SSL) {
      // For Azure Database for PostgreSQL and RDS, SSL is typically required
      if (process.env.DATABASE_URL.includes('azure.com') || 
          process.env.DATABASE_URL.includes('rds.amazonaws.com')) {
        console.log('Detected cloud database, enabling SSL');
        process.env.ENABLE_SSL = 'true';
      }
    }
  }

  // Set AWS credentials (only if not already set)
  const awsCredentials = {
    AWS_REGION: process.env.AWS_REGION || 'eu-west-2',
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME || 'arzani-images1'
  };
  
  // Only set AWS credentials if not already present
  Object.entries(awsCredentials).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
  
  // Log configuration type
  if (process.env.DATABASE_URL) {
    console.log('Using connection string for database configuration');
  } else {
    console.log('Using individual parameters for database configuration');
  }
  
  // Explicitly log whether SSL is enabled
  const sslEnabled = process.env.ENABLE_SSL === 'true' || process.env.DB_SSL === 'true';
  console.log(`Database SSL ${sslEnabled ? 'enabled' : 'disabled'}`);
}

// Main function to start the server
async function startServer() {
  try {
    console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
    
    // Load environment variables first
    loadEnvironmentVariables();
    
    // Explicitly log DB configuration
    console.log('Database configuration:');
    if (process.env.DATABASE_URL) {
      // Mask password in connection URL
      const maskedUrl = process.env.DATABASE_URL.replace(
        /(postgres:\/\/[^:]+:)([^@]+)(@.+)/,
        '$1****$3'
      );
      console.log('- Connection URL:', maskedUrl);
    } else {
      console.log('- Host:', process.env.DB_HOST);
      console.log('- Database:', process.env.DB_NAME);
      console.log('- User:', process.env.DB_USER);
      console.log('- Port:', process.env.DB_PORT);
    }
    console.log('- Enable SSL:', process.env.ENABLE_SSL === 'true' ? 'Yes' : 'No');
    
    // Test database connection first
    console.log('Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.warn('⚠️ Warning: Database connection failed. Some features may not work properly.');
      console.warn('⚠️ Please check your database configuration and make sure PostgreSQL is running.');
      console.warn('⚠️ If SSL issues persist, set ENABLE_SSL=false in your environment variables.');
    } else {
      console.log('✅ Database connection successful!');
    }
    
    // Try to ensure AI tables exist
    let aiTablesCreated = false;
    try {
      console.log('Setting up AI tables...');
      aiTablesCreated = await ensureAITables();
      
      if (aiTablesCreated) {
        console.log('✅ AI tables created/verified successfully!');
      } else {
        console.warn('⚠️ Warning: Failed to ensure AI tables exist.');
      }
    } catch (err) {
      console.warn('⚠️ Warning: Error ensuring AI tables:', err.message);
      // Continue with startup even if table creation fails
    }
    
    // Initialize the server
    console.log('Initializing server...');
    const serverModule = await import('./server.js');
    console.log('✅ Server started successfully');
    
    // Log startup status
    console.log('\n--- STARTUP SUMMARY ---');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Database Connection:', dbConnected ? '✅ Connected' : '❌ Failed');
    console.log('AI Tables:', aiTablesCreated ? '✅ Ready' : '⚠️ Issues detected');
    console.log('Server Status: ✅ Running');
    console.log('---------------------\n');
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Run the startup sequence
startServer().catch(err => {
  console.error('Unhandled error during startup:', err);
  process.exit(1);
});
