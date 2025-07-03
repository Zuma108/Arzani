/**
 * Generalist Orchestrator Agent
 * 
 * Core orchestration logic for routing tasks to specialist agents
 * and aggregating results in the Arzani A2A system
 */

import { A2AClient } from '../../libs/a2a/client.js';
import { 
  createTask, 
  createMessage, 
  createTextPart, 
  createDataPart,
  generateTaskId 
} from '../../libs/a2a/utils.js';
import { stripMarkdownFromMessage } from '../../utils/markdown-stripper.js';
import { enhanceSystemPromptWithMarkdown, formatAgentResponse, addAgentSignature } from '../../utils/markdown-utils.js';
import { a2aDatabase } from './database-service.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import hybridRetriever from '../knowledge/enhanced-hybrid-retrieval.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize OpenAI client for AI-enhanced intent classification
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize hybrid knowledge retrieval system for enhanced orchestration
const knowledgeRetriever = hybridRetriever;

/**
 * Knowledge Mapper for learning from orchestration patterns
 */
class KnowledgeMapper {
  constructor(database) {
    this.database = database;
    this.patterns = new Map();
    this.delegationChains = new Map();
    this.agentPerformance = new Map();
  }

  /**
   * Record a successful orchestration pattern
   */
  async recordSuccessfulPattern(query, agents, confidence, outcome) {
    const patternKey = this.generatePatternKey(query);
    const pattern = {
      query: query.substring(0, 200),
      agents,
      confidence,
      outcome,
      timestamp: new Date().toISOString(),
      successRate: 1.0
    };
    
    this.patterns.set(patternKey, pattern);
    
    // Store in database if available
    if (this.database) {
      try {
        await this.database.recordOrchestrationPattern(pattern);
      } catch (error) {
        console.error('[KnowledgeMapper] Failed to record pattern:', error);
      }
    }
  }

  /**
   * Generate pattern key from query text
   */
  generatePatternKey(query) {
    const words = query.toLowerCase().split(/\s+/).slice(0, 5);
    return words.join('-');
  }

  /**
   * Get similar patterns for a query
   */
  getSimilarPatterns(query) {
    const patternKey = this.generatePatternKey(query);
    return this.patterns.get(patternKey) || null;
  }

  /**
   * Record delegation chain success
   */
  recordDelegationChain(fromAgent, toAgent, reason, success) {
    const chainKey = `${fromAgent}-${toAgent}`;
    const existing = this.delegationChains.get(chainKey) || { 
      count: 0, 
      successCount: 0, 
      reasons: [] 
    };
    
    existing.count++;
    if (success) existing.successCount++;
    if (!existing.reasons.includes(reason)) {
      existing.reasons.push(reason);
    }
    
    this.delegationChains.set(chainKey, existing);
  }

  /**
   * Get delegation success rate
   */
  getDelegationSuccessRate(fromAgent, toAgent) {
    const chainKey = `${fromAgent}-${toAgent}`;
    const chain = this.delegationChains.get(chainKey);
    return chain ? chain.successCount / chain.count : 0.5; // Default 50%
  }
}

/**
 * Orchestrator class for managing agent coordination
 */
export class Orchestrator {  constructor() {
    this.client = new A2AClient({ 
      agentId: 'orchestrator',
      authToken: process.env.A2A_AUTH_TOKEN,
      sseEnabled: process.env.A2A_SSE_ENABLED === 'true'
    });
    
    // Initialize OpenAI client for general agent
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize database service
    this.database = a2aDatabase;
    
    // Initialize knowledge mapper for learning
    this.knowledgeMapper = new KnowledgeMapper(this.database);
    
    // Thinking panel state for UI transparency
    this.currentThinkingPanel = null;
    this.thinkingSteps = [];
    
    // Agent registry with their endpoints
    this.agents = {
      revenue: {
        name: 'Revenue Agent',
        url: `http://localhost:${process.env.REVENUE_AGENT_PORT || 5002}/a2a/tasks/send`,
        specialties: ['growth', 'revenue', 'business', 'sales', 'optimization', 'strategy', 'marketplace']
      },
      legal: {
        name: 'Legal Agent', 
        url: `http://localhost:${process.env.LEGAL_AGENT_PORT || 5003}/a2a/tasks/send`,
        specialties: ['compliance', 'contracts', 'nda', 'regulations', 'due-diligence']
      },
      finance: {
        name: 'Finance Agent',
        url: `http://localhost:${process.env.FINANCE_AGENT_PORT || 5004}/a2a/tasks/send`,
        specialties: ['ebitda', 'multiples', 'tax', 'financial-analysis', 'cash-flow']
      },
      financial: {
        name: 'Financial Agent',
        url: process.env.FINANCE_AGENT_URL || 'http://localhost:3002/api/finance',
        specialties: ['finance', 'billing', 'invoices', 'payments', 'pricing'],
      },
      general: {
        name: 'Generalist Agent',
        url: null,  // handled in-process by Orchestrator
        specialties: ['smalltalk', 'faq', 'task-management', 'knowledge'],
      }
    };

    this.agentSpecialties = {};
    for (const agentKey in this.agents) {
      const specialties = this.agents[agentKey].specialties;
      specialties.forEach(specialty => {
        if (!this.agentSpecialties[specialty]) {
          this.agentSpecialties[specialty] = [];
        }
        this.agentSpecialties[specialty].push(agentKey);
      });
    }
  }  /**
   * Classify user intent using AI-enhanced semantic analysis with confidence scoring
   * @param {string} text - The user's input text
   * @returns {Promise<object>} Object containing selected agents and confidence scores
   */
  async classifyIntent(text) {
    const lowerText = text.toLowerCase();
    
    // Create thinking panel for transparency
    const thinkingPanel = this.createThinkingPanel('orchestrator');
    
    // First priority: Check for explicit agent requests
    this.addThinkingStep('Checking for explicit agent requests in user query...');
    const explicitAgent = this.detectExplicitAgentRequest(lowerText);
    if (explicitAgent) {
      this.addThinkingStep(`Found explicit request for ${explicitAgent} agent`);
      this.completeThinkingPanel();
      console.log(`[Orchestrator] Explicit agent request detected: ${explicitAgent}`);
      return {
        agents: [explicitAgent],
        confidence: 1.0,
        reasoning: `User explicitly requested ${explicitAgent} agent`,
        method: 'explicit',
        thinkingPanel: this.getThinkingPanelState()
      };
    }

    // Second priority: AI-enhanced semantic intent classification
    this.addThinkingStep('No explicit agent found, analyzing query semantically...');
    try {
      console.log(`[Orchestrator] Using AI-enhanced semantic classification`);
      this.addThinkingStep('Consulting AI for semantic intent classification...');
      
      // Check knowledge mapper for similar patterns
      const similarPattern = this.knowledgeMapper.getSimilarPatterns(text);
      if (similarPattern && similarPattern.confidence > 0.8) {
        this.addThinkingStep(`Found similar successful pattern: ${similarPattern.agents.join(', ')}`);
      }
      
      const aiClassification = await this.performAIIntentClassification(text);
      
      if (aiClassification.confidence >= 0.7) {
        this.addThinkingStep(`AI classification confident (${aiClassification.confidence}): ${aiClassification.agents.join(', ')}`);
        this.completeThinkingPanel();
        
        // Record successful pattern
        await this.knowledgeMapper.recordSuccessfulPattern(
          text, 
          aiClassification.agents, 
          aiClassification.confidence, 
          'ai_classification'
        );
        
        return {
          ...aiClassification,
          thinkingPanel: this.getThinkingPanelState()
        };
      }
      
      // Fallback to regex-based classification if AI confidence is low
      this.addThinkingStep(`AI confidence ${aiClassification.confidence} below threshold, using regex fallback`);
      console.log(`[Orchestrator] AI confidence ${aiClassification.confidence} below threshold, using regex fallback`);
      const regexClassification = this.performRegexClassification(lowerText);
      
      this.addThinkingStep(`Hybrid classification complete: ${regexClassification.agents.join(', ')}`);
      this.completeThinkingPanel();
      
      // Combine AI insights with regex results
      return {
        agents: regexClassification.agents,
        confidence: Math.max(aiClassification.confidence, regexClassification.confidence),
        reasoning: `Hybrid classification: ${aiClassification.reasoning} + regex patterns`,
        method: 'hybrid',
        aiInsights: aiClassification,
        thinkingPanel: this.getThinkingPanelState()
      };
      
    } catch (error) {
      console.error(`[Orchestrator] AI classification failed, using regex fallback:`, error);
      this.addThinkingStep('AI classification failed, falling back to regex patterns...');
      const regexClassification = this.performRegexClassification(lowerText);
      this.completeThinkingPanel();
      
      return {
        ...regexClassification,
        thinkingPanel: this.getThinkingPanelState()
      };
    }
  }
  /**
   * Perform AI-enhanced intent classification using OpenAI with sequential thinking and knowledge retrieval
   * @param {string} text - The user's input text
   * @returns {Promise<object>} Classification result with confidence scores
   */
  async performAIIntentClassification(text) {
    const startTime = Date.now();
    
    // Quick check for basic conversational messages to avoid unnecessary MCP calls
    const basicPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)\.?$/i,
      /^(what do you do|how can you help|what are your capabilities|tell me about yourself)\.?\??$/i,
      /^(how are you|what's new|what's up)\.?\??$/i,
      /^(ok|thanks|thank you|got it|understood|alright)\.?$/i,
      /^(what is this|how does this work|what's this platform)\.?\??$/i,
      /^(test|testing|hello world|ping)\.?$/i,
      /^.{1,10}$/i, // Very short messages (1-10 characters) are likely basic
      /^(yes|no|maybe|sure|okay)\.?$/i,
      /^(good|nice|cool|great)\.?$/i,
      /^(help|info|information)\.?\??$/i
    ];
    
    const textTrimmed = text.trim();
    const isBasicMessage = basicPatterns.some(pattern => pattern.test(textTrimmed)) || 
                          textTrimmed.length < 3 || // Very short text
                          (textTrimmed.length < 15 && !/\b(business|company|legal|finance|revenue|market|sale|buy|sell|contract|nda|compliance|valuation|analysis)\b/i.test(textTrimmed));
    
    let contextualKnowledge = '';
    let mcpSources = [];
    let knowledgeConfidence = 0;
    
    if (!isBasicMessage) {
      // Step 1: Get relevant context from knowledge base to improve classification (only for business queries)
      this.addThinkingStep('Gathering relevant context from knowledge base...', 'active');
      this.updateThinkingStatus('searching');
      
      try {
        const knowledgeResult = await knowledgeRetriever.retrieveKnowledge(
          text, 
          'orchestrator',
          null, // No user ID for classification
          {
            maxResults: 3,
            includeUserDocs: false,
            searchFallback: true // Use real-time search for current context
          }
        );
        
        // Extract MCP source information
        if (knowledgeResult.metadata && knowledgeResult.metadata.breakdown) {
          const breakdown = knowledgeResult.metadata.breakdown;
          
          if (breakdown.pineconeResults > 0) {
            mcpSources.push({
              type: 'pinecone',
              name: 'Pinecone Knowledge Base',
              confidence: knowledgeResult.metadata.confidence,
              resultsCount: breakdown.pineconeResults,
              responseTime: knowledgeResult.metadata.responseTime || null
            });
          }
          
          if (breakdown.realTimeSearch > 0) {
            mcpSources.push({
              type: 'brave',
              name: 'Brave Real-time Search',
              confidence: knowledgeResult.metadata.confidence,
              resultsCount: breakdown.realTimeSearch,
              responseTime: knowledgeResult.metadata.responseTime || null
            });
          }
        }
        
        if (knowledgeResult.results.length > 0) {
          contextualKnowledge = '\n\nRELEVANT CONTEXT FROM KNOWLEDGE BASE:\n';
          knowledgeResult.results.forEach((result, index) => {
            contextualKnowledge += `${index + 1}. ${result.content.substring(0, 200)}...\n`;
          });
          
          knowledgeConfidence = knowledgeResult.metadata.confidence;
          
          this.addThinkingStep(
            `Found ${knowledgeResult.results.length} relevant context items (confidence: ${knowledgeResult.metadata.confidence.toFixed(2)})`,
            'completed',
            { 
              resultsCount: knowledgeResult.results.length,
              confidence: knowledgeResult.metadata.confidence,
              sources: mcpSources
            }
          );
          
          // Add MCP sources to thinking panel
          this.addMCPSources(mcpSources);
          
          // Add memory insights if available
          if (knowledgeResult.metadata.memoryInsights) {
            this.addMemoryInsights({
              patterns: knowledgeResult.metadata.memoryInsights.patterns || [],
              insights: knowledgeResult.metadata.memoryInsights.insights || [],
              confidence: knowledgeResult.metadata.memoryInsights.confidence || null
            });
          }
          
        } else {
          this.addThinkingStep('No relevant context found in knowledge base', 'completed');
        }
        
      } catch (error) {
        console.warn('[Orchestrator] Knowledge retrieval failed during classification:', error);
        this.addThinkingStep('Knowledge retrieval failed, proceeding with basic classification', 'error', {
          error: error.message
        });
      }
    } else {
      // Skip MCP for basic conversational messages
      this.addThinkingStep('Basic conversational message detected - skipping knowledge retrieval', 'completed');
      
      // Return early for basic messages without AI classification
      return {
        agents: ['general'],
        confidence: 0.4,
        reasoning: 'Basic conversational message - no business expertise or knowledge retrieval needed',
        method: 'basic_detection',
        agentConfidences: { general: 0.4 },
        requiresMultipleAgents: false,
        thinkingSteps: ['Detected basic conversational message', 'Classified as general response'],
        skipMCP: true
      };
    }

    // Step 2: AI Classification with enhanced context (only for business queries)
    this.updateThinkingStatus('retrieving');
    this.addThinkingStep('Performing AI-enhanced semantic classification...', 'active');

    // Enhanced system prompt with sequential thinking methodology and knowledge context
    const prompt = `You are an intelligent intent classifier for a business marketplace A2A system using structured sequential thinking with access to contextual knowledge.

CRITICAL: Before escalating to specialist agents, determine if this is a BASIC CONVERSATIONAL MESSAGE that can be handled with a simple response.

BASIC CONVERSATIONAL MESSAGES (handle with general response, NO specialist agents needed):
- Greetings: "hi", "hello", "hey", "good morning", etc.
- General inquiries: "what do you do", "how can you help", "what are your capabilities"
- Small talk: "how are you", "what's new", "tell me about yourself"
- Simple acknowledgments: "ok", "thanks", "got it", "understood"
- Basic questions about the platform: "what is this", "how does this work"

FOR BASIC MESSAGES: Return "general" agent with low confidence (0.3-0.5) to trigger simple conversational response.

AVAILABLE SPECIALIST AGENTS (only use for business-specific queries):
1. REVENUE AGENT - Business growth, revenue maximization, sales strategy, market optimization, business development
2. LEGAL AGENT - Contracts, NDAs, compliance, regulations, due diligence, legal documentation  
3. FINANCE AGENT - EBITDA analysis, financial multiples, tax scenarios, cash flow, financial due diligence

SEQUENTIAL THINKING PROCESS:
You must think through this step-by-step using the following methodology:

STEP 1 - BASIC MESSAGE CHECK:
- Is this a greeting, small talk, or general platform inquiry?
- Does this require business expertise or just conversation?
- If basic conversational, classify as "general" and skip to Step 4

STEP 2 - QUERY ANALYSIS (only for business queries):
- Break down the user's query into core components
- Identify key business terms and concepts
- Determine the primary intent category
- Consider the contextual knowledge provided

STEP 3 - AGENT MAPPING (only for business queries):
- Map identified concepts to agent specialties
- Consider which agents have the expertise for each component
- Evaluate if multiple agents are needed
- Use contextual knowledge to improve mapping accuracy

STEP 4 - CONFIDENCE ASSESSMENT:
- For basic messages: Use "general" with confidence 0.3-0.5
- For business queries: Assess confidence level for each potential agent
- Consider ambiguity factors and if escalation is needed

STEP 5 - FINAL CLASSIFICATION:
- Select the most appropriate agent(s)
- Provide reasoning for the decision
- Include confidence metrics

**CRITICAL MARKDOWN FORMATTING REQUIREMENTS:**
You MUST format ALL your responses using proper **GitHub-flavoured Markdown** for every element:

### Headings
- Use **##** for main sections (e.g., ## Orchestration Analysis)
- Use **###** for subsections (e.g., ### Agent Selection)
- Use **####** for minor sections (e.g., #### Confidence Assessment)
- Always include a space after the # symbols

### Lists
- Use **-** for unordered lists (with a space after the dash)
- Use **1.** for numbered lists (with proper sequential numbering)
- Use proper indentation for nested lists (two spaces per level)
- Ensure consistent spacing between list items

### Tables
- Use well-structured markdown tables for agent analysis and workflow data
- Include clear column headers (Agent, Confidence, Reasoning, etc.)
- Use agent emoji indicators: 📊 Finance, ⚖️ Legal, 🏢 Broker, 🔄 Orchestrator
- Bold all confidence scores and status indicators
- Include decision metrics and reasoning in separate columns
- Fill empty cells with "N/A" rather than leaving blank

### Code and Emphasis
- Use \`\`\`code blocks\`\`\` for examples and structured data
- Use **bold text** for key findings, decisions and important terms
- Use *italic text* for explanations or supporting reasoning
- Use > blockquotes for important notes or warnings
- Use horizontal rules (---) to separate major sections
- Use clear headers like "Agent", "Task", "Status", "Priority", "Confidence"
- Use emoji indicators: 📈 for "Revenue", 📊 for "Finance", ⚖️ for "Legal"
- Use status indicators: ✅ for "Complete", 🔄 for "In Progress", ⏳ for "Pending"
- Bold all priority levels like **High**, **Medium**, **Low**
- Bold all confidence percentages like **85%** confidence
- Fill empty cells with "N/A" rather than leaving blank
- Right-align numeric columns (confidence scores, completion percentages)

USER QUERY: "${text}"
${contextualKnowledge}

Respond with your sequential thinking process followed by the final JSON classification:

## SEQUENTIAL THINKING PROCESS

### Step 1: Query Analysis
[Your analysis here]

### Step 2: Agent Mapping  
[Your mapping here]

### Step 3: Confidence Assessment
[Your assessment here]

### Step 4: Final Classification
[Your final decision here]

## CLASSIFICATION RESULT

\`\`\`json
{
  "agents": ["general"], 
  "agentConfidences": {"general": 0.4},
  "overallConfidence": 0.4,
  "reasoning": "Basic conversational message - no business expertise needed",
  "requiresMultipleAgents": false,
  "contextUsed": false,
  "thinkingSteps": [
    "Identified as basic conversational message",
    "Classified as general response", 
    "No specialist agents needed"
  ]
}
\`\`\`

EXAMPLES:
- For "hey" or "hello": Use "general" agent with 0.3-0.4 confidence
- For "what do you do": Use "general" agent with 0.4-0.5 confidence  
- For "help me grow my business": Use "revenue" agent with 0.8+ confidence
- For "I need an NDA": Use "legal" agent with 0.9+ confidence

Only include specialist agents (revenue/legal/finance) with confidence >= 0.3 for actual business queries. If no clear business match, use "general" with low confidence.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800 // Increased for thinking process
    });

    const response = completion.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('No JSON classification found in AI response');
    }
    
    let cleanedResponse = jsonMatch[1].trim();
    
    try {
      const classification = JSON.parse(cleanedResponse);
      
      // Validate and sanitize the response
      const validAgents = ['revenue', 'legal', 'finance', 'general'];
      const selectedAgents = classification.agents.filter(agent => 
        validAgents.includes(agent) && 
        classification.agentConfidences[agent] >= 0.3
      );
      
      if (selectedAgents.length === 0) {
        // Default to general for basic conversations
        selectedAgents.push('general');
        classification.agentConfidences.general = 0.4;
        classification.overallConfidence = 0.4;
        classification.reasoning += " (defaulted to general conversation)";
      }
      
      return {
        agents: selectedAgents,
        confidence: classification.overallConfidence || 0.5,
        reasoning: classification.reasoning || 'AI semantic analysis with sequential thinking',
        method: 'ai_sequential',
        agentConfidences: classification.agentConfidences,
        requiresMultipleAgents: classification.requiresMultipleAgents || false,
        thinkingSteps: classification.thinkingSteps || [],
        fullThinkingProcess: response // Store full thinking process for debugging
      };
      
    } catch (parseError) {
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
  }

  /**
   * Perform regex-based intent classification (fallback method)
   * @param {string} lowerText - The user's input text in lowercase
   * @returns {object} Classification result with confidence scores
   */
  performRegexClassification(lowerText) {
    let selectedAgents = [];
    const agentConfidences = {};
    
    // Basic conversational patterns (handle locally, no specialist agents)
    const basicPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)\.?$/i,
      /^(what do you do|how can you help|what are your capabilities|tell me about yourself)\.?\??$/i,
      /^(how are you|what's new|what's up)\.?\??$/i,
      /^(ok|thanks|thank you|got it|understood|alright)\.?$/i,
      /^(what is this|how does this work|what's this platform)\.?\??$/i,
      /^(test|testing|hello world|ping)\.?$/i,
      /^.{1,10}$/i, // Very short messages (1-10 characters) are likely basic
      /^(yes|no|maybe|sure|okay)\.?$/i,
      /^(good|nice|cool|great)\.?$/i,
      /^(help|info|information)\.?\??$/i
    ];
    
    // Check for basic conversational messages first
    const textTrimmed = lowerText.trim();
    const isBasicMessage = basicPatterns.some(pattern => pattern.test(textTrimmed)) || 
                          textTrimmed.length < 3 || // Very short text
                          (textTrimmed.length < 15 && !/\b(business|company|legal|finance|revenue|market|sale|buy|sell|contract|nda|compliance|valuation|analysis)\b/i.test(textTrimmed));
    if (isBasicMessage) {
      return {
        agents: ['general'],
        confidence: 0.4,
        reasoning: 'Basic conversational message - no business expertise needed',
        method: 'regex_basic',
        agentConfidences: { general: 0.4 },
        requiresMultipleAgents: false
      };
    }
    
    // Revenue agent patterns with confidence scoring
    const revenuePatterns = [
      { pattern: /growth|scaling|increase|revenue|maximize|optimize|profit/i, confidence: 0.8 },
      { pattern: /business.*growth|what.*strategies|how to increase|revenue|sales|marketing/i, confidence: 0.9 },
      { pattern: /marketplace|revenue|deal|strategy|optimization/i, confidence: 0.7 }
    ];
    
    // Legal agent patterns with confidence scoring
    const legalPatterns = [
      { pattern: /legal|contract|nda|agreement|compliance|regulation|due.?diligence/i, confidence: 0.8 },
      { pattern: /lawyer|attorney|terms|conditions|liability/i, confidence: 0.9 },
      { pattern: /confidentiality|non.?disclosure/i, confidence: 0.9 }
    ];
    
    // Finance agent patterns with confidence scoring
    const financePatterns = [
      { pattern: /ebitda|financial|cash.?flow|profit|loss|tax|multiple/i, confidence: 0.8 },
      { pattern: /finance|accounting|revenue|expenses|roi|dcf/i, confidence: 0.8 },
      { pattern: /financial.*analysis|income.*statement|balance.*sheet/i, confidence: 0.9 }
    ];

    // Check revenue patterns
    const revenueMatches = revenuePatterns.filter(p => p.pattern.test(lowerText));
    if (revenueMatches.length > 0) {
      selectedAgents.push('revenue');
      agentConfidences.revenue = Math.max(...revenueMatches.map(m => m.confidence));
    }
    
    // Check legal patterns
    const legalMatches = legalPatterns.filter(p => p.pattern.test(lowerText));
    if (legalMatches.length > 0) {
      selectedAgents.push('legal');
      agentConfidences.legal = Math.max(...legalMatches.map(m => m.confidence));
    }
    
    // Check finance patterns
    const financeMatches = financePatterns.filter(p => p.pattern.test(lowerText));
    if (financeMatches.length > 0) {
      selectedAgents.push('finance');
      agentConfidences.finance = Math.max(...financeMatches.map(m => m.confidence));
    }

    // Default to general conversation if no clear business classification
    if (selectedAgents.length === 0) {
      selectedAgents.push('general');
      agentConfidences.general = 0.4;
    }

    const overallConfidence = selectedAgents.length > 0 
      ? Math.max(...selectedAgents.map(agent => agentConfidences[agent]))
      : 0.4;

    return {
      agents: selectedAgents,
      confidence: overallConfidence,
      reasoning: 'Regex pattern matching',
      method: 'regex',
      agentConfidences,
      requiresMultipleAgents: selectedAgents.length > 1    };
  }

  /**
   * Create and manage thinking panels for transparent AI decision-making with MCP integration
   */
  createThinkingPanel(agentType = 'orchestrator') {
    const panelId = 'thinking-' + Date.now();
    this.currentThinkingPanel = {
      id: panelId,
      agentType,
      thoughts: [],
      isActive: true,
      startTime: new Date().toISOString(),
      sources: [],
      memory: {},
      confidence: null,
      status: 'processing'
    };
    this.thinkingSteps = [];
    this.addThinkingStep('Analyzing user query and determining optimal approach...', 'active');
    
    return { panelId, agentType, action: 'create', initialThought: 'Starting analysis...' };
  }

  addThinkingStep(thought, status = 'active', metadata = {}) {
    if (!this.currentThinkingPanel) return;
    
    const step = {
      id: this.thinkingSteps.length,
      title: `Step ${this.thinkingSteps.length + 1}`,
      detail: thought,
      status, // 'active', 'completed', 'error'
      timestamp: new Date().toISOString(),
      duration: metadata.duration || null,
      metadata
    };
    
    this.thinkingSteps.push(step);
    this.currentThinkingPanel.thoughts.push(step);
    
    return { panelId: this.currentThinkingPanel.id, action: 'addThought', thought: step };
  }

  /**
   * Add MCP source information to the thinking panel
   * @param {Array} sources - Array of MCP source objects
   */
  addMCPSources(sources) {
    if (!this.currentThinkingPanel || !sources) return;
    
    this.currentThinkingPanel.sources = sources.map(source => ({
      type: source.source || source.type || 'unknown',
      name: source.name || source.source || 'Unknown Source',
      confidence: source.confidence || null,
      resultsCount: source.resultsCount || source.count || null,
      responseTime: source.responseTime || source.duration || null,
      description: source.description || null
    }));
  }

  /**
   * Add knowledge memory insights to the thinking panel
   * @param {Object} memoryData - Memory insights and patterns
   */
  addMemoryInsights(memoryData) {
    if (!this.currentThinkingPanel) return;
    
    this.currentThinkingPanel.memory = {
      patterns: memoryData.patterns || [],
      insights: memoryData.insights || [],
      similarQueries: memoryData.similarQueries || [],
      confidence: memoryData.confidence || null
    };
  }

  /**
   * Set overall confidence score for the thinking panel
   * @param {number} confidence - Confidence score between 0 and 1
   */
  setThinkingConfidence(confidence) {
    if (!this.currentThinkingPanel) return;
    
    this.currentThinkingPanel.confidence = confidence;
  }

  /**
   * Update thinking panel status
   * @param {string} status - New status ('processing', 'searching', 'retrieving', 'completed', 'error')
   */
  updateThinkingStatus(status) {
    if (!this.currentThinkingPanel) return;
    
    this.currentThinkingPanel.status = status;
  }

  completeThinkingPanel(finalData = {}) {
    if (!this.currentThinkingPanel) return;
    
    // Mark all steps as completed
    this.thinkingSteps.forEach(step => { 
      if (step.status === 'active') {
        step.status = 'completed'; 
      }
    });
    
    // Add final completion step
    this.addThinkingStep('Analysis complete! Generating response...', 'completed');
    
    // Update panel with final data
    if (finalData.confidence) {
      this.setThinkingConfidence(finalData.confidence);
    }
    
    if (finalData.sources) {
      this.addMCPSources(finalData.sources);
    }
    
    if (finalData.memory) {
      this.addMemoryInsights(finalData.memory);
    }
    
    this.updateThinkingStatus('completed');
    
    const result = {
      panelId: this.currentThinkingPanel.id,
      action: 'complete',
      totalSteps: this.thinkingSteps.length,
      duration: new Date() - new Date(this.currentThinkingPanel.startTime),
      confidence: this.currentThinkingPanel.confidence,
      sources: this.currentThinkingPanel.sources,
      memory: this.currentThinkingPanel.memory
    };
    
    this.currentThinkingPanel.isActive = false;
    return result;
  }

  /**
   * Get current thinking panel state for UI updates with full MCP integration
   */
  getThinkingPanelState() {
    if (!this.currentThinkingPanel) return null;
    
    return {
      panelId: this.currentThinkingPanel.id,
      agentType: this.currentThinkingPanel.agentType,
      isActive: this.currentThinkingPanel.isActive,
      status: this.currentThinkingPanel.status,
      confidence: this.currentThinkingPanel.confidence,
      steps: this.thinkingSteps.map(step => ({
        title: step.title,
        detail: step.detail,
        status: step.status,
        duration: step.duration
      })),
      sources: this.currentThinkingPanel.sources,
      memory: this.currentThinkingPanel.memory,
      totalSteps: this.thinkingSteps.length,
      startTime: this.currentThinkingPanel.startTime
    };
  }

  /**
   * Generate thinking panel markdown for inclusion in responses
   */
  generateThinkingPanelMarkdown() {
    const thinkingState = this.getThinkingPanelState();
    if (!thinkingState) return '';
    
    return `<!--THINKING: ${JSON.stringify(thinkingState)}-->`;
  }

  /**
   * Detect if the user is explicitly requesting a specific agent
   * @param {string} lowerText - The user's input text in lowercase
   * @returns {string|null} The agent key if explicitly requested, null otherwise
   */
  detectExplicitAgentRequest(lowerText) {
    // Explicit agent name patterns
    const agentPatterns = {
      revenue: [
        /revenue\s+agent/i,
        /\brevenue\b/i,
        /talk\s+to\s+revenue/i,
        /speak\s+to\s+revenue/i,
        /ask\s+the\s+revenue/i,
        /contact\s+revenue/i,
        /revenue\s+(please|help|can|what)/i,
        /\brevenue\b.*\b(agent|specialist|expert)\b/i,
        /business\s+growth/i,
        /maximize\s+revenue/i
      ],
      legal: [
        /legal\s+agent/i,
        /lawyer\s+agent/i,
        /talk\s+to\s+legal/i,
        /speak\s+to\s+legal/i,
        /ask\s+the\s+legal/i,
        /contact\s+legal/i,
        /legal\s+(please|help|can|what)/i,
        /\blegal\b.*\b(agent|specialist|expert)\b/i,
        /attorney\s+agent/i
      ],
      finance: [
        /finance\s+agent/i,
        /financial\s+agent/i,
        /talk\s+to\s+finance/i,
        /speak\s+to\s+finance/i,
        /ask\s+the\s+finance/i,
        /contact\s+finance/i,
        /finance\s+(please|help|can|what)/i,
        /\bfinance\b.*\b(agent|specialist|expert)\b/i,
        /financial\s+(specialist|expert|agent)/i
      ]
    };

    // Check each agent's patterns
    for (const [agentKey, patterns] of Object.entries(agentPatterns)) {
      if (patterns.some(pattern => pattern.test(lowerText))) {
        return agentKey;
      }
    }

    return null;
  }  /**
   * Route a task to specialist agents and aggregate results
   * @param {object} originalTask - The original task from the user
   * @param {object} originalMessage - The original message from the user
   * @param {number} userId - User ID for database persistence
   * @returns {Promise<object>} The aggregated response
   */
  async routeTask(originalTask, originalMessage, userId = null) {
    let taskRecord = null;
    
    try {
      // Extract text from message for intent classification
      const textParts = originalMessage.parts.filter(part => part.type === 'text');
      const combinedText = textParts.map(part => part.text).join(' ');
      
      console.log(`[Orchestrator] Processing request: ${combinedText.substring(0, 100)}...`);
      
      // Classify intent and determine which agents to consult
      const classification = await this.classifyIntent(combinedText);
      const targetAgents = classification.agents;
      
      // Create A2A task record in database if userId provided
      if (userId && this.database) {
        try {
          taskRecord = await this.database.createA2ATask({
            userId,
            taskId: originalTask.id,
            initialQuery: combinedText,
            taskType: classification.method === 'ai' ? 'ai_classified' : 'regex_classified',
            primaryAgent: targetAgents[0] || 'revenue',
            classificationConfidence: classification.confidence,
            classificationReasoning: classification.reasoning,
            aiInsights: classification.aiInsights || {},
            assignedAgents: targetAgents,
            metadata: {
              method: classification.method,
              requiresMultipleAgents: classification.requiresMultipleAgents,
              agentConfidences: classification.agentConfidences
            },
            context: {
              originalTaskId: originalTask.id,
              messageLength: combinedText.length,
              textParts: textParts.length
            }
          });
          
          console.log(`[Orchestrator] Created A2A task record: ${taskRecord.task_id}`);
          
          // Log initial user message
          await this.database.logA2AMessage({
            userId,
            taskId: originalTask.id,
            messageId: generateTaskId(),
            content: combinedText,
            messageType: 'user_query',
            senderType: 'user',
            metadata: {
              textParts: textParts.length,
              classification
            }
          });
          
        } catch (dbError) {
          console.error('[Orchestrator] Database error during task creation:', dbError);
          // Continue processing even if database fails
        }
      }
      
      console.log(`[Orchestrator] Classification - Method: ${classification.method}, Confidence: ${classification.confidence}, Agents: ${targetAgents.join(' → ')}`);
      console.log(`[Orchestrator] Reasoning: ${classification.reasoning}`);
      
      // Check if confidence is below escalation threshold
      if (classification.confidence < 0.4) {
        console.log(`[Orchestrator] Low confidence (${classification.confidence}), adding human escalation flag`);
      }
        // Process agents sequentially with delegation logic
      const agentResults = await this.processAgentsSequentially(
        targetAgents, 
        originalTask, 
        originalMessage, 
        combinedText,
        classification,
        userId
      );
      
      // Process results and aggregate
      const successfulResults = [];
      const failedResults = [];
      
      agentResults.forEach((result) => {
        if (result.success) {
          successfulResults.push(result);
        } else {
          failedResults.push(result);
        }
      });
        // Calculate overall success rate
      const successRate = targetAgents.length > 0 ? successfulResults.length / targetAgents.length : 0;
      const shouldEscalate = classification.confidence < 0.4 || successRate < 0.5;
      
      console.log(`[Orchestrator] Results - Success Rate: ${successRate}, Classification Confidence: ${classification.confidence}, Escalate: ${shouldEscalate}`);
      
      // Determine if this was a single agent request
      const isSingleAgent = targetAgents.length === 1;
      
      // Generate aggregated response with sequential agent metadata
      const aggregatedText = this.aggregateSequentialResponses(
        successfulResults, 
        failedResults, 
        shouldEscalate, 
        isSingleAgent
      );
      
      // Create response task and message
      const responseTask = {
        ...originalTask,
        state: shouldEscalate ? 'input-required' : 'completed'
      };
        const responseParts = [createTextPart(aggregatedText, 'aggregated-response')];
        // Add metadata about the sequential process and classification
      responseParts.push(createDataPart({
        classification_confidence: classification.confidence,
        classification_method: classification.method,
        classification_reasoning: classification.reasoning,
        agent_confidences: classification.agentConfidences || {},
        requires_multiple_agents: classification.requiresMultipleAgents || false,
        success_rate: successRate,
        agents_consulted: targetAgents,
        successful_agents: successfulResults.map(r => r.agent),
        failed_agents: failedResults.map(r => r.agent),
        escalate: shouldEscalate,
        active_agent: isSingleAgent && successfulResults.length > 0 ? successfulResults[0].agent : null,
        single_agent_mode: isSingleAgent,
        sequential_mode: true,
        agent_sequence: agentResults.map(r => ({ agent: r.agent, order: r.order, success: r.success })),
        delegation_chain: agentResults.filter(r => r.delegated_from).map(r => ({ 
          from: r.delegated_from, 
          to: r.agent, 
          reason: r.delegation_reason 
        })),        ai_insights: classification.aiInsights || null,
        thinking_panel: classification.thinkingPanel || this.getThinkingPanelState(),
        timestamp: new Date().toISOString()
      }, 'orchestration-metadata'));const responseMessage = createMessage(responseParts, 'agent');
      
      // Update task status and log final response in database
      if (userId && this.database) {
        try {
          const finalStatus = shouldEscalate ? 'requires_escalation' : 'completed';
          const aggregatedTextPreview = aggregatedText.substring(0, 500);
            await this.database.updateA2ATaskStatus(originalTask.id, {
            status: finalStatus,
            result: {
              successRate,
              agentsConsulted: targetAgents.length,
              successfulAgents: successfulResults.length,
              failedAgents: failedResults.length,
              escalated: shouldEscalate,
              isSingleAgent,
              finalResponseLength: aggregatedText.length
            },
            completed_at: new Date().toISOString()
          });
          
          // Log final aggregated response
          await this.database.logA2AMessage({
            userId,
            taskId: originalTask.id,
            messageId: generateTaskId(),
            content: aggregatedTextPreview,
            messageType: 'orchestrator_response',
            senderType: 'orchestrator',
            metadata: {
              classification,
              successRate,
              agentsConsulted: targetAgents,
              successful: successfulResults.map(r => r.agent),
              failed: failedResults.map(r => r.agent),
              escalated: shouldEscalate,
              isSingleAgent,
              responseLength: aggregatedText.length,
              finalStatus
            }
          });
          
          console.log(`[Orchestrator] Updated task status to: ${finalStatus}, logged final response`);
          
        } catch (dbError) {
          console.error('[Orchestrator] Database error during final status update:', dbError);
        }
      }
      
      return {
        task: responseTask,
        message: stripMarkdownFromMessage(responseMessage)
      };
      
    } catch (error) {
      console.error('[Orchestrator] Fatal error during routing:', error);
      throw error;
    }  }
  /**
   * Process agents sequentially with intelligent delegation
   * @param {Array<string>} targetAgents - Initial agents to consult
   * @param {object} originalTask - The original task
   * @param {object} originalMessage - The original message
   * @param {string} combinedText - The combined text for analysis
   * @param {object} classification - Classification results
   * @param {number} userId - User ID for database logging
   * @returns {Promise<Array>} Array of agent results with delegation info
   */
  async processAgentsSequentially(targetAgents, originalTask, originalMessage, combinedText, classification, userId = null) {
    const results = [];
    let currentAgents = [...targetAgents];
    let processedAgents = new Set();
    let order = 1;

    while (currentAgents.length > 0) {
      const agentKey = currentAgents.shift();
      
      // Skip if already processed
      if (processedAgents.has(agentKey)) {
        continue;
      }
      
      const agent = this.agents[agentKey];
      processedAgents.add(agentKey);
      
      // Create sub-task for the specialist agent
      const subTask = createTask({
        parentId: originalTask.id,
        agentId: agentKey,
        state: 'submitted'
      });
        try {
        // Add thinking step for agent consultation
        this.addThinkingStep(`Step ${order}: Consulting ${agent.name} for specialized analysis...`);
        console.log(`[Orchestrator] Step ${order}: Consulting ${agent.name}...`);
          // Log agent interaction start
        if (userId && this.database) {
          try {
            await this.database.recordAgentInteraction({
              userId,
              taskId: originalTask.id,
              fromAgent: 'orchestrator',
              toAgent: agentKey,
              interactionType: 'consultation_start',
              reason: order === 1 ? 'initial_classification' : 'delegation',
              contextPassed: {
                agentOrder: order,
                subTaskId: subTask.id,
                consultationReason: order === 1 ? 'initial_classification' : 'delegation',
                parentTaskId: originalTask.id,
                agentUrl: agent.url,
                specialties: agent.specialties,
                classificationConfidence: classification.confidence,
                processedAgents: Array.from(processedAgents)
              }
            });
          } catch (dbError) {
            console.error('[Orchestrator] Database error during agent interaction logging:', dbError);
          }
        }
        
        let response;
        if (agentKey === 'general') {
          // Handle general agent in-process
          const generalResult = await this.handleGeneralRequest(combinedText);
          response = {
            result: {
              message: {
                parts: [
                  { type: 'text', text: generalResult.response }
                ]
              }
            }
          };
        } else {
          // Handle external specialist agents
          response = await this.client.sendTask(
            agent.url,
            subTask,
            originalMessage,
            { timeout: 30000 }
          );
        }
        
        const result = {
          agent: agentKey,
          success: true,
          response: response.result,
          error: null,
          order: order++,
          timestamp: new Date().toISOString()
        };
          results.push(result);
        
        // Add thinking step for successful response
        this.addThinkingStep(`✅ ${agent.name} provided successful analysis`);
        
        // Log successful agent response
        if (userId && this.database) {
          try {
            const responseText = response.result?.message?.parts
              ?.filter(part => part.type === 'text')
              ?.map(part => part.text)
              ?.join(' ') || 'No text response';
              
            await this.database.logA2AMessage({
              userId,
              taskId: originalTask.id,
              messageId: generateTaskId(),
              content: responseText.substring(0, 1000), // Limit length
              messageType: 'agent_response',
              senderType: 'agent',
              metadata: {
                agentName: agentKey,
                agentOrder: order - 1,
                subTaskId: subTask.id,
                responseLength: responseText.length,
                successful: true
              }
            });
              await this.database.recordAgentInteraction({
              userId,
              taskId: originalTask.id,
              fromAgent: agentKey,
              toAgent: 'orchestrator',
              interactionType: 'consultation_success',
              responseTimeMs: null,
              success: true,
              contextPassed: {
                responseLength: responseText.length,
                hasTextParts: response.result?.message?.parts?.some(p => p.type === 'text') || false,
                hasDataParts: response.result?.message?.parts?.some(p => p.type === 'data') || false,
                agentOrder: order - 1,
                subTaskId: subTask.id,
                processingTime: new Date().toISOString()
              }
            });
          } catch (dbError) {
            console.error('[Orchestrator] Database error during agent response logging:', dbError);
          }
        }
        
        // Analyze response for potential delegation needs
        const delegationNeeds = this.analyzeDelegationNeeds(
          response.result, 
          agentKey, 
          combinedText, 
          processedAgents
        );
          if (delegationNeeds.length > 0) {
          // Add thinking step for delegation
          this.addThinkingStep(`🔄 ${agent.name} suggests consulting: ${delegationNeeds.join(', ')}`);
          console.log(`[Orchestrator] ${agent.name} suggests consulting: ${delegationNeeds.join(', ')}`);
            // Log delegation decision
          if (userId && this.database) {
            try {
              await this.database.recordAgentInteraction({
                userId,
                taskId: originalTask.id,
                fromAgent: agentKey,
                toAgent: delegationNeeds.join(','),
                interactionType: 'delegation',
                reason: 'response_analysis_triggered_delegation',
                contextPassed: {
                  delegatedTo: delegationNeeds,
                  fromAgent: agentKey,
                  toAgents: delegationNeeds,
                  agentOrder: order - 1
                }
              });
            } catch (dbError) {
              console.error('[Orchestrator] Database error during delegation logging:', dbError);
            }
          }
          
          // Add new agents to the queue with delegation metadata
          delegationNeeds.forEach(delegatedAgent => {
            if (!processedAgents.has(delegatedAgent)) {
              currentAgents.push(delegatedAgent);
              // Mark this result as having triggered delegation
              result.delegated_to = delegationNeeds;
              result.delegation_reason = this.getDelegationReason(agentKey, delegatedAgent);
            }
          });
        }
          } catch (error) {
        // Add thinking step for error
        this.addThinkingStep(`❌ Error from ${agent.name}: ${error.message}`);
        console.error(`[Orchestrator] Error from ${agent.name}:`, error.message);
        
        const errorResult = {
          agent: agentKey,
          success: false,
          response: null,
          error: error.message,
          order: order++,
          timestamp: new Date().toISOString()
        };
        
        results.push(errorResult);
        
        // Log agent error
        if (userId && this.database) {
          try {
            await this.database.logA2AMessage({
              userId,
              taskId: originalTask.id,
              messageId: generateTaskId(),
              content: `Agent error: ${error.message}`,
              messageType: 'agent_error',
              senderType: 'system',
              metadata: {
                agentName: agentKey,
                agentOrder: order - 1,
                errorType: error.name || 'Unknown',
                successful: false
              }
            });
              await this.database.recordAgentInteraction({
              userId,
              taskId: originalTask.id,
              fromAgent: agentKey,
              toAgent: 'orchestrator',
              interactionType: 'consultation_error',
              success: false,
              reason: error.message,
              contextPassed: {
                error: error.message,
                errorType: error.name || 'Unknown',
                agentOrder: order - 1,
                subTaskId: subTask.id,
                errorTime: new Date().toISOString()
              }
            });
          } catch (dbError) {
            console.error('[Orchestrator] Database error during error logging:', dbError);
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Analyze agent response to determine if additional expertise is needed
   * @param {object} response - Agent response to analyze
   * @param {string} currentAgent - Current agent that provided the response
   * @param {string} originalText - Original user query
   * @param {Set} processedAgents - Already consulted agents
   * @returns {Array<string>} Array of additional agents to consult
   */
  analyzeDelegationNeeds(response, currentAgent, originalText, processedAgents) {
    const delegationNeeds = [];
    
    // Ensure originalText is a string
    let originalTextStr = '';
    if (typeof originalText === 'string') {
      originalTextStr = originalText;
    } else if (typeof originalText === 'object' && originalText !== null) {
      // Try to extract text from object if it has text properties
      originalTextStr = originalText.text || originalText.content || originalText.message || '';
    }
    
    // Extract response text for analysis
    const responseParts = response.message?.parts?.filter(part => part.type === 'text') || [];
    const responseText = responseParts.map(part => part.text).join(' ').toLowerCase();
    
    // Delegation patterns based on agent responses
    const delegationPatterns = {
      revenue: {
        to_legal: [
          /legal review/i, /attorney/i, /compliance/i, /contract/i, /nda/i,
          /legal advice/i, /regulatory/i, /due diligence/i, /liability/i
        ],
        to_finance: [
          /financial analysis/i, /ebitda/i, /cash flow/i, /tax implications/i,
          /financial review/i, /accounting/i, /valuation model/i, /financial due diligence/i
        ]
      },
      legal: {
        to_revenue: [
          /business growth/i, /revenue strategy/i, /sales optimization/i, /growth strategy/i,
          /revenue maximization/i, /business development/i, /market optimization/i
        ],
        to_finance: [
          /financial impact/i, /tax/i, /ebitda/i, /financial structure/i,
          /cost analysis/i, /financial compliance/i
        ]
      },
      finance: {
        to_revenue: [
          /growth strategy/i, /revenue optimization/i, /sales strategy/i, /business growth/i,
          /market analysis/i, /business development/i
        ],
        to_legal: [
          /legal structure/i, /compliance/i, /regulatory/i, /contract/i,
          /legal implications/i, /due diligence/i
        ]
      }
    };
    
    // Check for delegation patterns
    const currentPatterns = delegationPatterns[currentAgent] || {};
    
    Object.entries(currentPatterns).forEach(([targetAgent, patterns]) => {
      const agentKey = targetAgent.replace('to_', '');
      
      if (!processedAgents.has(agentKey) && 
          patterns.some(pattern => pattern.test(responseText))) {
        delegationNeeds.push(agentKey);
      }
    });
    
    // Also check original query for missed specialties
    const originalLower = originalTextStr.toLowerCase();
    
    if (currentAgent === 'revenue' && !processedAgents.has('legal')) {
      if (/legal|contract|nda|compliance|attorney|regulation/i.test(originalLower)) {
        delegationNeeds.push('legal');
      }
    }
    
    if (currentAgent === 'revenue' && !processedAgents.has('finance')) {
      if (/financial|ebitda|tax|cash.?flow|accounting|financial.?analysis/i.test(originalLower)) {
        delegationNeeds.push('finance');
      }
    }
    
    return [...new Set(delegationNeeds)]; // Remove duplicates
  }

  /**
   * Get delegation reason for logging
   * @param {string} fromAgent - Agent that triggered delegation
   * @param {string} toAgent - Agent being delegated to
   * @returns {string} Reason for delegation
   */
  getDelegationReason(fromAgent, toAgent) {
    const reasons = {
      'revenue-legal': 'Legal expertise needed for contracts and compliance',
      'revenue-finance': 'Financial analysis required for business growth strategy',
      'legal-revenue': 'Business growth and revenue optimization expertise needed',
      'legal-finance': 'Financial impact analysis required',
      'finance-revenue': 'Revenue optimization and growth strategy needed',
      'finance-legal': 'Legal structure and compliance review needed'
    };
    
    return reasons[`${fromAgent}-${toAgent}`] || 'Additional specialized expertise required';
  }

  /**
   * Aggregate responses from sequential agent consultation (refactored for deduplication, attribution, and actionable summary)
   * @param {Array} successfulResults - Results from successful agent calls
   * @param {Array} failedResults - Results from failed agent calls
   * @param {boolean} shouldEscalate - Whether to escalate to human
   * @param {boolean} isSingleAgent - Whether this was a single agent request
   * @returns {string} Aggregated response text
   */
  aggregateSequentialResponses(successfulResults, failedResults, shouldEscalate, isSingleAgent = false) {
    let aggregatedText = '';
    if (shouldEscalate) {
      aggregatedText += '## Escalation Required\n\nI need to escalate this request to a human agent for the best assistance. ';
      aggregatedText += "However, here's what our specialist agents were able to analyze:\n\n";
    } else if (isSingleAgent && successfulResults.length === 1) {
      // For single agent requests, provide a cleaner response
      const result = successfulResults[0];
      const textParts = result.response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        aggregatedText = textParts.map(part => part.text).join('\n');
      } else {
        aggregatedText = 'Analysis completed successfully.';
      }
      return aggregatedText;
    } else {
      aggregatedText += '## Analysis Summary\n\nOur specialist agents have analyzed your request sequentially:\n\n';
    }

    // Sort results by order and add each agent's response
    const sortedResults = successfulResults.sort((a, b) => (a.order || 0) - (b.order || 0));

    // --- Deduplication and Knowledge Map Memory ---
    // Collect all key findings and map them for deduplication
    const findingsMap = new Map();
    const agentAttributions = [];
    sortedResults.forEach((result, index) => {
      const agentName = this.agents[result.agent]?.name || result.agent;
      const textParts = result.response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        // Split into sentences for deduplication
        const sentences = textParts.map(part => part.text).join(' ').split(/(?<=\.|!|\?)\s+/);
        sentences.forEach(sentence => {
          const trimmed = sentence.trim();
          if (trimmed.length > 30 && !findingsMap.has(trimmed)) {
            findingsMap.set(trimmed, agentName);
          }
        });
      }
    });

    // --- Sequential Thinking: Synthesize and Attribute ---
    let step = 1;
    findingsMap.forEach((agent, finding) => {
      agentAttributions.push(`### Step ${step}: ${agent.toUpperCase()}\n${finding}`);
      step++;
    });
    aggregatedText += agentAttributions.join('\n\n---\n\n');

    // Add information about failed agents if any
    if (failedResults.length > 0 && !shouldEscalate) {
      aggregatedText += '\n\n> **Note:** Some specialist agents were unavailable during the consultation chain.';
    }

    // --- Actionable, Non-Repetitive Final Summary ---
    if (findingsMap.size > 1) {
      aggregatedText += '\n\n## Final Conclusion\n\n';
      aggregatedText += 'Key actionable takeaways from all specialist agents:';
      let i = 1;
      findingsMap.forEach((agent, finding) => {
        // Only include the first sentence for brevity
        const firstSentence = finding.split(/\.|!|\?/)[0];
        aggregatedText += `\n${i}. **${agent}**: ${firstSentence.trim()}.`;
        i++;
      });
    }

    // Apply final markdown formatting enhancements
    return formatAgentResponse(aggregatedText, 'orchestrator');
  }

  /**
   * Aggregate responses from multiple specialist agents (legacy method for compatibility)
   * @param {Array} successfulResults - Results from successful agent calls
   * @param {Array} failedResults - Results from failed agent calls
   * @param {boolean} shouldEscalate - Whether to escalate to human
   * @param {boolean} isSingleAgent - Whether this was a single agent request
   * @returns {string} Aggregated response text
   */
  aggregateResponses(successfulResults, failedResults, shouldEscalate, isSingleAgent = false) {
    let aggregatedText = '';
    
    if (shouldEscalate) {
      aggregatedText += 'I need to escalate this request to a human agent for the best assistance. ';
      aggregatedText += 'However, here\'s what I was able to gather:\n\n';
    } else if (isSingleAgent && successfulResults.length === 1) {
      // For single agent requests, provide a cleaner response without "ANALYSIS" headers
      const result = successfulResults[0];
      const textParts = result.response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        aggregatedText = textParts.map(part => part.text).join('\n');
      } else {
        aggregatedText = 'Analysis completed successfully.';
      }
      return aggregatedText;
    } else {
      aggregatedText += 'Based on analysis from our specialist agents:\n\n';
    }
      // Add successful results
    successfulResults.forEach((result, index) => {
      const agentName = this.agents[result.agent]?.name || result.agent;
      aggregatedText += `${agentName.toUpperCase()} ANALYSIS:\n`;
      
      // Extract text from response message
      const textParts = result.response.message.parts.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        aggregatedText += textParts.map(part => part.text).join('\n');
      } else {
        aggregatedText += 'Analysis completed successfully.';
      }
      
      if (index < successfulResults.length - 1) {
        aggregatedText += '\n\n---\n\n';
      }
    });
    
    // Add information about failed agents if any
    if (failedResults.length > 0 && !shouldEscalate) {
      aggregatedText += '\n\n*Note: Some specialist agents were unavailable, but the above analysis should be sufficient.*';
    }
      if (shouldEscalate) {
      aggregatedText += '\n\nNEXT STEPS:\n';
      aggregatedText += 'A revenue optimization specialist will review your request and provide additional guidance. ';
      aggregatedText += 'You can contact them directly at hello@arzani.co.uk';
    }
    
    return aggregatedText;
  }

  /**
   * Get agent health status
   * @returns {Promise<object>} Health status of all agents
   */
  async getAgentHealth() {
    const healthChecks = Object.entries(this.agents).map(async ([key, agent]) => {
      try {
        const healthURL = agent.url.replace('/a2a/tasks/send', '/health');
        const response = await fetch(healthURL, { timeout: 5000 });
        return {
          agent: key,
          status: response.ok ? 'healthy' : 'unhealthy',
          url: healthURL
        };
      } catch (error) {
        return {
          agent: key,
          status: 'unreachable',
          error: error.message
        };
      }
    });
    
    const results = await Promise.allSettled(healthChecks);
    
    return results.map((result, index) => {
      const agentKey = Object.keys(this.agents)[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          agent: agentKey,
          status: 'error',
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  async handleGeneralRequest(text) {
    console.log('[Orchestrator] Handling request with Generalist Agent', { text });
    try {
      // Ensure text is a string, not an object
      let userMessage = text;
      if (typeof text === 'object') {
        // If it's a task object, we can't extract meaningful text - use a default message
        userMessage = "Hello, how can I help you today?";
        console.log('[Orchestrator] Warning: Received object instead of text, using default message');
      } else if (!text || typeof text !== 'string') {
        userMessage = "Hello, how can I help you today?";
        console.log('[Orchestrator] Warning: Received invalid text, using default message');
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: enhanceSystemPromptWithMarkdown(`You are the Generalist Agent. You are part of a larger system. Your role is to handle general queries, provide helpful information, manage simple tasks, and engage in small talk. If a user's request seems to fall outside the scope of the specialist agents (Finance, Legal, Revenue), you should handle it. Be helpful, concise, and clear. If you cannot fulfill a request, explain why and suggest what you can do.

**CRITICAL MARKDOWN FORMATTING REQUIREMENTS:**
You MUST format ALL your responses using proper **GitHub-flavoured Markdown** for every element:

### Headings
- Use **##** for main sections
- Use **###** for subsections
- Always include a space after the # symbols

### Lists
- Use **-** for unordered lists (with a space after the dash)
- Use **1.** for numbered lists (with proper sequential numbering)
- Use proper indentation for nested lists (two spaces per level)

### Emphasis
- Use **bold text** for important points and key information
- Use *italic text* for definitions or supplementary information
- Use > blockquotes for important notes or highlights
- Use horizontal rules (---) to separate major sections

Be consistent with all other agents in the system by using proper markdown formatting.`, 'generalist')
          },
          { role: 'user', content: userMessage }
        ]
      });
      const message = response.choices[0].message;
      console.log('[Orchestrator] Generalist Agent response:', { message });
      return { success: true, response: message.content };
    } catch (error) {
      console.log(`[Orchestrator] Error in handleGeneralRequest: ${error.message}`, { stack: error.stack });
      return { success: false, response: 'An error occurred while processing your request with the Generalist Agent.' };
    }
  }
}
