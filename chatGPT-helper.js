import OpenAI from 'openai';
import pool from './db.js';
import config from './config.js';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI configuration
const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

/**
 * Simple function to call OpenAI API with a prompt
 * @param {string} prompt - The prompt to send to OpenAI
 * @param {string} model - The model to use, defaults to gpt-4.1-nano
 * @param {number} maxTokens - Maximum tokens for response, defaults to 1000
 * @returns {Promise<string>} The response text from OpenAI
 */
export async function callOpenAI(prompt, model = 'gpt-4.1-nano', maxTokens = 1000) {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

/**
 * ChatGPT helper class that integrates with the existing chat system
 * and provides AI-powered responses to user messages
 */
class ChatGPTHelper {
  constructor() {
    this.contextWindow = 10; // Number of previous messages to include for context
    this.defaultSystemPrompt = `You are an AI assistant for a business marketplace platform. 
    You help users with information about businesses, market trends, and using the platform.
    Be helpful, concise, and professional.`;
    
    // Verification system configuration
    this.verificationConfig = {
      // Different weights for verification categories
      weights: {
        financialConsistency: 0.3,
        industryStandards: 0.25,
        marketRealism: 0.25, 
        descriptiveAccuracy: 0.2
      },
      // Confidence thresholds
      confidenceThresholds: {
        high: 0.8,
        medium: 0.6,
        low: 0.4
      },
      // Token usage estimates for billing
      tokenEstimates: {
        promptBase: 500,
        businessData: 1000,
        completion: 800
      }
    };
  }

  /**
   * Create a new AI assistant conversation
   * @param {number} userId - The user ID initiating the conversation
   * @param {string} initialPrompt - Optional initial prompt from the user
   * @returns {Promise<object>} The created conversation details
   */
  async createAssistantConversation(userId, initialPrompt = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create a conversation with the AI assistant
      const conversationResult = await client.query(
        `INSERT INTO conversations (title, type, is_archived) 
         VALUES ($1, $2, $3) 
         RETURNING id, created_at`,
        ['AI Assistant', 'assistant', false]
      );

      const conversationId = conversationResult.rows[0].id;

      // Add the user as a participant
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role) 
         VALUES ($1, $2, $3)`,
        [conversationId, userId, 'owner']
      );

      // Add the system (AI) as a participant with ID -1 (special ID for the system)
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role) 
         VALUES ($1, $2, $3)`,
        [conversationId, -1, 'assistant']
      );

      // Add initial system message
      await client.query(
        `INSERT INTO messages (conversation_id, sender_id, content, is_system_message) 
         VALUES ($1, $2, $3, $4)`,
        [conversationId, -1, this.defaultSystemPrompt, true]
      );

      // If there's an initial prompt, add it too
      if (initialPrompt) {
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content) 
           VALUES ($1, $2, $3)`,
          [conversationId, userId, initialPrompt]
        );

        // Generate AI response to the initial prompt
        const response = await this.generateResponse(conversationId, userId, initialPrompt);
        
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content, is_system_message) 
           VALUES ($1, $2, $3, $4)`,
          [conversationId, -1, response, false]
        );
      }

      await client.query('COMMIT');

      // Return the created conversation
      return {
        conversationId,
        createdAt: conversationResult.rows[0].created_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating assistant conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate a response from the AI for a specific message
   * @param {number} conversationId - The conversation ID
   * @param {number} userId - The user ID sending the message
   * @param {string} userMessage - The message content from the user
   * @returns {Promise<string>} The AI-generated response
   */
  async generateResponse(conversationId, userId, userMessage) {
    let requestId = uuidv4();
    try {
      // Get conversation context (previous messages)
      const context = await this.getConversationContext(conversationId);

      // Record the request to track API usage
      await this.recordApiRequest(userId, 'chat', requestId);

      // Prepare the messages array for the OpenAI API
      const messages = [
        { role: 'system', content: this.defaultSystemPrompt },
        ...context.map(msg => ({
          role: msg.is_system_message ? 'system' : (msg.sender_id === -1 ? 'assistant' : 'user'),
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      // Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Updated from gpt-4 for best results, or gpt-3.5-turbo for lower cost
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      // Record successful API usage
      await this.recordApiUsage(userId, requestId, 
        response.usage.prompt_tokens, 
        response.usage.completion_tokens
      );

      // Return the AI response
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      // Record failed API request
      await this.recordApiFailure(userId, requestId, error.message || 'Unknown error');
      
      // Return a fallback message
      return "I'm sorry, I encountered an error processing your request. Please try again later.";
    }
  }

  /**
   * Get previous messages from a conversation for context
   * @param {number} conversationId - The conversation ID
   * @returns {Promise<Array>} Array of previous messages
   */
  async getConversationContext(conversationId) {
    try {
      const result = await pool.query(
        `SELECT sender_id, content, is_system_message, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, this.contextWindow]
      );

      // Return messages in chronological order
      return result.rows.reverse();
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  /**
   * Record an API request before making the call
   * @param {number} userId - User ID making the request
   * @param {string} requestType - Type of request (chat, image, etc.)
   * @param {string} requestId - Unique ID for this request
   */
  async recordApiRequest(userId, requestType, requestId) {
    try {
      await pool.query(
        `INSERT INTO ai_credits_usage (user_id, request_id, request_type, status, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, requestId, requestType, 'pending']
      );
    } catch (error) {
      console.error('Error recording API request:', error);
    }
  }

  /**
   * Record successful API usage with token counts
   * @param {number} userId - User ID making the request
   * @param {string} requestId - Unique ID for this request
   * @param {number} promptTokens - Number of prompt tokens used
   * @param {number} completionTokens - Number of completion tokens used
   */
  async recordApiUsage(userId, requestId, promptTokens, completionTokens) {
    try {
      await pool.query(
        `UPDATE ai_credits_usage
         SET status = 'completed', 
             prompt_tokens = $1, 
             completion_tokens = $2,
             completed_at = NOW()
         WHERE request_id = $3 AND user_id = $4`,
        [promptTokens, completionTokens, requestId, userId]
      );
    } catch (error) {
      console.error('Error recording API usage:', error);
    }
  }

  /**
   * Record a failed API request
   * @param {number} userId - User ID making the request
   * @param {string} requestId - Unique ID for this request
   * @param {string} errorMessage - Error message from the API
   */
  async recordApiFailure(userId, requestId, errorMessage) {
    try {
      await pool.query(
        `UPDATE ai_credits_usage
         SET status = 'failed', 
             error_message = $1,
             completed_at = NOW()
         WHERE request_id = $2 AND user_id = $3`,
        [errorMessage.substring(0, 255), requestId, userId]
      );
    } catch (error) {
      console.error('Error recording API failure:', error);
    }
  }

  /**
   * Archive a conversation
   * @param {number} conversationId - The conversation ID to archive
   * @param {number} userId - The user ID requesting the archive
   * @returns {Promise<boolean>} Success status
   */
  async archiveConversation(conversationId, userId) {
    try {
      // Check if user is a participant
      const participantCheck = await pool.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return false;
      }

      // Update archive status
      await pool.query(
        `UPDATE conversations 
         SET is_archived = TRUE 
         WHERE id = $1`,
        [conversationId]
      );

      return true;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      return false;
    }
  }

  /**
   * Unarchive a conversation
   * @param {number} conversationId - The conversation ID to unarchive
   * @param {number} userId - The user ID requesting the unarchive
   * @returns {Promise<boolean>} Success status
   */
  async unarchiveConversation(conversationId, userId) {
    try {
      // Check if user is a participant
      const participantCheck = await pool.query(
        `SELECT user_id FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return false;
      }

      // Update archive status
      await pool.query(
        `UPDATE conversations 
         SET is_archived = FALSE 
         WHERE id = $1`,
        [conversationId]
      );

      return true;
    } catch (error) {
      console.error('Error unarchiving conversation:', error);
      return false;
    }
  }

  /**
   * Verify a business listing using AI analysis
   * @param {number} businessId - ID of the business to verify
   * @param {number} userId - User ID requesting verification
   * @param {Array} verificationTypes - Types of verification to perform
   * @returns {Promise<object>} Verification results
   */
  async verifyBusinessListing(businessId, userId, verificationTypes = ['all']) {
    let requestId = uuidv4();
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');
      
      // Track the verification request
      await this.recordApiRequest(userId, 'verification', requestId);
      
      // Get business data
      const businessData = await this.getBusinessData(businessId, client);
      
      if (!businessData) {
        throw new Error(`Business with ID ${businessId} not found`);
      }
      
      // Create verification prompt
      const verificationPrompt = this.createVerificationPrompt(businessData, verificationTypes);
      
      // Call OpenAI for verification analysis
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Updated from gpt-4 for highest accuracy in verification
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI business verification specialist. Analyze the business data for consistency, realism, and adherence to industry standards. Focus on identifying potential issues or discrepancies.'
          },
          { role: 'user', content: verificationPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.2, // Lower temperature for more focused, analytical responses
      });
      
      // Parse and score the verification result
      const verificationResult = await this.parseVerificationResponse(response.choices[0].message.content);
      
      // Store verification results
      const verificationId = await this.storeVerificationResult(
        businessId, 
        userId, 
        verificationResult,
        requestId,
        client
      );
      
      // Record token usage for billing
      await this.recordApiUsage(
        userId, 
        requestId, 
        this.verificationConfig.tokenEstimates.promptBase + this.verificationConfig.tokenEstimates.businessData, 
        response.usage.completion_tokens
      );
      
      // Commit the transaction
      await client.query('COMMIT');
      
      // Return the verification results
      return {
        verificationId,
        businessId,
        results: verificationResult,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      // Rollback the transaction on error
      await client.query('ROLLBACK');
      console.error('Error in business verification:', error);
      
      // Record failure
      await this.recordApiFailure(userId, requestId, error.message || 'Unknown verification error');
      
      // Return error information
      return {
        error: true,
        message: 'Failed to complete business verification',
        details: error.message
      };
      
    } finally {
      client.release();
    }
  }
  
  /**
   * Get business data for verification
   * @param {number} businessId - Business ID to retrieve
   * @param {object} client - Database client
   * @returns {Promise<object>} Business data
   */
  async getBusinessData(businessId, client) {
    try {
      const result = await client.query(
        `SELECT * FROM businesses WHERE id = $1`,
        [businessId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error retrieving business data:', error);
      throw error;
    }
  }
  
  /**
   * Create a prompt for AI verification
   * @param {object} businessData - Business data to verify
   * @param {Array} verificationTypes - Types of verification to perform
   * @returns {string} Verification prompt
   */
  createVerificationPrompt(businessData, verificationTypes) {
    // Base prompt with instructions
    let prompt = `Please verify the following business listing for accuracy, consistency, and adherence to industry standards.\n\n`;
    prompt += `Business Data:\n${JSON.stringify(businessData, null, 2)}\n\n`;
    
    // Add specific verification instructions
    prompt += `Verification Instructions:\n`;
    
    if (verificationTypes.includes('all') || verificationTypes.includes('financialConsistency')) {
      prompt += `1. Financial Consistency: Analyze whether the financial figures are internally consistent. `;
      prompt += `Check if the price, cash flow, revenue, EBITDA, inventory, and profit margins make sense together. `;
      prompt += `Verify if the sales multiple is appropriate for the industry and financials.\n`;
    }
    
    if (verificationTypes.includes('all') || verificationTypes.includes('industryStandards')) {
      prompt += `2. Industry Standards: Determine if the business data aligns with typical standards for its industry. `;
      prompt += `Consider if the profit margins, sales multiples, and revenue figures are realistic for this type of business `;
      prompt += `and location.\n`;
    }
    
    if (verificationTypes.includes('all') || verificationTypes.includes('marketRealism')) {
      prompt += `3. Market Realism: Evaluate if the pricing seems realistic in the current market. `;
      prompt += `Is the asking price reasonable based on the financials? Is the cash-on-cash return plausible? `;
      prompt += `Is the valuation aligned with market expectations?\n`;
    }
    
    if (verificationTypes.includes('all') || verificationTypes.includes('descriptiveAccuracy')) {
      prompt += `4. Descriptive Accuracy: Assess if the business description aligns with the provided data. `;
      prompt += `Look for inconsistencies between the narrative description and the numerical data.\n`;
    }
    
    // Format for response
    prompt += `\nProvide your analysis in JSON format with the following structure:
    {
      "financialConsistency": {
        "score": (0.0 to 1.0),
        "issues": ["issue1", "issue2", ...],
        "analysis": "detailed analysis"
      },
      "industryStandards": {
        "score": (0.0 to 1.0),
        "issues": ["issue1", "issue2", ...],
        "analysis": "detailed analysis"
      },
      "marketRealism": {
        "score": (0.0 to 1.0),
        "issues": ["issue1", "issue2", ...],
        "analysis": "detailed analysis"
      },
      "descriptiveAccuracy": {
        "score": (0.0 to 1.0),
        "issues": ["issue1", "issue2", ...],
        "analysis": "detailed analysis"
      },
      "overallAssessment": "overall analysis summary",
      "confidenceScore": (0.0 to 1.0),
      "recommendations": ["recommendation1", "recommendation2", ...]
    }`;
    
    return prompt;
  }
  
  /**
   * Parse the AI verification response
   * @param {string} responseText - Raw AI response
   * @returns {object} Structured verification result
   */
  async parseVerificationResponse(responseText) {
    try {
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in verification response');
      }
      
      // Parse the JSON
      const verificationData = JSON.parse(jsonMatch[0]);
      
      // Calculate weighted score
      let weightedScore = 0;
      let totalWeight = 0;
      
      for (const category in this.verificationConfig.weights) {
        if (verificationData[category] && typeof verificationData[category].score === 'number') {
          weightedScore += verificationData[category].score * this.verificationConfig.weights[category];
          totalWeight += this.verificationConfig.weights[category];
        }
      }
      
      // If no valid scores found, default to 0
      const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
      
      // Determine confidence level
      let confidenceLevel;
      if (finalScore >= this.verificationConfig.confidenceThresholds.high) {
        confidenceLevel = 'high';
      } else if (finalScore >= this.verificationConfig.confidenceThresholds.medium) {
        confidenceLevel = 'medium';
      } else if (finalScore >= this.verificationConfig.confidenceThresholds.low) {
        confidenceLevel = 'low';
      } else {
        confidenceLevel = 'very low';
      }
      
      // Combine all issues
      const allIssues = [];
      for (const category in verificationData) {
        if (verificationData[category] && Array.isArray(verificationData[category].issues)) {
          allIssues.push(...verificationData[category].issues);
        }
      }
      
      // Return structured result
      return {
        ...verificationData,
        weightedScore: finalScore,
        confidenceLevel,
        allIssues
      };
      
    } catch (error) {
      console.error('Error parsing verification response:', error);
      
      // Return a default structure with error information
      return {
        error: true,
        message: 'Failed to parse verification response',
        details: error.message,
        rawResponse: responseText
      };
    }
  }
  
  /**
   * Store verification result in the database
   * @param {number} businessId - Business ID
   * @param {number} userId - User ID requesting verification
   * @param {object} verificationResult - Verification analysis results
   * @param {string} requestId - Request ID for tracking
   * @param {object} client - Database client
   * @returns {Promise<number>} Verification record ID
   */
  async storeVerificationResult(businessId, userId, verificationResult, requestId, client) {
    try {
      const result = await client.query(
        `INSERT INTO business_verifications (
          business_id, user_id, verification_data, weighted_score, 
          confidence_level, request_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id`,
        [
          businessId,
          userId,
          JSON.stringify(verificationResult),
          verificationResult.weightedScore || 0,
          verificationResult.confidenceLevel || 'unknown',
          requestId
        ]
      );
      
      // If weighted score is above medium threshold, update business verification status
      if (verificationResult.weightedScore >= this.verificationConfig.confidenceThresholds.medium) {
        await client.query(
          `UPDATE businesses 
           SET ai_verified = TRUE, ai_verification_date = NOW()
           WHERE id = $1`,
          [businessId]
        );
      }
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error storing verification result:', error);
      throw error;
    }
  }
  
  /**
   * Get verification history for a business
   * @param {number} businessId - Business ID
   * @param {number} limit - Max number of records to return
   * @returns {Promise<Array>} Verification history
   */
  async getBusinessVerificationHistory(businessId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          bv.id, bv.business_id, bv.user_id, bv.weighted_score, 
          bv.confidence_level, bv.created_at,
          u.username as verified_by
        FROM business_verifications bv
        LEFT JOIN users u ON bv.user_id = u.id
        WHERE bv.business_id = $1
        ORDER BY bv.created_at DESC
        LIMIT $2`,
        [businessId, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error retrieving verification history:', error);
      return [];
    }
  }
  
  /**
   * Get detailed verification information
   * @param {number} verificationId - Verification record ID
   * @returns {Promise<object>} Detailed verification data
   */
  async getVerificationDetails(verificationId) {
    try {
      const result = await pool.query(
        `SELECT 
          bv.id, bv.business_id, bv.user_id, bv.verification_data, 
          bv.weighted_score, bv.confidence_level, bv.created_at,
          b.business_name, u.username as verified_by
        FROM business_verifications bv
        JOIN businesses b ON bv.business_id = b.id
        LEFT JOIN users u ON bv.user_id = u.id
        WHERE bv.id = $1`,
        [verificationId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const verification = result.rows[0];
      
      // Parse the verification_data JSON
      if (verification.verification_data) {
        try {
          verification.verification_data = JSON.parse(verification.verification_data);
        } catch (e) {
          console.error('Error parsing verification data JSON:', e);
        }
      }
      
      return verification;
    } catch (error) {
      console.error('Error retrieving verification details:', error);
      return null;
    }
  }
  
  /**
   * Get verification statistics
   * @returns {Promise<object>} Verification statistics
   */
  async getVerificationStats() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_verifications,
          AVG(weighted_score) as avg_score,
          COUNT(CASE WHEN confidence_level = 'high' THEN 1 END) as high_confidence,
          COUNT(CASE WHEN confidence_level = 'medium' THEN 1 END) as medium_confidence,
          COUNT(CASE WHEN confidence_level = 'low' THEN 1 END) as low_confidence,
          COUNT(CASE WHEN confidence_level = 'very low' THEN 1 END) as very_low_confidence
        FROM business_verifications
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error retrieving verification statistics:', error);
      return {
        total_verifications: 0,
        avg_score: 0,
        high_confidence: 0,
        medium_confidence: 0,
        low_confidence: 0,
        very_low_confidence: 0
      };
    }
  }
  
  /**
   * Generate a verification report for a business
   * @param {number} businessId - Business ID
   * @param {number} userId - User ID requesting the report
   * @returns {Promise<object>} Verification report
   */
  async generateVerificationReport(businessId, userId) {
    let requestId = uuidv4();
    try {
      // Record the request
      await this.recordApiRequest(userId, 'verification_report', requestId);
      
      // Get business data
      const businessData = await this.getBusinessData(businessId);
      
      if (!businessData) {
        throw new Error(`Business with ID ${businessId} not found`);
      }
      
      // Get verification history
      const verificationHistory = await this.getBusinessVerificationHistory(businessId, 3);
      
      if (verificationHistory.length === 0) {
        return {
          businessId,
          businessName: businessData.business_name,
          status: 'not_verified',
          message: 'This business has not been verified yet.'
        };
      }
      
      // Get the most recent verification
      const latestVerification = await this.getVerificationDetails(verificationHistory[0].id);
      
      // Generate a report prompt
      const reportPrompt = `Generate a comprehensive verification report for ${businessData.business_name}.
      
Business Data:
${JSON.stringify(businessData, null, 2)}

Verification Results:
${JSON.stringify(latestVerification.verification_data, null, 2)}

Please compile a professional report covering:
1. Overall verification assessment
2. Key strengths identified
3. Areas of concern or inconsistencies
4. Recommendations for the business owner or potential buyers
5. Confidence level explanation

Keep the report professional, balanced, and focused on factual observations rather than opinions.`;
      
      // Call OpenAI for report generation
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Updated from gpt-4
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI business analyst specializing in verification reports. Create professional, balanced reports based on verification data.'
          },
          { role: 'user', content: reportPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.4,
      });
      
      // Record token usage
      await this.recordApiUsage(
        userId, 
        requestId, 
        this.verificationConfig.tokenEstimates.promptBase + this.verificationConfig.tokenEstimates.businessData * 2, 
        response.usage.completion_tokens
      );
      
      // Format and return the report
      return {
        businessId,
        businessName: businessData.business_name,
        verificationId: latestVerification.id,
        confidenceLevel: latestVerification.confidence_level,
        score: latestVerification.weighted_score,
        verificationDate: latestVerification.created_at,
        report: response.choices[0].message.content,
        status: 'verified'
      };
      
    } catch (error) {
      console.error('Error generating verification report:', error);
      
      // Record the failure
      await this.recordApiFailure(userId, requestId, error.message || 'Unknown error in report generation');
      
      return {
        error: true,
        message: 'Failed to generate verification report',
        details: error.message
      };
    }
  }
}

export default new ChatGPTHelper();