import pool from '../db.js';

/**
 * Record user analytics event in the database
 * @param {string} eventType - The type of event (signup, verification, etc.)
 * @param {string|number} userId - The user ID associated with the event
 * @param {Object} eventData - Additional data about the event
 * @returns {Promise<Object>} - The database query result
 */
export async function recordAnalyticsEvent(eventType, userId, eventData = {}) {
  try {
    // First check if analytics_events table exists
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
      `);
      console.log('Created analytics_events table');
    }
    
    // Insert the event record
    const result = await pool.query(
      'INSERT INTO analytics_events (event_type, user_id, event_data) VALUES ($1, $2, $3) RETURNING *',
      [eventType, userId, JSON.stringify(eventData)]
    );
    
    console.log(`Recorded analytics event: ${eventType} for user ${userId}`);
    return result.rows[0];
  } catch (error) {
    console.error('Failed to record analytics event:', error);
    // Don't throw, just log the error so it doesn't interrupt the main flow
    return null;
  }
}

/**
 * Get analytics summary for user events within a time period
 * @param {string} eventType - Type of event to query
 * @param {Date} startDate - Start date for the query
 * @param {Date} endDate - End date for the query
 * @returns {Promise<Object>} - Summary statistics
 */
export async function getAnalyticsSummary(eventType, startDate, endDate = new Date()) {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_count, 
        MIN(created_at) as first_event,
        MAX(created_at) as last_event
      FROM analytics_events 
      WHERE event_type = $1 
      AND created_at BETWEEN $2 AND $3`,
      [eventType, startDate, endDate]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to get analytics summary:', error);
    return { total_count: 0, first_event: null, last_event: null };
  }
}

export default {
  recordAnalyticsEvent,
  getAnalyticsSummary
};
