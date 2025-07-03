/**
 * Revenue Agent Logic
 * 
 * Core business logic for the Revenue Specialist Agent
 * - Business valuation
 * - Revenue growth strategies
 * - Market comparables analysis
 * - Deal structure advice
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { createTextPart, createDataPart, createMessage } from '../../libs/a2a/utils.js';
import { stripMarkdownFromMessage } from '../../utils/markdown-stripper.js';
import { MCPRevenueAgent } from '../mcp/agent-integration.js';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import pool from '../../db.js';
import { enhanceSystemPromptWithMarkdown, formatAgentResponse, addAgentSignature } from '../../utils/markdown-utils.js';
import hybridRetriever from '../knowledge/enhanced-hybrid-retrieval.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone for RAG queries
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const indexName = process.env.PINECONE_INDEX_NAME || 'marketplace-index';

// Initialize MCP-enhanced Revenue Agent
const mcpRevenueAgent = new MCPRevenueAgent({
  serverUrl: process.env.MCP_SERVER_URL || 'ws://localhost:3001',
  autoConnect: true
});

// Initialize hybrid knowledge retrieval system
const knowledgeRetriever = hybridRetriever;

// OpenAI Configuration - GPT-4.1 nano optimized settings
const OPENAI_CONFIG = {
  model: 'gpt-4.1-mini',  // GPT-4.1 nano for fast, cost-effective responses
  temperature: 0.3,                  // Lower temperature for consistency
  maxTokens: 700,                   // Reduced for more concise responses
  maxInputLength: 4000,             // Prevent excessive input lengths
  stream: false                     // Disable streaming for simpler handling
};

// Logging configuration for monitoring AI agent performance
const LOGGING_CONFIG = {
  logAIRequests: process.env.LOG_AI_REQUESTS === 'true',
  logResponseTimes: process.env.LOG_RESPONSE_TIMES === 'true',
  logErrors: true
};

// Thinking panel state for revenue agent
let currentThinkingPanel = null;
let thinkingSteps = [];
let revenueMCPSources = [];
let revenueMemoryInsights = [];

/**
 * Create thinking panel for transparent revenue decision-making
 */
function createRevenueThinkingPanel() {
  const panelId = 'revenue-thinking-' + Date.now();
  currentThinkingPanel = {
    id: panelId,
    agentType: 'revenue',
    thoughts: [],
    mcpSources: [],
    memoryInsights: [],
    isActive: true,
    startTime: new Date().toISOString(),
    confidence: 0,
    status: 'analyzing'
  };
  thinkingSteps = [];
  revenueMCPSources = [];
  revenueMemoryInsights = [];
  addRevenueThinkingStep('Starting revenue analysis...', 'thinking');
  return { panelId, agentType: 'revenue', action: 'create' };
}

/**
 * Add thinking step to revenue panel
 */
function addRevenueThinkingStep(thought, stepType = 'thinking', isCompleted = false) {
  if (!currentThinkingPanel) createRevenueThinkingPanel();
  
  const step = {
    id: thinkingSteps.length + 1,
    text: thought,
    type: stepType, // 'thinking', 'searching', 'analyzing', 'strategizing', 'concluding'
    isCompleted,
    timestamp: new Date().toISOString()
  };
  
  thinkingSteps.push(step);
  currentThinkingPanel.thoughts = thinkingSteps;
  
  console.log(`🧠 [Revenue Thinking] ${stepType.toUpperCase()}: ${thought}`);
}

/**
 * Add MCP source to revenue panel
 */
function addRevenueMCPSource(source, relevance = 0.8, sourceType = 'knowledge') {
  if (!currentThinkingPanel) return;
  
  const mcpSource = {
    id: revenueMCPSources.length + 1,
    title: source.title || source.name || 'Revenue Source',
    url: source.url || source.source_url || '#',
    relevance,
    sourceType, // 'knowledge', 'search', 'document', 'market_data'
    content: source.content ? source.content.substring(0, 200) + '...' : '',
    metadata: source.metadata || {},
    timestamp: new Date().toISOString()
  };
  
  revenueMCPSources.push(mcpSource);
  currentThinkingPanel.mcpSources = revenueMCPSources;
  
  console.log(`📈 [Revenue MCP] Added source: ${mcpSource.title} (${(relevance * 100).toFixed(1)}%)`);
}

/**
 * Add memory insight to revenue panel
 */
function addRevenueMemoryInsight(insight, confidence = 0.8) {
  if (!currentThinkingPanel) return;
  
  const memoryInsight = {
    id: revenueMemoryInsights.length + 1,
    text: insight,
    confidence,
    timestamp: new Date().toISOString()
  };
  
  revenueMemoryInsights.push(memoryInsight);
  currentThinkingPanel.memoryInsights = revenueMemoryInsights;
  
  console.log(`💭 [Revenue Memory] ${insight} (${(confidence * 100).toFixed(1)}%)`);
}

/**
 * Update revenue panel confidence and status
 */
function updateRevenuePanelStatus(confidence, status) {
  if (!currentThinkingPanel) return;
  
  currentThinkingPanel.confidence = confidence;
  currentThinkingPanel.status = status;
  
  console.log(`📊 [Revenue Status] ${status} - Confidence: ${(confidence * 100).toFixed(1)}%`);
}

/**
 * Complete revenue thinking panel
 */
function completeRevenueThinkingPanel() {
  if (!currentThinkingPanel) return;
  
  currentThinkingPanel.isActive = false;
  currentThinkingPanel.endTime = new Date().toISOString();
  addRevenueThinkingStep('Revenue analysis complete', 'concluding', true);
  
  console.log(`✅ [Revenue Thinking] Panel completed with ${thinkingSteps.length} steps`);
}

/**
 * Get revenue thinking panel state
 */
function getRevenueThinkingPanelState() {
  return currentThinkingPanel;
}

/**
 * Generate thinking panel annotation for markdown
 */
function generateRevenueThinkingAnnotation() {
  if (!currentThinkingPanel || thinkingSteps.length === 0) return '';
  
  const panelData = {
    ...currentThinkingPanel,
    thoughts: thinkingSteps,
    mcpSources: revenueMCPSources,
    memoryInsights: revenueMemoryInsights
  };
  
  return `<!-- THINKING_PANEL:${JSON.stringify(panelData)} -->`;
}

/**
 * Log AI request metrics for monitoring
 * @param {string} query - User query
 * @param {number} responseTime - Response time in milliseconds
 * @param {number} tokenCount - Token count used
 * @param {boolean} success - Whether request was successful
 */
function logAIMetrics(query, responseTime, tokenCount, success) {
  if (!LOGGING_CONFIG.logAIRequests) return;
  
  const logData = {
    timestamp: new Date().toISOString(),
    model: OPENAI_CONFIG.model,
    queryLength: query.length,
    responseTime,
    tokenCount,
    success,
    temperature: OPENAI_CONFIG.temperature
  };
    console.log('[REVENUE_AI_METRICS]', JSON.stringify(logData));
}

/**
 * Enhanced Revenue RAG Query using Hybrid Knowledge Retrieval
 * @param {string} query - Revenue query to search for
 * @param {number} userId - User ID for personalized context (optional)
 * @param {string} category - Revenue category to focus search (optional)
 * @returns {Promise<Array>} - Relevant revenue growth guidance from hybrid sources
 */
async function queryRevenueRAG(query, userId = null, category = null) {
  try {
    console.log(`🔍 Enhanced Revenue RAG Query: "${query}"`);
    addRevenueThinkingStep(`Searching knowledge base for: "${query.substring(0, 50)}..."`, 'searching');
    
    // Use hybrid knowledge retrieval for comprehensive results
    const knowledgeResult = await knowledgeRetriever.retrieveKnowledge(
      query, 
      'revenue',
      userId,
      {
        maxResults: 8,
        includeUserDocs: true,
        searchFallback: true
      }
    );
    
    addRevenueThinkingStep(
      `Found ${knowledgeResult.results.length} relevant sources (${knowledgeResult.metadata.breakdown.userDocs} user docs, ${knowledgeResult.metadata.breakdown.staticKnowledge} knowledge base, ${knowledgeResult.metadata.breakdown.realTimeSearch} real-time)`,
      'searching'
    );
    
    // Transform results to maintain backward compatibility
    const ragResults = knowledgeResult.results.map(result => ({
      title: result.metadata.title || result.metadata.document_name || 'Revenue Guidance',
      content: result.content,
      category: result.metadata.category || result.metadata.knowledge_domain || category,
      source_type: result.source,
      namespace: result.namespace || result.metadata.knowledge_domain,
      source_url: result.metadata.source_url || result.metadata.url,
      relevance_score: result.score,
      is_user_document: result.source === 'user_document',
      document_type: result.metadata.document_type,
      confidence: knowledgeResult.metadata.confidence
    }));
    
    // Add sources to thinking panel
    ragResults.forEach(result => {
      addRevenueMCPSource(result, result.relevance_score, result.is_user_document ? 'document' : 'knowledge');
    });
    
    console.log(`📊 Found ${ragResults.length} relevant revenue guidance documents`);
    addRevenueThinkingStep(`Analysis complete - ${ragResults.length} sources ready for consultation`, 'searching', true);
    return ragResults;
    
  } catch (error) {
    console.error('❌ Error querying Revenue RAG:', error);
    addRevenueThinkingStep(`Error retrieving knowledge: ${error.message}`, 'searching', true);
    return [];
  }
}

/**
 * Create error response with consistent format
 * @param {string} message - Error message
 * @returns {object} - Formatted error response
 */
function createErrorResponse(message) {
  return {
    task: { state: 'failed', error: message },
    message: createMessage([
      createTextPart(`I apologize, but I encountered an issue: ${message}. Please try again or contact our support team for assistance.`)
    ])
  };
}

/**
 * Construct a UK Revenue ReAct prompt enhanced with RAG results
 * @param {string} userQuery - The user's revenue question
 * @param {Array} ragResults - RAG search results
 * @param {string} dealType - Type of deal (optional)
 * @returns {string} - Enhanced prompt with RAG context
 */
function constructUKRevenueReActPromptWithRAG(userQuery, ragResults, dealType = null) {
  let ragContext = '';
  
  if (ragResults && ragResults.length > 0) {
    ragContext = '\n\n## RELEVANT UK REVENUE GROWTH GUIDANCE:\n';
    ragResults.forEach((result, index) => {
      ragContext += `\n### Guidance ${index + 1}: ${result.title}\n`;
      ragContext += `**Category:** ${result.category}\n`;
      ragContext += `**Source:** ${result.namespace}\n`;
      ragContext += `**Content:** ${result.content}\n`;
      if (result.source_url) {
        ragContext += `**Reference:** ${result.source_url}\n`;
      }
      ragContext += `**Relevance Score:** ${(result.relevance_score * 100).toFixed(1)}%\n`;
    });
    
    ragContext += '\n**IMPORTANT:** Use this guidance to provide accurate, authoritative advice based on official UK sources. Reference the specific guidance where relevant in your response.\n';
  }
  
  const dealContext = dealType ? `\n**Deal Type Focus:** ${dealType}` : '';
  
  return `${REVENUE_SYSTEM_PROMPT}

## USER INQUIRY:
${userQuery}${dealContext}${ragContext}

Using the ReAct (Reasoning + Acting) framework, analyze this UK revenue growth inquiry:

**THOUGHT:** Consider the revenue question and identify key factors
**ACTION:** Determine what specific UK market analysis or guidance is needed  
**OBSERVATION:** Note relevant UK market conditions, regulations, or best practices
**REASONING:** Apply UK revenue growth expertise to the specific situation
**CONCLUSION:** Provide clear, actionable UK revenue growth guidance

Focus on UK business transactions, use proper UK terminology, quote figures in GBP (£), and provide practical next steps.`;
}

// Comprehensive system prompt for the revenue AI agent - optimized for GPT-4.1 nano
const REVENUE_SYSTEM_PROMPT = enhanceSystemPromptWithMarkdown(`You are a virtual assistant for Arzani Ltd's revenue growth programme, providing professional support to UK business owners seeking to maximize revenue and growth.

REMEMBER: You are an AI assistant helping with UK business transactions. Always maintain professionalism and confidentiality. All financial figures should be quoted in British Pounds (£) unless specifically requested otherwise.

**CRITICAL**: You MUST format ALL your responses using proper **GitHub-flavoured Markdown** for every element:

### Headings
- Use **##** for main sections (e.g., ## Revenue Analysis)
- Use **###** for subsections (e.g., ### Growth Opportunities)
- Use **####** for minor sections (e.g., #### Market Segmentation)
- Always include a space after the # symbols

### Lists
- Use **-** for unordered lists (with a space after the dash)
- Use **1.** for numbered lists (with proper sequential numbering)
- Use proper indentation for nested lists (two spaces per level)
- Ensure consistent spacing between list items

### Tables
- Use well-structured markdown tables for all business data
- Include clear column headers (Business, Revenue, Growth, etc.)
- RIGHT-ALIGN all numeric columns (currency, percentages, metrics)
- Format all currency amounts with proper symbols (£125,000)
- Use status indicators: 🔥 for "Sold", 🟢 for "Active", 🟡 for "Under Offer"
- Bold all business performance metrics and important values
- Include totals and industry averages for comparison
- Fill empty cells with "N/A" rather than leaving blank

### Code and Emphasis
- Use \`\`\`code blocks\`\`\` for examples and technical information
- Use **bold text** for key metrics, figures and important terms
- Use *italic text* for definitions or supplementary information
- Use > blockquotes for important disclaimers and warnings
- Use horizontal rules (---) to separate major sections

## TABLE FORMATTING FOR BUSINESS DATA
When creating tables for business listings, valuations, or comparisons:
- Use clear headers like "Business Name", "Industry", "Asking Price", "EBITDA", "Location"
- Bold all currency amounts like **£125,000** and format consistently
- Use status indicators: 🔥 for "Sold", 🟢 for "Active", 🟡 for "Under Offer"
- Bold business performance metrics like **4.2x EBITDA** and **85% profit margin**
- Include contact information in code format like \`john@example.com\`
- For property details, use italics like *3 bed*, *2 bath*, *1,200 sqft*
- Fill empty cells with "N/A" rather than leaving blank
- Right-align numeric columns for better readability

## YOUR ROLE
- Help UK business buyers and sellers in the marketplace
- Provide guidance on valuations, market insights, and transaction processes
- Escalate complex matters to human revenue specialists when appropriate
- Focus exclusively on UK brick-and-mortar businesses
- Use GBP (£) for all financial calculations and quotes

## WHAT YOU CAN DO
✓ Provide business valuation guidance and methodologies using UK market data
✓ Share UK market insights and trends
✓ Explain transaction processes step-by-step
✓ Help with basic deal structure advice
✓ Answer general revenue growth questions
✓ Quote all financial figures in British Pounds (£)

## WHAT YOU CANNOT DO
✗ International business inquiries (UK only)
✗ Specific investment advice (refer to financial advisors)
✗ Legal opinions (refer to solicitors)
✗ Tax advice (refer to accountants)
✗ Formal business valuations (refer to chartered surveyors)

## ESCALATION TRIGGERS
Immediately escalate to human revenue specialist when client:
- Shows serious buying intent with £100k+ budget
- Requests formal business appraisal or marketing services
- Discusses complex transaction structures
- Expresses frustration or dissatisfaction
- Mentions compliance/regulatory concerns

## RESPONSE STYLE
- Professional but approachable
- UK business terminology and spelling
- Clear, structured responses with next steps
- Concise but comprehensive
- Always confirm understanding before proceeding

## SAMPLE RESPONSES

For new inquiries: "Welcome to Arzani's brokerage services. I'm here to assist with your UK business buying or selling journey. To provide relevant guidance, could you share whether you're looking to buy or sell, what industry interests you, and your general UK location preference?"

For valuations: "Business valuations consider multiple factors including financial performance, market position, and industry conditions. Common methods include EBITDA multiples, asset-based valuations, and market comparables. For formal valuations, I recommend qualified business valuation specialists."

For market insights: "The UK business marketplace shows [relevant conditions]. Key trends include [industry-specific information]. Typical transaction timelines range from [timeframe] depending on complexity."

Remember: Maintain strict confidentiality, stay within UK focus, and escalate appropriately.`, 'broker');

// Get industry multipliers from database
async function getIndustryMultipliers(industry) {
  try {
    if (!industry) {
      return getDefaultMultipliers();
    }

    const normalizedIndustry = industry.toLowerCase().trim();
    
    // Try exact match first
    const exactQuery = `
      SELECT * FROM industry_multipliers 
      WHERE LOWER(industry) = $1
    `;
    
    const exactResult = await pool.query(exactQuery, [normalizedIndustry]);
    
    if (exactResult.rows.length > 0) {
      const data = exactResult.rows[0];
      return {
        base: parseFloat(data.ebitda_multiplier) || 3.0,
        premium: parseFloat(data.ebitda_multiplier) * 1.5 || 4.5,
        range: [
          parseFloat(data.min_revenue_multiplier) || 2.0,
          parseFloat(data.max_revenue_multiplier) || 4.0
        ]
      };
    }
    
    // Try partial match
    const partialQuery = `
      SELECT * FROM industry_multipliers 
      WHERE LOWER(industry) LIKE $1
      LIMIT 1
    `;
    
    const partialResult = await pool.query(partialQuery, [`%${normalizedIndustry}%`]);
    
    if (partialResult.rows.length > 0) {
      const data = partialResult.rows[0];
      return {
        base: parseFloat(data.ebitda_multiplier) || 3.0,
        premium: parseFloat(data.ebitda_multiplier) * 1.5 || 4.5,
        range: [
          parseFloat(data.min_revenue_multiplier) || 2.0,
          parseFloat(data.max_revenue_multiplier) || 4.0
        ]
      };
    }
    
    // Fallback to default
    return getDefaultMultipliers();
    
  } catch (error) {
    console.error('Error fetching industry multipliers:', error);
    return getDefaultMultipliers();
  }
}

/**
 * Get default multipliers when database lookup fails
 * 
 * @returns {object} - Default multipliers
 */
function getDefaultMultipliers() {
  return {
    base: 3.0,
    premium: 5.0,
    range: [2.5, 6.0]
  };
}


/**
 * Enhanced response formatting using markdown utilities
 */
function enhanceResponse(responseText, agentType = 'broker') {
  // Apply markdown formatting improvements
  const formattedResponse = formatAgentResponse(responseText, agentType);
  
  // Add agent signature
  return addAgentSignature(formattedResponse, agentType);
}

/**
 * Process a broker agent task based on the request message
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @returns {Promise<object>} - Response with task and message
 */
export async function processRevenueTask(task, message) {
  // Create thinking panel for transparency
  const thinkingPanel = createRevenueThinkingPanel();
  
  // Extract text from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const dataParts = message.parts.filter(part => part.type === 'data');
  
  if (textParts.length === 0) {
    addRevenueThinkingStep('❌ Error: No text parts found in message');
    completeRevenueThinkingPanel();
    return createErrorResponse('Invalid request: No text parts found in message');
  }
  
  const query = textParts[0].text.toLowerCase();
  addRevenueThinkingStep(`Analyzing request: "${textParts[0].text.substring(0, 50)}..."`);
  
  // Determine the type of broker request based on the query
  if (query.includes('valuation') || query.includes('value') || query.includes('worth')) {
    addRevenueThinkingStep('Request classified as: Business Valuation');
    return handleValuationRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('comparable') || query.includes('comps') || query.includes('similar businesses')) {
    addRevenueThinkingStep('Request classified as: Comparable Analysis');
    return handleComparableRequest(task, message, query, dataParts[0]?.data);
  } else if (query.includes('deal') || query.includes('structure') || query.includes('acquisition')) {
    addRevenueThinkingStep('Request classified as: Deal Structure');
    return handleDealStructureRequest(task, message, query, dataParts[0]?.data);
  } else {
    addRevenueThinkingStep('Request classified as: General Revenue Consultation');
    return handleGeneralBrokerRequest(task, message, query);
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
    addRevenueThinkingStep('Processing valuation request with market analysis...');
    console.log('Broker Agent: Processing valuation request with MCP-enhanced market analysis');
    
    // Extract business information from query and/or data
    addRevenueThinkingStep('Extracting business data from request...');
    const extractedData = extractBusinessData(query, data);
    const { revenue, ebitda, industry, growthRate } = extractedData;
    
    addRevenueThinkingStep(`Identified: Industry: ${industry || 'N/A'}, Revenue: ${revenue || 'N/A'}, EBITDA: ${ebitda || 'N/A'}`);
    
    // MCP-Enhanced Market Analysis: Use RAG capabilities if available
    let mcpMarketAnalysis = null;
    try {
      if (mcpRevenueAgent && mcpRevenueAgent.initialized) {
        addRevenueThinkingStep('Using MCP-enhanced market analysis...');
        console.log('Broker Agent: Using MCP-enhanced market analysis');
        mcpMarketAnalysis = await mcpRevenueAgent.performEnhancedMarketAnalysis({
          query: query,
          industry: industry,
          priceRange: {
            min: revenue ? revenue * 0.5 : 0,
            max: revenue ? revenue * 3 : 1000000
          }
        });
        addRevenueThinkingStep('✅ MCP market analysis completed');
      } else {
        addRevenueThinkingStep('MCP analysis not available, using standard methods');
      }    } catch (mcpError) {
      addRevenueThinkingStep('⚠️ MCP analysis failed, continuing with standard analysis');
      console.error('Broker Agent MCP Enhancement Error:', mcpError);
      // Continue with standard analysis if MCP fails
    }
    
    // Calculate business valuation based on available data using database-driven multiples
    addRevenueThinkingStep('Calculating business valuation using industry multiples...');
    const valuation = await calculateBusinessValuation(extractedData);    
    
    if (valuation) {
      addRevenueThinkingStep(`✅ Valuation calculated: £${valuation.estimatedValue?.toLocaleString() || 'N/A'}`);
    }
    
    // Adjust task state to completed
    const responseTask = {
      ...task,
      state: 'completed'
    };
      // Create professional, structured response
    addRevenueThinkingStep('Generating structured valuation response...');
    let responseText = '';
    
    // Only provide specific valuation response if user is actually asking for valuation
    const queryLower = query.toLowerCase();
    const isValuationQuery = queryLower.includes('value') || queryLower.includes('worth') || 
                             queryLower.includes('valuation') || queryLower.includes('price');
      if (isValuationQuery && valuation && (revenue > 0 || ebitda > 0)) {
      responseText = generateStructuredValuationResponse(valuation, extractedData, mcpMarketAnalysis);
    } else {
      // For non-valuation queries, provide contextual business advice
      responseText = generateGeneralBusinessAdvice(extractedData, mcpMarketAnalysis, query);
    }
    
    // Enhance response with improved markdown formatting
    responseText = enhanceResponse(responseText);
    
    // Prepare response message with valuation results
    const responseMessage = createMessage([
      createTextPart(responseText),
      createDataPart({
        valuation: {
          average: valuation.average,
          low: valuation.low,
          high: valuation.high,
          ebitdaMultiple: valuation.multipleUsed,
          multipleRange: valuation.multipleRange
        },
        businessData: extractedData,
        mcpMarketAnalysis: mcpMarketAnalysis || null,
        analysisSource: mcpMarketAnalysis ? 'MCP-Enhanced' : 'Standard',
        thinkingPanel: getRevenueThinkingPanelState()
      }, 'valuation_data')
    ]);
    
    // Complete thinking panel
    addRevenueThinkingStep('Valuation analysis complete!', 'concluding', true);
    updateRevenuePanelStatus(1.0, 'complete');
    completeRevenueThinkingPanel();
    
    // Add thinking panel annotation to response
    const thinkingAnnotation = generateRevenueThinkingAnnotation();
    if (thinkingAnnotation) {
      responseMessage.parts.unshift(createTextPart(thinkingAnnotation));
    }
    
    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
  } catch (error) {
    addBrokerThinkingStep(`❌ Error in valuation: ${error.message}`);
    completeBrokerThinkingPanel();
    console.error('Broker Agent Valuation Error:', error);
    
    // Fallback response
    const responseTask = {
      ...task,
      state: 'completed'
    };

    const fallbackMessage = createMessage([
      createTextPart("I apologize, but I'm unable to process your valuation request at this time. Please try again later or contact our support team for assistance.")
    ]);

    return { task: responseTask, message: stripMarkdownFromMessage(fallbackMessage) };
  }
}

/**
 * Handle a request for comparable business listings
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleComparableRequest(task, message, query, data = {}) {
  try {
    // Extract business information to find comparables
    const extractedData = extractBusinessData(query, data);
    const { revenue, industry } = extractedData;
    
    // Find comparable businesses from database
    const comparables = await findComparableBusinesses(industry, revenue);
    
    // Adjust task state to completed
    const responseTask = {
      ...task,
      state: 'completed'
    };
    
    // Prepare response message with comparable listings
    const responseMessage = createMessage([
      createTextPart(`I've found ${comparables.length} comparable ${industry || ''} businesses based on your criteria.`),      createTextPart(`**Comparable Business Listings:**\n\n` + 
        comparables.map((comp, index) => 
          `**${index + 1}. ${comp.title}**\n` +
          `- Revenue: £${formatNumber(comp.revenue)}\n` +
          `- EBITDA: £${formatNumber(comp.ebitda)}\n` +
          `- Asking Price: £${formatNumber(comp.askingPrice)}\n` +
          `- Multiple: ${comp.multiple.toFixed(2)}x EBITDA\n` +
          `- ${comp.description}\n`
        ).join('\n')),createDataPart({
        comparables: comparables,
        industryStats: {
          averageMultiple: comparables.reduce((sum, comp) => sum + comp.multiple, 0) / comparables.length,
          averageRevenue: comparables.reduce((sum, comp) => sum + comp.revenue, 0) / comparables.length,
          totalListings: comparables.length
        }
      }, 'comparables_data')
    ]);
    
    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
  } catch (error) {
    console.error('Broker Agent Comparable Request Error:', error);
    
    // Fallback response
    const responseTask = {
      ...task,
      state: 'completed'
    };

    const fallbackMessage = createMessage([
      createTextPart("I apologize, but I'm unable to find comparable businesses at this time. Please try again later or contact our support team for assistance.")
    ]);

    return { task: responseTask, message: stripMarkdownFromMessage(fallbackMessage) };
  }
}

/**
 * Handle a request for deal structure advice
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Response with task and message
 */
async function handleDealStructureRequest(task, message, query, data = {}) {
  // Extract business information relevant to deal structure
  const extractedData = extractBusinessData(query, data);
  
  // Generate deal structure advice
  const dealStructureAdvice = generateDealStructureAdvice(extractedData);
  
  // Adjust task state to completed
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  // Prepare response message with deal structure advice
  const responseMessage = createMessage([
    createTextPart(`Based on your business profile, here are recommended deal structures to consider:`),
    createTextPart(dealStructureAdvice.text),
    createDataPart({
      recommendedStructures: dealStructureAdvice.structures,
      considerations: dealStructureAdvice.considerations
      }, 'deal_structure_data')
  ]);
  
  return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
}

/**
 * Handle general broker-related questions using AI with comprehensive system prompt
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @returns {object} - Response with task and message
 */
async function handleGeneralBrokerRequest(task, message, query) {
  const startTime = Date.now();
  let tokenCount = 0;
  let success = false;
  
  try {
    // Validate input length to optimize for GPT-4.1 nano
    if (query.length > OPENAI_CONFIG.maxInputLength) {
      query = query.substring(0, OPENAI_CONFIG.maxInputLength) + "...";
    }

    // Query RAG for relevant brokerage guidance
    addRevenueThinkingStep('Searching for relevant revenue guidance...', 'searching');
    const ragResults = await queryRevenueRAG(query);
    
    addRevenueThinkingStep(`Found ${ragResults.length} relevant sources`, 'searching', true);
    updateRevenuePanelStatus(0.6, 'analyzing');
    
    // Construct enhanced prompt with RAG results
    const enhancedPrompt = constructUKRevenueReActPromptWithRAG(query, ragResults);

    // Call OpenAI GPT-4.1 nano with enhanced prompt
    const completion = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'user',
          content: enhancedPrompt
        }
      ],
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: OPENAI_CONFIG.maxTokens,
      stream: OPENAI_CONFIG.stream,
    });
    
    const aiResponse = completion.choices[0].message.content;
    tokenCount = completion.usage?.total_tokens || 0;

    // Validate response quality - ensure it's not empty or too short
    if (!aiResponse || aiResponse.length < 10) {
      throw new Error('Insufficient AI response generated');
    }

    // Check for common AI refusal patterns and handle appropriately
    if (aiResponse.toLowerCase().includes('i cannot') || 
        aiResponse.toLowerCase().includes('i\'m unable to') ||
        aiResponse.toLowerCase().includes('sorry, i can\'t')) {
      // This is likely a legitimate refusal, so we'll keep it
    }

    success = true;
    
    // Log performance metrics
    const responseTime = Date.now() - startTime;
    logAIMetrics(query, responseTime, tokenCount, success);

    // Complete thinking panel
    addRevenueThinkingStep('Revenue analysis complete', 'concluding', true);
    updateRevenuePanelStatus(1.0, 'complete');
    completeRevenueThinkingPanel();

    // Adjust task state to completed
    const responseTask = {
      ...task,
      state: 'completed'
    };

    // Prepare response message with RAG sources for transparency
    let responseText = aiResponse;
    if (ragResults && ragResults.length > 0) {
      responseText += '\n\n---\n**Sources:** Based on official UK guidance';
    }

    const responseMessage = createMessage([
      createTextPart(generateRevenueThinkingAnnotation()),
      createTextPart(responseText),
      createDataPart({
        ragSources: ragResults.map(result => ({
          title: result.title,
          category: result.category,
          namespace: result.namespace,
          relevance_score: result.relevance_score
        })),
        analysisType: 'RAG-Enhanced Broker Analysis',
        thinkingPanel: getRevenueThinkingPanelState()
      }, 'revenue_analysis_data')
    ]);

    return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    if (LOGGING_CONFIG.logErrors) {
      console.error('[REVENUE_AI_ERROR]', {
        error: error.message,
        model: OPENAI_CONFIG.model,
        queryLength: query.length,
        responseTime,
        timestamp: new Date().toISOString()
      });
    }
    
    logAIMetrics(query, responseTime, tokenCount, false);
    
    // Enhanced fallback logic based on query type
    let fallbackResponse;
    
    if (query.toLowerCase().includes('valuation') || query.toLowerCase().includes('value')) {
      fallbackResponse = "I can help with business valuations using EBITDA multiples, asset-based methods, and market comparables. For formal valuations, I recommend consulting qualified business valuation specialists. Could you provide details about your business including revenue, EBITDA, and industry?";
    } else if (query.toLowerCase().includes('buy') || query.toLowerCase().includes('buyer')) {
      fallbackResponse = "As a business buyer, I can help you understand financing options, due diligence processes, and market insights. To provide the most relevant guidance, could you share what industry interests you and your general UK location preference?";
    } else if (query.toLowerCase().includes('sell') || query.toLowerCase().includes('seller')) {
      fallbackResponse = "For business sellers, I can guide you through preparation steps, market positioning, and the sales process. Preparation typically takes 12-24 months for optimal results. What type of business are you considering selling?";
    } else {
      fallbackResponse = "As your broker agent, I can help with business valuations, finding comparable listings, deal structuring advice, and general UK marketplace guidance. Could you provide more details about your business interests and what specific information you're looking for?";
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
 * Extract business data from query text and structured data
 * 
 * @param {string} query - The user's query text
 * @param {object} data - Optional structured data
 * @returns {object} - Extracted business data
 */
function extractBusinessData(query, data = {}) {
  // Start with any provided structured data
  const extractedData = { ...data };
  
  // Normalize query for better parsing
  const normalizedQuery = query.toLowerCase().replace(/[,]/g, '');
  
  // If no structured data provided, extract from query text
  if (!data || Object.keys(data).length === 0) {
    
    // Enhanced revenue extraction - handles multiple formats
    // Patterns: £500k, £1.2m, £1.2 million, 500000, 1.2m revenue, turnover of £500k, etc.
    const revenuePatterns = [
      /(?:revenue|turnover|sales)\s*(?:of|is|:)?\s*£?([\d,.]+)\s*([kmb]|thousand|million|billion)?/i,
      /£([\d,.]+)\s*([kmb]|thousand|million|billion)?\s*(?:revenue|turnover|sales)/i,
      /£([\d,.]+)\s*([kmb]|thousand|million|billion)/i,
      /([\d,.]+)\s*([kmb]|thousand|million|billion)\s*(?:revenue|turnover|sales)/i,
      /(?:generates|making|earns?)\s*£?([\d,.]+)\s*([kmb]|thousand|million|billion)?/i
    ];
    
    for (const pattern of revenuePatterns) {
      const match = normalizedQuery.match(pattern);
      if (match && !extractedData.revenue) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        const unit = (match[2] || '').toUpperCase();
        
        if (unit === 'K' || unit === 'THOUSAND') {
          extractedData.revenue = amount * 1000;
        } else if (unit === 'M' || unit === 'MILLION') {
          extractedData.revenue = amount * 1000000;
        } else if (unit === 'B' || unit === 'BILLION') {
          extractedData.revenue = amount * 1000000000;
        } else if (amount > 1000) {
          // Assume it's already in pounds if it's a large number without unit
          extractedData.revenue = amount;
        }
        break;
      }
    }
    
    // Enhanced EBITDA extraction - handles amounts, percentages, and margins
    const ebitdaPatterns = [
      /ebitda\s*(?:of|is|:)?\s*£?([\d,.]+)\s*([kmb]|thousand|million|billion)?/i,
      /£([\d,.]+)\s*([kmb]|thousand|million|billion)?\s*ebitda/i,
      /ebitda\s*(?:margin|of)?\s*([\d.]+)\s*%/i,
      /([\d.]+)\s*%\s*ebitda/i,
      /profit\s*(?:of|is)?\s*£?([\d,.]+)\s*([kmb]|thousand|million|billion)?/i,
      /net\s*income\s*(?:of|is)?\s*£?([\d,.]+)\s*([kmb]|thousand|million|billion)?/i
    ];
    
    for (const pattern of ebitdaPatterns) {
      const match = normalizedQuery.match(pattern);
      if (match && !extractedData.ebitda) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        const unit = (match[2] || '').toUpperCase();
        
        // Handle percentage-based EBITDA
        if (pattern.source.includes('%') && extractedData.revenue) {
          extractedData.ebitda = extractedData.revenue * (amount / 100);
        } else {
          // Handle absolute amounts
          if (unit === 'K' || unit === 'THOUSAND') {
            extractedData.ebitda = amount * 1000;
          } else if (unit === 'M' || unit === 'MILLION') {
            extractedData.ebitda = amount * 1000000;
          } else if (unit === 'B' || unit === 'BILLION') {
            extractedData.ebitda = amount * 1000000000;
          } else if (amount > 1000) {
            extractedData.ebitda = amount;
          }
        }
        break;
      }
    }
    
    // Enhanced industry detection with more comprehensive mapping
    const industryMappings = {
      // E-commerce variations
      'ecommerce': ['ecommerce', 'e-commerce', 'online retail', 'online store', 'online shop', 'dropship', 'shopify', 'amazon fba'],
      // SaaS variations  
      'saas': ['saas', 'software as a service', 'software', 'app', 'platform', 'subscription software', 'cloud software'],
      // Services variations
      'services': ['services', 'consulting', 'agency', 'marketing', 'digital agency', 'professional services', 'accountancy', 'law firm'],
      // Manufacturing variations
      'manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'engineering', 'automotive', 'aerospace'],
      // Retail variations
      'retail': ['retail', 'shop', 'store', 'boutique', 'fashion', 'clothing', 'beauty', 'convenience store'],
      // Food & Beverage variations
      'food': ['food', 'restaurant', 'cafe', 'catering', 'bakery', 'pub', 'bar', 'takeaway', 'food service'],
      // Healthcare variations
      'health': ['healthcare', 'medical', 'dental', 'pharmacy', 'clinic', 'wellness', 'fitness', 'care home'],
      // Technology variations
      'tech': ['technology', 'tech', 'it services', 'cybersecurity', 'fintech', 'edtech', 'artificial intelligence', 'ai'],
      // Additional industries
      'construction': ['construction', 'building', 'property development', 'trades', 'plumbing', 'electrical'],
      'logistics': ['logistics', 'transport', 'delivery', 'shipping', 'courier', 'freight'],
      'education': ['education', 'training', 'school', 'university', 'tutoring', 'learning'],
      'finance': ['finance', 'financial services', 'insurance', 'investment', 'banking', 'mortgage']
    };
    
    for (const [industry, keywords] of Object.entries(industryMappings)) {
      for (const keyword of keywords) {
        if (normalizedQuery.includes(keyword)) {
          extractedData.industry = industry;
          break;
        }
      }
      if (extractedData.industry) break;
    }
    
    // Enhanced growth rate extraction
    const growthPatterns = [
      /([\d.]+)\s*%\s*(?:growth|growing|increase)/i,
      /(?:growth|growing|increase)[\s\w]*?([\d.]+)\s*%/i,
      /(?:growing|increased|grown)\s*(?:by)?\s*([\d.]+)\s*%/i,
      /([\d.]+)\s*%\s*(?:year on year|yoy|annually)/i
    ];
    
    for (const pattern of growthPatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        extractedData.growthRate = parseFloat(match[1]) / 100;
        break;
      }
    }
    
    // Extract asking price or valuation if mentioned
    const valuationPatterns = [
      /(?:valued|worth|asking|price)\s*(?:at|of|is)?\s*£?([\d,.]+)\s*([kmb]|thousand|million|billion)?/i,
      /£([\d,.]+)\s*([kmb]|thousand|million|billion)?\s*(?:valuation|asking|price)/i
    ];
    
    for (const pattern of valuationPatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        const unit = (match[2] || '').toUpperCase();
        
        let askingPrice = amount;
        if (unit === 'K' || unit === 'THOUSAND') {
          askingPrice = amount * 1000;
        } else if (unit === 'M' || unit === 'MILLION') {
          askingPrice = amount * 1000000;
        } else if (unit === 'B' || unit === 'BILLION') {
          askingPrice = amount * 1000000000;
        }
        
        extractedData.askingPrice = askingPrice;
        break;
      }
    }
    
    // Extract business age
    const agePatterns = [
      /([\d]+)\s*(?:years?|yrs?)\s*(?:old|established)/i,
      /(?:established|founded|running)\s*(?:for)?\s*([\d]+)\s*(?:years?|yrs?)/i,
      /(?:established|founded)\s*(?:in)?\s*(19|20)\d{2}/i
    ];
    
    for (const pattern of agePatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        if (match[1].startsWith('19') || match[1].startsWith('20')) {
          // Founded year
          extractedData.businessAge = new Date().getFullYear() - parseInt(match[1]);
        } else {
          // Years old
          extractedData.businessAge = parseInt(match[1]);
        }
        break;
      }
    }
    
    // Extract location information
    const ukRegions = [
      'london', 'manchester', 'birmingham', 'liverpool', 'bristol', 'leeds', 'sheffield', 'cardiff',
      'edinburgh', 'glasgow', 'newcastle', 'nottingham', 'southampton', 'brighton', 'oxford',
      'cambridge', 'york', 'bath', 'exeter', 'canterbury', 'scotland', 'wales', 'northern ireland',
      'england', 'north west', 'north east', 'yorkshire', 'midlands', 'south west', 'south east'
    ];
    
    for (const region of ukRegions) {
      if (normalizedQuery.includes(region)) {
        extractedData.location = region;
        break;
      }
    }
  }
  
  return extractedData;
}

/**
 * Calculate business valuation using multiple methods with database-driven industry multiples
 * 
 * @param {object} businessData - Business data for valuation
 * @returns {Promise<object>} - Valuation results
 */
async function calculateBusinessValuation(businessData) {
  const { revenue, ebitda, industry = 'default', growthRate = 0 } = businessData;
  
  // Get industry multiples from database
  const multiples = await getIndustryMultipliers(industry);
  
  // Adjust multiple based on growth rate
  const growthAdjustment = growthRate > 0.2 ? 1.5 : 
                          growthRate > 0.1 ? 1.2 : 
                          growthRate > 0.05 ? 1.1 : 1.0;
  
  let multipleUsed = multiples.base * growthAdjustment;
  if (growthRate > 0.3) {
    multipleUsed = multiples.premium;
  }
  
  // Calculate valuation from EBITDA if available
  if (ebitda) {
    const average = ebitda * multipleUsed;
    const low = ebitda * multiples.range[0];
    const high = ebitda * multiples.range[1] * growthAdjustment;
    
    return {
      average,
      low,
      high,
      multipleUsed,
      multipleRange: multiples.range,
      method: 'ebitda'
    };
  } 
  // If no EBITDA but we have revenue, estimate EBITDA based on industry averages
  else if (revenue) {
    // Typical EBITDA margins by industry
    const margins = {
      'ecommerce': 0.15,
      'saas': 0.25,
      'services': 0.20,
      'manufacturing': 0.18,
      'retail': 0.08,
      'food': 0.12,
      'health': 0.22,
      'tech': 0.20,
      'default': 0.15
    };
    
    const margin = margins[industry.toLowerCase()] || margins.default;
    const estimatedEbitda = revenue * margin;
    
    const average = estimatedEbitda * multipleUsed;
    const low = estimatedEbitda * multiples.range[0];
    const high = estimatedEbitda * multiples.range[1] * growthAdjustment;
    
    return {
      average,
      low,
      high,
      multipleUsed,
      multipleRange: multiples.range,
      method: 'revenue-based-estimate',
      estimatedEbitda
    };
  }
  
  // Not enough data for valuation
  return {
    average: 0,
    low: 0,
    high: 0,
    multipleUsed: multipleUsed,
    multipleRange: multiples.range,
    method: 'insufficient-data'
  };
}

/**
 * Find comparable businesses from the database based on industry and revenue
 * 
 * @param {string} industry - Business industry
 * @param {number} revenue - Annual revenue
 * @returns {Promise<Array<object>>} - List of comparable businesses from database
 */
async function findComparableBusinesses(industry = '', revenue = 0) {
  try {
    let query = `
      SELECT 
        business_name as title,
        gross_revenue as revenue,
        ebitda,
        price as askingPrice,
        industry,
        description,
        location,
        CASE 
          WHEN ebitda > 0 THEN ROUND((price / ebitda)::numeric, 2)
          WHEN gross_revenue > 0 THEN ROUND((price / gross_revenue)::numeric, 2)
          ELSE 0
        END as multiple
      FROM businesses 
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Filter by industry if provided
    if (industry && industry.toLowerCase() !== 'default') {
      paramCount++;
      query += ` AND LOWER(industry) LIKE $${paramCount}`;
      params.push(`%${industry.toLowerCase()}%`);
    }
    
    // Filter by revenue range if provided (±50% range)
    if (revenue > 0) {
      const lowerBound = revenue * 0.5;
      const upperBound = revenue * 2.0;
      
      paramCount++;
      query += ` AND gross_revenue >= $${paramCount}`;
      params.push(lowerBound);
      
      paramCount++;
      query += ` AND gross_revenue <= $${paramCount}`;
      params.push(upperBound);
    }
    
    // Filter out businesses with invalid data
    query += ` AND gross_revenue > 0 AND price > 0`;
    
    // Order by similarity to target revenue, then by recency
    if (revenue > 0) {
      query += ` ORDER BY ABS(gross_revenue - ${revenue}), date_listed DESC`;
    } else {
      query += ` ORDER BY date_listed DESC`;
    }
    
    query += ` LIMIT 5`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      // If no matches found, get recent businesses from any industry
      const fallbackQuery = `
        SELECT 
          business_name as title,
          gross_revenue as revenue,
          ebitda,
          price as askingPrice,
          industry,
          description,
          location,
          CASE 
            WHEN ebitda > 0 THEN ROUND((price / ebitda)::numeric, 2)
            WHEN gross_revenue > 0 THEN ROUND((price / gross_revenue)::numeric, 2)
            ELSE 0
          END as multiple
        FROM businesses 
        WHERE gross_revenue > 0 AND price > 0
        ORDER BY date_listed DESC
        LIMIT 3
      `;
      
      const fallbackResult = await pool.query(fallbackQuery);
      return fallbackResult.rows.map(formatBusinessForComparison);
    }
    
    return result.rows.map(formatBusinessForComparison);
    
  } catch (error) {
    console.error('Error fetching comparable businesses from database:', error);
    // Fallback to legacy mock data if database query fails
    return findMockComparableBusinesses(industry, revenue);
  }
}

/**
 * Format business data for comparison display
 * 
 * @param {object} business - Raw business data from database
 * @returns {object} - Formatted business data
 */
function formatBusinessForComparison(business) {
  return {
    title: business.title || 'Business Listing',
    revenue: parseFloat(business.revenue) || 0,
    ebitda: parseFloat(business.ebitda) || 0,
    askingPrice: parseFloat(business.askingprice) || 0,
    multiple: parseFloat(business.multiple) || 0,
    industry: business.industry || 'Other',
    description: business.description || 'No description available.',
    location: business.location || 'UK'
  };
}

/**
 * Legacy mock function as fallback - now returns empty array to avoid fake data
 * 
 * @param {string} industry - Business industry
 * @param {number} revenue - Annual revenue
 * @returns {Array<object>} - Empty array (no mock data)
 */
function findMockComparableBusinesses(industry = '', revenue = 0) {
  // Do not generate fake/mock comparable business data as it appears unprofessional
  // and can mislead clients. Only real market data should be used for comparables.
  console.log('Broker Agent: Mock comparables requested but returning empty array to maintain professionalism');
  return [];
}

/**
 * Generate deal structure advice based on business data
 * 
 * @param {object} businessData - Business data for deal structure advice
 * @returns {object} - Deal structure advice
 */
function generateDealStructureAdvice(businessData) {
  const { industry = 'default', revenue = 0, ebitda = 0 } = businessData;
  
  // Default structures
  const structures = [
    {
      name: "Standard Asset Sale",
      description: "Purchase of business assets without assuming liabilities",
      allocation: {
        "Tangible Assets": "30-40%",
        "Goodwill": "50-60%",
        "Non-compete": "5-10%"
      },
      benefits: [
        "Cleaner transaction with fewer inherited risks",
        "Potentially more favorable tax treatment for buyer"
      ],
      considerations: [
        "May require asset transfer documentation",
        "Could trigger sales tax on tangible assets"
      ]
    },
    {
      name: "Seller Financing",
      description: "Seller provides partial financing with downpayment and installments",
      terms: {
        "Typical Down Payment": "30-50%",
        "Financing Term": "3-5 years",
        "Interest Rate": "5-8%"
      },
      benefits: [
        "Lower initial capital requirement",
        "Demonstrates seller's confidence in business",
        "Smooth transition with seller's vested interest"
      ],
      considerations: [
        "Requires strong legal agreements",
        "Need clear performance conditions and defaults"
      ]
    },
    {
      name: "Earn-out Structure",
      description: "Portion of purchase price tied to future business performance",
      terms: {
        "Initial Payment": "60-70%",
        "Earn-out Period": "1-3 years",
        "Performance Metrics": "Revenue or EBITDA targets"
      },
      benefits: [
        "Bridges valuation gaps",
        "Reduces buyer's risk",
        "Incentivizes smooth transition"
      ],
      considerations: [
        "Define clear, measurable performance metrics",
        "Requires detailed legal agreements",
        "May need third-party verification of results"
      ]
    }
  ];
  
  // Recommended structures based on business size
  let recommended = [];
  if (revenue < 500000 || ebitda < 100000) {
    // Small business recommendations
    recommended = [structures[0], structures[1]];
  } else if (revenue < 2000000 || ebitda < 500000) {
    // Medium business recommendations
    recommended = [structures[1], structures[2]];
  } else {
    // Larger business recommendations
    recommended = structures;
  }
  
  // Industry-specific considerations
  const industryConsiderations = {
    'ecommerce': [
      "Consider inventory guarantees at closing",
      "Include transition of digital assets (domains, social media)",
      "Address customer data privacy concerns in agreements"
    ],
    'saas': [
      "Structure for customer contract assignments",
      "Consider escrow for source code",
      "Address recurring revenue verification method"
    ],
    'services': [
      "Strong non-compete and employee retention provisions",
      "Client transition plan with retention incentives",
      "Consider longer transition period with owner"
    ],
    'default': [
      "Document all assumptions used in valuation",
      "Consider tax implications for both parties",
      "Define clear transition plan and timeline"
    ]
  };
  
  const considerations = industryConsiderations[industry.toLowerCase()] || 
                        industryConsiderations.default;
    // Generate advice text
  const text = `RECOMMENDED DEAL STRUCTURES\n\n` +
    recommended.map(structure => 
      `${structure.name}\n` +
      `${structure.description}\n\n` +
      `Key Terms:\n` +
      (structure.terms ? 
        Object.entries(structure.terms).map(([term, value]) => `- ${term}: ${value}`).join('\n') :
        Object.entries(structure.allocation).map(([type, percent]) => `- ${type}: ${percent}`).join('\n')
      ) +
      `\n\nBenefits:\n` +
      structure.benefits.map(benefit => `- ${benefit}`).join('\n') +
      `\n\nConsiderations:\n` +
      structure.considerations.map(consideration => `- ${consideration}`).join('\n')
    ).join('\n\n') +
    `\n\nINDUSTRY-SPECIFIC CONSIDERATIONS\n\n` +
    considerations.map(item => `- ${item}`).join('\n');
  
  return {
    text,
    structures: recommended,
    considerations
  };
}

/**
 * Generate structured valuation response matching sample quality
 */
function generateStructuredValuationResponse(valuation, businessData, mcpAnalysis) {
  const { revenue, ebitda, industry, growthRate } = businessData;
  
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}K`;
    } else {
      return `£${value.toLocaleString()}`;
    }
  };

  return `## Business Broker Analysis & Market Assessment

### Transaction Structure & Pricing

| **Deal Size** | **Fee Structure** | **Market Position** | **Transaction Type** |
|---------------|------------------|-------------------|-------------------|
| ${formatCurrency(valuation.average)} | 5-10% of sale price | ${getMarketPosition(revenue)} | ${getRecommendedStructure(revenue)} |
| Range: ${formatCurrency(valuation.low)} - ${formatCurrency(valuation.high)} | Success fee basis | ${industry || 'General'} sector | ${revenue > 2000000 ? 'Auction process' : 'Direct negotiation'} |

### Current UK Market Conditions

| **Metric** | **Current State** | **Impact on Sale** | **Timing Considerations** |
|------------|------------------|------------------|-------------------------|
| Buyer Demand | ${getBuyerDemand(industry)} | ${getDemandImpact(industry)} | ${getTimingAdvice()} |
| Interest Rates | 5.25% BoE Base Rate | Higher cost of capital | Consider rate environment |
| Market Multiples | ${valuation.multipleRange[0].toFixed(1)}x - ${valuation.multipleRange[1].toFixed(1)}x EBITDA | ${getMultipleContext()} | Recent deals at lower end |
| Due Diligence | 8-12 weeks typical | Extended timelines | Prepare documentation early |

### Deal Process & Timeline

| **Phase** | **Duration** | **Key Activities** | **Success Factors** |
|-----------|--------------|-------------------|-------------------|
| Preparation | 4-8 weeks | Financial normalisation, legal review | Clean records, management team |
| Marketing | 6-10 weeks | Teaser, IM, data room | Professional presentation |
| Due Diligence | 8-12 weeks | Financial, commercial, legal review | Responsive management |
| Completion | 2-4 weeks | Final negotiations, completion | Clear deal terms |

### Fee Structure & Investment Required

| **Service** | **Fee Range** | **When Payable** | **Value Delivered** |
|-------------|---------------|------------------|-------------------|
| Business Broker | 5-10% of sale price | On completion | Market access, negotiation |
| Financial Adviser | £15K-25K | 50% upfront | Valuation, deal structure |
| Legal Adviser | £25K-50K | As incurred | Due diligence, SPA |
| Tax Adviser | £5K-15K | As incurred | Structure optimisation |

**Total Professional Costs:** 8-15% of transaction value

### Market Positioning Strategy

**Your Business Profile:**
- Industry: ${industry || 'General Business'}
- Revenue: ${revenue ? formatCurrency(revenue) : 'To be confirmed'}
- EBITDA: ${ebitda ? formatCurrency(ebitda) : 'To be confirmed'}
- Growth: ${growthRate ? growthRate + '%' : 'To be assessed'}

**Competitive Advantages:**
- Established market position
- Recurring revenue base
- Experienced management team
- Growth opportunities

### Next Steps & Recommendations

1. **Sale Preparation** (6-8 weeks)
   - Financial statements normalisation
   - Management presentation preparation
   - Data room organisation
   - Legal structure review

2. **Market Testing** (4-6 weeks)
   - Confidential teaser distribution
   - Strategic buyer identification
   - Financial buyer outreach
   - Indicative offer collection

3. **Transaction Execution** (12-16 weeks)
   - Due diligence management
   - Negotiation facilitation
   - Legal documentation
   - Completion support

**Total Process Timeline:** 22-30 weeks from engagement to completion
**Success Rate:** 70-80% for well-prepared businesses in current market`;
}

/**
 * Generate general business advice for non-valuation queries
 */
function generateGeneralBusinessAdvice(businessData, mcpAnalysis, query) {
  const { industry } = businessData;
  
  let response = `## Business Advisory Consultation

I'd be pleased to assist with your ${industry || 'business'} inquiry. Based on current UK market conditions, here are the key considerations:`;

  // Add specific advice based on query content
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('sell') || queryLower.includes('sale')) {
    response += `

### Sale Readiness Assessment

**Key Preparation Areas:**
- Financial statements normalisation (3-year trend)
- Management team documentation
- Customer concentration analysis
- Legal and compliance review

**Current Market Environment:**
- Transaction volumes down 15-20% year-on-year
- Higher interest rates affecting buyer financing
- Quality businesses still achieving good multiples
- Preparation more critical than ever`;
  }
  
  if (queryLower.includes('buy') || queryLower.includes('acquire')) {
    response += `

### Acquisition Opportunity Assessment

**Current Buyer Advantages:**
- Increased deal flow from motivated sellers
- Better negotiating position on price
- More thorough due diligence possible
- Financing still available for strong buyers

**Key Success Factors:**
- Clear acquisition criteria
- Adequate financial resources
- Experienced advisory team
- Patient approach to sourcing`;
  }

  // Add MCP insights if available
  if (mcpAnalysis && mcpAnalysis.recommendations && mcpAnalysis.recommendations.length > 0) {
    response += `\n\n**Market Intelligence:**\n${mcpAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}`;
  }

  response += `

**How I Can Assist Further:**
- Business valuation and pricing strategy
- Market positioning and competitive analysis
- Sale process management and buyer sourcing
- Deal negotiation and completion support

Would you like to discuss any of these areas in more detail?`;

  return response;
}

/**
 * Helper functions for market assessment
 */
function getMarketPosition(revenue) {
  if (!revenue) return 'SME Market';
  if (revenue < 1000000) return 'Micro/Small';
  if (revenue < 5000000) return 'SME Core';
  if (revenue < 25000000) return 'Mid-Market';
  return 'Large Corporate';
}

function getRecommendedStructure(revenue) {
  if (!revenue) return 'Asset/Share Sale';
  if (revenue < 2000000) return 'Share Sale';
  if (revenue < 10000000) return 'Auction Process';
  return 'Dual Track Process';
}

function getBuyerDemand(industry) {
  const demand = {
    'technology': 'High - Strategic interest',
    'healthcare': 'Strong - Defensive sector',
    'manufacturing': 'Moderate - Cyclical',
    'retail': 'Selective - Location dependent',
    'services': 'Good - Scalable models',
    'hospitality': 'Recovering - Post-pandemic',
    'default': 'Moderate - Market dependent'
  };
  return demand[industry] || demand['default'];
}

function getDemandImpact(industry) {
  const impact = {
    'technology': 'Multiple expansion possible',
    'healthcare': 'Premium valuations',
    'manufacturing': 'Market multiples',
    'retail': 'Below market multiples',
    'services': 'Depends on recurring revenue',
    'hospitality': 'Recovery discount diminishing',
    'default': 'Market dependent pricing'
  };
  return impact[industry] || impact['default'];
}

function getTimingAdvice() {
  return 'Q1-Q2 optimal for process launch';
}

function getMultipleContext() {
  return 'Rate environment compressing multiples';
}