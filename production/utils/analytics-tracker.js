import pool from '../db.js';
import { sendWeeklyAnalyticsSummaryEmail } from '../utils/email.js';

/**
 * Track a user signup event
 * @param {string|number} userId - The user ID
 * @param {string} email - User's email
 * @param {string} username - User's username
 * @returns {Promise<Object>} - The recorded event
 */
export async function trackSignup(userId, email, username) {
  return await recordAnalyticsEvent('signup', userId, {
    email,
    username,
    timestamp: new Date().toISOString()
  });
}

/**
 * Track a successful verification event
 * @param {string|number} userId - The user ID
 * @param {string} email - User's email
 * @param {string} username - User's username
 * @returns {Promise<Object>} - The recorded event
 */
export async function trackVerificationSuccess(userId, email, username) {
  return await recordAnalyticsEvent('verification_success', userId, {
    email,
    username,
    timestamp: new Date().toISOString()
  });
}

/**
 * Track a failed verification event
 * @param {string|number} userId - The user ID
 * @param {string} email - User's email
 * @param {string} reason - Failure reason
 * @param {number} attemptCount - Number of attempts
 * @returns {Promise<Object>} - The recorded event
 */
export async function trackVerificationFailure(userId, email, reason, attemptCount = 1) {
  return await recordAnalyticsEvent('verification_failure', userId, {
    email,
    reason,
    attemptCount,
    timestamp: new Date().toISOString()
  });
}

/**
 * Record analytics event in the database
 * @param {string} eventType - The type of event
 * @param {string|number} userId - The user ID
 * @param {Object} eventData - Additional event data
 * @returns {Promise<Object>} - The recorded event
 */
export async function recordAnalyticsEvent(eventType, userId, eventData = {}) {
  try {
    // Check if table exists and create if needed
    await ensureAnalyticsTableExists();
    
    // Insert the event record
    const result = await pool.query(
      'INSERT INTO analytics_events (event_type, user_id, event_data) VALUES ($1, $2, $3) RETURNING *',
      [eventType, userId, JSON.stringify(eventData)]
    );
    
    console.log(`Recorded analytics event: ${eventType} for user ${userId}`);
    return result.rows[0];
  } catch (error) {
    console.error('Failed to record analytics event:', error);
    return null;
  }
}

/**
 * Ensure the analytics events table exists
 */
async function ensureAnalyticsTableExists() {
  try {
    // Check if table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analytics_events'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    // Create table if it doesn't exist
    if (!tableExists) {
      await pool.query(`
        CREATE TABLE analytics_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          user_id VARCHAR(100),
          event_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
        CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
        CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
      `);
      console.log('Created analytics_events table');
    }
  } catch (error) {
    console.error('Error ensuring analytics table exists:', error);
    throw error;
  }
}

/**
 * Get analytics statistics for a given time period
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Promise<Object>} - Analytics statistics
 */
export async function getAnalyticsStats(startDate, endDate = new Date()) {
  try {
    // Check if table exists
    const tableCheckResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analytics_events'
      );
    `);
    
    const tableExists = tableCheckResult.rows[0].exists;
    
    if (!tableExists) {
      return {
        signupCount: 0,
        verificationSuccessCount: 0,
        verificationFailureCount: 0,
        conversionRate: 0,
        totalUsers: 0,
        weekStart: startDate,
        weekEnd: endDate,
        topFailureReasons: []
      };
    }
    
    // Count signup events
    const signupResult = await pool.query(
      `SELECT COUNT(*) FROM analytics_events 
       WHERE event_type = 'signup' 
       AND created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    const signupCount = parseInt(signupResult.rows[0].count, 10) || 0;
    
    // Count successful verification events
    const successResult = await pool.query(
      `SELECT COUNT(*) FROM analytics_events 
       WHERE event_type = 'verification_success' 
       AND created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    const verificationSuccessCount = parseInt(successResult.rows[0].count, 10) || 0;
    
    // Count failed verification events
    const failureResult = await pool.query(
      `SELECT COUNT(*) FROM analytics_events 
       WHERE event_type = 'verification_failure' 
       AND created_at BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    const verificationFailureCount = parseInt(failureResult.rows[0].count, 10) || 0;
    
    // Get total user count
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count, 10) || 0;
    
    // Calculate conversion rate
    const conversionRate = signupCount > 0 
      ? Math.round((verificationSuccessCount / signupCount) * 100) 
      : 0;
    
    // Get top failure reasons
    const failureReasonsResult = await pool.query(
      `SELECT event_data->>'reason' AS reason, COUNT(*) 
       FROM analytics_events 
       WHERE event_type = 'verification_failure' 
       AND created_at BETWEEN $1 AND $2 
       GROUP BY event_data->>'reason' 
       ORDER BY COUNT(*) DESC 
       LIMIT 5`,
      [startDate, endDate]
    );
    
    const topFailureReasons = failureReasonsResult.rows.map(row => ({
      reason: row.reason,
      count: parseInt(row.count, 10)
    }));
    
    return {
      signupCount,
      verificationSuccessCount,
      verificationFailureCount,
      conversionRate,
      totalUsers,
      weekStart: startDate,
      weekEnd: endDate,
      topFailureReasons
    };
  } catch (error) {
    console.error('Error getting analytics stats:', error);
    return {
      signupCount: 0,
      verificationSuccessCount: 0,
      verificationFailureCount: 0,
      conversionRate: 0,
      totalUsers: 0,
      weekStart: startDate,
      weekEnd: endDate,
      topFailureReasons: []
    };
  }
}

/**
 * Generate and send weekly analytics report
 */
export async function generateAndSendWeeklyReport() {
  try {
    // Calculate date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // Get analytics stats
    const stats = await getAnalyticsStats(startDate, endDate);
    
    // Send weekly summary email
    await sendWeeklyAnalyticsSummaryEmail(stats);
    
    return true;
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return false;
  }
}

export default {
  trackSignup,
  trackVerificationSuccess,
  trackVerificationFailure,
  recordAnalyticsEvent,
  getAnalyticsStats,
  generateAndSendWeeklyReport
};
