// Markdown Test Runner
// This script can be run to test our enhanced markdown detection

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing enhanced markdown detection for AI responses');

// Sample AI responses in different formats
const responses = [
  {
    name: 'clean-markdown',
    content: `# Analysis Results

Here's what I found in the data:

## Key Metrics
- Revenue: $1.2M
- Profit: $350K
- Growth: 15%

\`\`\`javascript
function calculateGrowth(current, previous) {
  return ((current - previous) / previous) * 100;
}
\`\`\`

| Quarter | Revenue | Profit |
|---------|---------|--------|
| Q1      | $300K   | $75K   |
| Q2      | $350K   | $85K   |
| Q3      | $250K   | $70K   |
| Q4      | $300K   | $120K  |

> Note: These figures are preliminary and subject to final review.`
  },
  {
    name: 'plain-text',
    content: `Analysis Results

Here's what I found in the data:

Key Metrics
- Revenue: $1.2M
- Profit: $350K
- Growth: 15%

The revenue breakdown shows Q2 was our strongest quarter.
Q4 showed the highest profit margin despite lower revenue.

You should consider investing more in Q2 marketing campaigns since they're the most effective.`
  },
  {
    name: 'mixed-format',
    content: `ANALYSIS RESULTS

Here's what I found in the data:

KEY METRICS:
Revenue: $1.2M
Profit: $350K
Growth: 15%

function calculateGrowth(current, previous) {
  return ((current - previous) / previous) * 100;
}

Quarter | Revenue | Profit
--------|---------|--------
Q1      | $300K   | $75K
Q2      | $350K   | $85K
Q3      | $250K   | $70K
Q4      | $300K   | $120K

NOTE: These figures are preliminary and subject to final review.`
  },
  {
    name: 'agent-specific',
    content: `FINANCE AGENT ANALYSIS

Based on the financial data provided, I've identified the following:

INCOME STATEMENT REVIEW:
• Revenue: $1.2M (↑15% YoY)
• Operating Expenses: $850K (↑5% YoY)
• Net Profit: $350K (↑25% YoY)

CASH FLOW ANALYSIS:
1. Operating Cash Flow: $420K
2. Investing Cash Flow: -$150K
3. Financing Cash Flow: -$75K

Net Change in Cash Position: $195K

RECOMMENDATION:
→ Consider increasing capital expenditure in Q3 to maximize tax benefits.
→ Review vendor contracts to identify potential cost savings.

For more information: https://example.com/finance-report`
  }
];

// Create a directory for the test results
const testDir = path.join(__dirname, 'markdown-test-results');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Test each response with our enhanced isMarkdownContent function
console.log('\n🔍 Testing markdown detection for different response formats:\n');

// Simple mock of the markdown renderer
const mockRenderer = {
  isMarkdownContent: function(content) {
    // Basic patterns from our enhanced function
    const markdownPatterns = [
      /#{1,6}\s+/, // Headers
      /\*\*.*?\*\*/, // Bold
      /\*.*?\*/, // Italic
      /`.*?`/, // Inline code
      /```[\s\S]*?```/, // Code blocks
      /^\s*[-*+]\s+/m, // Bullet lists
      /^\s*\d+\.\s+/m, // Numbered lists
      /^\s*\|.*\|/m, // Tables
      /^\s*>/m, // Blockquotes
      /\[.*?\]\(.*?\)/, // Links
      
      // Enhanced patterns for AI agent responses
      /\n\n/, // Multiple newlines
      /\b[A-Z][A-Z\s]+:/, // ALL CAPS section titles with colon
      /^\s*-\s+/m, // Simple dash lists
      /^\s*•\s+/m, // Bullet lists with bullet character
      /^[A-Z][A-Z\s]+[A-Z]$/m, // ALL CAPS lines
      /\[\d+\]/, // Citation references
      /https?:\/\/\S+/ // URLs
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  },
  
  getMarkdownIndicators: function(content) {
    const indicators = [];
    if (content.match(/#{1,6}\s+/)) indicators.push('headers');
    if (content.match(/\*\*.*?\*\*/)) indicators.push('bold');
    if (content.match(/\*.*?\*/)) indicators.push('italic');
    if (content.match(/`.*?`/)) indicators.push('inline_code');
    if (content.match(/```[\s\S]*?```/)) indicators.push('code_blocks');
    if (content.match(/^\s*[-*+]\s+/m)) indicators.push('bullet_lists');
    if (content.match(/^\s*\d+\.\s+/m)) indicators.push('numbered_lists');
    if (content.match(/^\s*\|.*\|/m)) indicators.push('tables');
    if (content.match(/^\s*>/m)) indicators.push('blockquotes');
    if (content.match(/\[.*?\]\(.*?\)/)) indicators.push('links');
    if (content.match(/\n\n/)) indicators.push('paragraph_breaks');
    if (content.match(/\b[A-Z][A-Z\s]+:/)) indicators.push('caps_titles');
    if (content.match(/^\s*-\s+/m)) indicators.push('simple_lists');
    if (content.match(/^\s*•\s+/m)) indicators.push('bullet_char_lists');
    if (content.match(/^[A-Z][A-Z\s]+[A-Z]$/m)) indicators.push('all_caps_lines');
    if (content.match(/\[\d+\]/)) indicators.push('citations');
    if (content.match(/https?:\/\/\S+/)) indicators.push('urls');
    
    return {
      hasMarkdown: indicators.length > 0,
      indicators: indicators,
      count: indicators.length
    };
  }
};

// Test each response
responses.forEach(response => {
  const isMarkdown = mockRenderer.isMarkdownContent(response.content);
  const indicators = mockRenderer.getMarkdownIndicators(response.content);
  
  console.log(`${response.name}:`);
  console.log(`  - Is markdown: ${isMarkdown ? '✅ YES' : '❌ NO'}`);
  console.log(`  - Indicators found: ${indicators.count}`);
  console.log(`  - Patterns: ${indicators.indicators.join(', ')}`);
  console.log();
  
  // Write the results to a file
  const resultPath = path.join(testDir, `${response.name}-results.json`);
  fs.writeFileSync(resultPath, JSON.stringify({
    content: response.content.substring(0, 200) + '...',
    isMarkdown,
    indicators
  }, null, 2));
});

console.log(`✅ Test results saved to: ${testDir}`);
console.log('\n🔧 To debug in browser, use markdown-debug-helper.js:');
console.log('Instructions:');
console.log('1. Open the Arzani-X interface in your browser');
console.log('2. Get a response from an AI agent');
console.log('3. Open browser console and paste this:');
console.log('   fetch("/js/markdown-debug-helper.js").then(r => r.text()).then(t => new Function(t)())');
console.log('4. The script will analyze the last AI message and provide debugging info');
console.log('5. To re-render with markdown, run: window.reRenderLastAIMessage()');

module.exports = {
  run: () => console.log('Markdown tests completed')
};
