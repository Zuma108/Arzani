/**
 * Unified Markdown Configuration for Arzani A2A Agents
 * 
 * This file provides standardized markdown formatting guidelines
 * to ensure consistent, well-formatted responses across all agents.
 */

// Markdown format guide for agent system prompts
const MARKDOWN_FORMAT_GUIDE = `
## CRITICAL: ALWAYS USE GITHUB-FLAVORED MARKDOWN

Format ALL responses using these specific markdown patterns:

### Headings and Structure
- Use \`##\` for main sections (H2)
- Use \`###\` for subsections (H3)
- Use \`####\` for minor sections (H4)
- Add line breaks between sections for readability

### Lists and Items
- Use \`-\` for unordered lists
- Use \`1.\` for ordered lists (with proper numbering)
- Use proper indentation for nested lists
  - Two spaces for each level of nesting
  - Maintain consistent indentation

### Emphasis and Highlighting
- Use \`**bold**\` for important terms, figures, and key points
- Use \`*italics*\` for definitions or slight emphasis
- Use \`~~strikethrough~~\` sparingly for corrections or deletions
- Use \`> blockquotes\` for important notes, warnings, or quoted material

### Code and Technical Content
- Use \`\`\`language\\n code \`\`\` for multi-line code blocks with syntax highlighting
- Use \`inline code\` for technical terms, variables, or short code snippets
- Always specify language for syntax highlighting (\`\`\`javascript, \`\`\`sql, etc.)

### Tables - CRITICAL FOR AI ACCURACY
**MANDATORY TABLE RULES:**
- **NEVER leave empty cells** - Use "N/A", "TBD", or "—" instead
- **Always include headers** with clear, descriptive column names
- **Use consistent data formatting** within each column
- **Right-align numerical data** using spaces or formatting
- **Include units** for all financial/numerical data (£, %, years, etc.)
- **Validate table structure** before output

**ADVANCED TABLE FORMATTING:**
\`\`\`markdown
| Item | Price (£) | Change | Status |
|------|----------:|-------:|--------|
| Widget A | £1,250.00 | +5.2% | Active |
| Widget B | £890.50 | -2.1% | Active |
| Widget C | £2,100.00 | +12.8% | Pending |
\`\`\`

**TABLE ALIGNMENT GUIDE:**
- Use \`:---\` for left alignment (default)
- Use \`:---:\` for center alignment  
- Use \`---:\` for right alignment (numbers, currency)
- Apply consistent alignment within data types

### Special Elements
- Use horizontal rules (\`---\`) to separate major sections
- Use emoji selectively for visual emphasis (e.g., ✅ ⚠️ 📊 💡)
- Include URLs as [descriptive text](http://example.com)

### Response Structure
- Begin with a brief summary or key point
- Organize information in logical sections with appropriate headings
- End with a concise conclusion or next steps
- Use clear section transitions
`;

// Agent-specific markdown guidelines
const AGENT_MARKDOWN_GUIDELINES = {
  orchestrator: `
### ORCHESTRATOR-SPECIFIC FORMATTING
- Begin responses with a clear summary of the analysis chain
- Use **Agent Name:** format to attribute information to specific agents
- Include markdown tables for comparative data from multiple agents
- Use bullet lists for key takeaways from different agents
- Add horizontal rules (---) between different agent sections
- Use consistent emoji for different agent types (📊 Finance, ⚖️ Legal, 🏢 Broker)
- End with a clear, concise overall conclusion

**MANDATORY ORCHESTRATOR TABLES:**
1. **Agent Summary Table** - Always include when coordinating multiple agents
2. **Comparison Tables** - For evaluating multiple options or scenarios
3. **Timeline Tables** - For complex multi-stage processes

**CRITICAL TABLE RULES FOR ORCHESTRATOR:**
- Status column must use: ✅ Complete, ⚠️ In Progress, ❌ Blocked, 📋 Ready
- Confidence scores must include percentage and reasoning
- Always include an "Overall" or "Total" summary row
- Use bold formatting for final recommendations
`,

  generalist: `
### GENERALIST-SPECIFIC FORMATTING
- Begin responses with a clear introduction or greeting
- Use simple, concise markdown headings for better readability
- Use bullet lists for step-by-step instructions or key points
- Include horizontal rules (---) to separate different topics
- Use emoji selectively for visual emphasis (e.g., 💡 for tips, ✅ for confirmed actions)
- End with a friendly closing or next steps

**CRITICAL MARKDOWN REQUIREMENTS:**
- Always use proper heading levels (## for main sections, ### for subsections)
- Format lists consistently with proper indentation and spacing
- Use **bold** for important terms and key information
- Use *italics* for emphasis or definitions
- Use > blockquotes for highlighting important information
- Use proper line breaks between sections for readability
`,

  finance: `
### FINANCE-SPECIFIC FORMATTING
- Use markdown tables for financial data, calculations, and comparisons
- Format monetary values consistently (e.g., £1,000.00)
- Use code blocks for calculation examples
- Include bullet lists for financial considerations
- Create comparison tables for different scenarios
- Add blockquotes for important financial disclaimers
- Use bold for key financial figures and metrics

**MANDATORY FINANCE TABLES:**
1. **Valuation Table** - Multi-method valuation with weights
2. **Cash Flow Table** - Historical and projected performance
3. **Tax Scenario Table** - Compare sale structures
4. **Industry Benchmark Table** - Market comparison data

**CRITICAL TABLE RULES FOR FINANCE:**
- All monetary values in GBP with proper formatting (£1,234,567.89)
- Percentages with one decimal place (15.0%)
- Right-align all numerical columns
- Include calculation methodology in footnotes
- Always show weighted averages and totals
- Use bold for final valuation ranges and recommendations
`,

  legal: `
### LEGAL-SPECIFIC FORMATTING
- Use numbered lists for legal procedures and steps
- Include blockquotes for important legal warnings or disclaimers
- Format citations consistently
- Use tables for comparing legal options
- Add bold for critical legal requirements
- Create collapsible sections for detailed legal explanations
- Use code blocks for legal clause examples

**MANDATORY LEGAL TABLES:**
1. **Compliance Status Table** - Regulatory requirements
2. **Document Checklist Table** - Required documentation
3. **Legal Timeline Table** - Process steps with durations
4. **Risk Assessment Table** - Legal risks and mitigation

**CRITICAL TABLE RULES FOR LEGAL:**
- Status indicators: ✅ Compliant, ⚠️ Partial, ❌ Non-compliant
- Include legal risk levels: Low, Medium, High, Critical
- All deadlines in DD-MMM-YYYY format
- Cost estimates as ranges (£5,000-8,000)
- Bold text for urgent actions and critical requirements
`,

  broker: `
### BROKER-SPECIFIC FORMATTING
- Use tables for property/business comparisons
- Include markdown formatting for pricing information
- Add bullet lists for property/business features
- Use bold for key selling points
- Create separate sections with headings for different properties/aspects
- Include blockquotes for market insights
- Format numerical data consistently

**MANDATORY BROKER TABLES:**
1. **Market Comparables Table** - Similar business sales
2. **Valuation Breakdown Table** - Factor-based assessment
3. **Marketing Timeline Table** - Sales process stages
4. **Competitive Analysis Table** - Market positioning

**CRITICAL TABLE RULES FOR BROKER:**
- All prices in GBP with commas (£1,234,567)
- EBITDA multiples to one decimal (3.2x)
- Status indicators: Sold, Active, Under Offer, Withdrawn
- Include market position scoring (1-10 scale)
- Timeline with realistic week ranges
- Bold for final recommendations and market insights
`
};

// Agent-specific table templates and examples
const AGENT_TABLE_TEMPLATES = {
  orchestrator: {
    agentSummary: `
| Agent | Status | Key Finding | Confidence |
|-------|:------:|-------------|----------:|
| 🏢 Broker | ✅ Complete | Market analysis favorable | 85% |
| 📊 Finance | ✅ Complete | Valuation: £1.2M-1.8M | 92% |
| ⚖️ Legal | ⚠️ In Progress | Due diligence required | 78% |`,

    comparisonTable: `
| Criteria | Option A | Option B | Recommendation |
|----------|:--------:|:--------:|:--------------:|
| **Cost** | £15,000 | £22,000 | Option A |
| **Timeline** | 6 weeks | 4 weeks | Option B |
| **Risk Level** | Low | Medium | Option A |
| **Overall Score** | **8.5/10** | **7.2/10** | **Option A** |`
  },

  finance: {
    valuation: `
| Method | Low Estimate | High Estimate | Weight | Weighted Value |
|--------|-------------:|--------------:|-------:|---------------:|
| **EBITDA Multiple** | £850,000 | £1,200,000 | 40% | £820,000 |
| **Revenue Multiple** | £900,000 | £1,100,000 | 30% | £600,000 |
| **Asset-Based** | £750,000 | £950,000 | 20% | £340,000 |
| **DCF Analysis** | £950,000 | £1,300,000 | 10% | £225,000 |
| **Final Valuation** | **£895,000** | **£1,185,000** | **100%** | **£985,000** |`,

    taxScenario: `
| Sale Structure | CGT Rate | Business Relief | Net Proceeds | Effective Rate |
|----------------|---------:|----------------:|-------------:|---------------:|
| **Share Sale** | 10% | £1M allowance | £1,620,000 | 8.9% |
| **Asset Sale** | 20% | £0 | £1,440,000 | 20.0% |
| **Earn-out** | 10%/20% | Partial | £1,580,000 | 11.1% |`,

    cashflow: `
| Year | Revenue | EBITDA | EBITDA % | Free Cash Flow | Growth Rate |
|------|--------:|-------:|----------:|---------------:|------------:|
| 2022 | £2,500,000 | £375,000 | 15.0% | £285,000 | — |
| 2023 | £2,750,000 | £440,000 | 16.0% | £350,000 | 10.0% |
| 2024 | £3,025,000 | £514,250 | 17.0% | £425,000 | 10.0% |
| **Avg** | **£2,758,333** | **£443,083** | **16.0%** | **£353,333** | **10.0%** |`
  },

  legal: {
    compliance: `
| Requirement | Status | Due Date | Risk Level | Action Required |
|-------------|:------:|----------|:----------:|-----------------|
| **Companies House Filing** | ✅ Current | 31-Dec-2024 | Low | Annual return |
| **GDPR Compliance** | ⚠️ Partial | Ongoing | Medium | Privacy policy update |
| **Employment Law** | ✅ Compliant | Ongoing | Low | Monitor changes |
| **Tax Registration** | ✅ Current | Quarterly | Low | VAT returns |`,

    documents: `
| Document Type | Required | Provided | Quality | Comments |
|---------------|:--------:|:--------:|:-------:|----------|
| **Articles of Association** | ✅ Yes | ✅ Yes | Good | Standard form |
| **Share Certificates** | ✅ Yes | ✅ Yes | Excellent | All accounted |
| **Board Minutes** | ✅ Yes | ⚠️ Partial | Fair | Missing 2023 Q4 |
| **Contracts Review** | ✅ Yes | ❌ No | N/A | **Action needed** |`,

    timeline: `
| Phase | Duration | Key Milestones | Legal Cost | Risk |
|-------|:--------:|----------------|:----------:|:----:|
| **Due Diligence** | 2-3 weeks | Document review | £5,000-8,000 | Medium |
| **Contract Drafting** | 1-2 weeks | SPA preparation | £8,000-12,000 | Low |
| **Negotiation** | 2-4 weeks | Terms agreement | £3,000-5,000 | High |
| **Completion** | 1 week | Legal completion | £2,000-3,000 | Low |
| **Total** | **6-10 weeks** | **Full process** | **£18,000-28,000** | **Medium** |`
  },

  broker: {
    marketComparables: `
| Business | Industry | Revenue | EBITDA | Multiple | Asking Price | Status |
|----------|----------|--------:|-------:|---------:|-------------:|:------:|
| **Café Central** | Food Service | £450,000 | £67,500 | 3.2x | £216,000 | Sold |
| **City Bistro** | Food Service | £380,000 | £57,000 | 2.8x | £160,000 | Active |
| **Corner Deli** | Food Service | £520,000 | £83,200 | 3.1x | £258,000 | Under Offer |
| **Market Average** | **Food Service** | **£450,000** | **£69,233** | **3.0x** | **£211,333** | **Benchmark** |`,

    valuationBreakdown: `
| Factor | Weight | Your Business | Market Avg | Score | Weighted Score |
|--------|:------:|:-------------:|:----------:|:-----:|:---------------:|
| **Location** | 25% | Prime location | Average | 9/10 | 2.25 |
| **Financial** | 30% | Strong margins | Average | 8/10 | 2.40 |
| **Growth** | 20% | 15% YoY | 5% YoY | 9/10 | 1.80 |
| **Assets** | 15% | Well-maintained | Average | 7/10 | 1.05 |
| **Market** | 10% | High demand | Average | 8/10 | 0.80 |
| **Overall** | **100%** | **Above Average** | **Baseline** | **8.3/10** | **8.30** |`,

    timeline: `
| Week | Activity | Responsibility | Deliverables | Status |
|------|----------|----------------|--------------|:------:|
| **1-2** | Market preparation | Broker + Seller | Marketing pack | 📋 Ready |
| **3-6** | Active marketing | Broker | Buyer enquiries | 🚀 Live |
| **7-10** | Viewings & offers | Broker + Seller | Initial offers | ⏳ Pending |
| **11-14** | Negotiation | Broker | Agreed terms | ⏳ Pending |
| **15-18** | Due diligence | All parties | Completion | ⏳ Pending |`
  }
};

// Table validation and utility functions
function validateTableStructure(tableMarkdown) {
  const lines = tableMarkdown.trim().split('\n');
  
  if (lines.length < 3) {
    return { valid: false, error: 'Table must have at least header, separator, and one data row' };
  }
  
  // Check header line
  const headerLine = lines[0];
  if (!headerLine.includes('|') || headerLine.split('|').length < 3) {
    return { valid: false, error: 'Header line must have proper pipe separators' };
  }
  
  // Check separator line
  const separatorLine = lines[1];
  if (!separatorLine.includes('-') || !separatorLine.includes('|')) {
    return { valid: false, error: 'Separator line must contain dashes and pipes' };
  }
  
  const headerColumns = headerLine.split('|').filter(col => col.trim() !== '').length;
  
  // Check data rows
  for (let i = 2; i < lines.length; i++) {
    const dataLine = lines[i];
    if (!dataLine.includes('|')) {
      return { valid: false, error: `Row ${i + 1} must have proper pipe separators` };
    }
    
    const dataColumns = dataLine.split('|').filter(col => col.trim() !== '').length;
    if (dataColumns !== headerColumns) {
      return { valid: false, error: `Row ${i + 1} has ${dataColumns} columns, expected ${headerColumns}` };
    }
    
    // Check for empty cells
    const cells = dataLine.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
    for (const cell of cells) {
      if (cell === '' || cell === ' ') {
        return { valid: false, error: `Empty cell found in row ${i + 1}. Use "N/A", "TBD", or "—" instead` };
      }
    }
  }
  
  return { valid: true };
}

function generateTableTemplate(agentType, templateType) {
  const templates = AGENT_TABLE_TEMPLATES[agentType];
  if (!templates || !templates[templateType]) {
    return null;
  }
  
  return templates[templateType];
}

function formatCurrencyForTable(amount, decimals = 0) {
  if (typeof amount !== 'number') return amount;
  
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(decimals)}K`;
  } else {
    return `£${amount.toFixed(decimals)}`;
  }
}

function formatPercentageForTable(value, decimals = 1) {
  if (typeof value !== 'number') return value;
  return `${value.toFixed(decimals)}%`;
}

function createResponsiveTableWrapper(tableHtml) {
  return `
<div class="table-container overflow-x-auto">
  <div class="min-w-full">
    ${tableHtml}
  </div>
</div>`;
}

// Enhanced table alignment helpers
function rightAlignNumbers(tableMarkdown) {
  const lines = tableMarkdown.trim().split('\n');
  if (lines.length < 2) return tableMarkdown;
  
  const separatorLine = lines[1];
  const columns = separatorLine.split('|').filter(col => col.trim() !== '');
  
  // Auto-detect numeric columns and apply right alignment
  const updatedColumns = columns.map(col => {
    const trimmed = col.trim();
    // If column contains numbers, currency, or percentages, right-align
    if (trimmed.includes('£') || trimmed.includes('%') || /\d/.test(trimmed)) {
      return col.replace(/:-+/g, '---:').replace(/-+:/g, '---:').replace(/-+/g, '---:');
    }
    return col;
  });
  
  lines[1] = '|' + updatedColumns.join('|') + '|';
  return lines.join('\n');
}

// Combined markdown guidelines for each agent
function getAgentMarkdownGuide(agentType) {
  const baseGuide = MARKDOWN_FORMAT_GUIDE;
  const specificGuide = AGENT_MARKDOWN_GUIDELINES[agentType] || '';
  
  return baseGuide + specificGuide;
}

// Export the configuration
export {
  MARKDOWN_FORMAT_GUIDE,
  AGENT_MARKDOWN_GUIDELINES,
  AGENT_TABLE_TEMPLATES,
  getAgentMarkdownGuide,
  validateTableStructure,
  generateTableTemplate,
  formatCurrencyForTable,
  formatPercentageForTable,
  createResponsiveTableWrapper,
  rightAlignNumbers
};
