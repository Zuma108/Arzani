/**
 * Start MCP Servers Script
 * 
 * This script initializes and starts all MCP servers required for the hybrid knowledge system:
 * - Brave Search MCP
 * - Firecrawl MCP  
 * - Pinecone MCP
 */

import { mcpService } from '../services/mcp/mcp-integration-service.js';
import { healthMonitor } from './mcp-health-monitor.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function startMCPServers() {
  console.log('🚀 Starting MCP servers for hybrid knowledge system...\n');

  try {
    // Check if required API keys are available
    const requiredEnvVars = [
      'BRAVE_API_KEY',
      'PINECONE_API_KEY',
      'OPENAI_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      console.error('Please set these in your .env file before starting MCP servers.');
      process.exit(1);
    }

    // Initialize MCP service (this starts all servers)
    await mcpService.initialize();

    console.log('\n✅ All MCP servers initialized successfully!');
    
    // Wait for all servers to be ready
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (!mcpService.isReady() && attempts < maxAttempts) {
      console.log(`⏳ Waiting for MCP servers to be ready... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (mcpService.isReady()) {
      console.log('\n🎉 MCP Integration Service is ready!');
      console.log('\nMCP Server Status:');
      const status = mcpService.getStatus();
      
      Object.entries(status.servers).forEach(([name, serverStatus]) => {
        const statusIcon = serverStatus.ready ? '✅' : '❌';
        console.log(`  ${statusIcon} ${name}: Ready=${serverStatus.ready}, Process=${serverStatus.hasProcess}`);
      });

      console.log('\n📡 Testing MCP connections...');
      
      // Test Brave Search
      try {
        console.log('🔍 Testing Brave Search MCP...');
        const braveResults = await mcpService.braveWebSearch('UK business regulations', { count: 2 });
        console.log(`✅ Brave Search: Found ${braveResults.length} results`);
      } catch (error) {
        console.warn('⚠️ Brave Search test failed:', error.message);
      }

      // Test Firecrawl (removed - not needed)
      console.log('� Firecrawl test skipped - removed from system');

      console.log('\n🎯 MCP servers are ready for hybrid knowledge retrieval!');
      console.log('Your AI agents can now use:');
      console.log('  • Real-time web search via Brave MCP');
      console.log('  • Vector search via Pinecone MCP');
      console.log('  • Combined with static RAG and user documents');
      
      // Start health monitoring
      console.log('\n🏥 Starting MCP health monitoring...');
      await healthMonitor.startMonitoring();
      
    } else {
      console.error('❌ MCP servers failed to start within timeout period');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to start MCP servers:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down MCP servers...');
  healthMonitor.stopMonitoring();
  await mcpService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down MCP servers...');
  healthMonitor.stopMonitoring();
  await mcpService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down MCP servers...');
  await mcpService.cleanup();
  process.exit(0);
});

// Start the servers
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServers();
}

export { startMCPServers };
