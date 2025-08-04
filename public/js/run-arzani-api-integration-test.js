/**
 * Arzani-X API Integration Test
 * This script tests the integration between the Arzani-X frontend and the /api/threads API
 * It creates a new conversation, sends a message, and fetches messages using the updated endpoints
 */

// Get auth token from environment variables
const authToken = process.env.AUTH_TOKEN;

if (!authToken) {
  console.error('❌ AUTH_TOKEN environment variable is required');
  process.exit(1);
}

// Test API integration with real data
async function testApiIntegration() {
  try {
    console.log('🧪 Testing Arzani-X API integration with /api/threads...');
    
    // Step 1: Create a new conversation
    console.log('\n📝 Step 1: Creating a new conversation...');
    const createResponse = await fetch('http://localhost:3000/api/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'API Integration Test',
        is_ai_chat: true
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create conversation: HTTP ${createResponse.status}`);
    }
    
    const createData = await createResponse.json();
    const conversationId = createData.id || createData.conversation_id;
    console.log(`✅ Conversation created with ID: ${conversationId}`);
    
    // Step 2: Send a test message to the conversation
    console.log('\n📝 Step 2: Sending a test message...');
    const sendResponse = await fetch(`http://localhost:3000/api/threads/${conversationId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        content: 'This is a test message from the API integration test',
        role: 'user'
      })
    });
    
    if (!sendResponse.ok) {
      throw new Error(`Failed to send message: HTTP ${sendResponse.status}`);
    }
    
    const sendData = await sendResponse.json();
    console.log(`✅ Message sent successfully: ${JSON.stringify(sendData, null, 2)}`);
    
    // Step 3: Fetch messages from the conversation
    console.log('\n📝 Step 3: Fetching messages...');
    const messagesResponse = await fetch(`http://localhost:3000/api/threads/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!messagesResponse.ok) {
      throw new Error(`Failed to fetch messages: HTTP ${messagesResponse.status}`);
    }
    
    const messagesData = await messagesResponse.json();
    console.log(`✅ Fetched ${messagesData.messages ? messagesData.messages.length : 0} messages successfully`);
    
    console.log('\n🎉 API integration test completed successfully!');
    return true;
  } catch (error) {
    console.error(`❌ API integration test failed: ${error.message}`);
    return false;
  }
}

// Run the test
testApiIntegration()
  .then(success => {
    if (success) {
      console.log('\n✅ INTEGRATION TEST PASSED: Arzani-X frontend is correctly integrated with /api/threads API');
    } else {
      console.log('\n❌ INTEGRATION TEST FAILED: Please check the error messages and fix the issues');
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
  });
