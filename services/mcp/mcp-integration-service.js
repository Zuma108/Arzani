/**
 * MCP Integration Service
 * Provides actual MCP server connections for Brave Search, Firecrawl, and Pinecone
 */

import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import { join } from 'path';
import os from 'os';

/**
 * Find npx executable path - Windows-compatible
 */
function findNpxPath() {
  try {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // On Windows, just use 'npx' - let the system find it
      return 'npx';
    } else {
      // Try to get npm prefix for Unix-like systems
      const npmPrefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim();
      return join(npmPrefix, 'bin', 'npx');
    }
  } catch (error) {
    // Fallback to npx in PATH
    console.warn('Could not find npm prefix, falling back to npx in PATH');
    return 'npx';
  }
}

class MCPIntegrationService extends EventEmitter {
  constructor() {
    super();
    this.mcpServers = new Map();
    this.isInitialized = false;
    this.npxPath = findNpxPath();
  }

  /**
   * Initialize all MCP servers based on mcp.json configuration
   */
  async initialize() {
    console.log('🚀 Initializing MCP Integration Service...');
    
    try {
      // Initialize Brave Search MCP
      await this.initializeBraveSearchMCP();
      
      // Initialize Pinecone MCP
      await this.initializePineconeMCP();
      
      this.isInitialized = true;
      console.log('✅ MCP Integration Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize MCP Integration Service:', error);
      throw error;
    }
  }

  /**
   * Initialize Brave Search MCP Server
   */
  async initializeBraveSearchMCP() {
    console.log('📡 Initializing Brave Search MCP...');
    
    // Ensure BRAVE_API_KEY is available
    if (!process.env.BRAVE_API_KEY) {
      throw new Error('BRAVE_API_KEY environment variable is required');
    }
    
    const serverConfig = {
      command: this.npxPath,
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {
        ...process.env, // Include all current environment variables
        BRAVE_API_KEY: process.env.BRAVE_API_KEY
      }
    };

    const server = this.createMCPServer('braveSearch', serverConfig);
    this.mcpServers.set('braveSearch', server);
  }

  /**
   * Initialize Firecrawl MCP Server - REMOVED (not needed)
   */
  async initializeFirecrawlMCP() {
    console.log('� Firecrawl MCP initialization skipped - not needed');
    // Firecrawl removed - using Brave search results directly
  }

  /**
   * Initialize Pinecone MCP Server
   */
  async initializePineconeMCP() {
    console.log('🌲 Initializing Pinecone MCP...');
    
    // Ensure PINECONE_API_KEY is available
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }
    
    const serverConfig = {
      command: this.npxPath,
      args: ['-y', '@pinecone-database/mcp'],
      env: {
        ...process.env, // Include all current environment variables
        PINECONE_API_KEY: process.env.PINECONE_API_KEY
      }
    };

    const server = this.createMCPServer('pinecone', serverConfig);
    this.mcpServers.set('pinecone', server);
  }

  /**
   * Create an MCP server instance
   */
  createMCPServer(name, config) {
    const server = {
      name,
      process: null,
      isReady: false,
      messageQueue: [],
      responseHandlers: new Map()
    };

    try {
      console.log(`🚀 Starting ${name} MCP server with command: ${config.command} ${config.args.join(' ')}`);
      
      server.process = spawn(config.command, config.args, {
        env: config.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: os.platform() === 'win32' // Use shell on Windows for better npx support
      });

      server.process.stdout.on('data', (data) => {
        this.handleMCPResponse(name, data);
      });

      server.process.stderr.on('data', (data) => {
        console.warn(`[${name}] stderr:`, data.toString());
      });

      server.process.on('error', (error) => {
        console.error(`[${name}] process error:`, error);
        this.emit('serverError', { server: name, error });
      });

      server.process.on('exit', (code) => {
        console.log(`[${name}] process exited with code:`, code);
        server.isReady = false;
      });

      // Perform actual health check instead of timeout
      this.performHealthCheck(name, server);

    } catch (error) {
      console.error(`❌ Failed to create ${name} MCP server:`, error);
      throw error;
    }

    return server;
  }

  /**
   * Handle MCP server responses
   */
  handleMCPResponse(serverName, data) {
    try {
      const response = JSON.parse(data.toString());
      const server = this.mcpServers.get(serverName);
      
      if (response.id && server.responseHandlers.has(response.id)) {
        const handler = server.responseHandlers.get(response.id);
        handler.resolve(response);
        server.responseHandlers.delete(response.id);
      }
      
    } catch (error) {
      console.warn(`[${serverName}] Failed to parse response:`, error);
    }
  }

  /**
   * Send request to MCP server
   */
  async sendMCPRequest(serverName, method, params = {}) {
    let server = this.mcpServers.get(serverName);
    
    if (!server || !server.isReady) {
      console.warn(`⚠️ ${serverName} not ready for request, waiting...`);
      
      // Wait a bit for server to be ready
      let attempts = 0;
      while (attempts < 5) {
        server = this.mcpServers.get(serverName); // Get fresh reference
        if (server && server.isReady) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!server || !server.isReady) {
        throw new Error(`MCP server ${serverName} is not ready`);
      }
    }

    const requestId = Math.random().toString(36).substr(2, 9);
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      // Set timeout for request
      const timeout = setTimeout(() => {
        server.responseHandlers.delete(requestId);
        reject(new Error(`MCP request timeout for ${serverName}.${method}`));
      }, 30000);

      server.responseHandlers.set(requestId, {
        resolve: (response) => {
          clearTimeout(timeout);
          if (response.error) {
            reject(new Error(response.error.message || 'MCP request failed'));
          } else {
            resolve(response.result);
          }
        }
      });

      // Send request to server
      server.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Brave Search MCP Integration with auto-retry
   */
  async braveWebSearch(query, options = {}) {
    const { count = 10, offset = 0 } = options;
    
    try {
      console.log(`🔍 Brave Search: "${query}"`);
      
      // Check if server is ready, attempt restart if not
      let server = this.mcpServers.get('braveSearch');
      if (!server || !server.isReady) {
        console.warn('⚠️ Brave Search MCP not ready, attempting restart...');
        await this.restartServer('braveSearch');
        
        // Wait for restart and update server reference
        let attempts = 0;
        while (attempts < 15) { // Increased timeout
          server = this.mcpServers.get('braveSearch'); // Get fresh reference
          if (server && server.isReady) {
            console.log('✅ Brave Search MCP ready after restart');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
        
        if (!server || !server.isReady) {
          console.warn('⚠️ Brave Search MCP restart timeout, proceeding anyway...');
          // Don't throw error, let the actual request attempt and handle failure
        }
      }
      
      // Use tools/call method for MCP tool execution
      const result = await this.sendMCPRequest('braveSearch', 'tools/call', {
        name: 'brave_web_search',
        arguments: {
          query,
          count,
          offset
        }
      });

      // Extract results from MCP tool response
      console.log('🔍 DEBUG: Raw MCP result:', JSON.stringify(result, null, 2));
      
      if (result && result.content && Array.isArray(result.content)) {
        // Parse text content from MCP response
        const textContent = result.content.find(item => item.type === 'text')?.text;
        if (textContent) {
          console.log('🔍 DEBUG: Text content:', textContent);
          
          // Parse the structured text into individual search results
          const searchResults = this.parseSearchResults(textContent);
          console.log('🔍 DEBUG: Parsed search results:', JSON.stringify(searchResults, null, 2));
          return searchResults;
        }
      }

      return [];
      
    } catch (error) {
      console.error('❌ Brave Search MCP error:', error);
      
      // Attempt one restart before giving up
      try {
        console.log('🔄 Attempting Brave Search MCP restart...');
        await this.restartServer('braveSearch');
        
        const result = await this.sendMCPRequest('braveSearch', 'tools/call', {
          name: 'brave_web_search', 
          arguments: {
            query,
            count,
            offset
          }
        });
        
        console.log('✅ Brave Search MCP recovered successfully');
        
        // Extract results from MCP tool response
        if (result && result.content) {
          try {
            const parsedContent = typeof result.content === 'string' ? 
              JSON.parse(result.content) : result.content;
            return parsedContent.results || parsedContent || [];
          } catch (parseError) {
            return result.content || [];
          }
        }
        
        return result || [];
        
      } catch (retryError) {
        console.error('❌ Brave Search MCP recovery failed:', retryError);
        throw error; // Throw original error
      }
    }
  }

  /**
   * Brave Local Search MCP Integration
   */
  async braveLocalSearch(query, options = {}) {
    const { count = 5 } = options;
    
    try {
      console.log(`📍 Brave Local Search: "${query}"`);
      
      const result = await this.sendMCPRequest('braveSearch', 'brave_local_search', {
        query,
        count
      });

      return result.results || [];
      
    } catch (error) {
      console.error('❌ Brave Local Search MCP error:', error);
      throw error;
    }
  }

  /**
   * Firecrawl Scrape MCP Integration - REMOVED (not needed)
   */
  async firecrawlScrape(url, options = {}) {
    console.log('� Firecrawl scraping removed - using search results directly');
    return {
      content: '',
      metadata: {
        url,
        note: 'Firecrawl removed - using Brave search descriptions instead'
      }
    };
  }

  /**
   * Firecrawl Search MCP Integration - REMOVED (not needed)
   */
  async firecrawlSearch(query, options = {}) {
    console.log('� Firecrawl search removed - using Brave search instead');
    return [];
  }

  /**
   * Pinecone Search MCP Integration
   */
  async pineconeSearchRecords(indexName, namespace, query, options = {}) {
    const {
      topK = 10,
      filter = null
    } = options;
    
    try {
      console.log(`🌲 Pinecone Search: "${query}" in ${indexName}/${namespace}`);
      
      const result = await this.sendMCPRequest('pinecone', 'search-records', {
        name: indexName,
        namespace,
        query: {
          inputs: { text: query },
          topK,
          filter
        }
      });

      return result.records || [];
      
    } catch (error) {
      console.error('❌ Pinecone Search MCP error:', error);
      throw error;
    }
  }

  /**
   * Pinecone Upsert MCP Integration
   */
  async pineconeUpsertRecords(indexName, namespace, records) {
    try {
      console.log(`🌲 Pinecone Upsert: ${records.length} records to ${indexName}/${namespace}`);
      
      const result = await this.sendMCPRequest('pinecone', 'upsert-records', {
        name: indexName,
        namespace,
        records
      });

      return result;
      
    } catch (error) {
      console.error('❌ Pinecone Upsert MCP error:', error);
      throw error;
    }
  }

  /**
   * Cleanup all MCP servers
   */
  async cleanup() {
    console.log('🧹 Cleaning up MCP servers...');
    
    for (const [name, server] of this.mcpServers) {
      if (server.process) {
        server.process.kill();
        console.log(`🛑 Terminated ${name} MCP server`);
      }
    }
    
    this.mcpServers.clear();
    this.isInitialized = false;
  }

  /**
   * Check if all servers are ready
   */
  isReady() {
    if (!this.isInitialized) return false;
    
    for (const server of this.mcpServers.values()) {
      if (!server.isReady) return false;
    }
    
    return true;
  }

  /**
   * Get server status
   */
  getStatus() {
    const status = {
      initialized: this.isInitialized,
      servers: {}
    };

    for (const [name, server] of this.mcpServers) {
      status.servers[name] = {
        ready: server.isReady,
        hasProcess: !!server.process,
        queuedMessages: server.messageQueue.length,
        pendingResponses: server.responseHandlers.size
      };
    }

    return status;
  }

  /**
   * Perform health check on MCP server
   */
  async performHealthCheck(serverName, server) {
    const maxAttempts = 10;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        // Wait a bit for process to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try a simple test request
        if (serverName === 'braveSearch') {
          await this.testBraveConnection(server);
        } else if (serverName === 'pinecone') {
          await this.testPineconeConnection(server);
        }
        
        server.isReady = true;
        console.log(`✅ ${serverName} MCP server ready and verified`);
        return;
        
      } catch (error) {
        attempts++;
        console.warn(`⏳ ${serverName} health check attempt ${attempts}/${maxAttempts} failed:`, error.message);
        
        if (attempts >= maxAttempts) {
          console.error(`❌ ${serverName} failed health check after ${maxAttempts} attempts`);
          server.isReady = false;
          return;
        }
      }
    }
  }

  /**
   * Test Brave Search connection
   */
  async testBraveConnection(server) {
    const testRequest = {
      jsonrpc: '2.0',
      id: 'health-check',
      method: 'tools/list'
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Brave connection test timeout'));
      }, 5000);

      const handleResponse = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === 'health-check') {
            clearTimeout(timeout);
            server.process.stdout.off('data', handleResponse);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parse errors for non-test responses
        }
      };

      server.process.stdout.on('data', handleResponse);
      server.process.stdin.write(JSON.stringify(testRequest) + '\n');
    });
  }

  /**
   * Test Pinecone connection
   */
  async testPineconeConnection(server) {
    const testRequest = {
      jsonrpc: '2.0',
      id: 'health-check',
      method: 'tools/list'
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pinecone connection test timeout'));
      }, 5000);

      const handleResponse = (data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === 'health-check') {
            clearTimeout(timeout);
            server.process.stdout.off('data', handleResponse);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parse errors for non-test responses
        }
      };

      server.process.stdout.on('data', handleResponse);
      server.process.stdin.write(JSON.stringify(testRequest) + '\n');
    });
  }

  /**
   * Restart a failed MCP server
   */
  async restartServer(serverName) {
    console.log(`🔄 Restarting ${serverName} MCP server...`);
    
    const server = this.mcpServers.get(serverName);
    if (server && server.process) {
      server.process.kill();
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reinitialize based on server type
    if (serverName === 'braveSearch') {
      await this.initializeBraveSearchMCP();
    } else if (serverName === 'pinecone') {
      await this.initializePineconeMCP();
    }
  }
}

// Create singleton instance
const mcpService = new MCPIntegrationService();

// Remove auto-initialization to prevent double initialization
// Service will be explicitly initialized by startup scripts

export { mcpService };
export default mcpService;
