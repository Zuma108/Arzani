/**
 * Profile API Debug Script
 * 
 * Instructions:
 * 1. Log in to your application normally
 * 2. Open browser console (F12)
 * 3. Paste and run this script
 */

console.log('🔍 Profile Debug Tool');

// Get authentication token from localStorage
const token = localStorage.getItem('token');

if (!token) {
  console.error('⚠️ No authentication token found. Please log in first.');
} else {
  console.log('✅ Authentication token found');
  
  // Debug token content
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('📋 Token payload:', payload);
      console.log(`⏰ Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`);
      console.log(`👤 User ID: ${payload.userId || 'Not found'}`);
    } else {
      console.warn('⚠️ Token does not appear to be a valid JWT');
    }
  } catch (error) {
    console.error('❌ Error parsing token:', error);
  }
  
  // Debug API request
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  };
  
  console.log('🔄 Testing profile API...');
  
  fetch('/api/profile', { headers })
    .then(response => {
      console.log(`📡 API status: ${response.status} ${response.statusText}`);
      console.log('📋 Response headers:', Object.fromEntries([...response.headers.entries()]));
      return response.json().catch(err => ({ error: 'Failed to parse JSON', details: err.message }));
    })
    .then(data => {
      console.log('📊 Response data:', data);
      
      // Check for common issues
      if (data.error === 'User not found') {
        console.error('❌ The user ID in your token does not exist in the database');
      } else if (data.error === 'Failed to fetch profile') {
        console.error('❌ Database error - check server logs');
      }
      
      if (data.id) {
        console.log('✅ Successfully retrieved profile data');
      }
    })
    .catch(error => {
      console.error('❌ Network error:', error);
    });
  
  // Debug upload endpoint
  console.log('🔄 Testing profile picture upload endpoint...');
  
  fetch('/api/profile/upload-picture', {
    method: 'OPTIONS',
    headers
  })
    .then(response => {
      console.log(`📡 Upload endpoint status: ${response.status} ${response.statusText}`);
      if (response.status !== 404) {
        console.log('✅ Profile picture upload endpoint exists');
      } else {
        console.error('❌ Profile picture upload endpoint not found');
      }
    })
    .catch(error => {
      console.error('❌ Upload endpoint error:', error);
    });
}

// Debug DOM elements on profile page
if (window.location.pathname.includes('/profile')) {
  console.log('🔄 Analyzing profile page DOM...');
  const elements = {
    profileHeader: document.querySelector('.profile-header'),
    profilePicture: document.querySelector('.profile-picture'),
    uploadForm: document.getElementById('picture-form'),
    signOutButton: document.getElementById('signOutBtn')
  };
  
  for (const [name, element] of Object.entries(elements)) {
    console.log(`${element ? '✅' : '❌'} ${name}: ${element ? 'Found' : 'Not found'}`);
    if (element) {
      console.log(`📝 ${name} HTML:`, element.outerHTML);
    }
  }
} else {
  console.log('ℹ️ Not on profile page. Navigate to /profile for DOM analysis.');
}
