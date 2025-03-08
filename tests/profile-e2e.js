/**
 * E2E tests for profile functionality
 * Run with Node.js: node tests/profile-e2e.js
 * 
 * Prerequisites:
 * - npm install puppeteer dotenv
 * - Server must be running on localhost:5000
 */

// Convert CommonJS requires to ES Module imports
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  testPassword: process.env.TEST_USER_PASSWORD || 'testpassword123',
  headless: process.env.TEST_HEADLESS !== 'false', // Default to headless unless explicitly set to false
  slowMo: parseInt(process.env.TEST_SLOW_MO || '0') // Slow down operations for debugging
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function logSuccess(message) {
  results.passed++;
  console.log(`✅ PASS: ${message}`);
}

function logFailure(message, error = null) {
  results.failed++;
  console.error(`❌ FAIL: ${message}`);
  if (error) {
    console.error(error);
    results.errors.push({ message, error });
  } else {
    results.errors.push({ message });
  }
}

// Main test function
async function runTests() {
  console.log(`\n🧪 Starting profile E2E tests on ${config.baseUrl}`);
  console.log('----------------------------------------');
  
  const browser = await puppeteer.launch({ 
    headless: config.headless,
    slowMo: config.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Setup console log listener
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    }
  });
  
  try {
    // Test 1: Login
    results.total++;
    try {
      await page.goto(`${config.baseUrl}/login`);
      await page.waitForSelector('form', { timeout: 5000 });
      
      // Fill login form
      await page.type('input[type="email"]', config.testEmail);
      await page.type('input[type="password"]', config.testPassword);
      
      // Submit form and wait for navigation
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
      
      // Check if we're logged in by looking for token in localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      if (token) {
        logSuccess('User login successful');
      } else {
        logFailure('User login failed - no token found');
      }
    } catch (error) {
      logFailure('Login test failed', error);
    }
    
    // Test 2: Navigate to profile page
    results.total++;
    try {
      await page.goto(`${config.baseUrl}/profile`);
      await page.waitForSelector('.profile-header', { timeout: 5000 });
      
      const profileTitle = await page.$eval('.profile-header h1', el => el.textContent);
      
      if (profileTitle && profileTitle.length > 0) {
        logSuccess(`Profile page loaded with username: ${profileTitle}`);
      } else {
        logFailure('Profile page loaded but username not found');
      }
    } catch (error) {
      logFailure('Profile navigation test failed', error);
    }
    
    // Test 3: Check profile API response
    results.total++;
    try {
      // Get the token from localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Make a request to the profile API
      const response = await page.evaluate(async (token) => {
        const res = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        return {
          ok: res.ok,
          status: res.status,
          data: res.ok ? await res.json() : null
        };
      }, token);
      
      if (response.ok && response.data && response.data.id) {
        logSuccess('Profile API returned valid user data');
      } else {
        logFailure(`Profile API failed with status ${response.status}`);
      }
    } catch (error) {
      logFailure('Profile API test failed', error);
    }
    
    // Test 4: Profile picture upload form exists
    results.total++;
    try {
      const uploadForm = await page.$('#picture-form');
      const fileInput = await page.$('input[name="profile_picture"]');
      
      if (uploadForm && fileInput) {
        logSuccess('Profile picture upload form exists');
      } else {
        logFailure('Profile picture upload form not found');
      }
    } catch (error) {
      logFailure('Profile picture form test failed', error);
    }
    
    // Test 5: Profile picture upload simulation
    // We won't actually upload a real file in automated tests
    results.total++;
    try {
      // Get token from localStorage
      const token = await page.evaluate(() => localStorage.getItem('token'));
      
      // Create a FormData object with a dummy file
      const testResult = await page.evaluate(async (token) => {
        // This won't actually upload anything, just tests if the endpoint responds
        const res = await fetch('/api/profile/upload-picture', {
          method: 'OPTIONS',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        return {
          status: res.status,
          ok: res.ok || res.status === 204 // OPTIONS requests often return 204
        };
      }, token);
      
      if (testResult.ok) {
        logSuccess('Profile picture upload endpoint is accessible');
      } else {
        logFailure(`Profile picture upload endpoint test failed with status ${testResult.status}`);
      }
    } catch (error) {
      logFailure('Profile picture upload simulation test failed', error);
    }
    
    // Test 6: Sign out functionality
    results.total++;
    try {
      const signOutBtn = await page.$('#signOutBtn');
      
      if (signOutBtn) {
        // Click sign out button
        await signOutBtn.click();
        
        // Wait for navigation and check if token is cleared
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        const token = await page.evaluate(() => localStorage.getItem('token'));
        
        if (!token) {
          logSuccess('Sign out functionality works correctly');
        } else {
          logFailure('Sign out did not clear the authentication token');
        }
      } else {
        logFailure('Sign out button not found');
      }
    } catch (error) {
      logFailure('Sign out test failed', error);
    }
    
  } catch (error) {
    console.error('Unexpected test error:', error);
  } finally {
    // Generate test summary
    console.log('\n----------------------------------------');
    console.log('📊 Test Summary:');
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️ Error Details:');
      results.errors.forEach((err, i) => {
        console.log(`${i + 1}. ${err.message}`);
      });
    }
    
    // Clean up
    await browser.close();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Run the tests
runTests();
