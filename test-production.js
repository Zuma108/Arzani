/**
 * Test production environment locally
 * 
 * This script sets NODE_ENV to 'production' and starts your server
 * allowing you to test production behavior locally.
 */

// Set environment to production
process.env.NODE_ENV = 'production';

// Import your main server file using ES module syntax
import('./server.js').then(() => {
  console.log('\x1b[32m%s\x1b[0m', '🚀 Server running in PRODUCTION mode for testing');
  console.log('\x1b[33m%s\x1b[0m', '⚠️  Remember to ensure tailwind.min.css exists:');
  console.log('\x1b[36m%s\x1b[0m', 'npm run build:css');
}).catch(error => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Failed to start server in production mode:');
  console.error(error);
  console.log('\x1b[33m%s\x1b[0m', '⚠️  Make sure your server.js file is correctly set up for ES modules');
});

// Add an unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('\x1b[31m%s\x1b[0m', '❌ Unhandled Promise Rejection:');
  console.error(reason);
});
