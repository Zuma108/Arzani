/**
 * Test Script for Arzani-X Markdown Rendering
 * Run this to test the new ChatGPT-like formatting system
 */

// Sample markdown content that your agents might return
const sampleMarkdownResponses = {
  finance: `## Business Valuation Analysis

Based on the information provided, here's a comprehensive financial analysis:

### Key Financial Metrics

| Metric | Value | Industry Benchmark |
|--------|-------|-------------------|
| Annual Revenue | £500,000 | £400,000-£600,000 |
| EBITDA | £150,000 | 25-35% of revenue |
| EBITDA Multiple | 3.5x | 3.0-4.5x for retail |

### Valuation Methods

**1. EBITDA Multiple Method**
- Current EBITDA: £150,000
- Industry multiple: 3.5x
- **Estimated Value: £525,000**

**2. Asset-Based Valuation**
- Tangible assets: £200,000
- Intangible assets: £75,000
- **Total Asset Value: £275,000**

> **Important Disclaimer**: This is a preliminary analysis. Please consult with a qualified chartered accountant for professional valuation.

### Next Steps
1. **Professional Valuation**: Engage a certified business valuer
2. **Due Diligence**: Complete financial audit
3. **Market Analysis**: Compare with recent sales
4. **Tax Planning**: Discuss with your accountant

### UK Tax Considerations
- **Capital Gains Tax**: May apply at 10% or 20% depending on circumstances
- **Business Asset Disposal Relief**: Could reduce CGT to 10% up to £1 million lifetime limit
- **Corporation Tax**: Consider timing of sale vs. dividend distribution

*For specific tax advice, please consult with a qualified UK tax professional.*`,

  legal: `## UK Legal Requirements for Business Sale

### Key Legal Considerations

**Due Diligence Requirements:**
- Corporate structure review
- Contract analysis
- IP rights assessment
- Employment law compliance

### Required Documents

| Document Type | Purpose | Timeline |
|---------------|---------|----------|
| Share Purchase Agreement | Main transaction document | 2-4 weeks |
| Disclosure Letter | Seller warranties | 1-2 weeks |
| Board Resolutions | Corporate approvals | 1 week |
| Companies House Filings | Public notifications | Post-completion |

### UK Regulatory Compliance

**Companies House Requirements:**
- Form PSC01 for PSC changes
- Form CS01 for share allotments
- Updated confirmation statement

**Employment Law (TUPE):**
- Employee consultation requirements
- Transfer of contracts
- Pension obligations

> **Critical**: All documentation must comply with English law. Seek qualified legal counsel before proceeding.

### Risk Assessment

**High Risk Areas:**
- **Data Protection**: UK GDPR compliance
- **Intellectual Property**: Patent and trademark transfers
- **Contract Novation**: Customer and supplier agreements

**Medium Risk Areas:**
- Business rates transfers
- Insurance policy assignments
- Lease assignments

### Recommended Actions
1. Engage a qualified solicitor specializing in M&A
2. Complete legal due diligence
3. Prepare disclosure documentation
4. Review all material contracts

*This guidance is for educational purposes only. Always consult with a qualified UK solicitor for specific legal advice.*`,

  broker: `## Business Marketplace Analysis

### Market Positioning

Your business shows strong potential in the current market:

**Competitive Advantages:**
- Established customer base
- Strong brand recognition
- Diversified revenue streams

### Comparable Sales Analysis

| Business Type | Sale Price | EBITDA Multiple | Location |
|---------------|------------|-----------------|----------|
| Similar Retail | £480,000 | 3.2x | Manchester |
| Competitor A | £620,000 | 4.1x | Birmingham |
| Market Leader | £750,000 | 5.0x | London |

### Marketing Strategy

**Preparation Phase (4-6 weeks):**
1. **Financial Cleanup**: Organize 3 years of accounts
2. **Operational Documentation**: Process manuals and systems
3. **Legal Review**: Contracts and compliance check

**Marketing Phase (8-12 weeks):**
1. **Professional Presentation**: Investment memorandum
2. **Buyer Identification**: Target strategic and financial buyers
3. **Confidential Marketing**: NDA-protected information sharing

### Valuation Methodology

\`\`\`
Enterprise Value = EBITDA × Industry Multiple + Adjustments

Base Calculation:
£150,000 × 3.5 = £525,000

Plus: Excess cash            +£25,000
Less: Debt repayment        -£50,000
Less: Working capital       -£15,000

Adjusted Enterprise Value: £485,000
\`\`\`

> **Market Insight**: Current market conditions favor sellers with 6-8 months average time to complete.

### Success Factors
- **Financial Transparency**: Clean, audited accounts
- **Growth Story**: Clear path to increased profitability  
- **Management Team**: Strong operational leadership
- **Market Position**: Defensible competitive advantages

**Next Steps:**
1. Complete business preparation checklist
2. Engage professional advisory team
3. Develop confidential marketing materials
4. Begin buyer identification process`
};

// Function to test rendering in the browser
function testMarkdownRendering() {
  console.log('Testing Arzani-X Markdown Rendering...');
  
  if (!window.arzaniRenderer) {
    console.error('Markdown renderer not loaded');
    return;
  }
  
  // Test each agent response
  Object.keys(sampleMarkdownResponses).forEach(agentType => {
    console.log(`\n=== Testing ${agentType.toUpperCase()} Agent Response ===`);
    
    const markdown = sampleMarkdownResponses[agentType];
    const html = window.arzaniRenderer.renderToHtml(markdown, agentType);
    
    console.log('Original Markdown:', markdown.substring(0, 100) + '...');
    console.log('Rendered HTML:', html.substring(0, 200) + '...');
    
    // Create a test message element
    const testContainer = document.createElement('div');
    testContainer.innerHTML = html;
    testContainer.style.border = '1px solid #ccc';
    testContainer.style.margin = '10px';
    testContainer.style.padding = '10px';
    
    // Add to page for visual inspection
    document.body.appendChild(testContainer);
  });
  
  console.log('Markdown rendering test complete. Check the page for visual results.');
}

// Function to simulate agent responses
function simulateAgentResponse(agentType = 'finance') {
  if (!window.client) {
    console.error('Arzani client not found');
    return;
  }
  
  const response = sampleMarkdownResponses[agentType];
  if (!response) {
    console.error(`No sample response for agent: ${agentType}`);
    return;
  }
  
  // Add the markdown-formatted response as if it came from an agent
  window.client.addMessage(response, 'assistant');
  console.log(`Simulated ${agentType} agent response added to chat`);
}

// Export for browser use
window.testMarkdownRendering = testMarkdownRendering;
window.simulateAgentResponse = simulateAgentResponse;
window.sampleMarkdownResponses = sampleMarkdownResponses;

console.log('Markdown testing utilities loaded. Use:');
console.log('- testMarkdownRendering() to test rendering');
console.log('- simulateAgentResponse("finance") to simulate agent responses');
