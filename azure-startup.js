// Improved Azure startup script with better error handling

// Import required modules for environment setup
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureAITables } from './startup-helpers/ensure-ai-tables.js';

// Setup directory names for ES modules
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
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = `.env.${nodeEnv}`;
  if (fs.existsSync(path.join(__dirname, envFile))) {
    console.log(`Loading ${envFile}`);
    dotenv.config({ path: path.join(__dirname, envFile) });
  }
  
  // Finally load default .env file
  console.log('Loading .env');
  dotenv.config({ path: path.join(__dirname, '.env') });
  
  // Forcibly set AWS credentials to ensure they're correct
  const forcedCredentials = {
    AWS_ACCESS_KEY_ID: 'AKIA5WLTS45XNHMUBGWY',
    AWS_SECRET_ACCESS_KEY: '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',
    AWS_REGION: 'eu-west-2',
    AWS_BUCKET_NAME: 'arzani-images1'
  };
  
  Object.entries(forcedCredentials).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  console.log('AWS credentials set.');
}

// Main function to start the server
async function startServer() {
  try {
    // Load environment variables first
    loadEnvironmentVariables();
    
    console.log('Starting server with environment:', process.env.NODE_ENV);
    
    // Ensure required tables exist
    try {
      await ensureAITables();
    } catch (tableError) {
      console.error('Warning: Error ensuring AI tables:', tableError);
      // Continue with startup even if table creation fails
    }
    
    // Import server.js after environment variables are loaded
    const { server } = await import('./server.js');
    
    // Add additional error handler for the server
    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
    
    console.log('Server imported successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the startup sequence
startServer().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
