import express from 'express';
import OpenAI from 'openai';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware to check rate limits and token usage
const checkCredits = async (req, res, next) => {
  try {
    // Skip credit check for free endpoints
    if (req.path === '/info') {
      return next();
    }
    
    // Get user ID from authenticated request
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check user's remaining credits from the new ai_credits table
    const creditQuery = await pool.query(
      'SELECT credits_used, credits_limit, subscription_tier FROM ai_credits WHERE user_id = $1',
      [userId]
    );
    
    // If no record exists, create one with default values
    if (creditQuery.rows.length === 0) {
      // Get user subscription from users table to determine credit limit
      const userQuery = await pool.query(
        'SELECT subscription_type FROM users WHERE id = $1',
        [userId]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = userQuery.rows[0];
      let creditsLimit = 30; // Default limit
      
      // Set appropriate limit based on subscription
      if (user.subscription_type === 'platinum') {
        creditsLimit = 200;
      } else if (user.subscription_type === 'gold') {
        creditsLimit = 100;
      }
      
      // Create new record in ai_credits table
      await pool.query(
        `INSERT INTO ai_credits (user_id, credits_used, credits_limit, subscription_tier) 
         VALUES ($1, 0, $2, $3)`,
        [userId, creditsLimit, user.subscription_type || 'free']
      );
      
      // Store credit info in request for later use
      req.userCredits = {
        used: 0,
        limit: creditsLimit,
        remaining: creditsLimit
      };
      
      next();
      return;
    }
    
    const creditRecord = creditQuery.rows[0];
    const creditsUsed = creditRecord.credits_used || 0;
    const creditsLimit = creditRecord.credits_limit || 30;
    
    // Check if user has reached their limit
    if (creditsUsed >= creditsLimit) {
      return res.status(429).json({
        error: 'Credit limit reached',
        creditsUsed,
        creditsLimit,
        message: 'Upgrade your plan to get more credits or wait for the reset.'
      });
    }
    
    // Store credit info in request for later use
    req.userCredits = {
      used: creditsUsed,
      limit: creditsLimit,
      remaining: creditsLimit - creditsUsed
    };
    
    next();
  } catch (error) {
    console.error('Credit check error:', error);
    // Don't block the request on credit check errors
    next();
  }
};

// Get credit information endpoint
router.get('/info', authenticateToken, async (req, res) => {
  try {
    // Make sure the user object exists before accessing userId
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.userId;
    
    try {
      // First check if ai_credits table exists
      const tableQuery = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'ai_credits'
        )
      `);
      
      // If ai_credits table exists, use it
      if (tableQuery.rows[0].exists) {
        // Get credit info from ai_credits table
        const creditQuery = await pool.query(`
          SELECT credits_used, credits_limit, subscription_tier, 
                 last_reset, next_reset 
          FROM ai_credits 
          WHERE user_id = $1`,
          [userId]
        );
        
        // If user has a record
        if (creditQuery.rows.length > 0) {
          const record = creditQuery.rows[0];
          return res.json({
            used: record.credits_used || 0,
            limit: record.credits_limit || 30,
            remaining: (record.credits_limit || 30) - (record.credits_used || 0),
            nextReset: record.next_reset || new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
            subscription: record.subscription_tier || 'free'
          });
        }
        
        // No record found, create one with default values
        const userQuery = await pool.query(
          'SELECT subscription_type FROM users WHERE id = $1',
          [userId]
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
        
        // Insert default record
        await pool.query(
          `INSERT INTO ai_credits 
           (user_id, credits_used, credits_limit, subscription_tier, last_reset, next_reset) 
           VALUES ($1, 0, $2, $3, $4, $5)`,
          [userId, creditsLimit, subscriptionType, now, nextReset]
        );
        
        return res.json({
          used: 0,
          limit: creditsLimit,
          remaining: creditsLimit,
          nextReset: nextReset.toISOString(),
          subscription: subscriptionType
        });
      }
      
      // Fallback to legacy users table if ai_credits doesn't exist
      // Check if credits columns exist in the users table
      const columnsQuery = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'credits_used'
        )
      `);
      
      // If credits_used column doesn't exist, return default values
      if (!columnsQuery.rows[0].exists) {
        console.log('Credits columns not found, returning default values');
        return res.json({
          used: 0,
          limit: 30,
          remaining: 30,
          nextReset: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          subscription: 'free'
        });
      }
      
      // Legacy code for users table
      const userQuery = await pool.query(
        'SELECT credits_used, credits_limit, subscription_type, last_credit_reset FROM users WHERE id = $1',
        [userId]
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = userQuery.rows[0];
      const creditsUsed = user.credits_used || 0;
      let creditsLimit = user.credits_limit || 30;
      
      // ...existing code for handling subscription types...
      
    } catch (dbError) {
      console.error('Database error in /info:', dbError);
      // Always return a response to avoid hanging requests
      res.status(500).json({ 
        error: 'Database error', 
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        fallback: {
          used: 0,
          limit: 30,
          remaining: 30
        }
      });
    }
  } catch (error) {
    console.error('Error getting credit info:', error);
    res.status(500).json({ 
      error: 'Failed to get credit information',
      fallback: {
        used: 0,
        limit: 30,
        remaining: 30
      }
    });
  }
});

// Chat completion endpoint
router.post('/chat', authenticateToken, checkCredits, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user.userId;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Log the interaction attempt
    console.log(`AI assistant chat: User ${userId} - ${message.substring(0, 50)}...`);
    
    try {
      // Get business listings context
      const listingsQuery = await pool.query(
        'SELECT id, business_name, industry, price, location FROM businesses ORDER BY date_listed DESC LIMIT 20'
      );
      const listings = listingsQuery.rows;
      
      // Format the messages for OpenAI
      const systemMessage = {
        role: 'system',
        content: `You are an AI assistant for a UK business marketplace called Arzani. 
        You help users buy and sell businesses. Be concise, helpful, and professional.
        
        Current marketplace listings:
        ${JSON.stringify(listings)}
        
        You can help with:
        1. Finding businesses based on criteria (location, price range, industry)
        2. Answering questions about selling a business
        3. Providing market insights and tips for buyers and sellers
        4. Explaining the process of business valuation
        
        Use British English spelling and formatting (£ for currency). 
        Keep responses brief (2-3 paragraphs max) unless asked for more detail.`
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
      
      // Call the OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
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
          model: 'gpt-3.5-turbo',
          messages: [
            ...messages,
            { role: 'assistant', content: aiResponse },
            { role: 'system', content: 'Based on this conversation, generate 3 brief follow-up questions or prompts the user might want to ask. Make them short (under 6 words each) and return them as a JSON array of strings. Format: {"suggestions": ["Question 1", "Question 2", "Question 3"]}' }
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
          (user_id, message, response, tokens_used, created_at, context)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         RETURNING id`,
        [userId, message, aiResponse, tokensUsed, JSON.stringify({
          listingsCount: listings.length,
          suggestionsCount: suggestions.length
        })]
      );
      
      // Update user's credit usage in the ai_credits table
      await pool.query(
        'UPDATE ai_credits SET credits_used = COALESCE(credits_used, 0) + 1, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );
      
      // Return the response
      res.json({
        message: aiResponse,
        suggestions,
        credits: {
          used: (req.userCredits?.used || 0) + 1,
          remaining: (req.userCredits?.remaining || 30) - 1,
          limit: req.userCredits?.limit || 30
        }
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Return a fallback response when AI service fails
      res.json({
        message: "I'm sorry, but I'm having trouble connecting to my knowledge service right now. Please try again in a few moments.",
        suggestions: [
          "Try again later",
          "Browse listings manually",
          "Contact support"
        ],
        credits: req.userCredits
      });
    }
  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Reset credits endpoint (for admin use or scheduled tasks)
router.post('/reset-credits', authenticateToken, async (req, res) => {
  try {
    const { userId, isAdmin } = req.body;
    
    // Only allow admins to reset other users' credits
    if (userId !== req.user.userId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Reset credits in the ai_credits table
    const now = new Date();
    const nextReset = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    await pool.query(
      `UPDATE ai_credits 
       SET credits_used = 0, 
           last_reset = $2, 
           next_reset = $3,
           updated_at = NOW() 
       WHERE user_id = $1`,
      [userId, now, nextReset]
    );
    
    res.json({ success: true, message: 'Credits reset successfully' });
  } catch (error) {
    console.error('Error resetting credits:', error);
    res.status(500).json({ error: 'Failed to reset credits' });
  }
});

export default router;
