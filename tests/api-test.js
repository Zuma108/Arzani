/**
 * API Tests for Profile Functionality
 * Run with Node.js
 * 
 * Prerequisites:
 * - npm install node-fetch dotenv form-data
 * - Server must be running on localhost:5000
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  testEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
  testPassword: process.env.TEST_USER_PASSWORD || 'testpassword123'
};

// Test results
let token;
const results = {
  passed: 0,
  failed: 0,
  skipped: 0
};

// Helper functions
function pass(message) {
  results.passed++;
  console.log(`✅ PASS: ${message}`);
}

function fail(message) {
  results.failed++;
  console.error(`❌ FAIL: ${message}`);
}

function skip(message) {
  results.skipped++;
  console.warn(`⚠️ SKIP: ${message}`);
}

// Test functions
async function login() {
  console.log('\n🔑 Testing login to obtain token...');
  
  try {
    const response = await fetch(`${config.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: config.testEmail,
        password: config.testPassword
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      token = data.token;
      pass('Successfully obtained authentication token');
      return true;
    } else {
      fail(`Login failed with status ${response.status}: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    fail(`Login request error: ${error.message}`);
    return false;
  }
}

async function testProfileApi() {
  console.log('\n👤 Testing /api/profile endpoint...');
  
  if (!token) {
    skip('Profile API test skipped - no authentication token');
    return false;
  }
  
  try {
    const response = await fetch(`${config.baseUrl}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      pass('Profile API returns success status code');
      
      // Validate data structure
      const hasRequiredFields = data.id && 
                               data.username && 
                               data.email && 
                               'profile_picture' in data;
      
      if (hasRequiredFields) {
        pass('Profile data contains all required fields');
        console.log('📊 Profile data:', {
          id: data.id,
          username: data.username,
          email: data.email.substring(0, 3) + '***' + data.email.substring(data.email.indexOf('@')),
          has_profile_picture: !!data.profile_picture
        });
        return true;
      } else {
        fail(`Profile data missing required fields: ${JSON.stringify(data)}`);
        return false;
      }
    } else {
      fail(`Profile API returned status ${response.status}: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    fail(`Profile API request error: ${error.message}`);
    return false;
  }
}

async function testProfilePictureUpload() {
  console.log('\n📷 Testing profile picture upload endpoint...');
  
  if (!token) {
    skip('Profile picture upload test skipped - no authentication token');
    return false;
  }
  
  // Create a test image
  const testImagePath = path.join(__dirname, 'test-profile-pic.png');
  const hasTestImage = fs.existsSync(testImagePath);
  
  if (!hasTestImage) {
    skip('Profile picture upload test skipped - no test image available');
    return false;
  }
  
  try {
    // Create form data with test image
    const form = new FormData();
    form.append('profile_picture', fs.createReadStream(testImagePath));
    
    const response = await fetch(`${config.baseUrl}/api/profile/upload-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      pass('Profile picture upload successful');
      console.log('🖼️ New profile picture URL:', data.profile_picture);
      return true;
    } else {
      fail(`Profile picture upload failed: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    fail(`Profile picture upload error: ${error.message}`);
    return false;
  }
}

// Main function
async function runTests() {
  console.log('🧪 Starting API tests for profile functionality');
  console.log(`🌐 Testing against: ${config.baseUrl}`);
  console.log('-----------------------------------------');
  
  // Run login test first to get token
  const loginSuccess = await login();
  
  if (loginSuccess) {
    await testProfileApi();
    await testProfilePictureUpload();
  }
  
  // Print summary
  console.log('\n-----------------------------------------');
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️ Skipped: ${results.skipped}`);
  
  // Return success/failure
  return results.failed === 0;
}

// Run tests and handle result
runTests()
  .then(success => {
    console.log(`\n${success ? '🎉 All tests passed!' : '❌ Some tests failed!'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
