import axios from 'axios';

async function testAuthenticatedMessageSending() {
    console.log('🧪 TESTING AUTHENTICATED MESSAGE SENDING');
    console.log('========================================');
    
    // Use the generated JWT token for user 1
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1MDY4MTAzMSwiZXhwIjoxNzUzMjczMDMxfQ.Zddf3y9iD8ZGlXY_M9st9lRKbdBE2AiOs7kJDg47Eic';
    const baseURL = 'http://localhost:5000';
    
    try {
        // Test with session 92 (most recent)
        const sessionId = 92;
        const testMessage = 'Test message from authenticated debug script';
        
        console.log(`🧪 Testing authenticated message send to session ${sessionId}`);
        console.log(`🧪 URL: ${baseURL}/api/threads/${sessionId}/send`);
        console.log(`🧪 Using JWT token for user 1`);
        
        const response = await axios.post(`${baseURL}/api/threads/${sessionId}/send`, {
            content: testMessage,
            sender_type: 'user',
            agent_type: 'orchestrator'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            timeout: 10000
        });
        
        console.log('✅ SUCCESS - Message sent successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        // Also test getting messages to see if it was saved
        console.log('\n🧪 Testing message retrieval...');
        const messagesResponse = await axios.get(`${baseURL}/api/threads/${sessionId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Messages retrieved:', messagesResponse.data.messages?.length || 0, 'messages');
        if (messagesResponse.data.messages && messagesResponse.data.messages.length > 0) {
            const lastMessage = messagesResponse.data.messages[messagesResponse.data.messages.length - 1];
            console.log('Last message:', lastMessage.content);
        }
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Server error:', error.response.status, error.response.data);
        } else {
            console.log('❌ Network error:', error.message);
        }
    }
}

// Run the test
testAuthenticatedMessageSending();
