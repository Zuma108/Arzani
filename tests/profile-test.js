/**
 * Profile API Testing Script
 * Run this in your browser console on any page after logging in
 */

// Global test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    console.log(`✅ PASS: ${message}`);
    return true;
  } else {
    testResults.failed++;
    const errorMsg = `❌ FAIL: ${message}`;
    console.error(errorMsg);
    testResults.errors.push(errorMsg);
    return false;
  }
}

function getAuthToken() {
  return localStorage.getItem('token');
}

// Test functions
async function testProfileApi() {
  console.log('🔍 Testing /api/profile endpoint...');
  
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token found. Please log in first.');
      return false;
    }
    
    const response = await fetch('/api/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    assert(response.ok, 'Profile API returns 200 status code');
    
    if (response.ok) {
      const data = await response.json();
      assert(data.id, 'Profile data contains user ID');
      assert(data.username, 'Profile data contains username');
      assert(data.email, 'Profile data contains email');
      assert('profile_picture' in data, 'Profile data contains profile_picture field');
      
      console.log('📊 Profile data sample:', {
        id: data.id,
        username: data.username,
        email: data.email.replace(/(.{3})(.*)(@.*)/, '$1***$3'), // Mask email for privacy
        profile_picture: data.profile_picture
      });
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error testing profile API:', error);
    testResults.errors.push(`Error: ${error.message}`);
    return false;
  }
}

async function testProfilePictureEndpoint() {
  console.log('🔍 Testing profile picture upload simulation...');
  
  try {
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token found. Please log in first.');
      return false;
    }
    
    // We can't actually upload a file from the console,
    // but we can test if the endpoint is available
    const response = await fetch('/api/profile/upload-picture', {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Status code 204 is typical for OPTIONS requests
    assert(response.status !== 404, 'Profile picture upload endpoint exists');
    
    return response.status !== 404;
  } catch (error) {
    console.error('Error testing profile picture endpoint:', error);
    testResults.errors.push(`Error: ${error.message}`);
    return false;
  }
}

async function testProfilePageLoading() {
  console.log('🔍 Testing profile page loading...');
  
  try {
    // We'll use an iframe to load the profile page and test if it renders correctly
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    return new Promise((resolve) => {
      iframe.onload = () => {
        try {
          const hasProfileHeader = iframe.contentDocument.querySelector('.profile-header');
          const hasProfilePicture = iframe.contentDocument.querySelector('.profile-picture');
          const hasUploadForm = iframe.contentDocument.querySelector('#picture-form');
          
          assert(hasProfileHeader, 'Profile header is rendered');
          assert(hasProfilePicture, 'Profile picture is rendered');
          assert(hasUploadForm, 'Picture upload form is rendered');
          
          document.body.removeChild(iframe);
          resolve(true);
        } catch (error) {
          console.error('Error inspecting profile page:', error);
          document.body.removeChild(iframe);
          testResults.errors.push(`Error: ${error.message}`);
          resolve(false);
        }
      };
      
      iframe.src = '/profile';
    });
  } catch (error) {
    console.error('Error testing profile page:', error);
    testResults.errors.push(`Error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting profile tests...');
  
  const apiTest = await testProfileApi();
  const pictureEndpointTest = await testProfilePictureEndpoint();
  const pageLoadingTest = await testProfilePageLoading();
  
  console.log('\n📝 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n⚠️ Errors:');
    testResults.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`);
    });
  }
  
  return apiTest && pictureEndpointTest && pageLoadingTest && testResults.failed === 0;
}

// Execute tests
runTests()
  .then(success => {
    console.log(`\n${success ? '✅ All tests passed!' : '❌ Some tests failed!'}`);
  })
  .catch(error => {
    console.error('Error running tests:', error);
  });
