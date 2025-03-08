/**
 * Route verification and testing script
 * Run with: node tests/fix-routes.js
 */

import fetch from 'node-fetch';
import { createServer } from 'http';
import { app } from '../server.js';

// Test configuration
const config = {
  port: process.env.TEST_PORT || 5002,
  testRoutes: [
    { path: '/api/business/listings', method: 'GET', description: 'Business listings endpoint' },
    { path: '/api/verify-token', method: 'GET', description: 'Token verification endpoint' },
    { path: '/api/business/19', method: 'GET', description: 'Single business endpoint' },
    { path: '/api/market/trends', method: 'GET', description: 'Market trends endpoint' }
  ]
};

// Start the test server
async function testRoutes() {
  // Start test server
  const server = createServer(app).listen(config.port, async () => {
    console.log(`Test server running on port ${config.port}`);
    
    try {
      console.log('\n======== ROUTE VERIFICATION ========\n');
      
      // Print all registered routes
      console.log('Registered routes:');
      const routePaths = [];
      app._router.stack.forEach(middleware => {
        if(middleware.route) {
          // Routes registered directly on the app
          routePaths.push(`${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
        } else if(middleware.name === 'router') {
          // Routes added via router
          const path = middleware.regexp.toString().replace(/[\\^$.*+?()[\]{}|]/g, '');
          middleware.handle.stack.forEach(handler => {
            if(handler.route) {
              const method = handler.route.stack[0].method.toUpperCase();
              routePaths.push(`${method} ${path}${handler.route.path}`);
            }
          });
        }
      });
      routePaths.forEach(route => console.log(`- ${route}`));
      
      console.log('\n======== TESTING ROUTES ========\n');
      
      // Test each route
      for (const route of config.testRoutes) {
        const startTime = performance.now();
        
        try {
          const response = await fetch(`http://localhost:${config.port}${route.path}`, {
            method: route.method
          });
          
          const timeElapsed = (performance.now() - startTime).toFixed(2);
          const status = response.status;
          
          let responseData;
          try {
            responseData = await response.json();
          } catch (e) {
            responseData = { error: 'Could not parse response as JSON' };
          }
          
          const result = status >= 200 && status < 300 ? '✅' : '❌';
          
          console.log(`${result} ${route.method} ${route.path} - Status: ${status} - ${timeElapsed}ms`);
          console.log(`  Description: ${route.description}`);
          
          if (status >= 400) {
            console.log(`  Error: ${responseData.error || 'Unknown error'}`);
          }
          
        } catch (error) {
          console.log(`❌ ${route.method} ${route.path} - Connection error`);
          console.log(`  Error: ${error.message}`);
        }
      }
      
    } finally {
      server.close();
      console.log('\nRoute testing complete. Server stopped.');
    }
  });
}

testRoutes();
