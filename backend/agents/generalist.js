/**
 * Generalist Coordinator Agent (G-A) for Arzani-AI
 * 
 * Orchestrates communication between user and specialist agents using A2A protocol
 */

const agentRegistry = require('../a2a/agentRegistry');
const { createEmbedding } = require('../vectorUtils');
const db = require('../db/models');
const logger = require('../utils/logger');

class GeneralistAgent {
  constructor() {
    this.systemPrompt = `You are the Arzani Generalist Coordinator Agent. Your role is to:
1. Understand user inquiries about business buying/selling
2. Classify intent and delegate to appropriate specialist agents via A2A protocol
3. Coordinate responses from specialists into a cohesive, single-voice response
4. Maintain conversation context and history
5. Detect low confidence situations that require human escalation`;
  }
  
  /**
   * Classify user intent to determine which specialist agent to use
   */
  async classifyIntent(message) {
    // Simple rule-based intent classification
    const text = typeof message === 'string' ? message : message.text;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('value') || lowerText.includes('worth') || 
        lowerText.includes('price') || lowerText.includes('negotiate')) {
      return 'broker';
    } else if (lowerText.includes('tax') || lowerText.includes('financial') || 
              lowerText.includes('ebitda') || lowerText.includes('profit')) {
      return 'finance';
    } else if (lowerText.includes('legal') || lowerText.includes('contract') || 
              lowerText.includes('compliance') || lowerText.includes('regulation')) {
      return 'legal';
    }
    
    // Default to broker for general inquiries
    return 'broker';
  }
  
  /**
   * Process user message and orchestrate response from specialist agents
   */
  async processMessage(sessionId, message, context = {}) {
    try {
      logger.info(`Processing message for session ${sessionId}`);
      
      // Store message in conversation history
      await this.storeConversationMemory(sessionId, 'user', message);
      
      // Get relevant conversation history
      const history = await this.getConversationMemory(sessionId, 5);
      
      // Classify intent to determine specialist
      const intent = await this.classifyIntent(message);
      logger.info(`Classified intent as: ${intent}`);
      
      // Check confidence level - implement detection of low confidence
      const confidenceScore = this.calculateConfidence(message);
      const needsHumanEscalation = confidenceScore < 0.7;
      
      if (needsHumanEscalation) {
        logger.warn(`Low confidence detected (${confidenceScore}), flagging for human escalation`);
        return {
          response: "I'm not entirely confident about how to help with this specific query. Let me connect you with a human specialist who can assist you better.",
          needsHumanEscalation: true,
          escalationType: intent,
          confidence: confidenceScore
        };
      }
      
      // Prepare message with context for specialist agent
      const specialistMessage = {
        text: message,
        parts: [
          { text: message },
          { 
            data: { 
              conversationHistory: history,
              sessionContext: context
            }
          }
        ]
      };
      
      // Send to specialist agent using A2A
      const specialistResponse = await agentRegistry.sendTaskToAgent(
        intent, 
        specialistMessage
      );
      
      // Process and refine the specialist response
      const refinedResponse = this.refineResponse(specialistResponse.message);
      
      // Store agent response in conversation memory
      await this.storeConversationMemory(sessionId, 'agent', refinedResponse);
      
      return {
        response: refinedResponse,
        needsHumanEscalation: false,
        intent,
        artifacts: specialistResponse.artifacts || []
      };
    } catch (error) {
      logger.error('Error in generalist agent:', error);
      
      // Handle gracefully
      return {
        response: "I apologize, but I encountered an issue while processing your request. Please try again in a moment.",
        error: error.message,
        needsHumanEscalation: true
      };
    }
  }
  
  /**
   * Refine specialist response for consistent voice and tone
   */
  refineResponse(response) {
    // Simple implementation - in production this might use another LLM call
    // to ensure consistent tone and voice
    if (typeof response === 'string') {
      return response;
    } else if (response.parts && response.parts.length > 0) {
      // Extract text from parts
      return response.parts.map(part => {
        if (part.text) return part.text;
        return '';
      }).join('\n').trim();
    }
    
    return "I'm sorry, I couldn't process that properly.";
  }
  
  /**
   * Calculate confidence score for handling the query
   */
  calculateConfidence(message) {
    // Simplified implementation - would be more sophisticated in production
    const text = typeof message === 'string' ? message : message.text;
    
    // List of terms we're confident about
    const highConfidenceTerms = [
      'value', 'worth', 'price', 'negotiate', 'tax', 'ebitda', 
      'profit', 'legal', 'contract', 'compliance', 'regulation'
    ];
    
    // Count how many high-confidence terms are in the message
    const lowerText = text.toLowerCase();
    const matchingTerms = highConfidenceTerms.filter(term => lowerText.includes(term)).length;
    
    // Calculate confidence based on matching terms
    const confidenceBase = 0.6; // Base confidence level
    const confidenceBoost = matchingTerms * 0.1; // Each term adds 10%
    
    return Math.min(0.95, confidenceBase + confidenceBoost); // Cap at 95%
  }
  
  /**
   * Store conversation memory in database
   */
  async storeConversationMemory(sessionId, role, message) {
    const text = typeof message === 'string' ? message : message.text;
    const embedding = await createEmbedding(text);
    
    await db.Memory.create({
      sessionId,
      role,
      content: text,
      embedding,
      timestamp: new Date()
    });
  }
  
  /**
   * Retrieve recent conversation memory
   */
  async getConversationMemory(sessionId, limit = 10) {
    const memories = await db.Memory.findAll({
      where: { sessionId },
      order: [['timestamp', 'DESC']],
      limit
    });
    
    return memories.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    })).reverse();
  }
}

module.exports = new GeneralistAgent();
