// Debug broker implementation step by step
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Debugging broker implementation...');

// Step 1: Test environment
console.log('\n1️⃣ Environment Check:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('Key length:', process.env.OPENAI_API_KEY?.length || 0);

// Step 2: Test OpenAI import
try {
  console.log('\n2️⃣ Testing OpenAI import...');
  const { default: OpenAI } = await import('openai');
  console.log('✅ OpenAI imported successfully');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('✅ OpenAI client created successfully');
  
} catch (error) {
  console.log('❌ OpenAI import/creation failed:', error.message);
}

// Step 3: Test broker import
try {
  console.log('\n3️⃣ Testing broker import...');
  const { processBrokerTask } = await import('./services/broker/broker.js');
  console.log('✅ Broker imported successfully');
  
  // Step 4: Test A2A utils
  console.log('\n4️⃣ Testing A2A utils...');
  const { createMessage, createTextPart } = await import('./libs/a2a/utils.js');
  console.log('✅ A2A utils imported successfully');
  
  // Step 5: Test simple broker call
  console.log('\n5️⃣ Testing simple broker call...');
  
  const testTask = {
    id: `test-${Date.now()}`,
    type: 'broker',
    state: 'active',
    created: new Date().toISOString()
  };

  const testMessage = createMessage([
    createTextPart('Hello, I need help with UK business buying.')
  ]);

  console.log('📤 Calling processBrokerTask...');
  
  const result = await processBrokerTask(testTask, testMessage);
  
  console.log('📥 Result received:', !!result);
  console.log('📝 Result structure:', Object.keys(result || {}));
  
  if (result?.message?.parts?.[0]) {
    const response = result.message.parts[0].text;
    console.log(`✅ Response: ${response.substring(0, 200)}...`);
  } else {
    console.log('❌ No valid response in result');
  }
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
  console.log('📚 Stack:', error.stack);
}
