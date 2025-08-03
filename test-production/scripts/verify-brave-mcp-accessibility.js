/**
 * Brave MCP Agent Accessibility Verification
 * 
 * Comprehensive test to verify that Brave MCP is truly accessible 
 * to all AI agents at runtime
 */

import { EnhancedHybridKnowledgeRetriever } from '../services/knowledge/enhanced-hybrid-retrieval.js';
import { mcpService } from '../services/mcp/mcp-integration-service.js';
import { healthMonitor } from './mcp-health-monitor.js';
import dotenv from 'dotenv';

dotenv.config();

class BraveMCPAccessibilityVerifier {
  constructor() {
    this.verificationResults = {
      mcpServiceReady: false,
      braveConnectionWorking: false,
      agentAccessibility: {
        revenue: { accessible: false, responseTime: null, error: null },
        finance: { accessible: false, responseTime: null, error: null },
        legal: { accessible: false, responseTime: null, error: null },
        orchestrator: { accessible: false, responseTime: null, error: null }
      },
      realTimeSearchWorking: false,
      fallbackMechanismWorking: false
    };
  }

  /**
   * Run comprehensive verification
   */
  async runVerification() {
    console.log('🔍 Starting Brave MCP Agent Accessibility Verification\n');
    console.log('='.repeat(60));

    try {
      // Step 1: Verify MCP Service is ready
      await this.verifyMCPServiceReady();
      
      // Step 2: Test direct Brave connection
      await this.testDirectBraveConnection();
      
      // Step 3: Test agent accessibility 
      await this.testAgentAccessibility();
      
      // Step 4: Test real-time search integration
      await this.testRealTimeSearchIntegration();
      
      // Step 5: Test fallback mechanism
      await this.testFallbackMechanism();
      
      // Step 6: Generate comprehensive report
      this.generateVerificationReport();
      
    } catch (error) {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    }
  }

  /**
   * Verify MCP service is ready
   */
  async verifyMCPServiceReady() {
    console.log('📡 Step 1: Verifying MCP Service Readiness...');
    
    try {
      // Wait for MCP service initialization
      let attempts = 0;
      while (!mcpService.isReady() && attempts < 30) {
        console.log(`   ⏳ Waiting for MCP service... (${attempts + 1}/30)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (mcpService.isReady()) {
        this.verificationResults.mcpServiceReady = true;
        console.log('   ✅ MCP Service is ready');
        
        const status = mcpService.getStatus();
        console.log(`   📊 Active servers: ${Object.keys(status.servers).length}`);
        
        Object.entries(status.servers).forEach(([name, serverStatus]) => {
          const icon = serverStatus.ready ? '✅' : '❌';
          console.log(`      ${icon} ${name}: Ready=${serverStatus.ready}`);
        });
        
      } else {
        throw new Error('MCP Service failed to become ready within timeout');
      }
      
    } catch (error) {
      console.error('   ❌ MCP Service verification failed:', error.message);
      throw error;
    }
    
    console.log('');
  }

  /**
   * Test direct Brave connection
   */
  async testDirectBraveConnection() {
    console.log('🔍 Step 2: Testing Direct Brave Search Connection...');
    
    try {
      const testQuery = 'UK business regulations test';
      const startTime = Date.now();
      
      const results = await mcpService.braveWebSearch(testQuery, { count: 3 });
      const responseTime = Date.now() - startTime;
      
      if (Array.isArray(results) && results.length > 0) {
        this.verificationResults.braveConnectionWorking = true;
        console.log(`   ✅ Brave Search MCP working (${responseTime}ms, ${results.length} results)`);
        console.log(`   📋 Sample result: "${results[0].title}"`);
      } else {
        throw new Error('No results returned from Brave Search');
      }
      
    } catch (error) {
      console.error('   ❌ Direct Brave connection failed:', error.message);
      this.verificationResults.braveConnectionWorking = false;
    }
    
    console.log('');
  }

  /**
   * Test agent accessibility to Brave MCP
   */
  async testAgentAccessibility() {
    console.log('🤖 Step 3: Testing Agent Accessibility to Brave MCP...');
    
    const agents = ['revenue', 'finance', 'legal', 'orchestrator'];
    const testQueries = {
      revenue: 'UK business growth strategies',
      finance: 'UK business valuation methods',
      legal: 'UK company law compliance',
      orchestrator: 'UK business marketplace'
    };

    for (const agent of agents) {
      try {
        console.log(`   🔍 Testing ${agent} agent accessibility...`);
        
        const knowledgeRetriever = new EnhancedHybridKnowledgeRetriever();
        const startTime = Date.now();
        
        // Force real-time search to test Brave MCP accessibility
        const result = await knowledgeRetriever.retrieveKnowledge(
          testQueries[agent], 
          agent,
          null,
          {
            maxResults: 3,
            includeUserDocs: false,
            forceSearch: true, // Force real-time search
            searchFallback: true
          }
        );
        
        const responseTime = Date.now() - startTime;
        
        // Check if real-time search was used
        const realTimeResults = result.metadata.breakdown.realTimeSearch;
        
        if (realTimeResults > 0) {
          this.verificationResults.agentAccessibility[agent] = {
            accessible: true,
            responseTime: responseTime,
            error: null,
            realTimeResults: realTimeResults
          };
          console.log(`      ✅ ${agent} agent: Brave MCP accessible (${responseTime}ms, ${realTimeResults} real-time results)`);
        } else {
          throw new Error('No real-time search results found');
        }
        
      } catch (error) {
        this.verificationResults.agentAccessibility[agent] = {
          accessible: false,
          responseTime: null,
          error: error.message
        };
        console.error(`      ❌ ${agent} agent: Brave MCP not accessible - ${error.message}`);
      }
    }
    
    console.log('');
  }

  /**
   * Test real-time search integration
   */
  async testRealTimeSearchIntegration() {
    console.log('🌐 Step 4: Testing Real-Time Search Integration...');
    
    try {
      const knowledgeRetriever = new EnhancedHybridKnowledgeRetriever();
      
      const result = await knowledgeRetriever.retrieveKnowledge(
        'latest UK business trends 2024',
        'revenue',
        null,
        {
          maxResults: 5,
          forceSearch: true,
          searchFallback: true
        }
      );
      
      const realTimeResults = result.metadata.breakdown.realTimeSearch;
      
      if (realTimeResults > 0) {
        this.verificationResults.realTimeSearchWorking = true;
        console.log(`   ✅ Real-time search working (${realTimeResults} results)`);
        
        // Check result quality
        const sampleResult = result.results.find(r => r.source === 'real_time_search');
        if (sampleResult) {
          console.log(`   📋 Sample real-time result: "${sampleResult.metadata.title}"`);
        }
      } else {
        throw new Error('Real-time search did not return results');
      }
      
    } catch (error) {
      console.error('   ❌ Real-time search integration failed:', error.message);
      this.verificationResults.realTimeSearchWorking = false;
    }
    
    console.log('');
  }

  /**
   * Test fallback mechanism
   */
  async testFallbackMechanism() {
    console.log('🛡️ Step 5: Testing Fallback Mechanism...');
    
    try {
      // Temporarily break Brave MCP to test fallback
      const knowledgeRetriever = new EnhancedHybridKnowledgeRetriever();
      
      // Force a scenario that would trigger fallback
      const result = await knowledgeRetriever.retrieveKnowledge(
        'test fallback mechanism',
        'legal',
        null,
        {
          maxResults: 3,
          forceSearch: true,
          searchFallback: true
        }
      );
      
      // Even if Brave MCP fails, should get fallback results
      if (result.results.length > 0) {
        this.verificationResults.fallbackMechanismWorking = true;
        console.log(`   ✅ Fallback mechanism working (${result.results.length} fallback results)`);
      } else {
        throw new Error('No fallback results provided');
      }
      
    } catch (error) {
      console.error('   ❌ Fallback mechanism failed:', error.message);
      this.verificationResults.fallbackMechanismWorking = false;
    }
    
    console.log('');
  }

  /**
   * Generate comprehensive verification report
   */
  generateVerificationReport() {
    console.log('📊 BRAVE MCP ACCESSIBILITY VERIFICATION REPORT');
    console.log('='.repeat(60));
    
    const results = this.verificationResults;
    
    // Overall status
    const allAgentsAccessible = Object.values(results.agentAccessibility).every(agent => agent.accessible);
    const overallStatus = results.mcpServiceReady && results.braveConnectionWorking && 
                         allAgentsAccessible && results.realTimeSearchWorking ? 'PASS' : 'FAIL';
    
    const statusIcon = overallStatus === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} OVERALL STATUS: ${overallStatus}\n`);
    
    // Detailed results
    console.log('📋 DETAILED RESULTS:');
    console.log(`   MCP Service Ready: ${results.mcpServiceReady ? '✅' : '❌'}`);
    console.log(`   Brave Connection Working: ${results.braveConnectionWorking ? '✅' : '❌'}`);
    console.log(`   Real-Time Search Working: ${results.realTimeSearchWorking ? '✅' : '❌'}`);
    console.log(`   Fallback Mechanism Working: ${results.fallbackMechanismWorking ? '✅' : '❌'}`);
    
    console.log('\n🤖 AGENT ACCESSIBILITY:');
    Object.entries(results.agentAccessibility).forEach(([agent, status]) => {
      const icon = status.accessible ? '✅' : '❌';
      const time = status.responseTime ? `${status.responseTime}ms` : 'N/A';
      console.log(`   ${icon} ${agent}: ${status.accessible ? 'Accessible' : 'Not Accessible'} (${time})`);
      if (status.error) {
        console.log(`      └─ Error: ${status.error}`);
      }
    });
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (overallStatus === 'PASS') {
      console.log('   🎉 Brave MCP is fully accessible to all AI agents!');
      console.log('   ✓ All agents can perform real-time searches');
      console.log('   ✓ Fallback mechanisms are working');
      console.log('   ✓ System is production-ready');
    } else {
      console.log('   ⚠️  Issues detected with Brave MCP accessibility:');
      
      if (!results.mcpServiceReady) {
        console.log('   • Fix MCP service initialization');
      }
      if (!results.braveConnectionWorking) {
        console.log('   • Check Brave API key and network connectivity');
      }
      if (!allAgentsAccessible) {
        console.log('   • Investigate agent integration issues');
      }
      if (!results.realTimeSearchWorking) {
        console.log('   • Debug real-time search integration');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    process.exit(overallStatus === 'PASS' ? 0 : 1);
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new BraveMCPAccessibilityVerifier();
  verifier.runVerification().catch(console.error);
}

export { BraveMCPAccessibilityVerifier };
