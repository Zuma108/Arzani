/**
 * Profile Manual Test Script
 * 
 * Instructions:
 * 1. Log in to your application normally
 * 2. Navigate to /profile page
 * 3. Open browser console (F12)
 * 4. Paste and run this script
 */

console.log('🧪 Starting Profile Tests...');

// Helper for test results
const tests = {
  passed: 0,
  failed: 0,
  logs: []
};

function pass(message) {
  tests.passed++;
  const msg = `✅ PASS: ${message}`;
  console.log(msg);
  tests.logs.push(msg);
}

function fail(message) {
  tests.failed++;
  const msg = `❌ FAIL: ${message}`;
  console.error(msg);
  tests.logs.push(msg);
}

async function runTests() {
  // Test 1: Check if we're on the profile page
  if (!window.location.pathname.includes('/profile')) {
    console.error('❌ ERROR: Must run this test on the /profile page. Please navigate there first.');
    return false;
  }
  
  // Test 2: Check DOM elements
  const profileHeader = document.querySelector('.profile-header');
  profileHeader ? pass('Profile header exists') : fail('Profile header not found');
  
  const profilePicture = document.querySelector('.profile-picture');
  profilePicture ? pass('Profile picture exists') : fail('Profile picture not found');
  
  const pictureForm = document.getElementById('picture-form');
  pictureForm ? pass('Picture upload form exists') : fail('Picture upload form not found');
  
  // Test 3: Check token and authentication
  const token = localStorage.getItem('token');
  if (token) {
    pass('Authentication token exists');
    
    // Test 4: Test profile API
    try {
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        pass('Profile API returns 200 status code');
        
        const data = await response.json();
        if (data && data.id) {
          pass('Profile data contains valid user information');
          console.log('📊 Profile data:', {
            username: data.username,
            email: data.email.substring(0, 3) + '***' + data.email.substring(data.email.indexOf('@')),
            has_profile_picture: !!data.profile_picture
          });
        } else {
          fail('Profile data is incomplete or invalid');
        }
      } else {
        fail(`Profile API returned error status: ${response.status}`);
      }
    } catch (error) {
      fail(`Profile API test error: ${error.message}`);
    }
    
    // Test 5: Test profile picture upload endpoint
    try {
      const response = await fetch('/api/profile/upload-picture', {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status !== 404) {
        pass('Profile picture upload endpoint exists');
      } else {
        fail('Profile picture upload endpoint not found');
      }
    } catch (error) {
      fail(`Profile picture endpoint test error: ${error.message}`);
    }
  } else {
    fail('No authentication token found - you may not be logged in');
  }
  
  // Print summary
  console.log('\n📝 Test Summary:');
  console.log(`✅ Passed: ${tests.passed}`);
  console.log(`❌ Failed: ${tests.failed}`);
  
  return tests.failed === 0;
}

// Run tests
runTests()
  .then(success => {
    console.log(`\n${success ? '🎉 All tests passed!' : '❌ Some tests failed!'}`);
  })
  .catch(error => {
    console.error('Error running tests:', error);
  });
