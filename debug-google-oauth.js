const puppeteer = require('puppeteer');

async function debugGoogleOAuth() {
  console.log('🔍 Starting Google OAuth debug...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    devtools: true
  });
  
  try {
    const page = await browser.newPage();
    
    // Listen to console messages
    page.on('console', msg => {
      console.log('📄 Browser console:', msg.text());
    });
    
    // Listen to network requests
    page.on('response', response => {
      if (response.url().includes('/auth/google')) {
        console.log('🌐 Google auth response:', response.status());
      }
    });
    
    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:5000/auth/login');
    
    // Wait for page to load
    await page.waitForSelector('#google-signin-btn', { timeout: 10000 });
    console.log('✅ Google sign-in button found');
    
    // Check for returnTo parameter
    const returnToElement = await page.$('[name="returnTo"]');
    if (returnToElement) {
      const returnToValue = await returnToElement.getAttribute('value');
      console.log('🔗 returnTo value:', returnToValue);
    }
    
    // Check URL parameters
    const currentUrl = page.url();
    console.log('🌐 Current URL:', currentUrl);
    
    // Let the user manually test Google login
    console.log('⏳ Please manually test Google OAuth in the browser...');
    console.log('   The browser will stay open for 60 seconds');
    
    // Wait for manual testing
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug if puppeteer is available
if (require.resolve('puppeteer')) {
  debugGoogleOAuth().catch(console.error);
} else {
  console.log('❌ Puppeteer not installed. Please install it: npm install puppeteer');
}
