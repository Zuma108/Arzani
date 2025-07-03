/**
 * Comprehensive Integration Test for Enhanced Hybrid Retrieval System
 * 
 * This test verifies that all agents are properly integrated with the new
 * enhanced hybrid retrieval system and that legacy systems are no longer in use.
 */

import fs from 'fs';
import path from 'path';

// Import all agents to verify they can load the new system
import { Orchestrator } from './services/orchestrator/orchestrator.js';
import { processLegalTask } from './services/legal/legal.js';
import financeService from './services/finance/finance.js';
import { processRevenueTask } from './services/revenue/revenue.js';

// Import the enhanced hybrid retrieval system directly
import hybridRetriever, { EnhancedHybridKnowledgeRetriever } from './services/knowledge/enhanced-hybrid-retrieval.js';

class AgentIntegrationTester {
  constructor() {
    this.testResults = {
      agentImports: {},
      retrievalSystemTests: {},
      legacySystemRemoval: {},
      apiCompatibility: {}
    };
  }

  /**
   * Test that all agents can import the enhanced hybrid retrieval system
   */
  async testAgentImports() {
    console.log('🔧 Testing Agent Imports...\n');

    const agents = [
      { name: 'orchestrator', service: Orchestrator },
      { name: 'legal', service: processLegalTask },
      { name: 'finance', service: financeService },
      { name: 'revenue', service: processRevenueTask }
    ];

    for (const agent of agents) {
      try {
        // Test that the agent service loaded successfully
        if (agent.service && (typeof agent.service === 'object' || typeof agent.service === 'function')) {
          console.log(`   ✅ ${agent.name} agent imported successfully`);
          this.testResults.agentImports[agent.name] = true;
        } else {
          throw new Error('Agent service not loaded properly');
        }
      } catch (error) {
        console.error(`   ❌ ${agent.name} agent import failed:`, error.message);
        this.testResults.agentImports[agent.name] = false;
      }
    }

    console.log('');
  }

  /**
   * Test that the enhanced hybrid retrieval system functions correctly
   */
  async testEnhancedRetrievalSystem() {
    console.log('🔍 Testing Enhanced Hybrid Retrieval System...\n');

    try {
      // Test direct access to enhanced retrieval system
      const retriever = new EnhancedHybridKnowledgeRetriever();
      
      console.log('   🏗️ Testing system initialization...');
      if (retriever && typeof retriever.retrieveKnowledge === 'function') {
        console.log('   ✅ Enhanced retrieval system initialized successfully');
        this.testResults.retrievalSystemTests.initialization = true;
      } else {
        throw new Error('Retrieval system not properly initialized');
      }

      // Test basic retrieval functionality
      console.log('   🔎 Testing basic retrieval functionality...');
      const testQuery = 'artificial intelligence trends';
      const testResult = await retriever.retrieveKnowledge(testQuery, 'orchestrator', null, {
        maxResults: 3,
        useCache: false // Disable cache for testing
      });

      if (testResult && testResult.results && Array.isArray(testResult.results)) {
        console.log(`   ✅ Basic retrieval working (${testResult.results.length} results)`);
        this.testResults.retrievalSystemTests.basicRetrieval = true;
        
        // Test that both Pinecone and Brave sources are available
        const sources = testResult.results.map(r => r.source);
        if (sources.includes('pinecone')) {
          console.log('   ✅ Pinecone MCP integration working');
          this.testResults.retrievalSystemTests.pineconeIntegration = true;
        }
        
        if (sources.includes('brave_search') || sources.includes('real_time_search')) {
          console.log('   ✅ Brave Search MCP integration working');
          this.testResults.retrievalSystemTests.braveIntegration = true;
        }
      } else {
        throw new Error('Retrieval system did not return expected results');
      }

      // Test knowledge memory and learning
      console.log('   🧠 Testing knowledge memory functionality...');
      const memoryStats = retriever.getMemoryStats();
      if (memoryStats && typeof memoryStats === 'object') {
        console.log('   ✅ Knowledge memory system working');
        this.testResults.retrievalSystemTests.memorySystem = true;
      }

    } catch (error) {
      console.error('   ❌ Enhanced retrieval system test failed:', error.message);
      this.testResults.retrievalSystemTests.initialization = false;
    }

    console.log('');
  }

  /**
   * Verify that legacy systems are no longer referenced
   */
  async testLegacySystemRemoval() {
    console.log('🗑️ Verifying Legacy System Removal...\n');

    const agentFiles = [
      './services/orchestrator/orchestrator.js',
      './services/legal/legal.js',
      './services/finance/finance.js',
      './services/revenue/revenue.js'
    ];

    for (const filePath of agentFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const agentName = path.basename(path.dirname(filePath));

        // Check for legacy imports
        if (content.includes("hybrid-retrieval.js'") && !content.includes("enhanced-hybrid-retrieval.js'")) {
          console.error(`   ❌ ${agentName} still uses legacy hybrid-retrieval.js`);
          this.testResults.legacySystemRemoval[agentName] = false;
        } else if (content.includes("enhanced-hybrid-retrieval.js'")) {
          console.log(`   ✅ ${agentName} using enhanced hybrid retrieval system`);
          this.testResults.legacySystemRemoval[agentName] = true;
        } else {
          console.warn(`   ⚠️ ${agentName} no retrieval system imports found`);
          this.testResults.legacySystemRemoval[agentName] = false;
        }

        // Check for references to old class names
        if (content.includes('HybridKnowledgeRetriever') && !content.includes('EnhancedHybridKnowledgeRetriever')) {
          console.error(`   ❌ ${agentName} still references old HybridKnowledgeRetriever class`);
        }

      } catch (error) {
        console.error(`   ❌ Error checking ${filePath}:`, error.message);
        this.testResults.legacySystemRemoval[path.basename(path.dirname(filePath))] = false;
      }
    }

    console.log('');
  }

  /**
   * Test API compatibility with the new system
   */
  async testAPICompatibility() {
    console.log('🔌 Testing API Compatibility...\n');

    try {
      // Test that the default export works
      if (hybridRetriever && typeof hybridRetriever.retrieveKnowledge === 'function') {
        console.log('   ✅ Default export working correctly');
        this.testResults.apiCompatibility.defaultExport = true;
      } else {
        throw new Error('Default export not working');
      }

      // Test that the named export works
      const namedRetriever = new EnhancedHybridKnowledgeRetriever();
      if (namedRetriever && typeof namedRetriever.retrieveKnowledge === 'function') {
        console.log('   ✅ Named export working correctly');
        this.testResults.apiCompatibility.namedExport = true;
      } else {
        throw new Error('Named export not working');
      }

      // Test API signature compatibility
      const testQuery = 'test api compatibility';
      const apiResult = await hybridRetriever.retrieveKnowledge(testQuery, 'orchestrator');
      
      if (apiResult && apiResult.results) {
        console.log('   ✅ API signature compatible');
        this.testResults.apiCompatibility.apiSignature = true;
      } else {
        throw new Error('API signature incompatible');
      }

    } catch (error) {
      console.error('   ❌ API compatibility test failed:', error.message);
      this.testResults.apiCompatibility.defaultExport = false;
    }

    console.log('');
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('📊 Integration Test Report\n');
    console.log('=' .repeat(50));

    // Agent Imports
    console.log('\n🔧 Agent Imports:');
    Object.entries(this.testResults.agentImports).forEach(([agent, success]) => {
      console.log(`   ${success ? '✅' : '❌'} ${agent}: ${success ? 'SUCCESS' : 'FAILED'}`);
    });

    // Retrieval System Tests
    console.log('\n🔍 Enhanced Retrieval System:');
    Object.entries(this.testResults.retrievalSystemTests).forEach(([test, success]) => {
      console.log(`   ${success ? '✅' : '❌'} ${test}: ${success ? 'SUCCESS' : 'FAILED'}`);
    });

    // Legacy System Removal
    console.log('\n🗑️ Legacy System Removal:');
    Object.entries(this.testResults.legacySystemRemoval).forEach(([agent, success]) => {
      console.log(`   ${success ? '✅' : '❌'} ${agent}: ${success ? 'CLEAN' : 'LEGACY DETECTED'}`);
    });

    // API Compatibility
    console.log('\n🔌 API Compatibility:');
    Object.entries(this.testResults.apiCompatibility).forEach(([test, success]) => {
      console.log(`   ${success ? '✅' : '❌'} ${test}: ${success ? 'COMPATIBLE' : 'INCOMPATIBLE'}`);
    });

    // Overall Status
    const allTests = [
      ...Object.values(this.testResults.agentImports),
      ...Object.values(this.testResults.retrievalSystemTests),
      ...Object.values(this.testResults.legacySystemRemoval),
      ...Object.values(this.testResults.apiCompatibility)
    ];

    const successCount = allTests.filter(Boolean).length;
    const totalTests = allTests.length;

    console.log('\n' + '=' .repeat(50));
    console.log(`\n🎯 Overall Result: ${successCount}/${totalTests} tests passed`);
    
    if (successCount === totalTests) {
      console.log('🎉 All integration tests passed! The enhanced hybrid retrieval system is ready for production.');
    } else {
      console.log('⚠️ Some tests failed. Please review the results above and fix any issues.');
    }

    console.log('\n' + '=' .repeat(50));
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Enhanced Hybrid Retrieval System Integration Test\n');
    console.log('Testing migration from legacy system to enhanced system...\n');
    console.log('=' .repeat(50) + '\n');

    await this.testAgentImports();
    await this.testEnhancedRetrievalSystem();
    await this.testLegacySystemRemoval();
    await this.testAPICompatibility();

    this.generateReport();
  }
}

// Run the integration tests
async function main() {
  const tester = new AgentIntegrationTester();
  await tester.runAllTests();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default AgentIntegrationTester;
