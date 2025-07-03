/**
 * ChatGPT Helper Test Script
 * Tests the A2A message logging functionality after fixes
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:3000/api/a2a/log-message';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN'; // Replace with a valid token

// Test message data
const messageData = {
  content: 'Test message to verify A2A message logging fixes',
  messageType: 'user',
  userId: 1,
  // Intentionally omitting senderType to test fix
  metadata: {
    agent: 'orchestrator',
    inputMethod: 'test_script',
    timestamp: new Date().toISOString()
  }
};

// Send test request
async function testMessageLogging() {
  try {
    console.log('Sending test message to A2A log-message endpoint...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(messageData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test successful! Message logged with response:', result);
    } else {
      console.error('❌ Test failed with error:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testMessageLogging().then(result => {
  console.log('Test completed with result:', result);
});
