#!/usr/bin/env node

/**
 * Container Startup Diagnostic Script
 * Enhanced to debug Cloud Run startup issues, particularly database connections
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🔍 CONTAINER STARTUP DIAGNOSTIC (Enhanced)');
console.log('==========================================');

// Environment diagnostics
console.log('\n1. � ENVIRONMENT ANALYSIS:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set (default: 8080)'}`);

// Database connection diagnostics
console.log('\n2. 🗄️ DATABASE CONNECTION ANALYSIS:');
if (process.env.DATABASE_URL) {
    console.log('   ✅ DATABASE_URL is set');
    
    // Parse DATABASE_URL safely without exposing password
    try {
        const dbUrl = new URL(process.env.DATABASE_URL);
        console.log(`   Protocol: ${dbUrl.protocol}`);
        console.log(`   Host: ${dbUrl.hostname}`);
        console.log(`   Port: ${dbUrl.port || '5432'}`);
        console.log(`   Database: ${dbUrl.pathname.slice(1)}`);
        console.log(`   Username: ${dbUrl.username}`);
        console.log(`   Search params: ${dbUrl.searchParams.toString()}`);
        
        // Check for Cloud SQL proxy configuration
        const hostParam = dbUrl.searchParams.get('host');
        if (hostParam && hostParam.includes('/cloudsql/')) {
            console.log('   ✅ Cloud SQL proxy configuration detected');
            console.log(`   Socket path: ${hostParam}`);
        } else {
            console.log('   ⚠️ No Cloud SQL proxy configuration found');
        }
    } catch (error) {
        console.log(`   ❌ Invalid DATABASE_URL format: ${error.message}`);
    }
} else {
    console.log('   ❌ DATABASE_URL is not set');
    console.log('   Checking individual parameters:');
    console.log(`   DB_HOST: ${process.env.DB_HOST || 'not set'}`);
    console.log(`   DB_PORT: ${process.env.DB_PORT || 'not set'}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME || 'not set'}`);
    console.log(`   DB_USER: ${process.env.DB_USER || 'not set'}`);
    console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? 'set' : 'not set'}`);
}

// SSL configuration diagnostics
console.log('\n3. 🔐 SSL CONFIGURATION:');
console.log(`   DATABASE_SSL: ${process.env.DATABASE_SSL || 'not set'}`);
console.log(`   DB_SSL: ${process.env.DB_SSL || 'not set'}`);
console.log(`   ENABLE_SSL: ${process.env.ENABLE_SSL || 'not set'}`);

// Check critical files exist
console.log('\n4. 📁 CRITICAL FILES CHECK:');
const criticalFiles = [
  'package.json',
  'server.js',
  'db.js',
  'database.js',
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
console.log('\n5. 📦 MODULE IMPORT TEST:');
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
