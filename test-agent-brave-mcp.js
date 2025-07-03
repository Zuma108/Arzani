#!/usr/bin/env node

/**
 * Test Brave MCP Integration with AI Agents
 * Verifies that AI agents can successfully use Brave MCP for real-time search
 */

import dotenv from 'dotenv';
dotenv.config();

import { EnhancedHybridKnowledgeRetriever } from './services/knowledge/enhanced-hybrid-retrieval.js';

console.log('🤖 Testing AI Agent Brave MCP Integration...');

async function testAgentBraveMCP() {
  try {
    console.log('🔍 Initializing EnhancedHybridKnowledgeRetriever...');
    const knowledgeRetriever = new EnhancedHybridKnowledgeRetriever();
    
    console.log('📊 Testing revenue agent real-time search...');
    const result = await knowledgeRetriever.retrieveKnowledge(
      'UK business growth strategies 2024',
      'revenue',
      null,
      {
        maxResults: 3,
        includeUserDocs: false,
        forceSearch: true, // Force real-time search to test Brave MCP
        searchFallback: true
      }
    );
    
    console.log('✅ Result received:', {
      totalResults: result.results.length,
      realTimeResults: result.metadata.breakdown.realTimeSearch,
      confidence: result.metadata.confidence,
      strategy: result.metadata.strategy
    });
    
    if (result.metadata.breakdown.realTimeSearch > 0) {
      console.log('🎉 SUCCESS: AI agents can access Brave MCP for real-time search!');
      
      // Show sample result
      const realtimeResult = result.results.find(r => r.source === 'real_time_search');
      if (realtimeResult) {
        console.log('📋 Sample real-time search result:');
        console.log(`   Title: ${realtimeResult.metadata.title}`);
        console.log(`   URL: ${realtimeResult.metadata.url}`);
      }
    } else {
      console.log('❌ FAILURE: No real-time search results received');
    }
    
  } catch (error) {
    console.error('❌ Agent Brave MCP test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAgentBraveMCP();
