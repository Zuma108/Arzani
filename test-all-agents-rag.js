/**
 * Test RAG Integration for All Three Agents
 * Tests Legal, Broker, and Finance agents with RAG functionality
 */

import dotenv from 'dotenv';
import { processLegalTask } from './services/legal/legal.js';
import { processBrokerTask } from './services/broker/broker.js';
import { processFinanceTask } from './services/finance/finance.js';
import { createTextPart, createDataPart, createMessage } from './libs/a2a/utils.js';

// Load environment variables
dotenv.config();

/**
 * Create a test task and message for agent testing
 */
function createTestMessage(query, taskType = 'inquiry') {
  const task = {
    id: `test-${taskType}-${Date.now()}`,
    type: taskType,
    state: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString()
  };

  const message = createMessage([
    createTextPart(query)
  ]);

  return { task, message };
}

/**
 * Test Legal Agent with RAG
 */
async function testLegalAgentRAG() {
  console.log('\n🏛️ Testing Legal Agent with RAG...');
  console.log('=' .repeat(50));
  
  const testQueries = [
    'What are the UK GDPR compliance requirements for a business sale?',
    'What are the TUPE obligations when acquiring a UK business?',
    'What Companies House notifications are required for a share purchase?'
  ];

  for (const query of testQueries) {
    console.log(`\n📋 Query: ${query}`);
    try {
      const { task, message } = createTestMessage(query, 'legal_inquiry');
      const response = await processLegalTask(task, message);
      
      console.log(`✅ Legal Agent Response Status: ${response.task.state}`);
      const textParts = response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        const responseText = textParts[0].text;
        console.log(`📄 Response Length: ${responseText.length} characters`);
        console.log(`🔍 Contains RAG Context: ${responseText.includes('GUIDANCE') || responseText.includes('Sources')}`);
      }
      
      // Check for RAG data parts
      const dataParts = response.message.parts.filter(part => part.type === 'data');
      if (dataParts.length > 0 && dataParts[0].data.ragSources) {
        console.log(`📊 RAG Sources Found: ${dataParts[0].data.ragSources.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Legal Agent Error: ${error.message}`);
    }
  }
}

/**
 * Test Broker Agent with RAG
 */
async function testBrokerAgentRAG() {
  console.log('\n🏢 Testing Broker Agent with RAG...');
  console.log('=' .repeat(50));
  
  const testQueries = [
    'What are the typical EBITDA multiples for restaurant businesses in the UK?',
    'What due diligence is required for a UK business acquisition?',
    'How do I structure a business sale to minimize risk?'
  ];

  for (const query of testQueries) {
    console.log(`\n📋 Query: ${query}`);
    try {
      const { task, message } = createTestMessage(query, 'valuation_request');
      const response = await processBrokerTask(task, message);
      
      console.log(`✅ Broker Agent Response Status: ${response.task.state}`);
      const textParts = response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        const responseText = textParts[0].text;
        console.log(`📄 Response Length: ${responseText.length} characters`);
        console.log(`🔍 Contains RAG Context: ${responseText.includes('GUIDANCE') || responseText.includes('Sources')}`);
      }
      
      // Check for RAG data parts
      const dataParts = response.message.parts.filter(part => part.type === 'data');
      if (dataParts.length > 0 && dataParts[0].data.ragSources) {
        console.log(`📊 RAG Sources Found: ${dataParts[0].data.ragSources.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Broker Agent Error: ${error.message}`);
    }
  }
}

/**
 * Test Finance Agent with RAG
 */
async function testFinanceAgentRAG() {
  console.log('\n💰 Testing Finance Agent with RAG...');
  console.log('=' .repeat(50));
  
  const testQueries = [
    'What are the tax implications of an asset sale vs share sale in the UK?',
    'What government funding is available for UK business acquisitions?',
    'How do I value a SaaS business using EBITDA multiples?'
  ];

  for (const query of testQueries) {
    console.log(`\n📋 Query: ${query}`);
    try {
      const { task, message } = createTestMessage(query, 'tax_analysis');
      const response = await processFinanceTask(task, message);
      
      console.log(`✅ Finance Agent Response Status: ${response.task.state}`);
      const textParts = response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        const responseText = textParts[0].text;
        console.log(`📄 Response Length: ${responseText.length} characters`);
        console.log(`🔍 Contains RAG Context: ${responseText.includes('GUIDANCE') || responseText.includes('Sources')}`);
      }
      
      // Check for RAG data parts
      const dataParts = response.message.parts.filter(part => part.type === 'data');
      if (dataParts.length > 0 && dataParts[0].data.ragSources) {
        console.log(`📊 RAG Sources Found: ${dataParts[0].data.ragSources.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Finance Agent Error: ${error.message}`);
    }
  }
}

/**
 * Main test runner
 */
async function runAllAgentTests() {
  console.log('🚀 Starting RAG Integration Tests for All Agents');
  console.log('=' .repeat(60));
  
  try {
    // Test all three agents
    await testLegalAgentRAG();
    await testBrokerAgentRAG();
    await testFinanceAgentRAG();
    
    console.log('\n✅ All Agent RAG Tests Completed!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Test Suite Error:', error);
  } finally {
    console.log('\n🏁 Test suite finished');
    process.exit(0);
  }
}

// Run the tests
runAllAgentTests().catch(console.error);
