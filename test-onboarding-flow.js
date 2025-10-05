// Test Onboarding Flow
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testOnboardingFlow() {
  console.log('🧪 Testing Onboarding Flow');
  console.log('================================');
  
  try {
    // Test 1: Access marketplace2 without authentication (should be redirected to login)
    console.log('\n1. Testing marketplace2 access without authentication...');
    try {
      const response = await axios.get(`${BASE_URL}/marketplace2`, {
        maxRedirects: 0,
        validateStatus: () => true
      });
      console.log(`   Status: ${response.status}`);
      if (response.status === 302) {
        console.log(`   ✅ Correctly redirected to: ${response.headers.location}`);
      } else if (response.status === 200) {
        console.log('   ❌ Should have been redirected to login');
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 2: Check onboarding page accessibility
    console.log('\n2. Testing onboarding page accessibility...');
    try {
      const response = await axios.get(`${BASE_URL}/onboarding`, {
        validateStatus: () => true
      });
      console.log(`   Status: ${response.status}`);
      if (response.status === 200) {
        console.log('   ✅ Onboarding page accessible');
      } else if (response.status === 302) {
        console.log(`   ⚠️  Redirected to: ${response.headers.location}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 3: Check login page
    console.log('\n3. Testing login page...');
    try {
      const response = await axios.get(`${BASE_URL}/login`, {
        validateStatus: () => true
      });
      console.log(`   Status: ${response.status}`);
      if (response.status === 200) {
        console.log('   ✅ Login page accessible');
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Test 4: Check onboarding status API endpoint
    console.log('\n4. Testing onboarding status API...');
    try {
      const response = await axios.get(`${BASE_URL}/users/onboarding-status`, {
        validateStatus: () => true
      });
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ✅ Correctly returns 401 for unauthenticated user');
      } else {
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    console.log('\n================================');
    console.log('✅ Basic onboarding flow test complete');
    console.log('\n📝 Next steps for full testing:');
    console.log('   1. Register/login with a test account');
    console.log('   2. Verify redirect to onboarding');
    console.log('   3. Complete onboarding process');
    console.log('   4. Verify access to marketplace2');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testOnboardingFlow();