#!/usr/bin/env node

/**
 * Container startup diagnostic script
 * This script simulates the exact container startup process
 * to identify what's causing the Cloud Run failure
 */

console.log('🔍 CONTAINER STARTUP DIAGNOSTIC');
console.log('===============================');

// Check environment variables
console.log('\n1. 📋 Environment Variables Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   PORT: ${process.env.PORT || 'undefined'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : 'undefined'}`);

// Check critical files exist
console.log('\n2. 📁 Critical Files Check:');
import fs from 'fs';
import path from 'path';

const criticalFiles = [
  'package.json',
  'server.js',
  'db.js',
  'api/valuation.js',
  'api/public-valuation.js'
];

let allFilesExist = true;
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ CRITICAL FILES MISSING - Container will fail to start');
  process.exit(1);
}

// Test import of critical modules
console.log('\n3. 📦 Module Import Test:');
try {
  console.log('   Testing express import...');
  const express = await import('express');
  console.log('   ✅ Express imported successfully');
  
  console.log('   Testing dotenv import...');
  const dotenv = await import('dotenv');
  console.log('   ✅ Dotenv imported successfully');
  
  console.log('   Testing db.js import...');
  const db = await import('./db.js');
  console.log('   ✅ Database module imported successfully');
  
} catch (error) {
  console.log(`   ❌ Module import failed: ${error.message}`);
  console.log('\n💥 MODULE IMPORT ERROR - Container will fail to start');
  console.log('Stack trace:', error.stack);
  process.exit(1);
}

// Test basic server creation
console.log('\n4. 🚀 Server Creation Test:');
try {
  const express = await import('express');
  const app = express.default();
  
  // Add basic health endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  console.log('   ✅ Express app created successfully');
  console.log('   ✅ Health endpoint configured');
  
  // Test port binding
  const PORT = process.env.PORT || 8080;
  console.log(`   🔌 Testing port binding on ${PORT}...`);
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`   ✅ Server successfully bound to port ${PORT}`);
    console.log(`   🏥 Health check available at: http://0.0.0.0:${PORT}/health`);
    
    // Test health endpoint
    setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:${PORT}/health`);
        const data = await response.json();
        console.log('   ✅ Health endpoint responding:', data.status);
        
        console.log('\n🎉 CONTAINER STARTUP DIAGNOSTIC COMPLETE');
        console.log('✅ All systems operational - container should start successfully');
        
        server.close(() => {
          console.log('   🔌 Test server closed');
          process.exit(0);
        });
      } catch (error) {
        console.log(`   ❌ Health endpoint test failed: ${error.message}`);
        server.close(() => {
          process.exit(1);
        });
      }
    }, 1000);
  });
  
  server.on('error', (error) => {
    console.log(`   ❌ Server error: ${error.message}`);
    if (error.code === 'EADDRINUSE') {
      console.log(`   🚨 Port ${PORT} is already in use`);
    }
    process.exit(1);
  });
  
} catch (error) {
  console.log(`   ❌ Server creation failed: ${error.message}`);
  console.log('\n💥 SERVER CREATION ERROR - Container will fail to start');
  process.exit(1);
}
