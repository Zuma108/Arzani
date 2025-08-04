/**
 * Legal Agent Logic
 * 
 * Core business logic for the Legal Specialist Agent
 * - NDA generation
 * - Compliance lookup
 * - Regulatory guidance
 */

import { createTextPart, createDataPart, createMessage } from '../../libs/a2a/utils.js';
import { stripMarkdownFromMessage } from '../../utils/markdown-stripper.js';
import { MCPLegalAgent } from '../mcp/agent-integration.js';
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

// Initialize MCP-enhanced Legal Agent
const mcpLegalAgent = new MCPLegalAgent({
  serverUrl: process.env.MCP_SERVER_URL || 'ws://localhost:3001',
  autoConnect: true
});

// Initialize hybrid knowledge retrieval system
const knowledgeRetriever = hybridRetriever;

// OpenAI Configuration optimized for GPT-4.1 mini
const OPENAI_CONFIG = {
  model: 'gpt-4.1-mini',           // GPT-4.1 mini for advanced legal reasoning
  temperature: 0.2,                // Lower temperature for precise legal analysis
  maxTokens: 1000,                // Reduced for more concise legal analysis
  topP: 0.95,                     // Focused sampling for legal accuracy
  frequencyPenalty: 0.1,          // Reduce repetition in legal text
  presencePenalty: 0.1            // Encourage diverse legal analysis
};

// Enhanced response formatting using markdown utilities
function enhanceLegalResponse(responseText) {
  // Apply markdown formatting improvements
  const formattedResponse = formatAgentResponse(responseText, 'legal');
  
  // Add agent signature
  return addAgentSignature(formattedResponse, 'legal');
}

// Thinking panel state for legal agent
let currentLegalThinkingPanel = null;
let legalThinkingSteps = [];
let legalMCPSources = [];
let legalMemoryInsights = [];

/**
 * Create thinking panel for transparent legal decision-making
 */
function createLegalThinkingPanel() {
  const panelId = 'legal-thinking-' + Date.now();
  currentLegalThinkingPanel = {
    id: panelId,
    agentType: 'legal',
    thoughts: [],
    mcpSources: [],
    memoryInsights: [],
    isActive: true,
    startTime: new Date().toISOString(),
    confidence: 0,
    status: 'analyzing'
  };
  legalThinkingSteps = [];
  legalMCPSources = [];
  legalMemoryInsights = [];
  addLegalThinkingStep('Starting legal analysis...', 'thinking');
  return { panelId, agentType: 'legal', action: 'create' };
}

/**
 * Add thinking step to legal panel
 */
function addLegalThinkingStep(thought, stepType = 'thinking', isCompleted = false) {
  if (!currentLegalThinkingPanel) createLegalThinkingPanel();
  
  const step = {
    id: legalThinkingSteps.length + 1,
    text: thought,
    type: stepType, // 'thinking', 'searching', 'analyzing', 'concluding'
    isCompleted,
    timestamp: new Date().toISOString()
  };
  
  legalThinkingSteps.push(step);
  currentLegalThinkingPanel.thoughts = legalThinkingSteps;
  
  console.log(`🧠 [Legal Thinking] ${stepType.toUpperCase()}: ${thought}`);
}

/**
 * Add MCP source to legal panel
 */
function addLegalMCPSource(source, relevance = 0.8, sourceType = 'knowledge') {
  if (!currentLegalThinkingPanel) return;
  
  const mcpSource = {
    id: legalMCPSources.length + 1,
    title: source.title || source.name || 'Legal Source',
    url: source.url || source.source_url || '#',
    relevance,
    sourceType, // 'knowledge', 'search', 'document', 'regulation'
    content: source.content ? source.content.substring(0, 200) + '...' : '',
    metadata: source.metadata || {},
    timestamp: new Date().toISOString()
  };
  
  legalMCPSources.push(mcpSource);
  currentLegalThinkingPanel.mcpSources = legalMCPSources;
  
  console.log(`📚 [Legal MCP] Added source: ${mcpSource.title} (${(relevance * 100).toFixed(1)}%)`);
}

/**
 * Add memory insight to legal panel
 */
function addLegalMemoryInsight(insight, confidence = 0.8) {
  if (!currentLegalThinkingPanel) return;
  
  const memoryInsight = {
    id: legalMemoryInsights.length + 1,
    text: insight,
    confidence,
    timestamp: new Date().toISOString()
  };
  
  legalMemoryInsights.push(memoryInsight);
  currentLegalThinkingPanel.memoryInsights = legalMemoryInsights;
  
  console.log(`💭 [Legal Memory] ${insight} (${(confidence * 100).toFixed(1)}%)`);
}

/**
 * Update legal panel confidence and status
 */
function updateLegalPanelStatus(confidence, status) {
  if (!currentLegalThinkingPanel) return;
  
  currentLegalThinkingPanel.confidence = confidence;
  currentLegalThinkingPanel.status = status;
  
  console.log(`📊 [Legal Status] ${status} - Confidence: ${(confidence * 100).toFixed(1)}%`);
}

/**
 * Get current legal thinking panel state
 */
function getLegalThinkingPanelState() {
  return currentLegalThinkingPanel;
}

/**
 * Complete legal thinking panel
 */
function completeLegalThinkingPanel() {
  if (!currentLegalThinkingPanel) return;
  
  currentLegalThinkingPanel.isActive = false;
  currentLegalThinkingPanel.endTime = new Date().toISOString();
  addLegalThinkingStep('Legal analysis complete', 'concluding', true);
  
  console.log(`✅ [Legal Thinking] Panel completed with ${legalThinkingSteps.length} steps`);
}

/**
 * Generate thinking panel annotation for markdown
 */
function generateLegalThinkingAnnotation() {
  if (!currentLegalThinkingPanel || legalThinkingSteps.length === 0) return '';
  
  const panelData = {
    ...currentLegalThinkingPanel,
    thoughts: legalThinkingSteps,
    mcpSources: legalMCPSources,
    memoryInsights: legalMemoryInsights
  };
  
  return `<!-- THINKING_PANEL:${JSON.stringify(panelData)} -->`;
}

// ReAct prompting system for UK legal agent - enhanced with markdown formatting
const UK_LEGAL_REACT_SYSTEM_PROMPT = enhanceSystemPromptWithMarkdown(`You are a specialized UK Legal AI Agent focusing exclusively on UK business law and commercial transactions. You use structured reasoning (ReAct - Reasoning + Acting) to provide comprehensive legal analysis under UK law.

**CRITICAL**: You MUST format ALL your responses using proper **GitHub-flavoured Markdown** for every element:

### Headings
- Use **##** for main sections (e.g., ## Legal Analysis)
- Use **###** for subsections (e.g., ### Compliance Requirements)
- Use **####** for minor sections (e.g., #### Companies Act 2006)
- Always include a space after the # symbols

### Lists
- Use **-** for unordered lists (with a space after the dash)
- Use **1.** for numbered lists (with proper sequential numbering)
- Use proper indentation for nested lists (two spaces per level)
- Ensure consistent spacing between list items

### Tables
- Use well-structured markdown tables for all structured legal data
- Include clear column headers (Requirements, Status, Deadline, etc.)
- Use status indicators: ✅ Compliant, ❌ Non-compliant, ⚠️ Partial
- Mark critical items with 🚨 and urgent deadlines in **bold**
- Fill empty cells with "N/A" rather than leaving blank
- Use consistent formatting for all legal citations

### Code and Emphasis
- Use \`\`\`code blocks\`\`\` for legal clauses or document samples
- Use **bold text** for key legal terms, requirements and important dates
- Use *italic text* for definitions or citations
- Use > blockquotes for important warnings or legal disclaimers
- Use horizontal rules (---) to separate major sections

## TABLE FORMATTING REQUIREMENTS FOR LEGAL DATA
When creating tables for legal analysis, follow these specific guidelines:
- Use clear, descriptive headers like "Legal Requirement", "Compliance Status", "Deadline", "Risk Level"
- Use status indicators: ✅ for "Compliant/Complete/Yes", ❌ for "Non-compliant/Incomplete/No", ⚠️ for "Partial/In Progress/Pending"
- Mark critical items with 🚨 like "**🚨 Critical**" or "**🚨 Urgent**"
- Bold all important legal references like **Companies Act 2006** and **Article 9 GDPR**
- Bold all dates like **March 15, 2024** or **15/03/2024**
- Fill empty cells with "N/A" rather than leaving blank
- Use consistent formatting for legal citations and references

## YOUR CAPABILITIES:
- UK business law analysis and document generation
- UK regulatory compliance assessment (Companies House, FCA, ICO, etc.)
- Contract analysis under English law
- UK-specific legal research and guidance
- Complex UK legal reasoning with step-by-step analysis

## REASONING FRAMEWORK:
For each request, follow this ReAct pattern:

**THOUGHT:** Analyze the UK legal question and identify key considerations
**ACTION:** Determine what specific UK legal research or analysis is needed
**OBSERVATION:** Note relevant UK laws, regulations, or legal precedents
**REASONING:** Apply UK legal principles to the specific situation
**CONCLUSION:** Provide clear, actionable UK legal guidance

## FOCUS AREAS:
- UK business sale and acquisition requirements
- UK data protection law (UK GDPR, DPA 2018)
- UK employment law and TUPE regulations
- UK contract law and terms
- Companies House compliance
- UK tax implications for business transactions

## UK-SPECIFIC GUIDELINES:
- Always reference UK laws and regulations
- Consider English law as the default governing law
- Reference UK court jurisdiction
- Include Companies House registration requirements
- Consider UK data protection obligations
- Address UK employment law implications
- Highlight UK tax considerations

Be thorough, accurate, and always prioritize UK legal compliance and risk management.`, 'legal');

// UK-specific compliance categories and considerations
const UK_COMPLIANCE_CATEGORIES = {
  'business_sale': {
    name: 'UK Business Sale & Acquisition',
    commonIssues: ['Companies House notifications', 'PSC register updates', 'TUPE obligations', 'tax clearances'],
    riskLevel: 'high',
    keyRegulations: ['Companies Act 2006', 'TUPE Regulations 2006', 'Takeover Code']
  },
  'data_protection': {
    name: 'UK Data Protection',
    commonIssues: ['UK GDPR compliance', 'ICO notifications', 'data transfer agreements', 'privacy notices'],
    riskLevel: 'high',
    keyRegulations: ['UK GDPR', 'Data Protection Act 2018', 'PECR 2003']
  },
  'employment': {
    name: 'UK Employment Law',
    commonIssues: ['TUPE transfers', 'consultation requirements', 'pension auto-enrolment', 'union recognition'],
    riskLevel: 'medium',
    keyRegulations: ['Employment Rights Act 1996', 'TUPE Regulations 2006', 'Pensions Act 2008']
  },
  'intellectual_property': {
    name: 'UK Intellectual Property',
    commonIssues: ['trademark assignments', 'copyright transfers', 'patent assignments', 'design rights'],
    riskLevel: 'medium',
    keyRegulations: ['Copyright, Designs and Patents Act 1988', 'Trade Marks Act 1994']
  },
  'licensing': {
    name: 'UK Licensing & Permits',
    commonIssues: ['premises licences', 'alcohol licences', 'food hygiene certificates', 'trading licences'],
    riskLevel: 'high',
    keyRegulations: ['Licensing Act 2003', 'Food Safety Act 1990', 'Local Government Act 1982']
  },
  'financial_services': {
    name: 'UK Financial Services',
    commonIssues: ['FCA authorisation', 'consumer credit licences', 'payment services', 'insurance mediation'],
    riskLevel: 'high',
    keyRegulations: ['FSMA 2000', 'Consumer Credit Act 1974', 'Payment Services Regulations 2017']
  }
};

// UK industry-specific legal considerations
const UK_INDUSTRY_COMPLIANCE_FOCUS = {
  'food_service': {
    name: 'UK Food Service & Hospitality',
    keyRegulations: ['Food Safety Act 1990', 'Licensing Act 2003', 'Health and Safety at Work Act 1974'],
    specialConsiderations: ['Food hygiene ratings', 'Allergen regulations', 'Premises licence transfers', 'TUPE for staff']
  },
  'ecommerce': {
    name: 'UK E-commerce & Digital Business',
    keyRegulations: ['UK GDPR', 'Consumer Rights Act 2015', 'Electronic Commerce Regulations 2002'],
    specialConsiderations: ['Distance selling regulations', 'UK GDPR compliance', 'Consumer protection from unfair trading']
  },
  'software': {
    name: 'UK Software & Technology',
    keyRegulations: ['UK GDPR', 'Computer Misuse Act 1990', 'Copyright, Designs and Patents Act 1988'],
    specialConsiderations: ['Data processing agreements', 'Software licensing', 'Export control regulations']
  },
  'manufacturing': {
    name: 'UK Manufacturing & Production', 
    keyRegulations: ['Health and Safety at Work Act 1974', 'Environmental Protection Act 1990', 'Consumer Protection Act 1987'],
    specialConsiderations: ['UKCA marking', 'Environmental permits', 'Product liability insurance']
  },
  'retail': {
    name: 'UK Retail & Distribution',
    keyRegulations: ['Consumer Rights Act 2015', 'Sale of Goods Act 1979', 'Unfair Trading Regulations 2008'],
    specialConsiderations: ['Consumer protection', 'Supply chain compliance', 'Business rates transfers']
  },
  'professional_services': {
    name: 'UK Professional Services',
    keyRegulations: ['Solicitors Regulation Authority rules', 'Financial Conduct Authority rules', 'Professional bodies requirements'],
    specialConsiderations: ['Professional indemnity insurance', 'Client asset protection', 'Regulatory body notifications']
  }
};

// Dynamic document generation for UK legal documents
const UK_DOCUMENT_TYPES = {
  'nda': {
    name: 'UK Non-Disclosure Agreement',
    description: 'Confidentiality agreement for UK business discussions under English law',
    requiredFields: ['parties', 'purpose'],
    optionalFields: ['termLength', 'customClauses', 'dataProtection'],
    governingLaw: 'English law',
    jurisdiction: 'English and Welsh courts'
  },
  'contract': {
    name: 'UK Business Contract',  
    description: 'General UK business agreement under English law',
    requiredFields: ['parties', 'terms'],
    optionalFields: ['paymentTerms', 'deliverables', 'warranties'],
    governingLaw: 'English law',
    jurisdiction: 'English and Welsh courts'
  },
  'compliance': {
    name: 'UK Compliance Assessment',
    description: 'UK regulatory compliance analysis and guidance',
    requiredFields: ['businessType'],
    optionalFields: ['specificRegulations', 'industryFocus'],
    governingLaw: 'UK regulations',
    jurisdiction: 'UK regulatory authorities'
  },
  'business_sale': {
    name: 'UK Business Sale Agreement',
    description: 'Share or asset purchase agreement under UK law',
    requiredFields: ['buyer', 'seller', 'businessAssets'],
    optionalFields: ['warranties', 'indemnities', 'completionConditions'],
    governingLaw: 'English law',
    jurisdiction: 'English and Welsh courts'
  }
};

// UK-specific legal requirements and standards
const UK_LEGAL_REQUIREMENTS = {
  dataProtection: 'UK GDPR and Data Protection Act 2018',
  governingLaw: 'laws of England and Wales',
  courtJurisdiction: 'courts of England and Wales',
  companyRegistration: 'Companies House registration required',
  witnessRequirements: 'SIGNED by or on behalf of each party',
  standardClauses: {
    severability: 'If any provision of this Agreement is held to be invalid or unenforceable by any court of competent jurisdiction, such provision shall be deemed severed from this Agreement and the remainder shall continue in full force and effect.',
    entireAgreement: 'This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations or agreements relating to the subject matter.',
    variation: 'No variation of this Agreement shall be valid unless made in writing and signed by both parties.',
    counterparts: 'This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one instrument.'
  }
};

/**
 * Enhanced Legal RAG Query using Hybrid Knowledge Retrieval
 * @param {string} query - Legal query to search for
 * @param {number} userId - User ID for personalized context (optional)
 * @param {string} category - Legal category to focus search (optional)
 * @returns {Promise<Array>} - Relevant legal guidance from hybrid sources
 */
async function queryLegalRAG(query, userId = null, category = null) {
  try {
    console.log(`🔍 Enhanced Legal RAG Query: "${query}"`);
    
    // Use hybrid knowledge retrieval for comprehensive legal analysis
    const knowledgeResult = await knowledgeRetriever.retrieveKnowledge(
      query, 
      'legal',
      userId,
      {
        maxResults: 8,
        includeUserDocs: true,
        searchFallback: true
      }
    );
    
    console.log(`📚 Found ${knowledgeResult.results.length} relevant legal sources`);
    console.log(`📊 Knowledge breakdown: ${knowledgeResult.metadata.breakdown.userDocs} user docs, ${knowledgeResult.metadata.breakdown.staticKnowledge} knowledge base, ${knowledgeResult.metadata.breakdown.realTimeSearch} real-time`);
    
    // Transform results to maintain backward compatibility
    const ragResults = knowledgeResult.results.map(result => ({
      title: result.metadata.title || result.metadata.document_name || 'Legal Guidance',
      content: result.content,
      category: result.metadata.category || result.metadata.knowledge_domain || category,
      legal_area: result.metadata.legal_area || result.metadata.document_type,
      jurisdiction: result.metadata.jurisdiction || 'UK',
      source_url: result.metadata.source_url || result.metadata.url,
      relevance_score: result.score,
      is_user_document: result.source === 'user_document',
      document_type: result.metadata.document_type,
      confidence: knowledgeResult.metadata.confidence
    }));

    console.log(`✅ Found ${ragResults.length} relevant legal documents`);
    ragResults.forEach((result, i) => {
      const sourceIcon = result.is_user_document ? '📄' : '📚';
      console.log(`   ${sourceIcon} ${i + 1}. ${result.title} (${(result.relevance_score * 100).toFixed(1)}%)`);
    });
    
    return ragResults;
    
  } catch (error) {
    console.error('❌ Legal RAG query failed:', error.message);
    return [];
  }
}

/**
 * Enhanced AI-powered UK legal analysis with RAG integration
 * @param {string} query - The legal question or request
 * @param {object} context - Additional context (business details, etc.)
 * @param {string} analysisType - Type of analysis: 'general', 'compliance', 'nda', 'contract'
 * @returns {Promise<object>} - AI analysis with reasoning steps and UK-specific recommendations
 */
async function performUKLegalAnalysis(query, context = {}, analysisType = 'general') {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Legal analysis request: ${analysisType}`);
    
    // Create thinking panel for transparent legal reasoning
    createLegalThinkingPanel();
    addLegalThinkingStep(`Analyzing ${analysisType} legal query: "${query}"`, 'thinking');
    updateLegalPanelStatus(0.1, 'initializing');
    
    // Query RAG database for relevant legal information
    addLegalThinkingStep('Searching legal knowledge base and documents...', 'searching');
    const ragResults = await queryLegalRAG(query, context.userId, context.legalArea);
    
    // Add RAG sources to thinking panel
    ragResults.forEach(result => {
      addLegalMCPSource(result, result.relevance_score, result.is_user_document ? 'document' : 'knowledge');
    });
    
    addLegalThinkingStep(`Found ${ragResults.length} relevant legal sources`, 'searching', true);
    updateLegalPanelStatus(0.4, 'analyzing');
    
    // Add memory insights based on context
    if (context.businessType) {
      addLegalMemoryInsight(`Business type: ${context.businessType} - specific legal requirements apply`, 0.9);
    }
    if (context.legalArea) {
      addLegalMemoryInsight(`Legal area focus: ${context.legalArea}`, 0.8);
    }
    
    // Construct UK-focused ReAct prompt with RAG context
    addLegalThinkingStep('Constructing legal analysis framework...', 'analyzing');
    const reactPrompt = constructUKReActPromptWithRAG(query, context, analysisType, ragResults);
    
    // Call GPT-4.1 mini for UK legal analysis
    addLegalThinkingStep('Performing AI-powered legal analysis...', 'analyzing');
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        { role: 'system', content: UK_LEGAL_REACT_SYSTEM_PROMPT },
        { role: 'user', content: reactPrompt }
      ],
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: OPENAI_CONFIG.maxTokens,
      top_p: OPENAI_CONFIG.topP,
      frequency_penalty: OPENAI_CONFIG.frequencyPenalty,
      presence_penalty: OPENAI_CONFIG.presencePenalty
    });

    const aiAnalysis = response.choices[0].message.content;
    const responseTime = Date.now() - startTime;
    
    addLegalThinkingStep('Processing and structuring legal analysis...', 'analyzing');
    updateLegalPanelStatus(0.8, 'finalizing');
    
    // Log metrics
    logLegalAIMetrics(query, responseTime, response.usage, true);
    
    // Parse the ReAct response into structured format
    const structuredAnalysis = parseReActResponse(aiAnalysis);
    
    // Complete thinking panel
    addLegalThinkingStep('Legal analysis complete - generating final response', 'concluding', true);
    updateLegalPanelStatus(1.0, 'complete');
    completeLegalThinkingPanel();
    
    return {
      success: true,
      analysis: structuredAnalysis,
      ragSources: ragResults,
      rawResponse: aiAnalysis,
      thinkingPanel: getLegalThinkingPanelState(),
      metadata: {
        model: OPENAI_CONFIG.model,
        tokensUsed: response.usage.total_tokens,
        responseTime,
        analysisType,
        jurisdiction: 'UK',
        ragSourcesUsed: ragResults.length,
        thinkingSteps: legalThinkingSteps.length,
        mcpSources: legalMCPSources.length
      }
    };
    
  } catch (error) {
    console.error('Error in UK legal analysis:', error);
    logLegalAIMetrics(query, Date.now() - startTime, null, false);
    
    // Try to get RAG data for fallback
    const ragResults = await queryLegalRAG(query, context.legalArea).catch(() => []);
    
    return {
      success: false,
      error: error.message,
      fallbackAnalysis: await getUKFallbackLegalAnalysis(query, context, analysisType)
    };
  }
}

/**
 * Construct UK-focused ReAct prompt with RAG data for legal analysis
 * @param {string} query - The legal question
 * @param {object} context - Additional context
 * @param {string} analysisType - Type of analysis
 * @param {Array} ragResults - RAG search results
 * @returns {string} - Formatted UK ReAct prompt with RAG data
 */
function constructUKReActPromptWithRAG(query, context, analysisType, ragResults = []) {
  let prompt = constructUKReActPrompt(query, context, analysisType);
  
  // Add RAG data if available
  if (ragResults && ragResults.length > 0) {
    prompt += `\n\nRELEVANT UK LEGAL GUIDANCE FROM OFFICIAL SOURCES:\n`;
    
    ragResults.forEach((result, index) => {
      prompt += `\n--- SOURCE ${index + 1}: ${result.title} ---\n`;
      prompt += `Legal Area: ${result.legal_area}\n`;
      prompt += `Category: ${result.category}\n`;
      prompt += `Jurisdiction: ${result.jurisdiction}\n`;
      prompt += `Step/Section: ${result.step}\n`;
      prompt += `Relevance: ${(result.relevance_score * 100).toFixed(1)}%\n`;
      prompt += `Official Source: ${result.source_url}\n\n`;
      
      // Include key content (truncated if too long)
      const content = result.content.length > 500 
        ? result.content.substring(0, 500) + '...' 
        : result.content;
      prompt += `Content: ${content}\n`;
    });
    
    prompt += `\nPlease incorporate this official UK legal guidance into your analysis where relevant. Always cite the specific sources when referencing this information.`;
  }
  
  return prompt;
}

/**
 * Construct UK-focused ReAct prompt for legal analysis
 * @param {string} query - The legal question
 * @param {object} context - Additional context
 * @param {string} analysisType - Type of analysis
 * @returns {string} - Formatted UK ReAct prompt
 */
function constructUKReActPrompt(query, context, analysisType) {
  let prompt = `I need comprehensive UK legal analysis for the following request:

QUERY: ${query}

CONTEXT:`;

  if (context.businessType) {
    prompt += `\n- Business Type: ${context.businessType}`;
  }
  if (context.transactionType) {
    prompt += `\n- Transaction Type: ${context.transactionType}`;
  }
  if (context.businessValue) {
    prompt += `\n- Business Value: ${context.businessValue}`;
  }
  if (context.timeline) {
    prompt += `\n- Timeline: ${context.timeline}`;
  }
  if (context.industry) {
    prompt += `\n- Industry: ${context.industry}`;
  }

  prompt += `

ANALYSIS TYPE: ${analysisType.toUpperCase()}
JURISDICTION: United Kingdom (English Law)

Please provide comprehensive UK legal analysis using the ReAct framework:

1. **THOUGHT:** What are the key UK legal considerations for this request?
2. **ACTION:** What specific UK legal research or analysis do I need to perform?
3. **OBSERVATION:** What relevant UK laws, regulations, or legal principles apply?
4. **REASONING:** How do these UK legal principles apply to the specific situation?
5. **CONCLUSION:** What are the clear, actionable UK legal recommendations?

Focus on:
- UK-specific laws and regulations
- English law principles
- UK regulatory requirements (Companies House, FCA, ICO, etc.)
- UK business transaction requirements
- UK employment law (TUPE) implications
- UK data protection obligations (UK GDPR)

Provide practical, actionable UK legal guidance while highlighting compliance requirements and risks.`;

  return prompt;
}

/**
 * Parse ReAct response into structured format
 * @param {string} response - Raw AI response
 * @returns {object} - Structured analysis
 */
function parseReActResponse(response) {
  const sections = {
    thought: '',
    action: '',
    observation: '',
    reasoning: '',
    conclusion: '',
    recommendations: [],
    risks: [],
    nextSteps: []
  };

  // Extract sections using regex patterns
  const thoughtMatch = response.match(/\*\*THOUGHT:\*\*(.*?)(?=\*\*ACTION:|\*\*OBSERVATION:|$)/s);
  const actionMatch = response.match(/\*\*ACTION:\*\*(.*?)(?=\*\*OBSERVATION:|\*\*REASONING:|$)/s);
  const observationMatch = response.match(/\*\*OBSERVATION:\*\*(.*?)(?=\*\*REASONING:|\*\*CONCLUSION:|$)/s);
  const reasoningMatch = response.match(/\*\*REASONING:\*\*(.*?)(?=\*\*CONCLUSION:|$)/s);
  const conclusionMatch = response.match(/\*\*CONCLUSION:\*\*(.*?)$/s);

  if (thoughtMatch) sections.thought = thoughtMatch[1].trim();
  if (actionMatch) sections.action = actionMatch[1].trim();
  if (observationMatch) sections.observation = observationMatch[1].trim();
  if (reasoningMatch) sections.reasoning = reasoningMatch[1].trim();
  if (conclusionMatch) sections.conclusion = conclusionMatch[1].trim();

  // Extract recommendations and risks if present
  const recMatch = response.match(/(?:RECOMMENDATIONS?|SUGGESTED ACTIONS?)[\s\S]*?([•\-\*]\s.*?)(?=\n\n|\*\*|$)/gi);
  if (recMatch) {
    sections.recommendations = recMatch.map(r => r.trim()).filter(r => r.length > 0);
  }

  const riskMatch = response.match(/(?:RISKS?|POTENTIAL ISSUES?)[\s\S]*?([•\-\*]\s.*?)(?=\n\n|\*\*|$)/gi);
  if (riskMatch) {
    sections.risks = riskMatch.map(r => r.trim()).filter(r => r.length > 0);
  }

  return {
    ...sections,
    fullResponse: response,
    structuredSections: true
  };
}

/**
 * Get fallback UK legal analysis when AI fails
 * @param {string} query - The legal question
 * @param {object} context - Additional context
 * @param {string} analysisType - Type of analysis
 * @returns {object} - Fallback UK analysis
 */
async function getUKFallbackLegalAnalysis(query, context, analysisType) {
  return {
    thought: "AI analysis temporarily unavailable, providing UK rule-based guidance.",
    action: "Applying standard UK legal analysis framework for business transactions.",
    observation: "Standard UK legal considerations include Companies Act compliance, UK employment law (TUPE), UK data protection (UK GDPR), and English contract law.",
    reasoning: "UK business transactions require comprehensive legal review under English law to ensure compliance with UK regulations and minimize risks.",
    conclusion: "Recommend engaging a UK qualified solicitor for detailed analysis and document preparation under English law.",
    recommendations: [
      "Consult with a UK qualified solicitor or barrister",
      "Review Companies Act 2006 requirements for business transfers",
      "Consider TUPE obligations for employee transfers",
      "Ensure UK GDPR compliance for data transfers",
      "Check industry-specific UK licensing requirements",
      "Prepare documentation under English law"
    ],
    risks: [
      "Non-compliance with UK regulations",
      "Companies House filing obligations",
      "TUPE consultation requirements",
      "UK data protection breaches",
      "Missing UK regulatory approvals"
    ],
    fallback: true,
    jurisdiction: 'UK'
  };
}

/**
 * Log AI legal analysis metrics
 * @param {string} query - User query
 * @param {number} responseTime - Response time in ms
 * @param {object} usage - Token usage object
 * @param {boolean} success - Whether request succeeded
 */
function logLegalAIMetrics(query, responseTime, usage, success) {
  const logData = {
    timestamp: new Date().toISOString(),
    agent: 'legal-agent',
    model: OPENAI_CONFIG.model,
    queryLength: query.length,
    responseTime,
    tokensUsed: usage?.total_tokens || 0,
    success,
    temperature: OPENAI_CONFIG.temperature
  };
  
  console.log('[LEGAL_AI_METRICS]', JSON.stringify(logData));
}

/**
 * Process a legal agent task based on the request message
 * 
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @returns {Promise<object>} - Response with task and message
 */
export async function processLegalTask(task, message) {
  // Extract text from message parts
  const textParts = message.parts.filter(part => part.type === 'text');
  const dataParts = message.parts.filter(part => part.type === 'data');
  
  if (textParts.length === 0) {
    throw new Error('Invalid request: No text parts found in message');
  }
  
  const query = textParts[0].text;
  const queryLower = query.toLowerCase();
  
  // Extract context from data parts
  const context = dataParts.length > 0 ? dataParts[0].data : {};
  
  // Determine the type of legal request and get AI analysis
  let analysisType = 'general';
  let result;
  
  if (queryLower.includes('nda') || queryLower.includes('non-disclosure') || queryLower.includes('confidentiality')) {
    analysisType = 'nda';
    result = await handleAIEnhancedNdaRequest(task, message, query, context);
  } else if (queryLower.includes('compliance') || queryLower.includes('regulation') || queryLower.includes('legal requirement')) {
    analysisType = 'compliance';
    result = await handleAIEnhancedComplianceRequest(task, message, query, context);
  } else if (queryLower.includes('contract') || queryLower.includes('agreement') || queryLower.includes('terms')) {
    analysisType = 'contract';
    result = await handleAIEnhancedContractRequest(task, message, query, context);
  } else {
    analysisType = 'general';
    result = await handleAIEnhancedGeneralRequest(task, message, query, context);
  }
  
  return result;
}

/**
 * Handle NDA request with AI-enhanced analysis
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} context - Additional context data
 * @returns {object} - Response with task and message
 */
async function handleAIEnhancedNdaRequest(task, message, query, context = {}) {
  // MCP-Enhanced Document Generation: Use RAG capabilities if available
  let mcpEnhancedDocuments = null;
  try {
    if (mcpLegalAgent && mcpLegalAgent.initialized) {
      console.log('Legal Agent: Using MCP-enhanced document generation');
      mcpEnhancedDocuments = await mcpLegalAgent.generateEnhancedLegalDocuments({
        type: 'nda',
        businessType: context.industry || 'general',
        jurisdiction: context.jurisdiction || 'uk',
        transactionType: 'business_sale',
        customClauses: context.customClauses
      });
    }
  } catch (mcpError) {
    console.error('Legal Agent MCP Enhancement Error:', mcpError);
    // Continue with standard analysis if MCP fails
  }
  // Get AI analysis for NDA requirements
  const aiAnalysis = await performUKLegalAnalysis(query, {
    ...context,
    transactionType: 'business_sale'
  }, 'nda');
    // Extract parameters for NDA generation
  const ndaParams = extractNdaParameters(query, context);
  
  // Generate dynamic UK NDA document based on AI analysis
  const ndaDocument = await generateDynamicUKNdaDocument(ndaParams, aiAnalysis);
  
  // Prepare response task
  const responseTask = {
    ...task,
    state: 'completed'
  };
    // Create professional, context-aware response instead of generic template
  let responseText = '';
  
  // Only provide comprehensive legal template if user is specifically requesting NDA generation
  const queryLower = query.toLowerCase();
  const isNdaRequest = queryLower.includes('nda') || queryLower.includes('non-disclosure') || 
                       queryLower.includes('confidentiality') || queryLower.includes('agreement');
  
  if (isNdaRequest) {
    responseText = `I've prepared a UK Non-Disclosure Agreement based on your requirements.`;
    
    if (mcpEnhancedDocuments && mcpEnhancedDocuments.recommendations.length > 0) {
      responseText += `\n\n**Key Recommendations:**\n${mcpEnhancedDocuments.recommendations.join('\n- ')}\n`;
    } else if (aiAnalysis.success && aiAnalysis.analysis.recommendations.length > 0) {
      responseText += `\n\n**Key Legal Considerations:**\n${aiAnalysis.analysis.recommendations.slice(0, 3).join('\n- ')}\n`;
    }
    
    responseText += `\n\nThe document below is drafted under English law and suitable for UK business discussions.\n\n`;
  } else {
    // For non-NDA queries, provide contextual legal guidance
    responseText = `I can help with UK legal matters for your business transaction.`;
    
    if (aiAnalysis.success && aiAnalysis.analysis.conclusion) {
      responseText += `\n\n${aiAnalysis.analysis.conclusion}\n`;
    }
    
    responseText += `\n\nWould you like me to prepare:\n- A UK Non-Disclosure Agreement\n- UK compliance analysis\n- Contract review guidance\n- Other legal documentation\n`;
  }
  
  const responseMessage = createMessage([
    createTextPart(generateLegalThinkingAnnotation()),
    createTextPart(responseText),
    createTextPart(ndaDocument),
    createDataPart({
      documentType: 'uk_nda',
      title: 'UK Non-Disclosure Agreement',
      jurisdiction: 'UK',
      governingLaw: 'English law',
      customizations: ndaParams,
      aiAnalysis: aiAnalysis.success ? aiAnalysis.analysis : null,
      aiRecommendations: aiAnalysis.success ? aiAnalysis.analysis.recommendations : [],
      mcpEnhancedDocuments: mcpEnhancedDocuments || null,
      analysisSource: mcpEnhancedDocuments ? 'MCP-Enhanced' : 'UK-Focused',
      thinkingPanel: getLegalThinkingPanelState()
    }, 'uk_nda_metadata')
  ]);
  
  return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
}

/**
 * Handle compliance request with AI-enhanced analysis
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} context - Additional context data
 * @returns {object} - Response with task and message
 */
async function handleAIEnhancedComplianceRequest(task, message, query, context = {}) {  // Get AI analysis for compliance requirements
  const aiAnalysis = await performUKLegalAnalysis(query, context, 'compliance');
    // Extract compliance lookup parameters
  const complianceParams = extractUKComplianceParameters(query, context);
  
  // Get UK compliance information dynamically
  const complianceInfo = getUKComplianceInfo(complianceParams);
  
  // Prepare response task
  const responseTask = {
    ...task,
    state: 'completed'
  };
    // Create professional, context-aware response
  let responseText = '';
  
  // Check if user is asking for specific compliance information
  const queryLower = query.toLowerCase();
  const isComplianceQuery = queryLower.includes('compliance') || queryLower.includes('regulation') || 
                            queryLower.includes('requirement') || queryLower.includes('legal');
  
  if (isComplianceQuery && complianceInfo.length > 0) {
    responseText = `Here's the UK regulatory compliance information for your business:\n\n`;
    
    if (aiAnalysis.success && aiAnalysis.analysis.conclusion) {
      responseText += `**Key Insight:** ${aiAnalysis.analysis.conclusion}\n\n`;
    }
    
    responseText += formatUKComplianceInfo(complianceInfo);
  } else {
    responseText = `I can help you understand UK regulatory requirements for your business.`;
    
    if (aiAnalysis.success && aiAnalysis.analysis.thought) {
      responseText += `\n\n${aiAnalysis.analysis.thought}`;
    }
    
    responseText += `\n\nWhat specific compliance area would you like information about?\n`;
    responseText += `- Data protection (UK GDPR)\n`;
    responseText += `- Employment law (TUPE)\n`;
    responseText += `- Industry-specific licensing\n`;
    responseText += `- Companies House requirements\n`;
  }
  
  const responseMessage = createMessage([
    createTextPart(generateLegalThinkingAnnotation()),
    createTextPart(responseText),
    createDataPart({
      compliance: complianceInfo,
      businessType: complianceParams.businessType,
      queryParameters: complianceParams,
      aiAnalysis: aiAnalysis.success ? aiAnalysis.analysis : null,
      enhancedInsights: aiAnalysis.success,
      jurisdiction: 'UK',
      thinkingPanel: getLegalThinkingPanelState()
    }, 'uk_compliance_data')
  ]);
  
  return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
}

/**
 * Handle contract analysis request with AI enhancement
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} context - Additional context data
 * @returns {object} - Response with task and message
 */
async function handleAIEnhancedContractRequest(task, message, query, context = {}) {
  // Get AI analysis for contract requirements
  const aiAnalysis = await performUKLegalAnalysis(query, context, 'contract');
  
  // Prepare response task
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  let responseText = '';
  
  // Check if user is asking for specific contract analysis
  const queryLower = query.toLowerCase();
  const isContractQuery = queryLower.includes('contract') || queryLower.includes('agreement') || 
                          queryLower.includes('terms') || queryLower.includes('review');
  
  // Check for business sale/acquisition contract queries
  const isBusinessContractQuery = (queryLower.includes('sale') || queryLower.includes('purchase') || 
                                  queryLower.includes('acquisition')) && isContractQuery;
  
  if (isBusinessContractQuery) {
    responseText = generateStructuredContractAdvice(query, context, aiAnalysis);
  } else if (isContractQuery && aiAnalysis.success) {
    responseText = `Here's my analysis of your contract requirements:\n\n`;
    
    if (aiAnalysis.analysis.conclusion) {
      responseText += `${aiAnalysis.analysis.conclusion}\n\n`;
    }
    
    if (aiAnalysis.analysis.risks.length > 0) {
      responseText += `**Key Considerations:**\n${aiAnalysis.analysis.risks.slice(0, 3).join('\n- ')}\n\n`;
    }
  } else if (isContractQuery) {
    responseText = `I can help you with contract analysis for business transactions. For detailed contract review, I recommend:\n\n`;
    responseText += `- Engaging qualified legal counsel\n`;
    responseText += `- Reviewing all terms and conditions thoroughly\n`;
    responseText += `- Ensuring compliance with applicable laws\n`;
    responseText += `- Conducting proper due diligence\n\n`;
  } else {
    responseText = `I can assist with UK contract analysis and legal documentation.`;
    
    if (aiAnalysis.success && aiAnalysis.analysis.thought) {
      responseText += `\n\n${aiAnalysis.analysis.thought}`;
    }
    
    responseText += `\n\nWhat specific contract assistance do you need?`;
  }
  
  const responseMessage = createMessage([
    createTextPart(generateLegalThinkingAnnotation()),
    createTextPart(responseText),
    createDataPart({
      analysisType: 'contract',
      aiAnalysis: aiAnalysis.success ? aiAnalysis.analysis : null,
      context: context,
      thinkingPanel: getLegalThinkingPanelState()
    }, 'contract_analysis_data')
  ]);
  
  return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
}

/**
 * Handle general legal request with AI enhancement
 * @param {object} task - A2A task object
 * @param {object} message - A2A message object
 * @param {string} query - The user's query text
 * @param {object} context - Additional context data
 * @returns {object} - Response with task and message
 */
async function handleAIEnhancedGeneralRequest(task, message, query, context = {}) {
  // Get AI analysis for general legal question
  const aiAnalysis = await performUKLegalAnalysis(query, context, 'general');
  
  // Prepare response task
  const responseTask = {
    ...task,
    state: 'completed'
  };
  
  let responseText = '';
  
  // Check if query is about business sale/acquisition for structured response
  const queryLower = query.toLowerCase();
  const isBusinessSaleQuery = queryLower.includes('sale') || queryLower.includes('acquisition') || 
                              queryLower.includes('purchase') || queryLower.includes('buy') || 
                              queryLower.includes('sell') || queryLower.includes('transaction');
  
  if (isBusinessSaleQuery) {
    responseText = generateStructuredBusinessSaleAdvice(query, context, aiAnalysis);
  } else if (aiAnalysis.success && aiAnalysis.analysis.conclusion) {
    responseText = `${aiAnalysis.analysis.conclusion}\n\n`;
    
    if (aiAnalysis.analysis.recommendations.length > 0) {
      responseText += `**Key Actions:**\n${aiAnalysis.analysis.recommendations.slice(0, 3).join('\n- ')}\n\n`;
    }
  } else {
    // Fallback to UK rule-based general guidance
    responseText = getUKGeneralLegalGuidance(query, context);
  }
  
  // Only show services menu if the response is general/short
  if (responseText.length < 200) {
    responseText += `\nI can assist you with UK legal matters including:\n`;
    responseText += `- UK Non-Disclosure Agreements under English law\n`;
    responseText += `- UK regulatory compliance analysis\n`;
    responseText += `- UK contract analysis and review\n`;
    responseText += `- UK business transaction legal guidance\n`;
    responseText += `- UK employment law (TUPE) considerations\n`;
    responseText += `- UK data protection (UK GDPR) compliance\n\n`;
    responseText += `For complex UK legal matters, I recommend consulting with a UK qualified solicitor.`;
  }
  
  const responseMessage = createMessage([
    createTextPart(generateLegalThinkingAnnotation()),
    createTextPart(responseText),
    createDataPart({
      analysisType: 'general',
      aiAnalysis: aiAnalysis.success ? aiAnalysis.analysis : null,
      context: context,
      thinkingPanel: getLegalThinkingPanelState()
    }, 'general_legal_data')
  ]);
  
  return { task: responseTask, message: stripMarkdownFromMessage(responseMessage) };
}

/**
 * Generate dynamic UK NDA document based on AI analysis and parameters
 * @param {object} params - Parameters for the NDA
 * @param {object} aiAnalysis - AI analysis results
 * @returns {string} - Generated UK NDA document
 */
async function generateDynamicUKNdaDocument(params, aiAnalysis) {
  const currentDate = new Date().toLocaleDateString('en-GB');
  
  let document = `UK NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is made on ${currentDate} under the laws of England and Wales.

BETWEEN:

(1) ${params.sellerName || '[SELLER NAME]'} of ${params.sellerAddress || '[SELLER ADDRESS]'} (the "Disclosing Party"); and

(2) ${params.buyerName || '[BUYER NAME]'} of ${params.buyerAddress || '[BUYER ADDRESS]'} (the "Receiving Party").

WHEREAS the parties wish to explore a potential business transaction and need to disclose confidential information for this purpose.

NOW THEREFORE the parties agree as follows:

1. CONFIDENTIAL INFORMATION
1.1 "Confidential Information" means any and all non-public information disclosed by the Disclosing Party to the Receiving Party, including but not limited to:
    (a) financial information, business plans, and projections;
    (b) customer lists, supplier information, and business relationships;
    (c) technical data, know-how, and trade secrets;
    (d) any other information marked as confidential or which would reasonably be considered confidential.

2. OBLIGATIONS OF RECEIVING PARTY
2.1 The Receiving Party undertakes to:
    (a) keep all Confidential Information strictly confidential;
    (b) not disclose Confidential Information to any third party without prior written consent;
    (c) use Confidential Information solely for evaluating the potential transaction;
    (d) protect Confidential Information with the same degree of care as their own confidential information.

3. DATA PROTECTION
3.1 The parties acknowledge that any personal data shared must be processed in accordance with the UK GDPR and Data Protection Act 2018.
3.2 Each party warrants that they have appropriate lawful bases for sharing any personal data.

4. TERM
4.1 This Agreement shall remain in force for ${params.termLength || '3'} years from the date of execution, unless terminated earlier in accordance with its terms.

5. RETURN OF INFORMATION
5.1 Upon termination or upon request, the Receiving Party shall return or destroy all Confidential Information and any copies thereof.

6. GOVERNING LAW AND JURISDICTION
6.1 This Agreement shall be governed by and construed in accordance with English law.
6.2 The courts of England and Wales shall have exclusive jurisdiction over any disputes arising from this Agreement.

7. GENERAL PROVISIONS
7.1 ${UK_LEGAL_REQUIREMENTS.standardClauses.severability}
7.2 ${UK_LEGAL_REQUIREMENTS.standardClauses.entireAgreement}
7.3 ${UK_LEGAL_REQUIREMENTS.standardClauses.variation}
7.4 ${UK_LEGAL_REQUIREMENTS.standardClauses.counterparts}

IN WITNESS WHEREOF the parties have executed this Agreement on the date first written above.

${UK_LEGAL_REQUIREMENTS.witnessRequirements}:

_________________________                    _________________________
${params.sellerName || '[SELLER NAME]'}      ${params.buyerName || '[BUYER NAME]'}
(Disclosing Party)                           (Receiving Party)

Date: _____________                          Date: _____________`;

  // Add AI recommendations as comments if available
  if (aiAnalysis.success && aiAnalysis.analysis.recommendations.length > 0) {
    document += "\n\n/* UK LEGAL RECOMMENDATIONS BASED ON AI ANALYSIS:\n";
    aiAnalysis.analysis.recommendations.forEach((rec, index) => {
      document += `${index + 1}. ${rec}\n`;
    });
    document += "*/\n";
    
    // Add specific UK legal considerations
    document += "\n/* UK LEGAL CONSIDERATIONS:\n";
    document += "- Ensure compliance with UK GDPR for any personal data sharing\n";
    document += "- Consider Companies Act 2006 disclosure requirements\n";
    document += "- Review any industry-specific licensing obligations\n";
    document += "- Ensure proper corporate authority for execution\n";
    document += "*/\n";
  }
  
  return document;
}

/**
 * Generate structured business sale legal advice matching sample quality
 */
function generateStructuredBusinessSaleAdvice(query, context, aiAnalysis) {
  const queryLower = query.toLowerCase();
  const isBuyer = queryLower.includes('buy') || queryLower.includes('acquisition') || queryLower.includes('acquire');
  const isSeller = queryLower.includes('sell') || queryLower.includes('sale');
  
  return `## UK Business Transaction Legal Framework

### Transaction Structure Comparison

| **Structure** | **Advantages** | **Disadvantages** | **Tax Implications** |
|---------------|---------------|------------------|-------------------|
| **Asset Purchase** | Selective asset acquisition | Complex transfer process | No CGT relief |
| | Clean break from liabilities | Requires individual consents | SDLT on property |
| | Depreciation allowances | Employment law complexities | VAT on assets |
| **Share Purchase** | Simple legal transfer | Inherited liabilities | Business Asset Disposal Relief |
| | Business continuity | Full due diligence required | 10% CGT rate (up to £1M) |
| | Established contracts remain | Minority shareholder issues | Stamp duty 0.5% |

### Due Diligence Requirements (UK-Specific)

| **Area** | **Key Documents** | **Red Flags** | **Professional Review** |
|----------|------------------|---------------|----------------------|
| **Corporate** | Articles, board minutes, PSC register | Outstanding litigation | Solicitor review |
| **Financial** | 3-year accounts, management accounts | Unusual transactions | Accountant analysis |
| **Employment** | Contracts, pension schemes, TUPE | High staff turnover | Employment lawyer |
| **Regulatory** | Licences, permits, compliance records | Regulatory breaches | Specialist counsel |
| **IP/IT** | Patents, trademarks, data policies | IP disputes | IP specialist |
| **Property** | Leases, planning permissions | Lease breaks pending | Property lawyer |

### UK Tax Considerations & Rates (2024/25)

| **Tax Type** | **Rate** | **Reliefs Available** | **Planning Opportunity** |
|--------------|----------|---------------------|------------------------|
| **Capital Gains Tax** | 10%/20% individuals | Business Asset Disposal Relief | Timing of disposal |
| | 25% companies | Substantial shareholding exemption | Corporate wrapper |
| **Stamp Duty** | 0.5% on shares >£1,000 | None | Consider structure |
| **SDLT** | 0-5% on property | None | Asset vs share purchase |
| **Corporation Tax** | 19%/25% | Various reliefs | Deferred consideration |
| **VAT** | 20% | TOGC relief | Going concern transfer |

### Sale & Purchase Agreement (SPA) Key Terms

| **Provision** | **Seller Protection** | **Buyer Protection** | **Market Standard** |
|---------------|---------------------|-------------------|-------------------|
| **Warranties** | Limited scope/knowledge | Comprehensive coverage | Negotiated scope |
| **Indemnities** | Specific/limited | Tax/environmental | 18-24 months |
| **Retention** | Minimal holdback | 10-20% purchase price | 12-18 months |
| **W&I Insurance** | Covers warranty claims | Covers unknown issues | £1M+ transactions |
| **Completion** | Simultaneous | Subject to conditions | 2-6 weeks from signing |

### Employment Law Considerations (TUPE)

| **Scenario** | **TUPE Application** | **Obligations** | **Timing** |
|--------------|-------------------|----------------|------------|
| **Asset Sale** | Likely applies | Consultation 30+ days | Pre-completion |
| **Share Sale** | No TUPE transfer | Continuity of employment | None |
| **Business Transfer** | Applies if going concern | Information/consultation | 30 days minimum |
| **Outsourcing** | Service provision change | Enhanced protection | Pre-transfer |

### Regulatory Compliance Checklist

**Pre-Transaction:**
- Competition law clearance (if thresholds met)
- Sector-specific approvals (FSA, CMA, etc.)
- Foreign investment screening (NSI Act)
- Anti-money laundering compliance

**Post-Transaction:**
- Companies House filings
- HMRC notifications
- Employment law compliance
- Ongoing regulatory obligations

### Professional Advisory Team Structure

| **Role** | **Scope** | **Typical Cost** | **When Engaged** |
|----------|-----------|-----------------|-----------------|
| **Corporate Lawyer** | Transaction structure, SPA | £150K-300K | From LOI stage |
| **Tax Adviser** | Structure optimisation | £25K-75K | Pre-marketing |
| **Employment Lawyer** | TUPE, consultation | £15K-40K | Due diligence stage |
| **Regulatory Specialist** | Compliance, approvals | £10K-50K | Sector dependent |

### Timeline & Critical Path

| **Phase** | **Duration** | **Legal Activities** | **Key Deliverables** |
|-----------|--------------|-------------------|-------------------|
| **Pre-Marketing** | 4-6 weeks | Legal review, structure | VDD legal report |
| **Marketing** | 6-8 weeks | NDA preparation, data room | Information memorandum |
| **Due Diligence** | 8-12 weeks | Full legal review | Due diligence report |
| **Documentation** | 4-6 weeks | SPA negotiation | Signed agreements |
| **Completion** | 2-4 weeks | Conditions satisfaction | Legal completion |

### Key Risk Areas & Mitigation

**High-Risk Items:**
- Undisclosed liabilities
- Regulatory non-compliance
- Employment claims
- Tax exposures
- IP ownership disputes

**Mitigation Strategies:**
- Comprehensive due diligence
- Warranty & indemnity insurance
- Retention mechanisms
- Specialist legal review
- Regulatory clearances

### Next Steps & Recommendations

1. **Legal Structure Review** (2-3 weeks)
   - Optimal transaction structure
   - Tax efficiency analysis
   - Regulatory requirements
   - Pre-transaction reorganisation

2. **Documentation Preparation** (4-6 weeks)
   - Standard form agreements
   - Disclosure letter preparation
   - Data room legal section
   - Completion mechanics

3. **Professional Team Assembly** (1-2 weeks)
   - Lead corporate counsel
   - Tax specialist
   - Employment lawyer
   - Regulatory adviser (if needed)

**Legal Investment Required:** £200K-500K (£2M-10M transaction)
**Critical Success Factor:** Early legal engagement and proper structuring

**Disclaimer:** This analysis is for guidance only. UK business transactions require specialist legal advice. Always consult with qualified UK solicitors before proceeding with any business sale or acquisition.`;
}

/**
 * Generate structured contract advice for business transactions
 */
function generateStructuredContractAdvice(query, context, aiAnalysis) {
  return `## UK Business Transaction Contract Framework

### Sale & Purchase Agreement (SPA) Structure

| **Section** | **Purpose** | **Key Provisions** | **Negotiation Points** |
|-------------|-------------|-------------------|----------------------|
| **Parties & Definitions** | Identity & interpretation | Buyer, seller, business definition | Subsidiaries inclusion |
| **Purchase Price** | Financial terms | Amount, adjustment mechanisms | Working capital, debt-free |
| **Completion** | Transfer mechanics | Conditions precedent | Simultaneous vs deferred |
| **Warranties** | Seller representations | Business condition statements | Knowledge qualifications |
| **Indemnities** | Specific protections | Tax, environmental, litigation | Scope and time limits |
| **Restrictive Covenants** | Post-completion restrictions | Non-compete, non-solicit | Geographic and time limits |

### Warranty Coverage & Risk Allocation

| **Warranty Category** | **Typical Scope** | **Seller Limitations** | **Buyer Protections** |
|---------------------|------------------|----------------------|---------------------|
| **Financial** | 3-year accounts accuracy | Knowledge qualifications | Materiality thresholds |
| **Legal/Regulatory** | Compliance statements | Disclosed matters | Full disclosure required |
| **Commercial** | Customer/supplier terms | Material contracts only | Key relationship stability |
| **Employment** | Staff terms, TUPE | Known issues disclosed | Consultation compliance |
| **Environmental** | Regulatory compliance | Historical knowledge | Full liability coverage |
| **IP/IT** | Ownership, validity | Registration evidence | Freedom to operate |

### Conditions Precedent Matrix

| **Condition** | **Responsibility** | **Timeline** | **Failure Consequences** |
|---------------|------------------|--------------|-------------------------|
| **Due Diligence** | Buyer satisfaction | 4-8 weeks | Termination right |
| **Financing** | Buyer arrangement | 6-8 weeks | Buyer liability/deposit |
| **Regulatory** | Joint application | Varies by sector | Shared termination right |
| **Third Party** | Seller procurements | 2-4 weeks | Seller breach/damages |
| **Corporate** | Seller resolutions | 1-2 weeks | Seller responsibility |

### Financial Adjustment Mechanisms

| **Mechanism** | **Purpose** | **Calculation** | **Market Standard** |
|---------------|-------------|----------------|-------------------|
| **Working Capital** | Normalised level | Completion accounts | 3-month average |
| **Cash-Free/Debt-Free** | Enterprise value basis | Actual vs normalised | Full adjustment |
| **Earn-Out** | Performance incentive | Future EBITDA targets | 1-3 year period |
| **Price Protection** | Buyer risk mitigation | Escrow/retention | 10-20% holdback |

### Disclosure Process & Data Room

| **Category** | **Key Documents** | **Disclosure Standard** | **Update Obligations** |
|--------------|------------------|----------------------|----------------------|
| **Corporate** | Constitutional docs, board minutes | Full corporate history | Current to completion |
| **Financial** | Accounts, management information | 3-5 year track record | Monthly updates |
| **Legal** | Material contracts, litigation | All material matters | Ongoing disclosure |
| **Commercial** | Customer/supplier agreements | Key relationships | Material changes |
| **Employment** | Contracts, policies, disputes | Full employment picture | TUPE consultation |
| **Regulatory** | Licences, permits, correspondence | Complete regulatory file | Ongoing compliance |

### Restrictive Covenants Framework

| **Restriction** | **Typical Scope** | **Enforcement** | **Reasonableness Test** |
|-----------------|------------------|----------------|----------------------|
| **Non-Compete** | Direct competition | 12-24 months | Geographic limitation |
| **Non-Solicit (Customers)** | Direct approaches | 12-18 months | Material customers only |
| **Non-Solicit (Staff)** | Key employees | 6-12 months | Senior staff typically |
| **Non-Deal** | Similar transactions | 6-12 months | Sector/geographic limits |

### Completion Mechanics & Documentation

| **Step** | **Documentation** | **Responsibility** | **Timing** |
|----------|------------------|------------------|------------|
| **Completion Accounts** | Draft/finalisation | Seller prepares | 30-60 days post |
| **Price Adjustment** | Independent accountant | Joint appointment | If disputed |
| **Asset Transfer** | Bill of sale, assignments | Seller execution | Completion day |
| **Share Transfer** | Stock transfer forms | Seller completion | Simultaneous |
| **Third Party Consents** | Novation agreements | Joint procurement | Pre-completion |

### Professional Indemnity & Insurance

| **Coverage** | **Policy Limit** | **Excess** | **Duration** |
|--------------|-----------------|------------|--------------|
| **W&I Insurance** | 10-30% deal value | 1-2% deal value | 3-7 years |
| **Tax Insurance** | Specific exposures | Varies | 7+ years |
| **Environmental** | Site liabilities | £25K-100K | Ongoing |
| **Professional** | Advisory negligence | £1M-10M+ | 6 years minimum |

### Key Commercial Terms Negotiation

**Seller Priorities:**
- Clean exit and certainty
- Minimal retention/escrow
- Knowledge-only warranties
- Reasonable covenant restrictions

**Buyer Priorities:**
- Comprehensive protection
- Adequate retention mechanisms
- Full warranty coverage
- Meaningful restrictive covenants

### Contract Risk Assessment

| **High-Risk Areas** | **Mitigation Strategies** | **Professional Input** |
|-------------------|-------------------------|----------------------|
| **Unknown Liabilities** | Comprehensive due diligence | Legal and financial |
| **Key Person Dependency** | Employment protections | HR specialist |
| **Customer Concentration** | Retention agreements | Commercial adviser |
| **Regulatory Changes** | Specific indemnities | Regulatory counsel |

### Professional Documentation Timeline

| **Phase** | **Duration** | **Key Documents** | **Legal Input** |
|-----------|--------------|------------------|----------------|
| **Heads of Terms** | 1-2 weeks | Letter of intent | Commercial terms |
| **Due Diligence** | 6-12 weeks | DD reports | Legal review |
| **SPA Negotiation** | 4-8 weeks | Full documentation | Principal drafting |
| **Completion** | 1-2 weeks | Transfer documents | Execution support |

### Next Steps & Recommendations

1. **Document Strategy** (1-2 weeks)
   - Transaction structure confirmation
   - Risk allocation principles
   - Commercial terms framework
   - Professional team briefing

2. **Due Diligence Preparation** (2-4 weeks)
   - Data room organisation
   - Disclosure letter drafting
   - Legal risk assessment
   - Documentation gaps analysis

3. **Contract Negotiation** (6-10 weeks)
   - SPA heads of terms
   - Detailed provision negotiation
   - Ancillary documentation
   - Completion preparation

**Legal Documentation Investment:** £150K-400K
**Timeline:** 12-20 weeks from engagement to completion
**Success Factors:** Early legal engagement, comprehensive preparation, experienced counsel

**Note:** This analysis covers standard UK business sale contracts. Complex transactions may require additional provisions and specialist legal advice.`;
}