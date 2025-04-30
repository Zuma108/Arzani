/**
 * Authentication middleware specifically for AI agent interactions
 * Extends the main auth system with AI-specific validation
 */

import { extractTokenFromRequest } from '../../middleware/auth.js';
import jwt from 'jsonwebtoken';
import pool from '../../db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Middleware to authenticate AI agent requests
 * Verifies user authentication and attaches AI context
 */
export const authenticateAiRequest = async (req, res, next) => {
  try {
    // Get token from request (reusing existing function)
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      // If anonymous AI access is allowed, continue with limited context
      if (process.env.ALLOW_ANONYMOUS_AI === 'true') {
        req.aiContext = {
          isAuthenticated: false,
          isAnonymous: true,
          sessionId: req.session?.id || req.cookies?.anonymous_session_id || null,
          anonymousId: req.cookies?.anonymous_id || null,
        };
        return next();
      }
      
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required for AI access'
      });
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists in database
      const userCheck = await pool.query(
        'SELECT id, username, role, email FROM users WHERE id = $1',
        [decoded.userId]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const user = userCheck.rows[0];
      
      // Get AI access permissions
      const aiAccessQuery = await pool.query(
        `SELECT access_level, max_tokens_per_day, tokens_used_today, 
                last_token_reset, ai_preferences, session_context 
         FROM user_ai_settings 
         WHERE user_id = $1`,
        [user.id]
      );
      
      // Default AI settings if not found
      const aiSettings = aiAccessQuery.rows[0] || {
        access_level: 'basic',
        max_tokens_per_day: 3000,
        tokens_used_today: 0,
        last_token_reset: new Date(),
        ai_preferences: {},
        session_context: {}
      };
      
      // Check for token limit exceeded
      const today = new Date();
      const lastReset = new Date(aiSettings.last_token_reset);
      
      // Reset counter if it's a new day
      if (today.toDateString() !== lastReset.toDateString()) {
        aiSettings.tokens_used_today = 0;
        aiSettings.last_token_reset = today;
        
        // Update in database
        await pool.query(
          `UPDATE user_ai_settings 
           SET tokens_used_today = 0, last_token_reset = NOW() 
           WHERE user_id = $1`,
          [user.id]
        );
      }
      
      // Check if user exceeded daily token limit
      if (aiSettings.tokens_used_today >= aiSettings.max_tokens_per_day) {
        return res.status(429).json({
          success: false,
          message: 'Daily AI token limit exceeded',
          limitReset: new Date(today.setHours(0, 0, 0, 0) + 86400000).toISOString()
        });
      }
      
      // Attach AI context to request for downstream handlers
      req.aiContext = {
        isAuthenticated: true,
        isAnonymous: false,
        userId: user.id,
        username: user.username,
        userRole: user.role,
        sessionId: req.session?.id || null,
        accessLevel: aiSettings.access_level,
        tokensRemaining: Math.max(0, aiSettings.max_tokens_per_day - aiSettings.tokens_used_today),
        preferences: aiSettings.ai_preferences || {},
        sessionContext: aiSettings.session_context || {}
      };
      
      next();
    } catch (jwtError) {
      console.error('AI auth token error:', jwtError);
      
      if (process.env.ALLOW_ANONYMOUS_AI === 'true') {
        // Continue with anonymous context
        req.aiContext = {
          isAuthenticated: false,
          isAnonymous: true,
          sessionId: req.session?.id || req.cookies?.anonymous_session_id || null
        };
        return next();
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }
  } catch (error) {
    console.error('AI authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Track token usage for billing and rate limiting
 */
export const trackTokenUsage = async (req, res, next) => {
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to track tokens after response
  res.end = function() {
    // Call original end function first
    originalEnd.apply(res, arguments);
    
    try {
      // Only track if we have a user
      if (req.aiContext?.isAuthenticated && req.aiContext.userId) {
        // Get token count from response headers or body
        const tokensUsed = parseInt(res.getHeader('x-tokens-used') || 0);
        
        if (tokensUsed > 0) {
          // Update token usage in database
          pool.query(
            `UPDATE user_ai_settings 
             SET tokens_used_today = tokens_used_today + $1
             WHERE user_id = $2`,
            [tokensUsed, req.aiContext.userId]
          ).catch(err => {
            console.error('Failed to update token usage:', err);
          });
        }
        
        // Log AI usage for analytics
        pool.query(
          `INSERT INTO ai_agent_logs 
           (user_id, session_id, tokens_used, agent_type, endpoint, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            req.aiContext.userId,
            req.aiContext.sessionId || null,
            tokensUsed,
            req.body.agentType || 'generalist',
            req.originalUrl,
          ]
        ).catch(err => {
          console.error('Failed to log AI usage:', err);
        });
      }
    } catch (error) {
      console.error('Error tracking token usage:', error);
    }
  };
  
  next();
};

export default {
  authenticateAiRequest,
  trackTokenUsage
};
