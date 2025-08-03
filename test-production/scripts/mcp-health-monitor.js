/**
 * MCP Health Monitor
 * 
 * Continuous monitoring and health checking for MCP services
 * to ensure Brave MCP remains accessible to all AI agents
 */

import { mcpService } from '../services/mcp/mcp-integration-service.js';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

dotenv.config();

class MCPHealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.monitoringInterval = 30000; // 30 seconds
    this.isMonitoring = false;
    this.healthStats = {
      braveSearch: { 
        successCount: 0, 
        failureCount: 0, 
        lastSuccess: null, 
        lastFailure: null,
        isHealthy: false
      },
      pinecone: { 
        successCount: 0, 
        failureCount: 0, 
        lastSuccess: null, 
        lastFailure: null,
        isHealthy: false
      }
    };
  }

  /**
   * Start monitoring MCP services
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ MCP monitoring is already running');
      return;
    }

    console.log('🏥 Starting MCP Health Monitor...');
    this.isMonitoring = true;

    // Initial health check
    await this.performHealthCheck();

    // Set up periodic monitoring
    this.monitoringTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.monitoringInterval);

    console.log(`✅ MCP Health Monitor started (checking every ${this.monitoringInterval/1000} seconds)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.isMonitoring = false;
    console.log('🛑 MCP Health Monitor stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`🏥 [${timestamp}] Performing MCP health check...`);

    // Check Brave Search MCP
    await this.checkBraveSearchHealth();
    
    // Check Pinecone MCP  
    await this.checkPineconeHealth();

    // Emit health status event
    this.emit('healthCheck', {
      timestamp,
      stats: this.healthStats,
      overall: this.getOverallHealth()
    });

    // Log summary
    this.logHealthSummary();
  }

  /**
   * Check Brave Search MCP health
   */
  async checkBraveSearchHealth() {
    try {
      const testQuery = 'UK business test query';
      const startTime = Date.now();
      
      const results = await mcpService.braveWebSearch(testQuery, { count: 1 });
      
      const responseTime = Date.now() - startTime;
      
      if (Array.isArray(results) && results.length >= 0) {
        this.healthStats.braveSearch.successCount++;
        this.healthStats.braveSearch.lastSuccess = new Date().toISOString();
        this.healthStats.braveSearch.isHealthy = true;
        this.healthStats.braveSearch.lastResponseTime = responseTime;
        
        console.log(`✅ Brave Search MCP healthy (${responseTime}ms, ${results.length} results)`);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      this.healthStats.braveSearch.failureCount++;
      this.healthStats.braveSearch.lastFailure = new Date().toISOString();
      this.healthStats.braveSearch.isHealthy = false;
      this.healthStats.braveSearch.lastError = error.message;
      
      console.error(`❌ Brave Search MCP unhealthy:`, error.message);
      
      // Emit alert
      this.emit('serviceDown', {
        service: 'braveSearch',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check Pinecone MCP health  
   */
  async checkPineconeHealth() {
    try {
      // Test Pinecone connection (placeholder - implement based on your Pinecone MCP interface)
      const status = mcpService.getStatus();
      const pineconeServer = status.servers.pinecone;
      
      if (pineconeServer && pineconeServer.ready) {
        this.healthStats.pinecone.successCount++;
        this.healthStats.pinecone.lastSuccess = new Date().toISOString();
        this.healthStats.pinecone.isHealthy = true;
        
        console.log(`✅ Pinecone MCP healthy`);
      } else {
        throw new Error('Pinecone server not ready');
      }
      
    } catch (error) {
      this.healthStats.pinecone.failureCount++;
      this.healthStats.pinecone.lastFailure = new Date().toISOString();
      this.healthStats.pinecone.isHealthy = false;
      this.healthStats.pinecone.lastError = error.message;
      
      console.error(`❌ Pinecone MCP unhealthy:`, error.message);
      
      // Emit alert
      this.emit('serviceDown', {
        service: 'pinecone',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get overall system health
   */
  getOverallHealth() {
    const braveHealthy = this.healthStats.braveSearch.isHealthy;
    const pineconeHealthy = this.healthStats.pinecone.isHealthy;
    
    if (braveHealthy && pineconeHealthy) {
      return 'healthy';
    } else if (braveHealthy || pineconeHealthy) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Log health summary
   */
  logHealthSummary() {
    const overall = this.getOverallHealth();
    const statusIcon = overall === 'healthy' ? '💚' : overall === 'degraded' ? '💛' : '💔';
    
    console.log(`${statusIcon} MCP Health Summary: ${overall.toUpperCase()}`);
    
    Object.entries(this.healthStats).forEach(([service, stats]) => {
      const icon = stats.isHealthy ? '✅' : '❌';
      const successRate = stats.successCount + stats.failureCount > 0 ? 
        (stats.successCount / (stats.successCount + stats.failureCount) * 100).toFixed(1) : 'N/A';
      
      console.log(`  ${icon} ${service}: ${successRate}% success rate (${stats.successCount}/${stats.successCount + stats.failureCount})`);
    });
  }

  /**
   * Get health report
   */
  getHealthReport() {
    return {
      timestamp: new Date().toISOString(),
      overall: this.getOverallHealth(),
      services: this.healthStats,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Reset health statistics
   */
  resetStats() {
    Object.keys(this.healthStats).forEach(service => {
      this.healthStats[service] = {
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        isHealthy: false
      };
    });
    console.log('🔄 Health statistics reset');
  }
}

// Create singleton instance
const healthMonitor = new MCPHealthMonitor();

// Set up event listeners for alerts
healthMonitor.on('serviceDown', (alert) => {
  console.error(`🚨 ALERT: ${alert.service} service is down - ${alert.error}`);
});

healthMonitor.on('healthCheck', (report) => {
  // Could integrate with monitoring systems here
});

export { healthMonitor };
export default healthMonitor;
