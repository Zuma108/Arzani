/**
 * API Endpoints Test
 * Run this in the browser console to check if API routes are accessible
 */

// Style for better console output
console.log('%c📡 API Endpoints Test', 'font-size: 16px; font-weight: bold; color: #4CAF50');

// Get auth token
const token = localStorage.getItem('token');
if (!token) {
  console.error('❌ No authentication token found. Please log in first.');
} else {
  console.log('✅ Auth token found');
  
  // Define API endpoints to test
  const endpoints = [
    { path: '/api/profile', method: 'GET', auth: true },
    { path: '/api/profile/upload-picture', method: 'OPTIONS', auth: true },
    { path: '/api/profile-test', method: 'GET', auth: false },
    { path: '/profile', method: 'GET', auth: false }
  ];
  
  // Test each endpoint
  console.log('🔍 Testing API endpoints...');
  
  endpoints.forEach(endpoint => {
    const headers = endpoint.auth 
      ? { 'Authorization': `Bearer ${token}` } 
      : {};
      
    fetch(endpoint.path, { method: endpoint.method, headers })
      .then(response => {
        const status = response.status;
        const statusText = response.statusText;
        
        if (status >= 200 && status < 300) {
          console.log(`✅ ${endpoint.method} ${endpoint.path} - ${status} ${statusText}`);
          return response.text().then(text => {
            try {
              if (text) return JSON.parse(text);
              return null;
            } catch (e) {
              console.log(`Response is not JSON: ${text.substring(0, 100)}...`);
              return null;
            }
          });
        } else {
          console.error(`❌ ${endpoint.method} ${endpoint.path} - ${status} ${statusText}`);
          return null;
        }
      })
      .then(data => {
        if (data) {
          console.log(`📦 Response data:`, data);
        }
      })
      .catch(error => {
        console.error(`❌ Error with ${endpoint.path}:`, error);
      });
  });
}
