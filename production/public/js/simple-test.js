// Simple test just to see if we can import and call
console.log('Starting simple test...');

try {
  console.log('Importing broker...');
  const broker = await import('./services/broker/broker.js');
  console.log('✅ Broker imported successfully');
  console.log('Available exports:', Object.keys(broker));
  
  if (broker.processBrokerTask) {
    console.log('✅ processBrokerTask function found');
  } else {
    console.log('❌ processBrokerTask function NOT found');
  }
  
} catch (error) {
  console.error('❌ Import failed:', error);
}
