/**
 * AI Agent Routes
 * Secure endpoints for AI agent interactions
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateAiRequest, trackTokenUsage } from '../middleware/aiAuth.js';
import contextService from '../services/contextService.js';
import userPreferencesService from '../services/userPreferencesService.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Rate limiting for AI endpoints
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Apply AI authentication middleware to all routes
router.use(authenticateAiRequest);

// Apply rate limiting to all routes
router.use(aiRateLimiter);

// Apply token usage tracking
router.use(trackTokenUsage);

/**
 * @route POST /api/ai/chat
 * @desc Send message to AI agent and get response
 * @access Private/Public (depends on settings)
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, agentType = 'generalist' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    // Get or create session
    const session = await contextService.createOrUpdateSession({
      sessionId: sessionId || uuidv4(),
      userId: req.aiContext.isAuthenticated ? req.aiContext.userId : null,
      anonymousId: !req.aiContext.isAuthenticated ? (req.cookies?.anonymous_id || uuidv4()) : null,
      metadata: {
        lastAgentType: agentType,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });
    
    // Set anonymous_id cookie if not authenticated
    if (!req.aiContext.isAuthenticated && !req.cookies?.anonymous_id) {
      res.cookie('anonymous_id', session.anonymous_id, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: 'lax'
      });
    }
    
    // Set anonymous_session_id cookie
    res.cookie('anonymous_session_id', session.id, {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    });
    
    // Save user message to history
    await contextService.saveMessage({
      sessionId: session.id,
      role: 'user',
      content: message,
      agentType
    });
    
    // Get session context
    const sessionContext = await userPreferencesService.getSessionContext(
      session.id,
      req.aiContext.isAuthenticated ? req.aiContext.userId : null
    );
    
    // This is where you would call your AI agent logic
    // For now, we'll simulate a response
    const aiResponse = {
      content: `This is a simulated response from the ${agentType} agent. You asked: ${message}`,
      tokens: 20
    };
    
    // Add token usage to response headers
    res.setHeader('x-tokens-used', aiResponse.tokens);
    
    // Save AI response to history
    await contextService.saveMessage({
      sessionId: session.id,
      role: 'assistant',
      content: aiResponse.content,
      tokens: aiResponse.tokens,
      agentType
    });
    
    return res.json({
      success: true,
      sessionId: session.id,
      message: aiResponse.content,
      context: {
        hasHistory: sessionContext.sessionHistory.length > 1,
        lastInteraction: sessionContext.lastInteraction
      }
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing AI request'
    });
  }
});

/**
 * @route GET /api/ai/sessions/:sessionId/history
 * @desc Get conversation history for a session
 * @access Private
 */
router.get('/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    // Security check - verify session belongs to user
    if (req.aiContext.isAuthenticated) {
      const sessionCheck = await contextService.getSession(sessionId);
      
      if (sessionCheck?.user_id !== req.aiContext.userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this session'
        });
      }
    } else {
      // For anonymous users, check cookie
      if (req.cookies?.anonymous_session_id !== sessionId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this session'
        });
      }
    }
    
    const history = await contextService.getConversationHistory(sessionId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving conversation history'
    });
  }
});

/**
 * @route POST /api/ai/preferences
 * @desc Update user AI preferences
 * @access Private
 */
router.post('/preferences', async (req, res) => {
  try {
    // Only allowed for authenticated users
    if (!req.aiContext.isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to update preferences'
      });
    }
    
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid preferences object required'
      });
    }
    
    const updatedPreferences = await userPreferencesService.updateUserPreferences(
      req.aiContext.userId,
      preferences
    );
    
    return res.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences'
    });
  }
});

/**
 * @route GET /api/ai/preferences
 * @desc Get user AI preferences
 * @access Private
 */
router.get('/preferences', async (req, res) => {
  try {
    // Only allowed for authenticated users
    if (!req.aiContext.isAuthenticated) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access preferences'
      });
    }
    
    const preferences = await userPreferencesService.getUserPreferences(
      req.aiContext.userId
    );
    
    return res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving preferences'
    });
  }
});

export default router;
