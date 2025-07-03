/**
 * Pinecone MCP Client
 * 
 * Provides a unified interface to Pinecone via direct MCP tool calls with fallback to SDK
 * Implements best practices for MCP integration in multi-agent systems
 * Uses direct MCP tool access instead of legacy MCP integration service
 */

import { EventEmitter } from 'events';
import pineconeService from '../pineconeService.js';

export class PineconeMCPClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      fallbackToSDK: options.fallbackToSDK !== false,
      healthCheckInterval: options.healthCheckInterval || 30000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    this.mcpConnected = false;
    this.sdkAvailable = true;
    this.healthCheckTimer = null;
    this.stats = {
      mcpRequests: 0,
      sdkFallbacks: 0,
      errors: 0,
      totalRequests: 0
    };
    
    this.initialize();
  }

  /**
   * Initialize MCP connection with health monitoring
   */
  async initialize() {
    console.log('🌲 Initializing Pinecone MCP Client...');
    
    // Test MCP integration service connection
    await this.testMCPIntegration();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Test SDK fallback
    await this.testSDKConnection();
    
    console.log(`✅ Pinecone MCP Client initialized (MCP: ${this.mcpConnected}, SDK: ${this.sdkAvailable})`);
  }

  /**
   * Test MCP integration service connection
   */
  async testMCPIntegration() {
    try {
      // Import the MCP integration service
      const { mcpService } = await import('./mcp-integration-service.js');
      
      // Check if MCP service is initialized and ready
      this.mcpConnected = mcpService.isInitialized && mcpService.isReady();
      
      if (this.mcpConnected) {
        console.log('📡 MCP integration service test: PASSED');
      } else {
        console.warn('⚠️  MCP integration service test: FAILED - Service not ready');
      }
    } catch (error) {
      console.error('❌ MCP integration service test: FAILED', error.message);
      this.mcpConnected = false;
    }
  }

  /**
   * Test SDK fallback connection (disabled to avoid Docker dependency)
   */
  async testSDKConnection() {
    // MCP is primary - SDK fallback disabled to avoid Docker dependency
    this.sdkAvailable = false;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      // Check MCP integration service health
      if (this.mcpConnected) {
        try {
          const { mcpService } = await import('./mcp-integration-service.js');
          this.mcpConnected = mcpService.isInitialized && mcpService.isReady();
        } catch (error) {
          this.mcpConnected = false;
        }
      }
      
      // Check SDK health
      if (this.options.fallbackToSDK) {
        this.sdkAvailable = await pineconeService.healthCheck();
      }
      
      this.emit('health_check', {
        mcpConnected: this.mcpConnected,
        sdkAvailable: this.sdkAvailable,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Query vectors with MCP server preference and SDK fallback
   */
  async queryVectors(options) {
    this.stats.totalRequests++;
    
    try {
      // Try MCP server first if available
      if (this.mcpConnected) {
        try {
          const result = await this.queryVectorsMCP(options);
          this.stats.mcpRequests++;
          this.emit('operation_completed', { method: 'queryVectors', provider: 'mcp', success: true });
          return result;
        } catch (mcpError) {
          console.warn('MCP query failed, falling back to SDK:', mcpError.message);
          this.mcpConnected = false; // Mark as disconnected for next health check
        }
      }
      
      // Fallback to SDK
      if (this.options.fallbackToSDK && this.sdkAvailable) {
        const result = await pineconeService.queryVectors(options);
        this.stats.sdkFallbacks++;
        this.emit('operation_completed', { method: 'queryVectors', provider: 'sdk', success: true });
        return result;
      }
      
      throw new Error('No available Pinecone providers (MCP server down, SDK unavailable)');
      
    } catch (error) {
      this.stats.errors++;
      this.emit('operation_completed', { method: 'queryVectors', provider: 'none', success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Upsert vectors with MCP server preference and SDK fallback
   */
  async upsertVectors(options) {
    this.stats.totalRequests++;
    
    try {
      // Try MCP server first if available
      if (this.mcpConnected) {
        try {
          const result = await this.upsertVectorsMCP(options);
          this.stats.mcpRequests++;
          this.emit('operation_completed', { method: 'upsertVectors', provider: 'mcp', success: true });
          return result;
        } catch (mcpError) {
          console.warn('MCP upsert failed, falling back to SDK:', mcpError.message);
          this.mcpConnected = false;
        }
      }
      
      // Fallback to SDK
      if (this.options.fallbackToSDK && this.sdkAvailable) {
        const result = await pineconeService.upsertVectors(options);
        this.stats.sdkFallbacks++;
        this.emit('operation_completed', { method: 'upsertVectors', provider: 'sdk', success: true });
        return result;
      }
      
      throw new Error('No available Pinecone providers (MCP server down, SDK unavailable)');
      
    } catch (error) {
      this.stats.errors++;
      this.emit('operation_completed', { method: 'upsertVectors', provider: 'none', success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Search records using MCP server (preferred for advanced features)
   */
  async searchRecords(query, options = {}) {
    this.stats.totalRequests++;
    
    try {
      if (this.mcpConnected) {
        try {
          const result = await this.searchRecordsMCP(query, options);
          this.stats.mcpRequests++;
          this.emit('operation_completed', { method: 'searchRecords', provider: 'mcp', success: true });
          return result;
        } catch (mcpError) {
          console.warn('MCP search failed, falling back to SDK query:', mcpError.message);
          this.mcpConnected = false;
        }
      }
      
      // Fallback to SDK queryVectors (less advanced but functional)
      if (this.options.fallbackToSDK && this.sdkAvailable) {
        // Convert search to query format for SDK
        const queryOptions = {
          queryVector: options.queryVector,
          topK: options.topK || 10,
          namespace: options.namespace,
          filter: options.filter,
          includeMetadata: true
        };
        
        const result = await pineconeService.queryVectors(queryOptions);
        this.stats.sdkFallbacks++;
        this.emit('operation_completed', { method: 'searchRecords', provider: 'sdk', success: true });
        return result;
      }
      
      throw new Error('No available Pinecone providers for search');
      
    } catch (error) {
      this.stats.errors++;
      this.emit('operation_completed', { method: 'searchRecords', provider: 'none', success: false, error: error.message });
      throw error;
    }
  }

  /**
   * MCP server query implementation using MCP integration service
   */
  async queryVectorsMCP(options) {
    try {
      const { mcpService } = await import('./mcp-integration-service.js');
      
      // Use MCP integration service to search Pinecone
      const result = await mcpService.pineconeSearchRecords(
        options.indexName || process.env.PINECONE_INDEX_NAME || 'marketplace-index',
        options.namespace || '',
        {
          text: options.queryText || options.query || ''
        },
        {
          topK: options.topK || 10,
          filter: options.filter || null
        }
      );
      
      return result;
    } catch (error) {
      throw new Error(`MCP Pinecone query failed: ${error.message}`);
    }
  }

  /**
   * MCP server upsert implementation using MCP integration service
   */
  async upsertVectorsMCP(options) {
    try {
      const { mcpService } = await import('./mcp-integration-service.js');
      
      // Use MCP integration service to upsert to Pinecone
      const result = await mcpService.pineconeUpsertRecords(
        options.indexName || process.env.PINECONE_INDEX_NAME || 'marketplace-index',
        options.namespace || '',
        options.records || options.vectors
      );
      
      return result;
    } catch (error) {
      throw new Error(`MCP Pinecone upsert failed: ${error.message}`);
    }
  }

  /**
   * MCP server search implementation using MCP integration service
   */
  async searchRecordsMCP(query, options) {
    try {
      const { mcpService } = await import('./mcp-integration-service.js');
      
      // Use MCP integration service to search Pinecone records
      const result = await mcpService.pineconeSearchRecords(
        options.indexName || process.env.PINECONE_INDEX_NAME || 'marketplace-index',
        options.namespace || '',
        {
          text: query
        },
        {
          topK: options.topK || 10,
          filter: options.filter || null
        }
      );
      
      return result;
    } catch (error) {
      throw new Error(`MCP Pinecone search failed: ${error.message}`);
    }
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      ...this.stats,
      mcpPercentage: this.stats.totalRequests > 0 ? (this.stats.mcpRequests / this.stats.totalRequests * 100).toFixed(2) : 0,
      sdkPercentage: this.stats.totalRequests > 0 ? (this.stats.sdkFallbacks / this.stats.totalRequests * 100).toFixed(2) : 0,
      errorRate: this.stats.totalRequests > 0 ? (this.stats.errors / this.stats.totalRequests * 100).toFixed(2) : 0,
      connectedProviders: {
        mcp: this.mcpConnected,
        sdk: this.sdkAvailable
      }
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.removeAllListeners();
    console.log('🧹 Pinecone MCP Client cleaned up');
  }
}

export default PineconeMCPClient;
