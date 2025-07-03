import { quickTestEnhancedLegalAgent, testReActPrompting } from './test-legal-agent-quick.js';

console.log('🚀 Starting Enhanced Legal Agent Tests...\n');

try {
  await quickTestEnhancedLegalAgent();
  console.log('\n' + '='.repeat(50));
  await testReActPrompting();
  
  console.log('\n🏁 ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('🎯 Enhanced Legal Agent is ready for production');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
