/**
 * Finance Agent Logic
 * 
 * Core business logic for the Finance Specialist Agent
 * - EBITDA × multiple valuations
 * - Tax scenario analysis
 * - Financial due diligence guidance
 * - AI-powered financial analysis using GPT-4.1 mini
 */

import { createTextPart, createDataPart, createMessage } from '../../libs/a2a/utils.js';
import { stripMarkdownFromMessage } from '../../utils/markdown-stripper.js';
import { 
  financeCache, 
  performanceMonitor, 
  aiCircuitBreaker, 
  rateLimiter, 
  withMonitoring,
  getSystemHealth 
} from './scalability-enhancements.js';
import { MCPFinanceAgent } from '../mcp/agent-integration.js';
import { enhanceSystemPromptWithMarkdown, formatAgentResponse, addAgentSignature } from '../../utils/markdown-utils.js';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import hybridRetriever from '../knowledge/enhanced-hybrid-retrieval.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize OpenAI client with GPT-4.1 mini configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone for RAG queries
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

// Initialize MCP-enhanced Finance Agent
const mcpFinanceAgent = new MCPFinanceAgent({
  serverUrl: process.env.MCP_SERVER_URL || 'ws://localhost:3001',
  autoConnect: true
});

// Initialize hybrid knowledge retrieval system
const knowledgeRetriever = hybridRetriever;

// OpenAI Configuration optimized for GPT-4.1 mini
const OPENAI_CONFIG = {
  model: 'gpt-4.1-mini',           // GPT-4.1 mini for advanced financial reasoning
  temperature: 0.3,               // Lower temperature for more precise financial calculations
  maxTokens: 750,                // Reduced for more concise financial analysis
  topP: 0.9,                     // Focused sampling for accuracy
  frequencyPenalty: 0.1,         // Slight penalty to avoid repetition
  presencePenalty: 0.1,          // Encourage diverse financial perspectives
  maxInputLength: 4000           // Limit input to optimize response time
};

// Enhanced response formatting using markdown utilities
function enhanceFinanceResponse(responseText) {
  // Apply markdown formatting improvements
  const formattedResponse = formatAgentResponse(responseText, 'finance');
  
  // Add agent signature
  return addAgentSignature(formattedResponse, 'finance');
}

// Thinking panel state for finance agent
let currentFinanceThinkingPanel = null;
let financeThinkingSteps = [];
let financeMCPSources = [];
let financeMemoryInsights = [];

/**
 * Create thinking panel for transparent finance decision-making
 */
function createFinanceThinkingPanel() {
  const panelId = 'finance-thinking-' + Date.now();
  currentFinanceThinkingPanel = {
    id: panelId,
    agentType: 'finance',
    thoughts: [],
    mcpSources: [],
    memoryInsights: [],
    isActive: true,
    startTime: new Date().toISOString(),
    confidence: 0,
    status: 'analyzing'
  };
  financeThinkingSteps = [];
  financeMCPSources = [];
  financeMemoryInsights = [];
  addFinanceThinkingStep('Starting financial analysis...', 'thinking');
  return { panelId, agentType: 'finance', action: 'create' };
}

/**
 * Add thinking step to finance panel
 */
function addFinanceThinkingStep(thought, stepType = 'thinking', isCompleted = false) {
  if (!currentFinanceThinkingPanel) createFinanceThinkingPanel();
  
  const step = {
    id: financeThinkingSteps.length + 1,
    text: thought,
    type: stepType, // 'thinking', 'searching', 'analyzing', 'calculating', 'concluding'
    isCompleted,
    timestamp: new Date().toISOString()
  };
  
  financeThinkingSteps.push(step);
  currentFinanceThinkingPanel.thoughts = financeThinkingSteps;
  
  console.log(`🧠 [Finance Thinking] ${stepType.toUpperCase()}: ${thought}`);
}

/**
 * Add MCP source to finance panel
 */
function addFinanceMCPSource(source, relevance = 0.8, sourceType = 'knowledge') {
  if (!currentFinanceThinkingPanel) return;
  
  const mcpSource = {
    id: financeMCPSources.length + 1,
    title: source.title || source.name || 'Financial Source',
    url: source.url || source.source_url || '#',
    relevance,
    sourceType, // 'knowledge', 'search', 'document', 'market_data'
    content: source.content ? source.content.substring(0, 200) + '...' : '',
    metadata: source.metadata || {},
    timestamp: new Date().toISOString()
  };
  
  financeMCPSources.push(mcpSource);
  currentFinanceThinkingPanel.mcpSources = financeMCPSources;
  
  console.log(`📊 [Finance MCP] Added source: ${mcpSource.title} (${(relevance * 100).toFixed(1)}%)`);
}

/**
 * Add memory insight to finance panel
 */
function addFinanceMemoryInsight(insight, confidence = 0.8) {
  if (!currentFinanceThinkingPanel) return;
  
  const memoryInsight = {
    id: financeMemoryInsights.length + 1,
    text: insight,
    confidence,
    timestamp: new Date().toISOString()
  };
  
  financeMemoryInsights.push(memoryInsight);
  currentFinanceThinkingPanel.memoryInsights = financeMemoryInsights;
  
  console.log(`💭 [Finance Memory] ${insight} (${(confidence * 100).toFixed(1)}%)`);
}

/**
 * Update finance panel confidence and status
 */
function updateFinancePanelStatus(confidence, status) {
  if (!currentFinanceThinkingPanel) return;
  
  currentFinanceThinkingPanel.confidence = confidence;
  currentFinanceThinkingPanel.status = status;
  
  console.log(`📊 [Finance Status] ${status} - Confidence: ${(confidence * 100).toFixed(1)}%`);
}

/**
 * Complete finance thinking panel
 */
function completeFinanceThinkingPanel() {
  if (!currentFinanceThinkingPanel) return;
  
  currentFinanceThinkingPanel.isActive = false;
  currentFinanceThinkingPanel.endTime = new Date().toISOString();
  addFinanceThinkingStep('Financial analysis complete', 'concluding', true);
  
  console.log(`✅ [Finance Thinking] Panel completed with ${financeThinkingSteps.length} steps`);
}

/**
 * Get finance thinking panel state
 */
function getFinanceThinkingPanelState() {
  return currentFinanceThinkingPanel;
}

/**
 * Generate thinking panel annotation for markdown
 */
function generateFinanceThinkingAnnotation() {
  if (!currentFinanceThinkingPanel || financeThinkingSteps.length === 0) return '';
  
  const panelData = {
    ...currentFinanceThinkingPanel,
    thoughts: financeThinkingSteps,
    mcpSources: financeMCPSources,
    memoryInsights: financeMemoryInsights
  };
  
  return `<!-- THINKING_PANEL:${JSON.stringify(panelData)} -->`;
}

// Comprehensive system prompt for the finance AI agent - enhanced with markdown formatting
const FINANCE_SYSTEM_PROMPT = enhanceSystemPromptWithMarkdown(`You are a virtual financial advisor for Arzani Ltd's business marketplace, specializing in UK business transactions and valuations.

**CRITICAL**: You MUST format ALL your responses using proper **GitHub-flavoured Markdown** for every element:

### Headings
- Use **##** for main sections (e.g., ## Financial Analysis)
- Use **###** for subsections (e.g., ### Valuation Methods)
- Use **####** for minor sections (e.g., #### Tax Implications)
- Always include a space after the # symbols

### Lists
- Use **-** for unordered lists (with a space after the dash)
- Use **1.** for numbered lists (with proper sequential numbering)
- Use proper indentation for nested lists (two spaces per level)
- Ensure consistent spacing between list items

### Tables
- Use well-structured markdown tables for all financial data
- Include clear column headers (Method, Value, Multiple, etc.)
- RIGHT-ALIGN all numeric columns (currency, percentages, multiples)
- Format all currency amounts with proper symbols (£125,000)
- Bold all important figures, rates and multipliers
- Include totals and weighted averages in the bottom row
- Fill empty cells with "N/A" rather than leaving blank

### Code and Emphasis
- Use \`\`\`code blocks\`\`\` for calculation examples
- Use **bold text** for key financial figures and terms
- Use *italic text* for definitions or supplementary information
- Use > blockquotes for important disclaimers and warnings
- Use horizontal rules (---) to separate major sections

## TABLE FORMATTING REQUIREMENTS
When creating tables, you must follow these specific finance-focused guidelines:
- Use well-structured markdown tables with clear headers
- RIGHT-ALIGN all numeric columns (currency, percentages, multiples)
- Bold all currency amounts like **£125,000** and **$250,000**
- Bold all percentages like **15.5%** and **92%**
- Bold all multipliers like **4.2x** and **6.8x**
- Use consistent decimal places (2 for currency, 1 for percentages)
- Include totals and subtotals in **bold** formatting
- Fill any empty cells with "N/A" rather than leaving blank
- Use descriptive column headers like "EBITDA Multiple", "Enterprise Value", "Tax Liability"

CRITICAL: You are an AI assistant providing general financial guidance. Your responses may contain inaccuracies and should NOT be relied upon for major financial decisions without human professional verification.

## YOUR ROLE
- Provide general business valuation guidance using industry-standard methods
- Offer educational information about tax planning for UK business sales
- Explain financial due diligence processes at a high level
- Support deal structure understanding from a financial perspective
- Focus exclusively on UK business transactions

## WHAT YOU CAN DO
✓ Provide general business valuation estimates using EBITDA multiples, DCF, and asset-based methods
✓ Explain tax implications of asset vs share sales in the UK (general guidance only)
✓ Provide industry-specific financial benchmarks and typical multiples
✓ Explain working capital adjustments and completion accounts concepts
✓ Guide on general financial due diligence requirements
✓ Offer educational information about deal structures

## WHAT YOU CANNOT DO
✗ Provide specific investment advice (refer to FCA-regulated advisors)
✗ Give personal tax advice (refer to qualified accountants)
✗ Guarantee valuation accuracy (always recommend professional valuations)
✗ Handle non-UK tax scenarios (UK-focused only)
✗ Replace professional financial, legal, or tax advice

## RESPONSE GUIDELINES
- Always use British English and UK terminology
- Quote figures in GBP (£) unless specifically requested otherwise
- Reference relevant UK tax rates and allowances where applicable
- Provide ranges rather than single-point estimates for valuations
- Be specific about assumptions made in calculations
- Include specific referrals to qualified professionals (accountants, business valuers, financial advisors)

## PROFESSIONAL REFERRAL GUIDANCE
Always recommend users consult with:
- Qualified chartered accountants for tax advice
- Certified business valuers for accurate valuations
- FCA-regulated financial advisors for investment decisions
- Solicitors for legal aspects of business sales
- Industry-specific specialists for sector expertise

## INDUSTRY KNOWLEDGE
You have general knowledge of UK business valuation multiples, tax regulations (including Capital Gains Tax, Corporation Tax, Business Asset Disposal Relief), and market conditions across various sectors. However, this knowledge may be incomplete or outdated and should always be verified with current professional sources.

Keep responses professional, educational, and heavily focused on encouraging users to seek qualified professional advice for all important financial decisions.`, 'finance');

/**
 * Enhanced Finance RAG Query using Hybrid Knowledge Retrieval
 * @param {string} query - Financial query to search for
 * @param {number} userId - User ID for personalized context (optional)
 * @param {string} category - Financial category to focus search (optional)
 * @returns {Promise<Array>} - Relevant financial guidance from hybrid sources
 */
async function queryFinanceRAG(query, userId = null, category = null) {
  try {
    console.log(`🔍 Enhanced Finance RAG Query: "${query}"`);
    addFinanceThinkingStep(`Searching financial knowledge base for: "${query.substring(0, 50)}..."`);
    
    // Use hybrid knowledge retrieval for comprehensive financial analysis
    const knowledgeResult = await knowledgeRetriever.retrieveKnowledge(
      query, 
      'finance',
      userId,
      {
        maxResults: 8,
        includeUserDocs: true,
        searchFallback: true
      }
    );
    
    addFinanceThinkingStep(
      `Found ${knowledgeResult.results.length} relevant sources (${knowledgeResult.metadata.breakdown.userDocs} user docs, ${knowledgeResult.metadata.breakdown.staticKnowledge} knowledge base, ${knowledgeResult.metadata.breakdown.realTimeSearch} real-time)`
    );
    
    // Transform results to maintain backward compatibility
    const ragResults = knowledgeResult.results.map(result => ({
      title: result.metadata.title || result.metadata.document_name || 'Financial Guidance',
      content: result.content,
      category: result.metadata.category || result.metadata.knowledge_domain || category,
      financial_area: result.metadata.financial_area || result.metadata.document_type,
      namespace: result.namespace || result.metadata.knowledge_domain,
      source_url: result.metadata.source_url || result.metadata.url,
      relevance_score: result.score,
      is_user_document: result.source === 'user_document',
      document_type: result.metadata.document_type,
      confidence: knowledgeResult.metadata.confidence
    }));
    
    console.log(`📊 Found ${ragResults.length} relevant financial guidance documents`);
    addFinanceThinkingStep(`Financial analysis complete - ${ragResults.length} sources ready for consultation`, true);
    return ragResults;
    
  } catch (error) {
    console.error('❌ Error querying Finance RAG:', error);
    addFinanceThinkingStep(`Error retrieving financial knowledge: ${error.message}`, true);
    return [];
  }
}

/**
 * Construct a UK Finance ReAct prompt enhanced with RAG results
 * @param {string} userQuery - The user's financial question
 * @param {Array} ragResults - RAG search results
 * @param {string} financialType - Type of financial analysis (optional)
 * @returns {string} - Enhanced prompt with RAG context
 */
function constructUKFinanceReActPromptWithRAG(userQuery, ragResults, financialType = null) {
  let ragContext = '';
  
  if (ragResults && ragResults.length > 0) {
    ragContext = '\n\n## RELEVANT UK FINANCIAL GUIDANCE:\n';
    ragResults.forEach((result, index) => {
      ragContext += `\n### Guidance ${index + 1}: ${result.title}\n`;
      ragContext += `**Financial Area:** ${result.financial_area || result.category}\n`;
      ragContext += `**Source:** ${result.namespace}\n`;
      ragContext += `**Content:** ${result.content}\n`;
      if (result.source_url) {
        ragContext += `**Reference:** ${result.source_url}\n`;
      }
      ragContext += `**Relevance Score:** ${(result.relevance_score * 100).toFixed(1)}%\n`;
    });
    
    ragContext += '\n**IMPORTANT:** Use this guidance to provide accurate, authoritative financial advice based on official UK sources. Reference the specific guidance where relevant in your response.\n';
  }
  
  const financialContext = financialType ? `\n**Financial Analysis Focus:** ${financialType}` : '';
  
  return `${FINANCE_SYSTEM_PROMPT}

## USER INQUIRY:
${userQuery}${financialContext}${ragContext}

Using the ReAct (Reasoning + Acting) framework, analyze this UK financial inquiry:

**THOUGHT:** Consider the financial question and identify key factors
**ACTION:** Determine what specific UK financial analysis or guidance is needed  
**OBSERVATION:** Note relevant UK financial regulations, tax implications, or best practices
**REASONING:** Apply UK financial expertise to the specific situation
**CONCLUSION:** Provide clear, actionable UK financial guidance with appropriate professional referrals

Focus on UK business finance, use proper UK terminology, quote figures in GBP (£), and always recommend qualified professional advice.`;
}

// Industry multiple ranges (would come from a database in production)
const INDUSTRY_MULTIPLES = {
  'restaurant': {
    min: 2.5,
    max: 3.5,
    median: 3.0,
    description: 'Food service businesses typically sell for 2.5-3.5× EBITDA depending on location, growth, and brand strength.'
  },
  'retail': {
    min: 3.0,
    max: 4.5,
    median: 3.8,
    description: 'Retail businesses typically sell for 3-4.5× EBITDA depending on location, inventory turnover, and online presence.'
  },
  'ecommerce': {
    min: 3.5,
    max: 5.0,
    median: 4.2,
    description: 'E-commerce businesses typically sell for 3.5-5× EBITDA depending on growth rate, market segment, and customer acquisition costs.'
  },
  'manufacturing': {
    min: 4.0,
    max: 6.0,
    median: 5.0,
    description: 'Manufacturing businesses typically sell for 4-6× EBITDA depending on equipment age, IP portfolio, and customer concentration.'
  },
  'saas': {
    min: 6.0,
    max: 10.0,
    median: 8.0,
    description: 'SaaS businesses typically sell for 6-10× ARR depending on growth rate, churn, and CAC/LTV metrics.'
  },
  'professional_services': {
    min: 2.0,
    max: 3.0,
    median: 2.5,
    description: 'Professional service firms typically sell for 2-3× EBITDA depending on client retention, partner dependency, and revenue predictability.'
  },
  'construction': {
    min: 3.0, 
    max: 4.0,
    median: 3.5,
    description: 'Construction businesses typically sell for 3-4× EBITDA depending on backlog, equipment ownership, and licensing.'
  },
  'default': {
    min: 3.0,
    max: 5.0,
    median: 4.0,
    description: 'Most small-to-medium brick-and-mortar businesses typically sell for 3-5× EBITDA.'
  }
};

// Tax scenarios by country (would be more extensive in production)
const TAX_SCENARIOS = {
  'uk': {
    'asset_sale': {
      name: 'Asset Sale (UK)',
      description: 'Sale of business assets rather than shares',
      considerations: [        {
          name: 'Capital Gains Tax',
          description: 'Business asset disposal relief (formerly Entrepreneurs\' Relief) may reduce CGT to 10% on qualifying assets up to the lifetime limit of £1 million.',
          impact: 'medium'
        },
        {
          name: 'VAT',
          description: 'VAT may be charged on asset transfers, though Transfer of Going Concern (TOGC) rules may apply if conditions are met.',
          impact: 'high'
        },
        {
          name: 'Stamp Duty',
          description: 'Stamp Duty Land Tax applies to property transfers at progressive rates.',
          impact: 'medium'
        }
      ]
    },
    'share_sale': {
      name: 'Share Sale (UK)',
      description: 'Sale of company shares rather than underlying assets',
      considerations: [
        {
          name: 'Capital Gains Tax',
          description: 'Business asset disposal relief may apply, reducing CGT to 10% up to lifetime limit.',
          impact: 'medium'
        },
        {
          name: 'Stamp Duty',
          description: '0.5% stamp duty on share transfers above £1,000.',
          impact: 'low'
        },
        {
          name: 'Inheritance Tax',
          description: 'Business Relief may provide up to 100% relief from inheritance tax if shares were held for at least 2 years.',
          impact: 'high'
        }
      ]
    }
  },
  'usa': {
    'asset_sale': {
      name: 'Asset Sale (USA)',
      description: 'Sale of business assets rather than entity ownership',
      considerations: [
        {
          name: 'Federal Income Tax',
          description: 'Seller pays ordinary income tax on assets sold above depreciated value, and capital gains tax on appreciated assets.',
          impact: 'high'
        },
        {
          name: 'State and Local Taxes',
          description: 'Sales tax may apply to tangible assets, varying by state and locality.',
          impact: 'medium'
        },
        {
          name: 'Depreciation Recapture',
          description: 'Depreciation previously claimed may be recaptured at 25% rate for real property or ordinary income rates for other assets.',
          impact: 'medium'
        }
      ]
    },
    'stock_sale': {
      name: 'Stock Sale (USA)',
      description: 'Sale of company stock rather than underlying assets',
      considerations: [
        {
          name: 'Capital Gains Tax',
          description: 'Long-term capital gains rates (0%, 15%, or 20% depending on income bracket) apply if stock held > 1 year.',
          impact: 'medium'
        },
        {
          name: 'Section 1202 QSBS Exclusion',
          description: 'Qualified Small Business Stock may exclude up to 100% of capital gains if held > 5 years (limits apply).',
          impact: 'high'
        },
        {
          name: 'Net Investment Income Tax',
          description: '3.8% additional tax may apply to net investment income for high income sellers.',
          impact: 'low'
        }
      ]
    }
  }
};

/**
 * Process a finance agent task based on the request message
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @returns {Promise<object>} - Response with task and message
 */
export async function processFinanceTask(task, message) {
  // Create thinking panel for transparency
  const thinkingPanel = createFinanceThinkingPanel();
  
  // Extract text from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const dataParts = message.parts.filter(part => part.type === 'data');
  
  if (textParts.length === 0) {
    addFinanceThinkingStep('❌ Error: No text parts found in message');
    completeFinanceThinkingPanel();
    throw new Error('Invalid request: No text parts found in message');
  }
  
  const query = textParts[0].text.toLowerCase();
  addFinanceThinkingStep(`Analyzing financial request: "${textParts[0].text.substring(0, 50)}..."`);
  
  // Determine the type of finance request based on the query
  if (query.includes('valuation') || query.includes('value') || query.includes('worth') || query.includes('multiple')) {
    addFinanceThinkingStep('Request classified as: Financial Valuation Analysis');
    return handleValuationRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('tax') || query.includes('capital gains') || query.includes('taxation')) {
    addFinanceThinkingStep('Request classified as: Tax Scenario Analysis');
    return handleTaxScenarioRequest(task, message, query, dataParts[0]?.data);
  } else {
    addFinanceThinkingStep('Request classified as: General Financial Consultation');
    return handleGeneralFinanceRequest(task, message, query);
  }
}

/**
 * Handle a business valuation request
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleValuationRequest(task, message, query, data = {}) {
  try {
    addFinanceThinkingStep('Processing financial valuation with enhanced analysis...');
    console.log('Finance Agent: Processing valuation request with MCP-enhanced AI analysis');
    
    // Extract valuation parameters from query and structured data
    addFinanceThinkingStep('Extracting valuation parameters from request...');
    const valuationParams = extractValuationParameters(query, data);
    
    addFinanceThinkingStep(`Identified parameters: Revenue: ${valuationParams.revenue || 'N/A'}, EBITDA: ${valuationParams.ebitda || 'N/A'}, Industry: ${valuationParams.industry || 'N/A'}`);
    
    // MCP-Enhanced Analysis: Use RAG capabilities if available
    let mcpEnhancedAnalysis = null;
    try {
      if (mcpFinanceAgent && mcpFinanceAgent.initialized) {
        console.log('Finance Agent: Using MCP-enhanced analysis');
        mcpEnhancedAnalysis = await mcpFinanceAgent.performEnhancedFinancialAnalysis({
          revenue: valuationParams.revenue,
          profit: valuationParams.ebitda,
          industry: valuationParams.industry,
          revenueHistory: valuationParams.revenueHistory,
          assets: valuationParams.assets,
          liabilities: valuationParams.liabilities
        });
      }
    } catch (mcpError) {
      console.error('Finance Agent MCP Enhancement Error:', mcpError);
      // Continue with standard analysis if MCP fails
    }
    
    // Calculate business valuation using existing logic
    const valuation = calculateBusinessValuation(valuationParams);
    
    // Include comparable businesses if available
    const comparableSales = findComparableSales(valuationParams);
    
    // Enhance with AI analysis
    let enhancedResponse;    try {
      const trimmedQuery = query.length > OPENAI_CONFIG.maxInputLength 
        ? query.substring(0, OPENAI_CONFIG.maxInputLength) 
        : query;
        
      // Create enhanced contextual prompt including MCP insights
      let contextualPrompt = `Provide expert analysis for this business valuation:

BUSINESS DETAILS:
- Industry: ${valuationParams.industry}
- EBITDA: £${valuationParams.ebitda?.toLocaleString() || 'Not specified'}
- Revenue: £${valuationParams.revenue?.toLocaleString() || 'Not specified'}
- Currency: ${valuationParams.currency}

CALCULATED VALUATION:
- Estimated Value: £${valuation.value.toLocaleString()}
- Range: £${valuation.rangeLow.toLocaleString()} - £${valuation.rangeHigh.toLocaleString()}
- Multiple Used: ${valuation.multipleUsed.toFixed(1)}x EBITDA`;

      // Add MCP-enhanced insights if available
      if (mcpEnhancedAnalysis) {
        contextualPrompt += `

MCP-ENHANCED ANALYSIS:
- Financial Health: ${JSON.stringify(mcpEnhancedAnalysis.financialAnalysis?.financial_health || {})}
- Industry Comparison: ${JSON.stringify(mcpEnhancedAnalysis.financialAnalysis?.industry_comparison || {})}
- Valuation Analysis: ${JSON.stringify(mcpEnhancedAnalysis.valuation || {})}
- Key Recommendations: ${mcpEnhancedAnalysis.recommendations?.join(', ') || 'None'}`;
      }

      contextualPrompt += `

USER QUERY: ${trimmedQuery}

Please provide professional commentary on this valuation, including:
1. Analysis of the valuation approach and multiples used
2. Key factors that could affect the valuation
3. Market considerations for this industry
4. Recommendations for improving business value
5. Next steps for the business owner

Keep the response professional, educational, and focused on UK business markets.`;

      const aiResponse = await callAIWithSafeguards([
        {
          role: 'system',
          content: FINANCE_SYSTEM_PROMPT        },
        {
          role: 'user',
          content: contextualPrompt
        }
      ], contextualPrompt);

      const aiAnalysis = aiResponse;
        if (aiAnalysis) {
        // Combine static valuation with AI analysis in a professional format
        const staticResponse = formatValuationResponse(valuation, valuationParams, comparableSales);
        if (aiAnalysis && aiAnalysis.trim()) {
          enhancedResponse = `${staticResponse}\n\n**Market Analysis:**\n\n${aiAnalysis}`;
        } else {
          enhancedResponse = staticResponse;
        }
        console.log('Finance Agent: AI valuation analysis generated successfully');
      } else {
        enhancedResponse = formatValuationResponse(valuation, valuationParams, comparableSales);
      }

    } catch (aiError) {
      console.error('Finance Agent AI Enhancement Error:', aiError);
      // Fall back to standard response if AI fails
      enhancedResponse = formatValuationResponse(valuation, valuationParams, comparableSales);
    }
    
    // Complete thinking panel
    addFinanceThinkingStep('Valuation analysis complete', 'concluding', true);
    updateFinancePanelStatus(1.0, 'complete');
    completeFinanceThinkingPanel();
    
    // Adjust task state to completed
    const responseTask = {
      ...task,
      state: 'completed'
    };
      // Prepare response message with enhanced valuation
    const responseMessage = createMessage([
      createTextPart(generateFinanceThinkingAnnotation()),
      createTextPart(enhancedResponse),
      createDataPart({
        valuation: {
          value: valuation.value,
          range: {
            low: valuation.rangeLow,
            high: valuation.rangeHigh
          },
          metrics: valuation.metrics,
          industry: valuationParams.industry,
          multiple: valuation.multipleUsed
        },
        comparables: comparableSales,
        parameters: valuationParams,
        mcpEnhancedAnalysis: mcpEnhancedAnalysis || null,
        analysisSource: mcpEnhancedAnalysis ? 'MCP-Enhanced' : 'Standard',
        thinkingPanel: getFinanceThinkingPanelState()
      }, 'valuation_data')
    ]);
    
    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
    
  } catch (error) {
    console.error('Finance Agent Valuation Error:', error);
    
    // Fallback response for complete failure
    const responseTask = {
      ...task,
      state: 'completed'
    };

    const fallbackMessage = createMessage([
      createTextPart("I apologize, but I'm unable to process your valuation request at this time. Please try again later or contact our support team for assistance with your business valuation needs.")
    ]);

    return { task: responseTask, message: stripMarkdownFromMessage(fallbackMessage) };
  }
}

/**
 * Handle a tax scenario analysis request
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleTaxScenarioRequest(task, message, query, data = {}) {
  try {
    console.log('Finance Agent: Processing tax scenario request with AI enhancement');
    
    // Extract tax scenario parameters
    const taxParams = extractTaxParameters(query, data);
    
    // Get tax scenarios for the country
    const scenarios = getTaxScenarios(taxParams);
    
    // Enhance with AI analysis
    let enhancedResponse;
    try {
      const trimmedQuery = query.length > OPENAI_CONFIG.maxInputLength 
        ? query.substring(0, OPENAI_CONFIG.maxInputLength) 
        : query;      // Create contextual prompt for AI analysis
      const contextualPrompt = `Provide expert tax analysis for this UK business sale scenario:

BUSINESS SALE PARAMETERS:
- Country: ${formatCountry(taxParams.country)}
- Sale Type: ${formatSaleType(taxParams.saleType)}
- Business Type: ${taxParams.businessType}

TAX SCENARIO ANALYSIS:
${scenarios.map(scenario => `
${scenario.name}: ${scenario.description}
Key Considerations:
${scenario.considerations.map(c => `- ${c.name}: ${c.description}`).join('\n')}
`).join('\n')}

USER QUERY: ${trimmedQuery}

Please provide educational tax guidance including:
1. General analysis of sale structures for tax considerations
2. Overview of UK tax rates and allowances (subject to verification)
3. General tax planning concepts to consider
4. Timeline considerations for tax planning
5. Documentation typically required
6. Common risks and general mitigation approaches

Focus on UK tax law for educational purposes only.`;

      const aiResponse = await callAIWithSafeguards([
        {
          role: 'system',
          content: FINANCE_SYSTEM_PROMPT
        },        {
          role: 'user',
          content: contextualPrompt
        }
      ], contextualPrompt);

      const aiAnalysis = aiResponse;
      
      if (aiAnalysis) {
        // Combine static tax scenarios with AI analysis
        const staticResponse = formatTaxScenarioResponse(scenarios, taxParams);
        enhancedResponse = `${staticResponse}\n\n--- AI TAX ANALYSIS ---\n\n${aiAnalysis}`;
        console.log('Finance Agent: AI tax analysis generated successfully');
      } else {
        enhancedResponse = formatTaxScenarioResponse(scenarios, taxParams);
      }

    } catch (aiError) {
      console.error('Finance Agent AI Enhancement Error:', aiError);
      // Fall back to standard response if AI fails
      enhancedResponse = formatTaxScenarioResponse(scenarios, taxParams);
    }
    
    // Adjust task state to completed
    const responseTask = {
      ...task,
      state: 'completed'
    };
    
    // Prepare response message with enhanced tax scenarios
    const responseMessage = createMessage([
      createTextPart(enhancedResponse),
      createDataPart({
        scenarios: scenarios,
        country: taxParams.country,
        businessType: taxParams.businessType,
        parameters: taxParams
      }, 'tax_scenario_data')
    ]);
    
    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };

  } catch (error) {
    console.error('Finance Agent Tax Scenario Error:', error);
    
    // Fallback to static response if everything fails
    const taxParams = extractTaxParameters(query, data);
    const scenarios = getTaxScenarios(taxParams);
    
    const responseTask = {
      ...task,
      state: 'completed'
    };
    
    const responseMessage = createMessage([
      createTextPart(formatTaxScenarioResponse(scenarios, taxParams)),
      createDataPart({
        scenarios: scenarios,
        country: taxParams.country,
        businessType: taxParams.businessType,
        parameters: taxParams
      }, 'tax_scenario_data')
    ]);
    
    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
  }
}

/**
 * Handle general finance-related questions
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @returns {object} - Response with task and message
 */
async function handleGeneralFinanceRequest(task, message, query) {  try {
    console.log('Finance Agent: Processing general finance request with RAG-enhanced AI');
    
    // Limit query length for optimization
    const trimmedQuery = query.length > OPENAI_CONFIG.maxInputLength 
      ? query.substring(0, OPENAI_CONFIG.maxInputLength) 
      : query;

    // Query RAG for relevant financial guidance
    addFinanceThinkingStep('Searching for relevant financial guidance...', 'searching');
    const ragResults = await queryFinanceRAG(trimmedQuery);
    
    // Add RAG sources to thinking panel
    ragResults.forEach(result => {
      addFinanceMCPSource(result, result.relevance_score, result.is_user_document ? 'document' : 'knowledge');
    });
    
    addFinanceThinkingStep(`Found ${ragResults.length} relevant financial sources`, 'searching', true);
    updateFinancePanelStatus(0.6, 'analyzing');
    
    // Construct enhanced prompt with RAG results
    const enhancedPrompt = constructUKFinanceReActPromptWithRAG(trimmedQuery, ragResults);

    // Create AI request with enhanced safeguards and RAG context
    const aiGeneratedResponse = await callAIWithSafeguards([
      {
        role: 'user',
        content: enhancedPrompt
      }
    ], enhancedPrompt);

    if (!aiGeneratedResponse) {
      throw new Error('No response generated by AI');
    }    console.log('Finance Agent: RAG-enhanced AI response generated successfully');

    // Adjust task state to completed
    const responseTask = {
      ...task,
      state: 'completed'
    };

    // Complete thinking panel
    addFinanceThinkingStep('Financial analysis complete', 'concluding', true);
    updateFinancePanelStatus(1.0, 'complete');
    completeFinanceThinkingPanel();

    // Prepare response message with AI-generated content and RAG sources
    let responseText = aiGeneratedResponse;
    if (ragResults && ragResults.length > 0) {
      responseText += '\n\n---\n**Sources:** Based on official UK financial guidance';
    }

    const responseMessage = createMessage([
      createTextPart(generateFinanceThinkingAnnotation()),
      createTextPart(responseText),
      createDataPart({
        ragSources: ragResults.map(result => ({
          title: result.title,
          financial_area: result.financial_area,
          namespace: result.namespace,
          relevance_score: result.relevance_score
        })),
        analysisType: 'RAG-Enhanced Finance Analysis',
        thinkingPanel: getFinanceThinkingPanelState()
      }, 'finance_analysis_data')
    ]);

    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };

  } catch (error) {
    console.error('Finance Agent AI Error:', error);      // Fallback to static response if AI fails
    let fallbackResponse = "I can provide educational information about:\n\n" +
                         "- Business valuations using EBITDA × multiple method\n" +
                         "- General tax implications of different sale structures (UK overview)\n" +
                         "- Financial due diligence checklists\n\n" +
                         "Could you provide more details about your business and what specific financial information you need?";
      // Industry-specific fallbacks
    if (query.includes('restaurant') || query.includes('cafe') || query.includes('food')) {
      fallbackResponse = "For restaurant businesses, general financial considerations typically include:\n\n" +
                       "- Typical valuation multiples range from 2.5-3.5× EBITDA\n" +
                       "- Cash flow verification is critical (many restaurants have cash transactions)\n" +
                       "- Lease terms significantly impact valuation\n" +
                       "- Inventory valuation methods matter for tax treatment\n\n" +
                       "Would you like more specific guidance on valuation or tax scenarios?";
    } else if (query.includes('ecommerce') || query.includes('online') || query.includes('digital')) {
      fallbackResponse = "For e-commerce businesses, general financial considerations typically include:\n\n" +
                       "- Typical valuation multiples range from 3.5-5× EBITDA\n" +
                       "- SDE (Seller's Discretionary Earnings) is often used instead of EBITDA\n" +
                       "- Customer acquisition costs and retention rates impact valuation\n" +
                       "- Inventory turnover and shipping logistics affect working capital needs\n\n" +
                       "Would you like more specific guidance on valuation or tax scenarios?";
    }
    
    const responseTask = {
      ...task,
      state: 'completed'
    };

    const responseMessage = createMessage([
      createTextPart(fallbackResponse)
    ]);

    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
  }
}

/**
 * Extract parameters for valuation from query and data
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted valuation parameters
 */
function extractValuationParameters(query, data = {}) {
  // Start with any provided structured data
  const params = { ...data };
  
  // Default values if not specified
  if (!params.industry) params.industry = "default";
  if (!params.currency) params.currency = "GBP";
  if (!params.ebitda && !params.revenue) {
    params.ebitda = 0;
    params.revenue = 0;
  }
  
  // Extract industry if mentioned
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food service')) {
    params.industry = 'restaurant';
  } else if (query.includes('retail') || query.includes('shop') || query.includes('store')) {
    params.industry = 'retail';
  } else if (query.includes('ecommerce') || query.includes('online store')) {
    params.industry = 'ecommerce';
  } else if (query.includes('manufacturing')) {
    params.industry = 'manufacturing';
  } else if (query.includes('saas') || query.includes('software')) {
    params.industry = 'saas';
  } else if (query.includes('professional') || query.includes('consultant') || query.includes('agency')) {
    params.industry = 'professional_services';
  } else if (query.includes('construction') || query.includes('contractor')) {
    params.industry = 'construction';
  }
  
  // Extract EBITDA if mentioned
  const ebitdaMatch = query.match(/ebitda (?:of|is|at|about|around)? [£$€]?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|m|thousand|million|bn|billion)?/i);
  if (ebitdaMatch) {
    let ebitda = parseFloat(ebitdaMatch[1].replace(/,/g, ''));
    
    // Handle scale
    if (ebitdaMatch[0].includes('k') || ebitdaMatch[0].includes('thousand')) {
      ebitda *= 1000;
    } else if (ebitdaMatch[0].includes('m') || ebitdaMatch[0].includes('million')) {
      ebitda *= 1000000;
    } else if (ebitdaMatch[0].includes('bn') || ebitdaMatch[0].includes('billion')) {
      ebitda *= 1000000000;
    }
    
    params.ebitda = ebitda;
  }
  
  // Extract revenue if mentioned
  const revenueMatch = query.match(/revenue (?:of|is|at|about|around)? [£$€]?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|m|thousand|million|bn|billion)?/i);
  if (revenueMatch) {
    let revenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
    
    // Handle scale
    if (revenueMatch[0].includes('k') || revenueMatch[0].includes('thousand')) {
      revenue *= 1000;
    } else if (revenueMatch[0].includes('m') || revenueMatch[0].includes('million')) {
      revenue *= 1000000;
    } else if (revenueMatch[0].includes('bn') || revenueMatch[0].includes('billion')) {
      revenue *= 1000000000;
    }
    
    params.revenue = revenue;
  }
  
  // Extract multiple if specified
  const multipleMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:x|times|×)\s*(?:multiple|ebitda)/i);
  if (multipleMatch) {
    params.requestedMultiple = parseFloat(multipleMatch[1]);
  }
  
  // Extract currency if mentioned
  if (query.includes('£') || query.includes('gbp') || query.includes('pounds')) {
    params.currency = 'GBP';
  } else if (query.includes('$') || query.includes('usd') || query.includes('dollars')) {
    params.currency = 'USD';
  } else if (query.includes('€') || query.includes('eur') || query.includes('euros')) {
    params.currency = 'EUR';
  }
  
  // If no explicit EBITDA but we have revenue, estimate EBITDA
  if (params.revenue > 0 && !params.ebitda) {
    // Simple industry margins estimates
    const margins = {
      'restaurant': 0.08,
      'retail': 0.06,
      'ecommerce': 0.12,
      'manufacturing': 0.14,
      'saas': 0.20,
      'professional_services': 0.18,
      'construction': 0.10,
      'default': 0.12
    };
    
    params.ebitda = params.revenue * (margins[params.industry] || margins.default);
    params.ebitdaEstimated = true;
  }
  
  return params;
}

/**
 * Extract parameters for tax scenario analysis
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted tax parameters
 */
function extractTaxParameters(query, data = {}) {
  // Start with any provided structured data
  const params = { ...data };
  
  // Default values
  if (!params.country) params.country = "uk";
  if (!params.saleType) params.saleType = "asset_sale";
  if (!params.businessType) params.businessType = "default";
  
  // Extract country if mentioned
  if (query.includes('uk') || query.includes('united kingdom') || query.includes('britain')) {
    params.country = 'uk';
  } else if (query.includes('us') || query.includes('united states') || query.includes('america')) {
    params.country = 'usa';
  }
  
  // Extract sale type if mentioned
  if (query.includes('asset sale') || query.includes('selling assets')) {
    params.saleType = 'asset_sale';
  } else if (query.includes('share sale') || query.includes('stock sale') || query.includes('selling shares')) {
    params.saleType = params.country === 'usa' ? 'stock_sale' : 'share_sale';
  }
  
  // Extract business type if mentioned
  if (query.includes('restaurant') || query.includes('cafe') || query.includes('food service')) {
    params.businessType = 'restaurant';
  } else if (query.includes('retail') || query.includes('shop')) {
    params.businessType = 'retail';
  } else if (query.includes('ecommerce') || query.includes('online')) {
    params.businessType = 'ecommerce';
  }
  
  return params;
}

/**
 * Calculate business valuation using EBITDA × multiple
 * 
 * @param {object} params - Valuation parameters
 * @returns {object} - Valuation results
 */
function calculateBusinessValuation(params) {
  const { ebitda, industry, requestedMultiple } = params;
  
  // Get multiple range for the industry
  const multipleRange = INDUSTRY_MULTIPLES[industry] || INDUSTRY_MULTIPLES.default;
  
  // Use requested multiple if specified, otherwise use median for industry
  const multipleUsed = requestedMultiple || multipleRange.median;
  
  // Calculate valuation
  const value = ebitda * multipleUsed;
  
  // Calculate valuation range
  const rangeLow = ebitda * multipleRange.min;
  const rangeHigh = ebitda * multipleRange.max;
  
  // Prepare metrics for comparison
  const metrics = {
    ebitdaMultiple: multipleUsed,
    industryMinMultiple: multipleRange.min,
    industryMaxMultiple: multipleRange.max,
    industryMedianMultiple: multipleRange.median
  };
  
  return {
    value,
    rangeLow,
    rangeHigh,
    metrics,
    multipleUsed,
    multipleDescription: multipleRange.description
  };
}

/**
 * Look up comparable business sales
 * 
 * @param {object} params - Search parameters
 * @returns {Array<object>} - List of comparable sales
 */
function findComparableSales(params) {
  // For professional valuation, we only provide comparable data when we have real market data
  // Mock data can mislead clients and appears unprofessional
  const { industry, ebitda, revenue } = params;
  
  // Return empty array - comparable sales should come from real data sources only
  // This prevents the display of fake/mock business data in client-facing reports
  return [];
}

/**
 * Get tax scenarios based on parameters
 * 
 * @param {object} params - Tax scenario parameters
 * @returns {Array<object>} - Tax scenarios
 */
function getTaxScenarios(params) {
  const { country, saleType } = params;
  
  // Get country scenarios
  const countryScenarios = TAX_SCENARIOS[country] || TAX_SCENARIOS.uk;
  
  // Get scenario for sale type
  const scenario = countryScenarios[saleType];
  
  // If no specific scenario found, return all scenarios
  if (!scenario) {
    return Object.values(countryScenarios);
  }
  
  return [scenario];
}

/**
 * Format valuation response for human-readable output
 * 
 * @param {object} valuation - Valuation results
 * @param {object} params - Valuation parameters
 * @param {Array<object>} comparableSales - Comparable business sales
 * @returns {string} - Formatted valuation response
 */
function formatValuationResponse(valuation, params, comparableSales) {
  const { ebitda, revenue, currency, industry, ebitdaEstimated } = params;
  const { value, rangeLow, rangeHigh, multipleUsed, multipleDescription } = valuation;
  
  // Format currency values
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    } else {
      return `£${value.toLocaleString()}`;
    }
  };

  let response = `## Business Valuation Analysis

### Valuation Summary & Methodology

| **Method** | **Multiple Range** | **Your Business** | **Market Context** |
|------------|-------------------|------------------|-------------------|
| EBITDA Multiple | ${(multipleUsed * 0.8).toFixed(1)}x - ${(multipleUsed * 1.2).toFixed(1)}x | ${multipleUsed.toFixed(1)}x | ${getIndustryContext(industry)} |
| Revenue Multiple | ${getRevenueMultiple(industry).low}x - ${getRevenueMultiple(industry).high}x | ${revenue ? (value / revenue).toFixed(1) + 'x' : 'N/A'} | Based on ${industry} sector |
| Asset Multiple | 0.8x - 1.5x | Subject to asset review | UK market standard |

**Estimated Enterprise Value: ${formatCurrency(value)}**
**Valuation Range: ${formatCurrency(rangeLow)} - ${formatCurrency(rangeHigh)}**

### Financial Profile Analysis

| **Metric** | **Your Business** | **Industry Benchmark** | **Assessment** |
|------------|------------------|----------------------|----------------|
| Annual Revenue | ${revenue ? formatCurrency(revenue) : 'Not provided'} | Varies by size | ${getRevenueAssessment(revenue)} |
| EBITDA | ${formatCurrency(ebitda)} | ${getIndustryEBITDAMargin(industry)}% of revenue | ${getEBITDAAssessment(ebitda, revenue)} |
| EBITDA Margin | ${revenue ? ((ebitda / revenue) * 100).toFixed(1) + '%' : 'N/A'} | ${getIndustryEBITDAMargin(industry)}% | ${getMarginAssessment(ebitda, revenue, industry)} |
| Business Type | ${industry.charAt(0).toUpperCase() + industry.slice(1).replace('_', ' ')} | UK ${industry} sector | ${getIndustryOutlook(industry)} |

### Valuation Sensitivity Analysis

| **EBITDA** | **Conservative (${(multipleUsed * 0.8).toFixed(1)}x)** | **Mid-Range (${multipleUsed.toFixed(1)}x)** | **Optimistic (${(multipleUsed * 1.2).toFixed(1)}x)** |
|------------|-------------|------------|-------------|
| ${formatCurrency(ebitda * 0.9)} | ${formatCurrency(ebitda * 0.9 * multipleUsed * 0.8)} | ${formatCurrency(ebitda * 0.9 * multipleUsed)} | ${formatCurrency(ebitda * 0.9 * multipleUsed * 1.2)} |
| **${formatCurrency(ebitda)}** | **${formatCurrency(ebitda * multipleUsed * 0.8)}** | **${formatCurrency(ebitda * multipleUsed)}** | **${formatCurrency(ebitda * multipleUsed * 1.2)}** |
| ${formatCurrency(ebitda * 1.1)} | ${formatCurrency(ebitda * 1.1 * multipleUsed * 0.8)} | ${formatCurrency(ebitda * 1.1 * multipleUsed)} | ${formatCurrency(ebitda * 1.1 * multipleUsed * 1.2)} |

### Current UK Market Conditions (Q4 2024)

- **Base Rate:** 5.25% (Bank of England)
- **SONIA Rate:** ~5.0%
- **Average Deal Timeline:** 4-8 months
- **Due Diligence Period:** 6-12 weeks
- **Financing Availability:** Moderate (higher rates impacting multiples)

### Key Value Drivers & Risk Factors

**Positive Factors:**
- Recurring revenue streams
- Strong management team
- Market-leading position
- Scalable business model
- Low customer concentration

**Risk Factors:**
- Economic uncertainty
- Interest rate environment
- Industry cyclicality
- Key person dependency
- Competitive pressures

### Professional Next Steps

1. **Enhanced Financial Review** (2-3 weeks)
   - 3-year financial normalisation
   - Working capital analysis
   - Quality of earnings assessment
   - Management adjustments review

2. **Market Positioning Study** (2-4 weeks)
   - Competitive landscape analysis
   - Customer concentration review
   - Market share assessment
   - Growth trajectory evaluation

3. **Tax Planning Consultation** (1-2 weeks)
   - Business Asset Disposal Relief optimisation
   - Share vs asset sale structure
   - Timing considerations
   - Corporate structuring review

**Investment Required:** £15K-30K for comprehensive preparation
**Expected Timeline:** 8-12 weeks to market-ready position`;

  return response;
}

// Helper functions for enhanced analysis
function getIndustryContext(industry) {
  const contexts = {
    'technology': 'High growth potential',
    'manufacturing': 'Asset-intensive sector',
    'retail': 'Location-dependent',
    'services': 'People-dependent',
    'hospitality': 'Asset + operational',
    'healthcare': 'Regulated sector',
    'default': 'Mixed market conditions'
  };
  return contexts[industry] || contexts['default'];
}

function getRevenueMultiple(industry) {
  const multiples = {
    'technology': { low: 1.5, high: 4.0 },
    'manufacturing': { low: 0.8, high: 2.0 },
    'retail': { low: 0.5, high: 1.5 },
    'services': { low: 1.0, high: 2.5 },
    'hospitality': { low: 0.8, high: 2.0 },
    'healthcare': { low: 1.2, high: 3.0 },
    'default': { low: 0.8, high: 2.0 }
  };
  return multiples[industry] || multiples['default'];
}

function getIndustryEBITDAMargin(industry) {
  const margins = {
    'technology': 25,
    'manufacturing': 12,
    'retail': 8,
    'services': 15,
    'hospitality': 18,
    'healthcare': 20,
    'default': 15
  };
  return margins[industry] || margins['default'];
}

function getRevenueAssessment(revenue) {
  if (!revenue) return 'Financial review required';
  if (revenue < 250000) return 'Micro business';
  if (revenue < 1000000) return 'Small business';
  if (revenue < 5000000) return 'Medium business';
  return 'Larger business';
}

function getEBITDAAssessment(ebitda, revenue) {
  if (!revenue) return 'Margin analysis needed';
  const margin = (ebitda / revenue) * 100;
  if (margin < 5) return 'Below market average';
  if (margin < 15) return 'Market average';
  if (margin < 25) return 'Above market average';
  return 'Excellent performance';
}

function getMarginAssessment(ebitda, revenue, industry) {
  if (!revenue) return 'Analysis required';
  const margin = (ebitda / revenue) * 100;
  const industryMargin = getIndustryEBITDAMargin(industry);
  
  if (margin < industryMargin * 0.8) return 'Below industry average';
  if (margin < industryMargin * 1.2) return 'Industry average';
  return 'Above industry average';
}

function getIndustryOutlook(industry) {
  const outlooks = {
    'technology': 'Strong growth sector',
    'manufacturing': 'Stable with automation trends',
    'retail': 'Challenging conditions',
    'services': 'Depends on service type',
    'hospitality': 'Recovery post-pandemic',
    'healthcare': 'Defensive sector',
    'default': 'Mixed conditions'
  };
  return outlooks[industry] || outlooks['default'];
}

/**
 * Format tax scenario response for human-readable output
 * 
 * @param {Array<object>} scenarios - Tax scenarios
 * @param {object} params - Tax parameters
 * @returns {string} - Formatted tax scenario response
 */
function formatTaxScenarioResponse(scenarios, params) {
  const { country, saleType, businessType } = params;
  
  return `## UK Business Sale Tax Analysis & Planning

### Transaction Structure Tax Comparison

| **Structure** | **Seller CGT Rate** | **Reliefs Available** | **Buyer Position** | **Overall Efficiency** |
|---------------|-------------------|---------------------|------------------|---------------------|
| **Asset Sale** | 10%/20% (individuals) | Business Asset Disposal Relief | Depreciation allowances | Moderate |
| | 25% (companies) | No substantial shareholding | Higher acquisition costs | Lower for companies |
| **Share Sale** | 10% (up to £1M BADR) | Business Asset Disposal Relief | No depreciation | Higher efficiency |
| | 20% (above £1M) | Substantial shareholding exemption | 0.5% stamp duty | Preferred structure |

### UK Tax Rates & Thresholds (2024/25 Tax Year)

| **Tax Type** | **Rate** | **Threshold/Allowance** | **Planning Opportunity** |
|--------------|----------|----------------------|------------------------|
| **CGT - Individuals** | 10% (BADR) / 20% | £1M lifetime BADR allowance | Time disposal for optimal rate |
| **CGT - Companies** | 25% (main rate) | 19% (small profits rate) | Consider corporate structure |
| **Corporation Tax** | 19% / 25% | £50K-250K marginal rate | Profit timing strategies |
| **Dividend Tax** | 8.75% / 33.75% | £500 dividend allowance | Distribution timing |
| **SDLT** | 0-5% (commercial) | £150K-250K thresholds | Structure consideration |

### Business Asset Disposal Relief (BADR) Optimization

| **Requirement** | **Test** | **Planning Action** | **Risk Mitigation** |
|-----------------|----------|-------------------|-------------------|
| **5% Shareholding** | Ordinary shares + voting | Ensure qualifying shares | Review share classes |
| **Officer/Employee** | 24 months in 2 years | Document employment | Formal appointment |
| **Trading Company** | >80% trading activities | Cease non-trading | Investment company rules |
| **Holding Period** | 24 months ownership | Plan timing carefully | Backdating not possible |

### Tax Planning Strategies by Business Value

| **Business Value** | **Primary Strategy** | **Secondary Considerations** | **Professional Advice** |
|-------------------|-------------------|---------------------------|----------------------|
| **£0-500K** | Straightforward sale | Basic BADR planning | General tax adviser |
| **£500K-1M** | BADR maximisation | Timing and structure | Tax specialist |
| **£1M-5M** | Multi-year planning | Family involvement | Tax/legal team |
| **£5M+** | Complex structuring | Trust planning | Full advisory team |

### Pre-Sale Tax Planning Timeline

| **Timing** | **Actions Required** | **Tax Implications** | **Professional Input** |
|------------|---------------------|---------------------|---------------------|
| **24+ Months** | Ensure BADR qualifying | Structure business correctly | Tax planning review |
| **12 Months** | Cease non-trading activities | Maintain trading status | Ongoing monitoring |
| **6 Months** | Consider share reorganisation | Optimise tax structure | Specialist advice |
| **3 Months** | Final structure review | Lock in tax position | Complete planning |

### Common Tax Traps & Avoidance

| **Risk Area** | **Trap** | **Consequence** | **Avoidance Strategy** |
|---------------|----------|----------------|---------------------|
| **BADR Loss** | Fails qualifying tests | 20% vs 10% CGT rate | Early compliance check |
| **Investment Company** | >20% non-trading assets | No BADR relief | Asset restructuring |
| **Share Classes** | Preference shares | BADR not available | Ordinary shares only |
| **Timing Issues** | Fails 24-month test | Higher CGT rates | Long-term planning |

### Post-Sale Considerations

**Immediate Actions:**
- CGT payment on account (31 Jan following tax year)
- Capital gains tax return filing
- Consider pension contributions (40% relief)
- Investment planning for proceeds

**Medium-Term Planning:**
- Spouse/civil partner transfers (CGT-free)
- Charitable donations (income tax relief)
- Future business investments (SEIS/EIS)
- Estate planning considerations

### Professional Advisory Investment

| **Service** | **Typical Cost** | **Value Delivered** | **ROI Potential** |
|-------------|-----------------|-------------------|------------------|
| **Tax Planning** | £5K-15K | Structure optimisation | 5-10% tax saving |
| **Legal Structuring** | £10K-25K | Deal structure advice | Risk mitigation |
| **Ongoing Compliance** | £2K-5K annually | HMRC compliance | Penalty avoidance |
| **Estate Planning** | £5K-20K | Inheritance tax planning | Long-term efficiency |

### Next Steps & Recommendations

1. **Immediate Review** (1-2 weeks)
   - BADR qualification assessment
   - Current business structure analysis
   - Tax exposure calculation
   - Planning window identification

2. **Structure Optimisation** (4-8 weeks)
   - Share class review and restructuring
   - Non-trading asset disposal
   - Employment status documentation
   - Trading company compliance

3. **Pre-Sale Planning** (3-6 months)
   - Tax-efficient sale structure
   - Timing optimization
   - Professional team assembly
   - Compliance monitoring

**Tax Planning Investment:** £10K-30K for comprehensive planning
**Potential Tax Savings:** 5-20% of transaction value
**Critical Timeline:** Start planning 24+ months before sale

**Disclaimer:** UK tax legislation is complex and subject to change. This analysis is for guidance only. Always consult with qualified UK tax advisers for specific advice tailored to your circumstances.`;
}

/**
 * Helper function to format sale type for display
 * 
 * @param {string} saleType - Sale type code
 * @returns {string} - Formatted sale type
 */
function formatSaleType(saleType) {
  switch (saleType) {
    case 'asset_sale':
      return 'Asset Sale';
    case 'share_sale':
      return 'Share Sale';
    case 'stock_sale':
      return 'Stock Sale';
    default:
      return saleType;
  }
}

/**
 * Helper function to format country for display
 * 
 * @param {string} country - Country code
 * @returns {string} - Formatted country name
 */
function formatCountry(country) {
  switch (country) {
    case 'uk':
      return 'United Kingdom';
    case 'usa':
      return 'United States';
    default:
      return country.toUpperCase();
  }
}

/**
 * Generate a random recent date for comparable sales
 * 
 * @returns {string} - Formatted date string
 */
function getRandomRecentDate() {
  const today = new Date();
  const monthsAgo = Math.floor(Math.random() * 18); // Random date within last 18 months
  
  const date = new Date(today);
  date.setMonth(today.getMonth() - monthsAgo);
  
  const options = { year: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-GB', options);
}

/**
 * Enhanced AI call with rate limiting, circuit breaker, and caching
 */
async function callAIWithSafeguards(messages, contextualPrompt) {
  // Check rate limiting first
  if (!rateLimiter.isAllowed()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Check cache for similar prompts
  const cacheKey = financeCache.generateKey(contextualPrompt);
  const cachedResponse = financeCache.get(cacheKey);
  if (cachedResponse) {
    console.log('Finance Agent: Using cached AI response');
    return cachedResponse;
  }

  // Use circuit breaker for AI calls
  const aiResponse = await aiCircuitBreaker.call(async () => {
    const startTime = Date.now();
    
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: OPENAI_CONFIG.maxTokens,
      top_p: OPENAI_CONFIG.topP,
      frequency_penalty: OPENAI_CONFIG.frequencyPenalty,
      presence_penalty: OPENAI_CONFIG.presencePenalty,
      messages: messages
    });

    const duration = Date.now() - startTime;
    console.log(`Finance Agent: AI call completed in ${duration}ms`);
    
    return response;
  });

  const result = aiResponse.choices[0]?.message?.content;
  
  // Cache successful responses
  if (result) {
    financeCache.set(cacheKey, result);
  }
  
  return result;
}

export default {
  processFinanceTask
};