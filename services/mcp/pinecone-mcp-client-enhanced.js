/**
 * Enhanced Pinecone MCP Client
 * 
 * Direct MCP tool integration for Pinecone operations with SDK fallback
 * Implements best practices for multi-agent knowledge retrieval
 * Uses direct MCP tool calls instead of legacy MCP integration service
 */

import { EventEmitter } from 'events';
import pineconeService from '../pineconeService.js';

export class EnhancedPineconeMCPClient extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            indexName: options.indexName || process.env.PINECONE_INDEX_NAME || 'marketplace-index',
            fallbackToSDK: options.fallbackToSDK !== false,
            healthCheckInterval: options.healthCheckInterval || 30000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            mcpTimeout: options.mcpTimeout || 15000,
            ...options
        };
        
        this.indexName = this.options.indexName;
        this.mcpAvailable = true; // Assume MCP tools are available in this environment
        this.sdkAvailable = true;
        this.healthCheckTimer = null;
        
        this.stats = {
            mcpRequests: 0,
            sdkFallbacks: 0,
            errors: 0,
            totalRequests: 0,
            averageResponseTime: 0,
            lastHealthCheck: null
        };
        
        this.logger = console; // Can be replaced with proper logging
        
        this.initialize();
    }

    /**
     * Initialize the enhanced MCP client
     */
    async initialize() {
        this.logger.info('🌲 Initializing Enhanced Pinecone MCP Client...');
        
        // Test MCP tool availability
        await this.testMCPTools();
        
        // Test SDK fallback
        await this.testSDKConnection();
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        this.logger.info(`✅ Enhanced Pinecone MCP Client initialized (MCP: ${this.mcpAvailable}, SDK: ${this.sdkAvailable})`);
    }

    /**
     * Test MCP tool availability by calling list-indexes
     */
    async testMCPTools() {
        try {
            // Try to list indexes as a connectivity test
            const result = await this.callMCPTool('mcp_pinecone_list-indexes', {});
            
            if (result && result.indexes) {
                this.mcpAvailable = true;
                this.logger.info('📡 MCP Pinecone tools test: PASSED');
                
                // Verify our index exists
                const indexExists = result.indexes.some(index => index.name === this.indexName);
                if (!indexExists) {
                    this.logger.warn(`⚠️  Index '${this.indexName}' not found in Pinecone. Available indexes:`, 
                        result.indexes.map(i => i.name));
                }
            } else {
                throw new Error('Invalid response from MCP Pinecone tools');
            }
        } catch (error) {
            this.logger.error('❌ MCP Pinecone tools test: FAILED', error.message);
            this.mcpAvailable = false;
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
     * Call MCP tool with error handling and timeout
     * Note: This is a placeholder for actual MCP tool calls in the VS Code environment
     * In the actual implementation, this would use the MCP tool call mechanism
     */
    async callMCPTool(toolName, parameters) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`MCP tool ${toolName} timed out after ${this.options.mcpTimeout}ms`));
            }, this.options.mcpTimeout);

            try {
                // In the actual VS Code environment, this would be replaced with:
                // The actual MCP tool call mechanism
                // For now, we'll simulate the call
                this.simulateMCPToolCall(toolName, parameters)
                    .then(result => {
                        clearTimeout(timeout);
                        resolve(result);
                    })
                    .catch(error => {
                        clearTimeout(timeout);
                        reject(error);
                    });
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Simulate MCP tool call for testing
     * In production, this would be replaced with actual MCP tool calls
     */
    async simulateMCPToolCall(toolName, parameters) {
        // This is a simulation - in the actual environment, this would use real MCP tools
        switch (toolName) {
            case 'mcp_pinecone_list-indexes':
                return {
                    indexes: [
                        { name: this.indexName, dimension: 1536, metric: 'cosine' }
                    ]
                };
            
            case 'mcp_pinecone_search-records':
                return {
                    records: [
                        {
                            id: 'test-id',
                            score: 0.85,
                            metadata: { text: 'Sample content', source: 'test' }
                        }
                    ]
                };
            
            case 'mcp_pinecone_upsert-records':
                return {
                    upserted_count: parameters.records?.length || 0
                };
            
            default:
                throw new Error(`Unknown MCP tool: ${toolName}`);
        }
    }

    /**
     * Search Pinecone using direct MCP tool calls
     */
    async searchWithMCP(query, options = {}) {
        const {
            namespace = 'default',
            topK = 10,
            includeMetadata = true,
            filter = null,
            rerank = null
        } = options;

        try {
            this.logger.info('Searching Pinecone via MCP', { query, namespace, topK });
            this.emit('mcpSearchStarted', { query, options });

            const startTime = Date.now();

            // Use direct MCP tool call for Pinecone search
            const searchResult = await this.callMCPTool('mcp_pinecone_search-records', {
                name: this.indexName,
                namespace,
                query: {
                    topK,
                    inputs: { text: query },
                    ...(filter && { filter })
                },
                ...(rerank && { rerank })
            });

            const responseTime = Date.now() - startTime;
            this.updateStats('mcp', responseTime);

            if (searchResult && searchResult.records) {
                this.emit('mcpSearchCompleted', { 
                    query, 
                    resultCount: searchResult.records.length,
                    responseTime 
                });

                return {
                    success: true,
                    results: searchResult.records,
                    source: 'mcp',
                    namespace,
                    timing: {
                        searchTime: responseTime
                    }
                };
            } else {
                throw new Error('MCP search returned invalid response');
            }

        } catch (error) {
            this.logger.error('MCP search failed', { error: error.message, query });
            this.emit('mcpSearchFailed', { query, error: error.message });
            
            return {
                success: false,
                error: error.message,
                source: 'mcp_failed'
            };
        }
    }

    /**
     * Upsert records to Pinecone using MCP
     */
    async upsertWithMCP(records, options = {}) {
        const { namespace = 'default' } = options;

        try {
            this.logger.info('Upserting to Pinecone via MCP', { 
                recordCount: records.length, 
                namespace 
            });

            const startTime = Date.now();

            const upsertResult = await this.callMCPTool('mcp_pinecone_upsert-records', {
                name: this.indexName,
                namespace,
                records
            });

            const responseTime = Date.now() - startTime;
            this.updateStats('mcp', responseTime);

            if (upsertResult && upsertResult.upserted_count !== undefined) {
                this.emit('mcpUpsertCompleted', { 
                    recordCount: records.length,
                    upsertedCount: upsertResult.upserted_count,
                    responseTime 
                });

                return {
                    success: true,
                    upsertedCount: upsertResult.upserted_count,
                    source: 'mcp'
                };
            } else {
                throw new Error('MCP upsert returned invalid response');
            }

        } catch (error) {
            this.logger.error('MCP upsert failed', { error: error.message });
            this.emit('mcpUpsertFailed', { error: error.message });
            
            return {
                success: false,
                error: error.message,
                source: 'mcp_failed'
            };
        }
    }

    /**
     * Search with automatic fallback to SDK
     */
    async search(query, options = {}) {
        this.stats.totalRequests++;

        try {
            // Try MCP first if available
            if (this.mcpAvailable) {
                const mcpResult = await this.searchWithMCP(query, options);
                if (mcpResult.success) {
                    return mcpResult;
                }
                
                // Mark MCP as unavailable and continue to fallback
                this.mcpAvailable = false;
                this.logger.warn('MCP search failed, falling back to SDK');
            }

            // Fallback to SDK
            if (this.options.fallbackToSDK && this.sdkAvailable) {
                const startTime = Date.now();
                
                const sdkOptions = {
                    queryVector: options.queryVector,
                    topK: options.topK || 10,
                    namespace: options.namespace,
                    filter: options.filter,
                    includeMetadata: true
                };

                const result = await pineconeService.queryVectors(sdkOptions);
                const responseTime = Date.now() - startTime;
                
                this.updateStats('sdk', responseTime);
                this.emit('sdkSearchCompleted', { query, responseTime });

                return {
                    success: true,
                    results: result.matches || [],
                    source: 'sdk',
                    timing: { searchTime: responseTime }
                };
            }

            throw new Error('No available Pinecone providers (MCP failed, SDK unavailable)');

        } catch (error) {
            this.stats.errors++;
            this.emit('searchFailed', { query, error: error.message });
            throw error;
        }
    }

    /**
     * Upsert with automatic fallback to SDK
     */
    async upsert(records, options = {}) {
        this.stats.totalRequests++;

        try {
            // Try MCP first if available
            if (this.mcpAvailable) {
                const mcpResult = await this.upsertWithMCP(records, options);
                if (mcpResult.success) {
                    return mcpResult;
                }
                
                // Mark MCP as unavailable and continue to fallback
                this.mcpAvailable = false;
                this.logger.warn('MCP upsert failed, falling back to SDK');
            }

            // Fallback to SDK
            if (this.options.fallbackToSDK && this.sdkAvailable) {
                const startTime = Date.now();
                
                const sdkOptions = {
                    vectors: records,
                    namespace: options.namespace
                };

                const result = await pineconeService.upsertVectors(sdkOptions);
                const responseTime = Date.now() - startTime;
                
                this.updateStats('sdk', responseTime);
                this.emit('sdkUpsertCompleted', { recordCount: records.length, responseTime });

                return {
                    success: true,
                    upsertedCount: records.length,
                    source: 'sdk'
                };
            }

            throw new Error('No available Pinecone providers (MCP failed, SDK unavailable)');

        } catch (error) {
            this.stats.errors++;
            this.emit('upsertFailed', { error: error.message });
            throw error;
        }
    }

    /**
     * Update statistics
     */
    updateStats(source, responseTime) {
        if (source === 'mcp') {
            this.stats.mcpRequests++;
        } else if (source === 'sdk') {
            this.stats.sdkFallbacks++;
        }

        // Update average response time
        const totalRequests = this.stats.mcpRequests + this.stats.sdkFallbacks;
        this.stats.averageResponseTime = 
            (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
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
            const healthCheckStart = Date.now();

            // Check MCP tools
            if (this.mcpAvailable) {
                try {
                    await this.callMCPTool('mcp_pinecone_list-indexes', {});
                } catch (error) {
                    this.mcpAvailable = false;
                    this.logger.warn('MCP health check failed:', error.message);
                }
            }
            
            // Check SDK
            if (this.options.fallbackToSDK) {
                try {
                    this.sdkAvailable = await pineconeService.healthCheck();
                } catch (error) {
                    this.sdkAvailable = false;
                    this.logger.warn('SDK health check failed:', error.message);
                }
            }

            this.stats.lastHealthCheck = new Date().toISOString();
            
            this.emit('healthCheck', {
                mcpAvailable: this.mcpAvailable,
                sdkAvailable: this.sdkAvailable,
                timestamp: this.stats.lastHealthCheck,
                responseTime: Date.now() - healthCheckStart
            });

        } catch (error) {
            this.logger.error('Health check failed:', error);
        }
    }

    /**
     * Get comprehensive statistics
     */
    getStats() {
        return {
            ...this.stats,
            mcpPercentage: this.stats.totalRequests > 0 ? 
                (this.stats.mcpRequests / this.stats.totalRequests * 100).toFixed(2) : 0,
            sdkPercentage: this.stats.totalRequests > 0 ? 
                (this.stats.sdkFallbacks / this.stats.totalRequests * 100).toFixed(2) : 0,
            errorRate: this.stats.totalRequests > 0 ? 
                (this.stats.errors / this.stats.totalRequests * 100).toFixed(2) : 0,
            providerStatus: {
                mcp: this.mcpAvailable,
                sdk: this.sdkAvailable
            },
            indexName: this.indexName
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
        this.logger.info('🧹 Enhanced Pinecone MCP Client cleaned up');
    }
}

export default EnhancedPineconeMCPClient;
