/**
 * User Preferences Service for AI Agents
 * Manages user preferences for AI interactions
 */

import pool from '../../db.js';

/**
 * Get user AI preferences
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User preferences
 */
export const getUserPreferences = async (userId) => {
  try {
    // Check if settings exist
    const result = await pool.query(
      `SELECT ai_preferences
       FROM user_ai_settings
       WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create default preferences
      const defaultPreferences = {
        aiAssistant: {
          voiceEnabled: false,
          preferredVoice: 'alloy',
          responseLength: 'balanced',
          expertiseLevel: 'intermediate',
          preferredAgents: ['generalist', 'broker']
        },
        notifications: {
          aiInsights: true,
          marketAlerts: true
        },
        privacy: {
          saveConversations: true,
          allowAnonymizedDataUse: false,
          deleteHistoryAfterDays: 90
        },
        display: {
          theme: 'system',
          fontSize: 'medium'
        }
      };
      
      // Insert default preferences
      await pool.query(
        `INSERT INTO user_ai_settings
         (user_id, ai_preferences, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [userId, defaultPreferences]
      );
      
      return defaultPreferences;
    }
    
    return result.rows[0].ai_preferences || {};
  } catch (error) {
    console.error('Error getting user preferences:', error);
    throw error;
  }
};

/**
 * Update user AI preferences
 * @param {number} userId - User ID
 * @param {Object} preferences - Preferences to update
 * @returns {Promise<Object>} - Updated preferences
 */
export const updateUserPreferences = async (userId, preferences) => {
  try {
    // Check if settings exist
    const checkResult = await pool.query(
      `SELECT ai_preferences
       FROM user_ai_settings
       WHERE user_id = $1`,
      [userId]
    );
    
    if (checkResult.rows.length === 0) {
      // Create new settings with provided preferences
      const result = await pool.query(
        `INSERT INTO user_ai_settings
         (user_id, ai_preferences, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING ai_preferences`,
        [userId, preferences]
      );
      
      return result.rows[0].ai_preferences;
    } else {
      // Merge with existing preferences
      const existingPrefs = checkResult.rows[0].ai_preferences || {};
      
      // Deep merge preferences
      const mergedPrefs = deepMerge(existingPrefs, preferences);
      
      // Update preferences
      const result = await pool.query(
        `UPDATE user_ai_settings
         SET ai_preferences = $1, updated_at = NOW()
         WHERE user_id = $2
         RETURNING ai_preferences`,
        [mergedPrefs, userId]
      );
      
      return result.rows[0].ai_preferences;
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

/**
 * Get user session context from state and history
 * @param {string} sessionId - Session ID
 * @param {number} userId - User ID (optional)
 * @returns {Promise<Object>} - Session context
 */
export const getSessionContext = async (sessionId, userId = null) => {
  try {
    // Base context
    const context = {
      userContext: {},
      sessionHistory: [],
      lastInteraction: null
    };
    
    // If user ID provided, get user context
    if (userId) {
      // Get user profile data
      const userResult = await pool.query(
        `SELECT u.username, u.email, u.created_at,
                s.plan_type AS subscription_plan,
                s.active AS subscription_active,
                (SELECT COUNT(*) FROM businesses WHERE user_id = u.id) AS business_count
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id
         WHERE u.id = $1`,
        [userId]
      );
      
      if (userResult.rows.length > 0) {
        context.userContext = {
          username: userResult.rows[0].username,
          joinDate: userResult.rows[0].created_at,
          subscription: {
            plan: userResult.rows[0].subscription_plan || 'free',
            isActive: userResult.rows[0].subscription_active || false
          },
          businessCount: userResult.rows[0].business_count || 0
        };
      }
      
      // Get user preferences
      const prefsResult = await pool.query(
        `SELECT ai_preferences
         FROM user_ai_settings
         WHERE user_id = $1`,
        [userId]
      );
      
      if (prefsResult.rows.length > 0) {
        context.userContext.preferences = prefsResult.rows[0].ai_preferences || {};
      }
      
      // Get user businesses summary if they have any
      if (context.userContext.businessCount > 0) {
        const businessResult = await pool.query(
          `SELECT id, name, business_type, created_at
           FROM businesses
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 3`,
          [userId]
        );
        
        context.userContext.recentBusinesses = businessResult.rows.map(b => ({
          id: b.id,
          name: b.name,
          type: b.business_type
        }));
      }
    }
    
    // Get session state
    const stateResult = await pool.query(
      `SELECT stage, payload, updated_at
       FROM session_state
       WHERE session_id = $1`,
      [sessionId]
    );
    
    if (stateResult.rows.length > 0) {
      context.sessionState = {
        stage: stateResult.rows[0].stage,
        payload: stateResult.rows[0].payload,
        lastUpdated: stateResult.rows[0].updated_at
      };
    }
    
    // Get recent history (last 5 messages)
    const historyResult = await pool.query(
      `SELECT role, content, agent_type, created_at
       FROM ai_messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [sessionId]
    );
    
    if (historyResult.rows.length > 0) {
      context.sessionHistory = historyResult.rows.reverse();
      context.lastInteraction = historyResult.rows[0].created_at;
    }
    
    return context;
  } catch (error) {
    console.error('Error getting session context:', error);
    throw error;
  }
};

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} - Merged object
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export default {
  getUserPreferences,
  updateUserPreferences,
  getSessionContext
};
