/**
 * Legal Agent Configuration with OpenAI Tools Integration
 * 
 * Configuration for the enhanced legal agent using GPT-4.1 mini
 * with OpenAI's new tools: file search, web search, and code interpreter
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Initialize OpenAI client with tools enabled
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Enhanced configuration for legal agent with new OpenAI capabilities
export const LEGAL_AGENT_CONFIG = {
  // Model configuration optimized for GPT-4.1 mini
  model: {
    name: 'gpt-4.1-mini',
    temperature: 0.2,          // Low temperature for precise legal analysis
    maxTokens: 4000,          // Higher limit for complex legal documents
    topP: 0.95,               // Focused sampling
    frequencyPenalty: 0.1,    // Reduce repetition
    presencePenalty: 0.1      // Encourage comprehensive analysis
  },
  
  // OpenAI Tools Configuration
  tools: {
    // File search for legal document analysis
    fileSearch: {
      enabled: true,
      maxFiles: 20,
      supportedFormats: ['.pdf', '.docx', '.txt', '.md'],
      categories: [
        'contracts',
        'legal_templates',
        'regulatory_documents',
        'case_law',
        'compliance_guides'
      ]
    },
    
    // Web search for real-time legal research
    webSearch: {
      enabled: true,
      maxResults: 10,
      domains: [
        'gov',                  // Government websites
        'legislature.gov',      // Legislative resources
        'courts.gov',          // Court decisions
        'bar.org',             // Bar association resources
        'law.edu'              // Legal education resources
      ],
      categories: [
        'regulatory_updates',
        'case_law',
        'legal_precedents',
        'compliance_requirements',
        'legislative_changes'
      ]
    },
    
    // Code interpreter for legal calculations and analysis
    codeInterpreter: {
      enabled: true,
      allowedLibraries: [
        'pandas',              // Data analysis for financial terms
        'numpy',               // Numerical calculations
        'matplotlib',          // Charts for legal analytics
        'datetime'             // Date calculations for legal terms
      ]
    }
  },
  
  // Legal specialization prompts
  specialization: {
    businessTransactions: {
      systemPrompt: `You are a specialized Business Transaction Legal AI with access to real-time legal research tools.
      
      **YOUR EXPERTISE:**
      - Business mergers and acquisitions
      - Commercial contract analysis
      - Regulatory compliance assessment
      - Due diligence procedures
      - Risk assessment and mitigation
      
      **YOUR TOOLS:**
      - File Search: Access to legal document templates and precedents
      - Web Search: Real-time regulatory and case law research
      - Code Interpreter: Financial and legal calculations
      
      **ANALYSIS FRAMEWORK:**
      Always use the ReAct (Reasoning + Acting) approach:
      1. THOUGHT: Analyze the legal question
      2. ACTION: Use tools to research relevant law/precedents
      3. OBSERVATION: Review findings from tools
      4. REASONING: Apply legal principles to the specific situation
      5. CONCLUSION: Provide actionable legal guidance
      
      Focus on practical, compliant solutions while highlighting risks.`,
      
      capabilities: [
        'nda_generation',
        'compliance_analysis',
        'contract_review',
        'risk_assessment',
        'due_diligence_guidance'
      ]
    },
    
    regulatoryCompliance: {
      systemPrompt: `You are a Regulatory Compliance Legal AI specializing in business law compliance.
      
      **YOUR EXPERTISE:**
      - Multi-jurisdictional compliance requirements
      - Industry-specific regulations
      - Real-time regulatory monitoring
      - Compliance gap analysis
      
      Use your tools to access the most current regulatory information and provide comprehensive compliance guidance.`,
      
      capabilities: [
        'regulatory_research',
        'compliance_gap_analysis',
        'industry_specific_guidance',
        'regulatory_change_monitoring'
      ]
    }
  },
  
  // Performance monitoring and metrics
  monitoring: {
    logRequests: process.env.LOG_LEGAL_REQUESTS === 'true',
    trackTokenUsage: true,
    measureResponseTimes: true,
    auditTrail: true,
    
    metrics: {
      accuracy: 'track_legal_accuracy',
      compliance: 'track_regulatory_compliance',
      clientSatisfaction: 'track_user_feedback',
      toolUsage: 'track_openai_tools_usage'
    }
  },
  
  // Safety and compliance settings
  safety: {
    contentFiltering: true,
    disclaimerRequired: false,
    humanOversightTriggers: [
      'high_value_transactions',
      'complex_regulatory_issues',
      'litigation_risk',
      'cross_border_transactions'
    ]
  }
};

/**
 * Create an OpenAI assistant with legal tools enabled
 * @param {string} specialization - Type of legal specialization
 * @returns {Promise<object>} - Created assistant object
 */
export async function createLegalAssistant(specialization = 'businessTransactions') {
  const config = LEGAL_AGENT_CONFIG.specialization[specialization];
  
  if (!config) {
    throw new Error(`Unknown legal specialization: ${specialization}`);
  }
  
  try {
    const assistant = await openai.beta.assistants.create({
      name: `Legal AI Agent - ${specialization}`,
      instructions: config.systemPrompt,
      model: LEGAL_AGENT_CONFIG.model.name,
      tools: [
        { type: 'file_search' },
        { type: 'web_search' },
        { type: 'code_interpreter' }
      ],
      temperature: LEGAL_AGENT_CONFIG.model.temperature,
      top_p: LEGAL_AGENT_CONFIG.model.topP
    });
    
    console.log(`[LEGAL_AGENT] Created assistant: ${assistant.id} for ${specialization}`);
    return assistant;
    
  } catch (error) {
    console.error('[LEGAL_AGENT] Error creating assistant:', error);
    throw error;
  }
}

/**
 * Enhanced legal analysis using OpenAI tools
 * @param {string} query - Legal question or request
 * @param {object} context - Additional context and files
 * @param {string} specialization - Legal specialization to use
 * @returns {Promise<object>} - Comprehensive legal analysis
 */
export async function performEnhancedLegalAnalysis(query, context = {}, specialization = 'businessTransactions') {
  const startTime = Date.now();
  
  try {
    // Create or get existing assistant
    const assistant = await createLegalAssistant(specialization);
    
    // Create a thread for this analysis
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: constructEnhancedLegalPrompt(query, context)
        }
      ]
    });
    
    // Upload any relevant files for analysis
    if (context.files && context.files.length > 0) {
      for (const file of context.files) {
        await openai.files.create({
          file: file,
          purpose: 'assistants'
        });
      }
    }
    
    // Run the analysis with tools
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      instructions: `Provide comprehensive legal analysis using all available tools. 
      Research current regulations, analyze any provided documents, and perform necessary calculations. 
      Structure your response using the ReAct framework.`
    });
    
    // Wait for completion and get results
    const result = await waitForRunCompletion(thread.id, run.id);
    
    const responseTime = Date.now() - startTime;
    
    // Log metrics
    logEnhancedLegalMetrics(query, responseTime, result.usage, true, specialization);
    
    return {
      success: true,
      analysis: result.content,
      toolsUsed: result.toolsUsed,
      assistantId: assistant.id,
      threadId: thread.id,
      metadata: {
        model: LEGAL_AGENT_CONFIG.model.name,
        specialization,
        responseTime,
        tokensUsed: result.usage.totalTokens
      }
    };
    
  } catch (error) {
    console.error('[LEGAL_AGENT] Error in enhanced analysis:', error);
    logEnhancedLegalMetrics(query, Date.now() - startTime, null, false, specialization);
    
    return {
      success: false,
      error: error.message,
      fallback: await getFallbackLegalAnalysis(query, context, specialization)
    };
  }
}

/**
 * Construct enhanced legal prompt with context
 * @param {string} query - Legal question
 * @param {object} context - Additional context
 * @returns {string} - Enhanced prompt
 */
function constructEnhancedLegalPrompt(query, context) {
  let prompt = `LEGAL ANALYSIS REQUEST\n\n`;
  prompt += `QUERY: ${query}\n\n`;
  
  if (context.jurisdiction) {
    prompt += `JURISDICTION: ${context.jurisdiction}\n`;
  }
  if (context.businessType) {
    prompt += `BUSINESS TYPE: ${context.businessType}\n`;
  }
  if (context.transactionValue) {
    prompt += `TRANSACTION VALUE: ${context.transactionValue}\n`;
  }
  if (context.timeline) {
    prompt += `TIMELINE: ${context.timeline}\n`;
  }
  if (context.specificConcerns) {
    prompt += `SPECIFIC CONCERNS: ${context.specificConcerns}\n`;
  }
  
  prompt += `\nINSTRUCTIONS:\n`;
  prompt += `1. Use file search to find relevant legal templates and precedents\n`;
  prompt += `2. Use web search to verify current regulations and recent legal developments\n`;
  prompt += `3. Use code interpreter for any necessary calculations or data analysis\n`;
  prompt += `4. Provide comprehensive analysis using the ReAct framework\n`;
  prompt += `5. Include specific actionable recommendations\n`;
  prompt += `6. Highlight any compliance risks or regulatory considerations\n`;
  prompt += `7. Suggest when professional legal counsel is recommended\n\n`;
  
  return prompt;
}

/**
 * Wait for OpenAI run completion and extract results
 * @param {string} threadId - Thread ID
 * @param {string} runId - Run ID
 * @returns {Promise<object>} - Run results
 */
async function waitForRunCompletion(threadId, runId) {
  let run;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes maximum wait
  
  do {
    run = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    if (run.status === 'completed') {
      break;
    } else if (run.status === 'failed' || run.status === 'cancelled') {
      throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
    }
    
    // Wait 10 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 10000));
    attempts++;
    
  } while (attempts < maxAttempts);
  
  if (run.status !== 'completed') {
    throw new Error('Run timed out');
  }
  
  // Get the messages from the thread
  const messages = await openai.beta.threads.messages.list(threadId);
  const latestMessage = messages.data[0];
  
  return {
    content: latestMessage.content[0].text.value,
    toolsUsed: run.tools || [],
    usage: run.usage || { totalTokens: 0 }
  };
}

/**
 * Log enhanced legal analysis metrics
 * @param {string} query - User query
 * @param {number} responseTime - Response time in ms
 * @param {object} usage - Token usage
 * @param {boolean} success - Success status
 * @param {string} specialization - Legal specialization used
 */
function logEnhancedLegalMetrics(query, responseTime, usage, success, specialization) {
  if (!LEGAL_AGENT_CONFIG.monitoring.logRequests) return;
  
  const logData = {
    timestamp: new Date().toISOString(),
    agent: 'enhanced-legal-agent',
    model: LEGAL_AGENT_CONFIG.model.name,
    specialization,
    queryLength: query.length,
    responseTime,
    tokensUsed: usage?.totalTokens || 0,
    success,
    toolsEnabled: ['file_search', 'web_search', 'code_interpreter']
  };
  
  console.log('[ENHANCED_LEGAL_METRICS]', JSON.stringify(logData));
}

/**
 * Get fallback analysis when enhanced tools fail
 * @param {string} query - Legal question
 * @param {object} context - Context
 * @param {string} specialization - Specialization
 * @returns {object} - Fallback analysis
 */
async function getFallbackLegalAnalysis(query, context, specialization) {
  return {
    thought: "Enhanced AI tools temporarily unavailable, providing standard legal analysis.",
    action: "Applying standard legal analysis framework based on stored knowledge.",
    observation: "Standard legal principles apply to business transactions with emphasis on compliance and risk mitigation.",
    reasoning: "Business transactions require comprehensive legal review, proper documentation, and regulatory compliance.",
    conclusion: "Recommend immediate consultation with qualified legal counsel for detailed analysis and guidance.",
    recommendations: [
      "Engage a qualified business attorney familiar with your jurisdiction",
      "Conduct thorough legal due diligence",
      "Ensure all regulatory requirements are met",
      "Prepare comprehensive legal documentation",
      "Consider professional liability insurance"
    ],
    risks: [
      "Regulatory non-compliance",
      "Inadequate legal documentation",
      "Missed disclosure requirements",
      "Jurisdictional compliance gaps",
      "Potential legal disputes"
    ],
    specialization,
    fallback: true
  };
}

export default {
  LEGAL_AGENT_CONFIG,
  createLegalAssistant,
  performEnhancedLegalAnalysis
};
