/**
 * Basic Profile E2E Test
 * - Uses direct email/password login instead of Google auth
 * - Tests just core functionality
 * 
 * Prerequisites:
 * - npm install puppeteer dotenv
 */

import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config();

const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  testEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
  testPassword: process.env.TEST_USER_PASSWORD || 'testpassword123',
  headless: true
};

async function runTest() {
  console.log('🧪 Starting basic profile test...');
  console.log(`🌐 Base URL: ${config.baseUrl}`);

  const browser = await puppeteer.launch({ 
    headless: config.headless ? 'new' : false,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  try {
    // Log console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Console Error: ${msg.text()}`);
      }
    });

    // Step 1: Open login page
    console.log('Opening login page...');
    await page.goto(`${config.baseUrl}/login`);
    
    // Take screenshot of login page
    await page.screenshot({ path: path.join(__dirname, 'login-page.png') });
    console.log('✅ Saved screenshot of login page to login-page.png');

    // Step 2: Enter email in the first step (based on your current login flow)
    console.log('Entering email...');
    await page.waitForSelector('#email');
    await page.type('#email', config.testEmail);
    await page.click('.login-button');
    
    // Wait for navigation or password field to appear
    try {
      // This handles both redirect to login2 or password field appearing
      await Promise.race([
        page.waitForNavigation({ timeout: 3000 }),
        page.waitForSelector('#password', { timeout: 3000 })
      ]);
      
      console.log('✅ First login step completed');
      
      // Take screenshot after first login step
      await page.screenshot({ path: path.join(__dirname, 'login-step2.png') });
      console.log('✅ Saved screenshot to login-step2.png');

      // Check if we're on the second login page (login2)
      const url = page.url();
      console.log(`Current URL: ${url}`);
      
      if (url.includes('login2')) {
        console.log('Entering password on login2 page...');
        await page.waitForSelector('#password');
        await page.type('#password', config.testPassword);
        await Promise.all([
          page.click('.login-button'),
          page.waitForNavigation({ timeout: 5000 })
        ]);
      }
    } catch (error) {
      console.log('Navigation or selector timeout:', error.message);
      // Continue anyway - we may already be logged in
    }

    // Step 3: Check if we're logged in and on a valid page
    console.log('Checking login status...');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    if (token) {
      console.log('✅ Login successful - found token in localStorage');
    } else {
      console.log('⚠️ No token found in localStorage');
    }
    
    // Take screenshot of current page
    await page.screenshot({ path: path.join(__dirname, 'post-login.png') });
    console.log('✅ Saved screenshot of post-login page to post-login.png');
    
    // Step 4: Navigate to profile page
    console.log('Navigating to profile page...');
    await page.goto(`${config.baseUrl}/profile`);
    await page.waitForTimeout(2000); // Give it time to load
    
    // Take screenshot of profile page
    await page.screenshot({ path: path.join(__dirname, 'profile-page.png') });
    console.log('✅ Saved screenshot of profile page to profile-page.png');
    
    // Check if we're actually on the profile page
    const profileHeader = await page.$('.profile-header');
    
    if (profileHeader) {
      console.log('✅ Successfully loaded profile page');
    } else {
      console.log('❌ Profile page elements not found');
      // Capture HTML for debugging
      const html = await page.content();
      console.log('Current page HTML:', html.substring(0, 500) + '...');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

// Run the test
runTest().catch(console.error);
