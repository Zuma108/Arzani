#!/usr/bin/env node

/**
 * Hybrid Knowledge System Startup
 * 
 * One-command startup for the complete hybrid knowledge retrieval system
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('🚀 Starting Hybrid Knowledge Retrieval System');
console.log('==============================================\n');

// Check environment variables
const requiredEnvVars = [
  'BRAVE_API_KEY',
  'PINECONE_API_KEY',
  'OPENAI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease add these to your .env file and try again.');
  process.exit(1);
}

console.log('✅ Environment variables configured');
console.log('📡 Starting MCP servers...\n');

// Start MCP servers first
const mcpProcess = spawn('node', ['scripts/start-mcp-servers.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

mcpProcess.on('error', (error) => {
  console.error('❌ Failed to start MCP servers:', error);
  process.exit(1);
});

// Wait for MCP servers to initialize
setTimeout(() => {
  console.log('\n🧪 Running system tests...\n');
  
  // Run tests
  const testProcess = spawn('node', ['scripts/test-hybrid-system.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n🎉 Hybrid Knowledge Retrieval System is ready!');
      console.log('\n📖 Next steps:');
      console.log('   1. Your AI agents now have hybrid knowledge retrieval');
      console.log('   2. Start your agent servers (revenue, finance, legal)');
      console.log('   3. Test queries will now use real-time search + static knowledge');
      console.log('\n📚 See docs/BRAVE_MCP_INTEGRATION.md for detailed usage examples');
    } else {
      console.log('\n⚠️ Some tests failed, but system may still be functional');
      console.log('   Check the test output above for specific issues');
    }
  });
  
  testProcess.on('error', (error) => {
    console.error('❌ Failed to run tests:', error);
  });
  
}, 10000); // Wait 10 seconds for MCP servers to start

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  mcpProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  mcpProcess.kill();  
  process.exit(0);
});
