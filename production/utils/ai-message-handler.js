import pool from '../db.js';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Processes an AI message request and returns a formatted response
 * @param {Object} options - Options for processing the message
 * @param {string} options.message - The user's message
 * @param {Array} options.conversationHistory - Previous conversation context
 * @param {Object} options.user - The user making the request
 * @param {string} options.sessionId - The current session ID
 * @returns {Promise<Object>} - The AI response data
 */
export async function processAIMessage({
  message,
  conversationHistory = [],
  user,
  sessionId
}) {
  try {
    // Get business listings context
    const listingsQuery = await pool.query(
      'SELECT id, business_name, industry, price, location FROM businesses ORDER BY date_listed DESC LIMIT 20'
    );
    const listings = listingsQuery.rows;
    
    // Get user's saved searches if available
    const savedSearchesQuery = await pool.query(
      'SELECT search_query, created_at FROM saved_searches WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [user.userId]
    );
    const savedSearches = savedSearchesQuery.rows;
    
    // Format the messages for OpenAI with enhanced context
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant for a UK business marketplace called Arzani. 
      You help users buy and sell businesses. Be concise, helpful, and professional.
      
      Current marketplace listings:
      ${JSON.stringify(listings)}
      
      ${savedSearches.length > 0 ? `User's saved searches: ${JSON.stringify(savedSearches)}` : ''}
      
      You can help with:
      1. Finding businesses based on criteria (location, price range, industry)
      2. Answering questions about selling a business
      3. Providing market insights and tips for buyers and sellers
      4. Explaining the process of business valuation
      
      When presenting business options:
      - Ensure industry categorizations are accurate and logical (e.g., travel businesses should be "Travel & Hospitality", not "Agriculture")
      - Use bullet points (• symbol) to format business details like industry, price, location
      - Include relevant details like establishment date and annual revenue when available
      - Always explain the remaining budget flexibility when working with budget constraints
      
      Use British English spelling and formatting (£ for currency).
      Keep responses brief (2-3 paragraphs max) unless asked for more detail.
      
      Important formatting guidelines:
      - Never use markdown formatting or asterisks for emphasis
      - Present business listings with business name followed by bullet points for details
      - Use proper spacing between sections for readability
      - Format prices with commas for better readability (e.g., £1,000,000)
      - When listing multiple businesses, number them and add a blank line between entries`
    };
    
    // Format conversation history and add the new user message
    const messages = [
      systemMessage,
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    
    // Call the OpenAI API with GPT-4.1-nano model
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano', // Updated to use GPT-4.1-nano instead of gpt-4o
      messages,
      temperature: 0.7,
      max_tokens: 500
    });
    
    // Get the assistant's response
    const aiResponse = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 1;
    
    // Generate follow-up suggestions based on the conversation
    let suggestions = [];
    try {
      const suggestionsCompletion = await openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Updated to use GPT-4.1-nano for suggestions
        messages: [
          ...messages,
          { role: 'assistant', content: aiResponse },
          { 
            role: 'system', 
            content: 'Based on this conversation, generate 3 brief follow-up questions or prompts the user might want to ask. Make them short (under 6 words each) and return them as a JSON array of strings. Format: {"suggestions": ["Question 1", "Question 2", "Question 3"]}' 
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });
      
      const suggestionsText = suggestionsCompletion.choices[0].message.content;
      try {
        const suggestionsJson = JSON.parse(suggestionsText);
        suggestions = suggestionsJson.suggestions || [];
      } catch (jsonError) {
        console.error('Error parsing suggestions JSON:', jsonError);
        suggestions = [];
      }
    } catch (suggestionsError) {
      console.error('Error generating suggestions:', suggestionsError);
    }
    
    // Save the interaction to the database
    const interactionResult = await pool.query(
      `INSERT INTO assistant_interactions 
        (user_id, message, response, tokens_used, created_at, context, session_id)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6)
       RETURNING id`,
      [
        user.userId, 
        message, 
        aiResponse, 
        tokensUsed, 
        JSON.stringify({
          listingsCount: listings.length,
          suggestionsCount: suggestions.length,
          savedSearchesCount: savedSearches.length
        }),
        sessionId
      ]
    );
    
    // Update user's credit usage in the ai_credits table instead of users table
    let creditInfo;
    
    try {
      // First, check if credit record exists
      const checkResult = await pool.query(
        'SELECT id FROM ai_credits WHERE user_id = $1',
        [user.userId]
      );
      
      if (checkResult.rows.length === 0) {
        // No record exists, create one
        const userQuery = await pool.query(
          'SELECT subscription_type FROM users WHERE id = $1',
          [user.userId]
        );
        
        let creditsLimit = 30; // Default
        const subscriptionType = userQuery.rows[0]?.subscription_type || 'free';
        
        // Set appropriate limit based on subscription
        if (subscriptionType === 'platinum') {
          creditsLimit = 200;
        } else if (subscriptionType === 'gold') {
          creditsLimit = 100;
        }
        
        const now = new Date();
        const nextReset = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        // Insert new record
        await pool.query(
          `INSERT INTO ai_credits 
           (user_id, credits_used, credits_limit, subscription_tier, last_reset, next_reset) 
           VALUES ($1, 1, $2, $3, $4, $5)`,
          [user.userId, creditsLimit, subscriptionType, now, nextReset]
        );
        
        creditInfo = {
          used: 1,
          limit: creditsLimit,
          remaining: creditsLimit - 1
        };
      } else {
        // Update existing record
        const result = await pool.query(
          `UPDATE ai_credits 
           SET credits_used = COALESCE(credits_used, 0) + 1, 
               updated_at = NOW() 
           WHERE user_id = $1
           RETURNING credits_used, credits_limit`,
          [user.userId]
        );
        
        const record = result.rows[0];
        creditInfo = {
          used: record.credits_used,
          limit: record.credits_limit,
          remaining: record.credits_limit - record.credits_used
        };
      }
    } catch (creditError) {
      console.error('Error updating credits:', creditError);
      // Fallback to default credit info
      creditInfo = {
        used: 0, 
        limit: 30, 
        remaining: 30
      };
    }
    
    // Return the response with credit information
    return {
      message: aiResponse,
      suggestions,
      credits: creditInfo,
      interactionId: interactionResult.rows[0].id,
      model: 'gpt-4.1-nano' // Updated model information in the response
    };
  } catch (error) {
    console.error('AI message processing error:', error);
    throw error;
  }
}

/**
 * Processes an AI request without authentication for simple queries
 * @param {string} message - The user's message
 * @returns {Promise<string>} - The AI response text
 */
export async function processPublicAIMessage(message) {
  try {
    // Simple system message with limited context
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant for a UK business marketplace. 
      You can only answer general questions about business buying and selling.
      Keep responses brief and informational. 
      Do not provide specific business listings as this is a public query.`
    };
    
    // Call the OpenAI API with GPT-4.1-nano for public queries
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano', // Updated to use GPT-4.1-nano
      messages: [
        systemMessage,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 150 // Shorter response for public queries
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Public AI message error:', error);
    return "Sorry, I'm currently unavailable. Please try again later.";
  }
}
