/**
 * AI-related API endpoints
 * Handles AI-powered features like title summarization
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/ai/summarize-title
 * Generate a conversation title from the first user message
 * 
 * Request Body:
 * {
 *   "message": "User's first message content"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "title": "Generated conversation title"
 * }
 */
router.post('/summarize-title', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    // Validate message length
    if (message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long (max 2000 characters)'
      });
    }

    // Generate title using AI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that creates concise, descriptive titles for conversations. 
          Create a short title (2-6 words) that captures the main topic or intent of the user's message.
          The title should be clear, professional, and help users identify the conversation later.
          Do not use quotes around the title. Return only the title text.
          
          Examples:
          - "I need help finding a restaurant business to buy" → "Restaurant Business Search"
          - "What's the valuation process for a tech startup?" → "Tech Startup Valuation"
          - "Can you help me with legal requirements for selling my business?" → "Business Sale Legal Help"
          - "I'm looking for investment opportunities in the healthcare sector" → "Healthcare Investment Opportunities"`
        },
        {
          role: 'user',
          content: message.trim()
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    });

    const generatedTitle = completion.choices[0]?.message?.content?.trim();

    if (!generatedTitle) {
      // Fallback to truncated message
      const fallbackTitle = message.length > 50 ? message.substring(0, 50) + '...' : message;
      return res.json({
        success: true,
        title: fallbackTitle
      });
    }

    // Clean up the title (remove quotes if present, limit length)
    let cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
    if (cleanTitle.length > 100) {
      cleanTitle = cleanTitle.substring(0, 100) + '...';
    }

    res.json({
      success: true,
      title: cleanTitle
    });

  } catch (error) {
    console.error('Title summarization error:', error);
    
    // Provide fallback title on error
    const { message } = req.body;
    const fallbackTitle = message && message.length > 50 ? 
      message.substring(0, 50) + '...' : 
      message || 'New Conversation';

    res.json({
      success: true,
      title: fallbackTitle,
      fallback: true
    });
  }
});

export default router;
