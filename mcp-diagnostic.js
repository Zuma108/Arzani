#!/usr/bin/env node

/**
 * Simple MCP Diagnostic Script
 * Tests if Brave MCP is accessible to AI agents
 */

console.log('🔍 MCP Diagnostic Starting...');

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Environment variables loaded');
console.log(`   BRAVE_API_KEY: ${process.env.BRAVE_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Missing'}`);

async function testMCP() {
  try {
    console.log('📦 Testing ES module imports...');
    
    const { mcpService } = await import('./services/mcp/mcp-integration-service.js');
    console.log('✅ MCP service imported successfully');
    
    console.log('🔧 Getting MCP service status...');
    const status = mcpService.getStatus();
    console.log('📊 MCP Status:', JSON.stringify(status, null, 2));
    
    console.log('🚀 Testing MCP initialization...');
    if (!mcpService.isReady()) {
      console.log('⏳ MCP not ready, attempting initialization...');
      await mcpService.initialize();
    }
    
    console.log('✅ MCP Diagnostic completed successfully');
    
  } catch (error) {
    console.error('❌ MCP Diagnostic failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMCP();
