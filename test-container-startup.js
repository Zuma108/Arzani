#!/usr/bin/env node

/**
 * Container startup test script
 * Tests if the server can start in a Cloud Run-like environment
 */

console.log('🧪 Testing Cloud Run container startup...');

// Set Cloud Run environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = '8080';
process.env.JWT_SECRET = 'test-secret-for-container';
process.env.EMAIL_SECRET = 'test-email-secret';

// Minimal required environment for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/test';

console.log('📋 Environment configured:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);

// Import and start the server
try {
  console.log('🚀 Starting server...');
  import('./server.js').then(() => {
    console.log('✅ Server import completed');
  }).catch(error => {
    console.error('💥 Server import failed:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('💥 Server startup failed:', error);
  process.exit(1);
}

// Set a timeout to check if server starts within reasonable time
setTimeout(() => {
  console.log('⏰ Checking if server is responsive...');
  
  fetch('http://localhost:8080/health')
    .then(response => response.json())
    .then(data => {
      console.log('✅ Health check successful:', data);
      console.log('🎯 Container startup test PASSED');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Health check failed:', error.message);
      console.log('🚨 Container startup test FAILED');
      process.exit(1);
    });
}, 10000); // 10 second timeout
