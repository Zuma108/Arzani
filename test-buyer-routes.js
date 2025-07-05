#!/usr/bin/env node

/**
 * Route Diagnostic Script
 * Tests if the buyer API routes are accessible and working correctly
 */

console.log('🔍 Testing Buyer API Routes...\n');

// Test basic connectivity
async function testRoutes() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test 1: Check if buyer test endpoint is accessible
    console.log('1. Testing buyer test endpoint...');
    const testResponse = await fetch(`${baseUrl}/api/buyer/test`);
    console.log(`   Status: ${testResponse.status}`);
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('   Response:', testData);
      console.log('   ✅ Buyer API routes are accessible\n');
    } else {
      console.log('   ❌ Buyer API test endpoint failed');
      console.log('   Response text:', await testResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Error testing routes:', error.message);
    console.log('\n💡 Make sure the server is running on port 5000');
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  testRoutes();
}

export { testRoutes };
