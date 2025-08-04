// Quick test for GPT-4.1 nano broker agent
console.log('🧪 Quick GPT-4.1 Nano Broker Test\n');

async function quickTest() {
  try {
    // Test import
    console.log('📦 Testing import...');
    const { processBrokerTask } = await import('./services/broker/broker.js');
    console.log('✅ Import successful');

    // Create test data
    const task = {
      id: 'test-123',
      type: 'broker',
      state: 'pending',
      created: new Date().toISOString()
    };

    const message = {
      id: 'msg-123', 
      parts: [{ type: 'text', text: 'Help me understand business valuations' }],
      created: new Date().toISOString()
    };

    // Test the function
    console.log('🚀 Testing processBrokerTask...');
    const startTime = Date.now();
    const result = await processBrokerTask(task, message);
    const elapsed = Date.now() - startTime;

    console.log(`✅ Function executed in ${elapsed}ms`);
    console.log(`📋 Task state: ${result.task.state}`);
    console.log(`💬 Response parts: ${result.message.parts.length}`);

    if (result.message.parts.length > 0) {
      const response = result.message.parts[0].text;
      console.log(`📝 Response length: ${response.length} characters`);
      console.log(`🤖 Preview: ${response.substring(0, 120)}...`);
      
      // Check if it looks like a proper broker response
      if (response.toLowerCase().includes('valuation') || 
          response.toLowerCase().includes('business') ||
          response.toLowerCase().includes('ebitda')) {
        console.log('✅ Response contains relevant broker terminology');
      }
    }

    console.log('\n🎉 GPT-4.1 nano broker agent is working!');
    return true;

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.log('💡 Note: Set OPENAI_API_KEY environment variable');
      console.log('   PowerShell: $env:OPENAI_API_KEY = "your-key"');
    }
    
    return false;
  }
}

quickTest();
