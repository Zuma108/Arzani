import pineconeService from './services/pineconeService.js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';

// Load environment variables
dotenv.config();

/**
 * Script to check Pinecone connection and Docker status
 * 
 * This script will:
 * 1. Check if Docker is running
 * 2. Check if Pinecone environment variables are set
 * 3. Test the Pinecone connection
 * 4. Provide troubleshooting information
 */
async function checkPineconeConnection() {
  console.log('===== Pinecone Connection Checker =====');
  console.log('Checking environment...');
  
  // Check environment variables
  const envVars = {
    'PINECONE_API_KEY': process.env.PINECONE_API_KEY,
    'PINECONE_INDEX_NAME': process.env.PINECONE_INDEX_NAME,
    'PINECONE_CLOUD': process.env.PINECONE_CLOUD,
    'PINECONE_REGION': process.env.PINECONE_REGION
    // Note: PINECONE_ENVIRONMENT is no longer needed in the new SDK
  };
  
  let missingVars = [];
  
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      missingVars.push(key);
      console.log(`❌ ${key} is not set`);
    } else {
      console.log(`✅ ${key} is set${key === 'PINECONE_API_KEY' ? ' (value hidden)' : ''}`);
    }
  }
  
  // Check Docker status
  console.log('\nChecking Docker status...');
  let dockerRunning = false;
  
  try {
    execSync('docker info', { stdio: 'ignore' });
    console.log('✅ Docker is running');
    dockerRunning = true;
  } catch (error) {
    console.log('❌ Docker is not running or not installed');
    console.log('   Error:', error.message);
    console.log('   Note: Docker is optional with the latest Pinecone SDK. You can connect directly.');
  }
  
  // Check for .env file
  console.log('\nChecking .env file...');
  let envFileExists = false;
  
  try {
    fs.accessSync('.env', fs.constants.F_OK);
    console.log('✅ .env file exists');
    envFileExists = true;
  } catch (error) {
    console.log('❌ .env file does not exist');
  }
  
  // Test Pinecone connection
  console.log('\nTesting Pinecone connection...');
  let pineconeConnected = false;
  
  try {
    if (!pineconeService.client) {
      await pineconeService.initialize();
    }
    
    if (!pineconeService.client) {
      throw new Error('Pinecone client not initialized');
    }
    
    // Try to list indexes as a connection test
    const indexes = await pineconeService.client.listIndexes();
    console.log('✅ Successfully connected to Pinecone');
    console.log(`   Available indexes: ${JSON.stringify(indexes)}`);
    pineconeConnected = true;
  } catch (error) {
    console.log('❌ Failed to connect to Pinecone');
    console.log('   Error:', error.message);
  }
  
  // Provide troubleshooting information
  console.log('\n===== Troubleshooting Information =====');
  
  if (missingVars.length > 0) {
    console.log(`❗ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('   Create or update your .env file with these variables');
  }
  
  if (!dockerRunning) {
    console.log('❗ Docker is not running');
    console.log('   Note: With the latest Pinecone SDK, Docker is optional.');
    console.log('   The service will attempt to connect directly to Pinecone cloud.');
  }
  
  if (!envFileExists) {
    console.log('❗ .env file is missing');
    console.log('   Create a .env file in the project root with required Pinecone variables');
  }
  
  if (!pineconeConnected) {
    console.log('❗ Could not connect to Pinecone');
    console.log('   - Check your API key is correct');
    console.log('   - Check your internet connection');
    console.log('   - Visit https://app.pinecone.io to verify your account status');
  }
  
  // Summary
  console.log('\n===== Summary =====');
  if (missingVars.length === 0 && envFileExists && pineconeConnected) {
    console.log('✅ All checks passed! Your Pinecone connection is working correctly.');
  } else {
    console.log('❌ Some issues were detected. Please fix the issues highlighted above.');
  }
}

// Run the check
checkPineconeConnection().catch(error => {
  console.error('Error running connection checker:', error);
});

// Run the check
checkPineconeConnection().catch(error => {
  console.error('Error running connection checker:', error);
});
