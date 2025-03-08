import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';

async function testEndpoint(path, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`Testing ${method} ${path}...`);
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const status = response.status;
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { error: 'Not JSON response' };
    }
    
    console.log(`Status: ${status}`);
    console.log('Response:', data);
    console.log('-------------------');
    
    return { status, data };
  } catch (error) {
    console.error(`Error testing ${path}:`, error.message);
    return { status: 'ERROR', error: error.message };
  }
}

async function runTests() {
  console.log('==== API TEST CLIENT ====');
  
  await testEndpoint('/api/market/trends');
  await testEndpoint('/api/verify-token');
  await testEndpoint('/api/business/19');
  
  console.log('==== TESTS COMPLETE ====');
}

runTests();
