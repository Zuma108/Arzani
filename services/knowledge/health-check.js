/**
 * Knowledge System Health Check
 * 
 * Provides health monitoring and diagnostics for the hybrid retrieval system
 */

import hybridRetriever, { EnhancedHybridKnowledgeRetriever } from './enhanced-hybrid-retrieval.js';

// Initialize the knowledge retriever for health checks
const knowledgeRetriever = hybridRetriever;

/**
 * Perform comprehensive system health check
 */
export async function performHealthCheck() {
  console.log('🏥 Performing Hybrid Knowledge System health check...');
  
  const healthReport = {
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    components: {},
    performance: {},
    recommendations: []
  };

  try {
    // Check MCP Client Health
    healthReport.components.mcpClient = await checkMCPClientHealth();
    
    // Check Brave Search Health
    healthReport.components.braveSearch = await checkBraveSearchHealth();
    
    // Check OpenAI Embeddings Health
    healthReport.components.openaiEmbeddings = await checkOpenAIHealth();
    
    // Check System Performance
    healthReport.performance = getPerformanceMetrics();
    
    // Generate recommendations
    healthReport.recommendations = generateRecommendations(healthReport);
    
    // Determine overall health
    healthReport.overall = determineOverallHealth(healthReport.components);
    
    console.log(`✅ Health check completed. Overall status: ${healthReport.overall}`);
    return healthReport;
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    healthReport.overall = 'critical';
    healthReport.error = error.message;
    return healthReport;
  }
}

/**
 * Check MCP Client health
 */
async function checkMCPClientHealth() {
  try {
    const health = knowledgeRetriever.getHealthStatus();
    
    return {
      status: health.mcpConnected && health.sdkAvailable ? 'healthy' : 'degraded',
      mcpConnected: health.mcpConnected,
      sdkAvailable: health.sdkAvailable,
      details: health.mcpConnected ? 'MCP server available' : 'Using SDK fallback'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Check Brave Search health
 */
async function checkBraveSearchHealth() {
  try {
    // Simple test search
    const testQuery = 'UK business advice';
    const results = await knowledgeRetriever.performBraveSearch(testQuery, 'orchestrator', 1);
    
    return {
      status: results.length > 0 ? 'healthy' : 'degraded',
      testResults: results.length,
      details: results.length > 0 ? 'Search functional' : 'No results returned'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Check OpenAI embeddings health
 */
async function checkOpenAIHealth() {
  try {
    // Test embedding generation
    const testEmbedding = await knowledgeRetriever.generateEmbedding('test query');
    
    return {
      status: testEmbedding && testEmbedding.length > 0 ? 'healthy' : 'unhealthy',
      embeddingDimensions: testEmbedding?.length || 0,
      details: 'Embedding generation functional'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

/**
 * Get performance metrics
 */
function getPerformanceMetrics() {
  const analytics = knowledgeRetriever.getAnalytics();
  
  return {
    totalQueries: analytics.performance.totalQueries,
    averageConfidence: analytics.performance.avgConfidence.toFixed(3),
    averageResponseTime: `${analytics.performance.avgResponseTime.toFixed(0)}ms`,
    cacheHitRate: analytics.performance.totalQueries > 0 
      ? `${((analytics.performance.cacheHits / analytics.performance.totalQueries) * 100).toFixed(1)}%`
      : '0%',
    braveSearchUsage: `${analytics.performance.braveSearchRequests} requests`,
    memoryPatterns: analytics.memoryStats.totalPatterns
  };
}

/**
 * Generate system recommendations
 */
function generateRecommendations(healthReport) {
  const recommendations = [];
  
  // MCP Client recommendations
  if (healthReport.components.mcpClient?.status !== 'healthy') {
    recommendations.push({
      priority: 'high',
      component: 'mcp_client',
      issue: 'MCP server connectivity issues',
      suggestion: 'Check MCP server status and restart if necessary'
    });
  }
  
  // Brave Search recommendations
  if (healthReport.components.braveSearch?.status !== 'healthy') {
    recommendations.push({
      priority: 'medium',
      component: 'brave_search',
      issue: 'Brave search functionality degraded',
      suggestion: 'Verify BRAVE_API_KEY and check API quota limits'
    });
  }
  
  // OpenAI recommendations
  if (healthReport.components.openaiEmbeddings?.status !== 'healthy') {
    recommendations.push({
      priority: 'high',
      component: 'openai_embeddings',
      issue: 'Embedding generation failing',
      suggestion: 'Check OPENAI_API_KEY and API quota limits'
    });
  }
  
  // Performance recommendations
  const avgResponseTime = parseFloat(healthReport.performance.averageResponseTime);
  if (avgResponseTime > 5000) {
    recommendations.push({
      priority: 'medium',
      component: 'performance',
      issue: 'High average response time',
      suggestion: 'Consider enabling embedding caching and optimizing queries'
    });
  }
  
  const totalQueries = healthReport.performance.totalQueries;
  if (totalQueries > 100) {
    const cacheHitRate = parseFloat(healthReport.performance.cacheHitRate);
    if (cacheHitRate < 20) {
      recommendations.push({
        priority: 'low',
        component: 'caching',
        issue: 'Low cache hit rate',
        suggestion: 'Enable embedding caching to improve performance'
      });
    }
  }
  
  return recommendations;
}

/**
 * Determine overall system health
 */
function determineOverallHealth(components) {
  const statuses = Object.values(components).map(c => c.status);
  
  if (statuses.includes('unhealthy')) {
    return 'critical';
  } else if (statuses.includes('degraded')) {
    return 'degraded';
  } else if (statuses.every(s => s === 'healthy')) {
    return 'healthy';
  } else {
    return 'unknown';
  }
}

/**
 * Quick health check for monitoring endpoints
 */
export function quickHealthCheck() {
  const health = knowledgeRetriever.getHealthStatus();
  
  return {
    status: health.mcpConnected && health.sdkAvailable ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      pinecone: health.mcpConnected || health.sdkAvailable,
      brave: health.braveSearchReady,
      cache: health.embeddingCacheSize
    }
  };
}

export default {
  performHealthCheck,
  quickHealthCheck
};
