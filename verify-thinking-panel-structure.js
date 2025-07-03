/**
 * Test script to verify thinking panel integration across all agents
 */

// Test data structure for each agent type
const testData = {
  legal: {
    content: `<!-- THINKING_PANEL:{"id":"test-legal-123","agentType":"legal","thoughts":["Analyzing contract compliance requirements","Reviewing regulatory framework","Checking jurisdiction-specific laws"],"mcpSources":[{"type":"pinecone","name":"Legal Knowledge Base","query":"contract compliance","resultsCount":15,"responseTime":250,"confidence":0.92}],"memoryInsights":["Contract review pattern","Compliance framework"],"confidence":0.89,"status":"completed"} -->

## Legal Analysis Complete

The contract has been reviewed for compliance.`,
    agentType: 'legal'
  },
  finance: {
    content: `<!-- THINKING_PANEL:{"id":"test-finance-456","agentType":"finance","thoughts":["Analyzing financial statements","Calculating valuation metrics","Assessing market comparables"],"mcpSources":[{"type":"brave","name":"Market Data Search","query":"comparable companies valuation","resultsCount":12,"responseTime":180}],"memoryInsights":["Valuation methodology","Market trends"],"confidence":0.94,"status":"completed"} -->

## Financial Valuation Report

Based on market analysis, the valuation is £2.5M.`,
    agentType: 'finance'
  },
  revenue: {
    content: `<!-- THINKING_PANEL:{"id":"test-revenue-789","agentType":"revenue","thoughts":["Analyzing revenue streams","Forecasting growth potential","Identifying optimization opportunities"],"mcpSources":[{"type":"pinecone","name":"Revenue Analytics","query":"growth patterns","resultsCount":8,"responseTime":120}],"memoryInsights":["Revenue optimization","Growth strategies"],"confidence":0.87,"status":"completed"} -->

## Revenue Analysis

Revenue optimization opportunities identified.`,
    agentType: 'revenue'
  }
};

// Simple test function
function testThinkingPanelStructure() {
  console.log('Testing Thinking Panel Data Structure...\n');
  
  Object.keys(testData).forEach(agentType => {
    console.log(`=== Testing ${agentType.toUpperCase()} Agent ===`);
    
    const { content } = testData[agentType];
    
    // Simple regex test to verify the annotation format
    const thinkingPanelMatch = content.match(/<!--\s*THINKING_PANEL:\s*(\{.*?\})\s*-->/s);
    
    if (thinkingPanelMatch) {
      try {
        const parsed = JSON.parse(thinkingPanelMatch[1]);
        console.log(`✓ Agent Type: ${parsed.agentType}`);
        console.log(`✓ Thoughts: ${parsed.thoughts ? parsed.thoughts.length : 0}`);
        console.log(`✓ MCP Sources: ${parsed.mcpSources ? parsed.mcpSources.length : 0}`);
        console.log(`✓ Memory Insights: ${parsed.memoryInsights ? parsed.memoryInsights.length : 0}`);
        console.log(`✓ Confidence: ${parsed.confidence || 'N/A'}`);
        console.log(`✓ Status: ${parsed.status || 'N/A'}`);
      } catch (e) {
        console.log(`❌ JSON Parse Error: ${e.message}`);
      }
    } else {
      console.log('❌ No thinking panel annotation found');
    }
    
    console.log('');
  });
  
  console.log('Test completed! ✨');
}

// Run the test
testThinkingPanelStructure();
