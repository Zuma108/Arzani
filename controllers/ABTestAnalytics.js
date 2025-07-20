/**
 * Enhanced A/B Testing Analytics Controller
 * Handles A/B test data collection, analysis, and reporting with database integration
 */

import pool from '../db.js';
import fs from 'fs/promises';
import path from 'path';

class ABTestAnalytics {
  constructor() {
    this.dataDirectory = path.join(process.cwd(), 'data', 'analytics');
    this.ensureDataDirectory();
  }

  /**
   * Normalize and validate event types
   * @param {string} eventType - Raw event type from client
   * @returns {string} - Normalized event type
   */
  normalizeEventType(eventType) {
    // Return default if input is null, undefined, or empty
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      return 'page_view';
    }

    // Normalize common variations
    const normalized = eventType.toLowerCase().trim();
    
    switch (normalized) {
      case 'click':
      case 'button_click':
      case 'btn_click':
        return 'button_click';
      
      case 'submit':
      case 'form_submit':
      case 'form_submission':
        return 'form_submit';
      
      case 'view':
      case 'page_view':
      case 'pageview':
        return 'page_view';
      
      case 'scroll':
      case 'scrolling':
        return 'scroll';
      
      case 'time':
      case 'time_spent':
      case 'duration':
        return 'time_spent';
      
      case 'convert':
      case 'conversion':
        return 'conversion';
      
      case 'engage':
      case 'engagement':
        return 'engagement';
      
      case 'action':
      case 'user_action':
        return 'user_action';
      
      case 'navigate':
      case 'navigation':
        return 'navigation';
      
      default:
        // Check if it's already a valid event type
        const validEventTypes = [
          'page_view', 'button_click', 'form_submit', 'scroll', 
          'time_spent', 'conversion', 'engagement', 'user_action', 'navigation'
        ];
        
        if (validEventTypes.includes(normalized)) {
          return normalized;
        }
        
        // Default to page_view for unknown types
        console.warn(`Unknown event type "${eventType}", defaulting to page_view`);
        return 'page_view';
    }
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDirectory, { recursive: true });
    } catch (error) {
      console.error('Error creating analytics directory:', error);
    }
  }

  /**
   * Record A/B test session assignment
   */
  async recordSessionAssignment(sessionData) {
    try {
      const { sessionId, userId, variant, ipAddress, userAgent, routingMethod } = sessionData;
      
      // Convert userId to integer or null if it's not a valid integer
      const validUserId = (userId && !isNaN(parseInt(userId))) ? parseInt(userId) : null;
      
      await pool.query(`
        INSERT INTO ab_test_sessions (
          session_id, 
          user_id, 
          variant, 
          ip_address, 
          user_agent, 
          routing_method
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          variant = EXCLUDED.variant,
          routing_method = EXCLUDED.routing_method
      `, [sessionId, validUserId, variant, ipAddress, userAgent, routingMethod || 'a_b_testing']);

      return { success: true };
    } catch (error) {
      console.error('Error recording session assignment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record A/B test event
   */
  async recordEvent(eventData) {
    try {
      const {
        sessionId,
        userId,
        eventType,
        variant,
        pageUrl,
        elementClicked,
        eventData: extraData,
        ipAddress,
        userAgent,
        routingMethod
      } = eventData;

      // Convert userId to integer or null if it's not a valid integer
      const validUserId = (userId && !isNaN(parseInt(userId))) ? parseInt(userId) : null;

      // Normalize and validate the event type
      const validEventType = this.normalizeEventType(eventType);

      // Validate required fields
      if (!sessionId || !variant) {
        throw new Error('Missing required fields: sessionId and variant are required');
      }

      // Insert into database
      await pool.query(`
        INSERT INTO ab_test_events (
          session_id,
          user_id,
          event_type,
          variant,
          page_url,
          element_clicked,
          event_data,
          ip_address,
          user_agent,
          routing_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        sessionId,
        validUserId,
        validEventType, // Use the validated event type
        variant,
        pageUrl,
        elementClicked,
        JSON.stringify(extraData || {}),
        ipAddress,
        userAgent,
        routingMethod
      ]);

      // Also log to file for backup/analysis
      await this.logToFile({
        ...eventData,
        eventType: validEventType // Use the validated event type for logging
      });

      // Update analytics summary if it's a conversion event
      if (this.isConversionEvent(validEventType)) {
        await this.recordConversion({
          sessionId,
          userId,
          variant,
          conversionType: eventType,
          conversionData: extraData
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording A/B test event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record conversion event
   */
  async recordConversion(conversionData) {
    try {
      const {
        sessionId,
        userId,
        variant,
        conversionType,
        conversionValue,
        conversionData: extraData
      } = conversionData;

      await pool.query(`
        INSERT INTO ab_test_conversions (
          session_id,
          user_id,
          variant,
          conversion_type,
          conversion_value,
          conversion_data
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        sessionId,
        userId,
        variant,
        conversionType,
        conversionValue || null,
        JSON.stringify(extraData || {})
      ]);

      // Update daily summary
      await this.updateDailySummary(variant);

      return { success: true };
    } catch (error) {
      console.error('Error recording conversion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if an event type is a conversion
   */
  isConversionEvent(eventType) {
    const conversionEvents = [
      'signup',
      'business_submit',
      'contact_seller',
      'valuation_request',
      'save_business',
      'premium_upgrade',
      'form_complete'
    ];
    return conversionEvents.includes(eventType);
  }

  /**
   * Update daily analytics summary
   */
  async updateDailySummary(variant) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Get session stats for today
      const sessionStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users
        FROM ab_test_sessions 
        WHERE variant = $1 
          AND DATE(assigned_at) = $2
      `, [variant, today]);

      // Get event stats for today
      const eventStats = await pool.query(`
        SELECT 
          COUNT(*) as total_page_views,
          COUNT(DISTINCT session_id) as sessions_with_events
        FROM ab_test_events 
        WHERE variant = $1 
          AND event_type = 'page_view'
          AND DATE(timestamp) = $2
      `, [variant, today]);

      // Get conversion stats for today
      const conversionStats = await pool.query(`
        SELECT 
          COUNT(*) as total_conversions
        FROM ab_test_conversions 
        WHERE variant = $1 
          AND DATE(timestamp) = $2
      `, [variant, today]);

      const sessions = parseInt(sessionStats.rows[0]?.total_sessions) || 0;
      const pageViews = parseInt(eventStats.rows[0]?.total_page_views) || 0;
      const conversions = parseInt(conversionStats.rows[0]?.total_conversions) || 0;
      const uniqueUsers = parseInt(sessionStats.rows[0]?.unique_users) || 0;
      
      const conversionRate = sessions > 0 ? (conversions / sessions) : 0;
      const bounceRate = this.calculateBounceRate(variant, today);

      // Update or insert summary
      await pool.query(`
        INSERT INTO ab_test_analytics_summary (
          variant,
          date_recorded,
          total_sessions,
          total_page_views,
          total_conversions,
          conversion_rate,
          unique_users,
          bounce_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (variant, date_recorded)
        DO UPDATE SET
          total_sessions = EXCLUDED.total_sessions,
          total_page_views = EXCLUDED.total_page_views,
          total_conversions = EXCLUDED.total_conversions,
          conversion_rate = EXCLUDED.conversion_rate,
          unique_users = EXCLUDED.unique_users,
          bounce_rate = EXCLUDED.bounce_rate,
          updated_at = CURRENT_TIMESTAMP
      `, [variant, today, sessions, pageViews, conversions, conversionRate, uniqueUsers, bounceRate]);

    } catch (error) {
      console.error('Error updating daily summary:', error);
    }
  }

  /**
   * Calculate bounce rate for a variant on a specific date
   */
  async calculateBounceRate(variant, date) {
    try {
      const bounceStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT s.session_id) as total_sessions,
          COUNT(DISTINCT CASE 
            WHEN event_counts.event_count <= 1 THEN s.session_id 
          END) as bounce_sessions
        FROM ab_test_sessions s
        LEFT JOIN (
          SELECT 
            session_id, 
            COUNT(*) as event_count
          FROM ab_test_events 
          WHERE DATE(timestamp) = $2
          GROUP BY session_id
        ) event_counts ON s.session_id = event_counts.session_id
        WHERE s.variant = $1 
          AND DATE(s.assigned_at) = $2
      `, [variant, date]);

      const total = parseInt(bounceStats.rows[0]?.total_sessions) || 0;
      const bounces = parseInt(bounceStats.rows[0]?.bounce_sessions) || 0;

      return total > 0 ? (bounces / total) : 0;
    } catch (error) {
      console.error('Error calculating bounce rate:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive A/B test analytics
   */
  async getAnalytics(options = {}) {
    try {
      // Handle both old format (number of days) and new format (options object)
      let startDate, endDate, variant = null;
      
      if (typeof options === 'number') {
        // Legacy format: number of days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - options);
      } else {
        // New format: options object
        const { 
          timeframe = '7d', 
          startDate: customStart, 
          endDate: customEnd,
          variant: filterVariant 
        } = options;
        
        if (customStart && customEnd) {
          startDate = new Date(customStart);
          endDate = new Date(customEnd);
        } else if (timeframe === '24h') {
          endDate = new Date();
          startDate = new Date();
          startDate.setHours(startDate.getHours() - 24);
        } else if (timeframe === '7d') {
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === '30d') {
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        } else {
          // Default to 7 days
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        }
        
        variant = filterVariant;
        
        // For real-time data, use live calculations instead of pre-aggregated summaries
        if (timeframe === '1h' || timeframe === '24h') {
          return await this.getRealTimeAnalytics(startDate, endDate, variant);
        }
      }
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date range:', { startDate, endDate });
        throw new Error('Invalid date range provided');
      }

      // Calculate date range in days
      const dateRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      // Get summary data with optional variant filtering
      let summaryQuery = `
        SELECT 
          variant,
          SUM(total_sessions) as total_sessions,
          SUM(total_page_views) as total_page_views,
          SUM(total_conversions) as total_conversions,
          AVG(conversion_rate) as avg_conversion_rate,
          SUM(unique_users) as total_unique_users,
          AVG(bounce_rate) as avg_bounce_rate
        FROM ab_test_analytics_summary
        WHERE date_recorded >= $1 AND date_recorded <= $2
      `;
      
      let queryParams = [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
      
      if (variant) {
        summaryQuery += ` AND variant = $3`;
        queryParams.push(variant);
      }
      
      summaryQuery += ` GROUP BY variant ORDER BY variant`;
      
      const summaryData = await pool.query(summaryQuery, queryParams);

      // Get daily breakdown
      const dailyData = await pool.query(`
        SELECT 
          variant,
          date_recorded,
          total_sessions,
          total_page_views,
          total_conversions,
          conversion_rate,
          unique_users,
          bounce_rate
        FROM ab_test_analytics_summary
        WHERE date_recorded >= $1 AND date_recorded <= $2
        ORDER BY date_recorded, variant
      `, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

      // Get event type breakdown
      const eventBreakdown = await pool.query(`
        SELECT 
          variant,
          event_type,
          COUNT(*) as event_count,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM ab_test_events
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY variant, event_type
        ORDER BY variant, event_count DESC
      `, [startDate, endDate]);

      // Get conversion funnel data
      const funnelData = await this.getConversionFunnel(startDate, endDate);

      // Calculate statistical significance
      const significance = await this.calculateStatisticalSignificance(summaryData.rows);

      return {
        summary: summaryData.rows,
        daily: dailyData.rows,
        events: eventBreakdown.rows,
        funnel: funnelData,
        significance,
        dateRange: {
          start: startDate,
          end: endDate,
          days: dateRange
        }
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics data by querying live tables
   */
  async getRealTimeAnalytics(startDate, endDate, variant = null) {
    try {
      // Build base queries with optional variant filtering
      const variantFilter = variant ? `AND variant = $3` : '';
      const queryParams = variant ? [startDate, endDate, variant] : [startDate, endDate];

      // Get real-time session data
      const sessionData = await pool.query(`
        SELECT 
          variant,
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users
        FROM ab_test_sessions
        WHERE assigned_at >= $1 AND assigned_at <= $2 ${variantFilter}
        GROUP BY variant
        ORDER BY variant
      `, queryParams);

      // Get real-time event data
      const eventData = await pool.query(`
        SELECT 
          variant,
          COUNT(*) as total_events,
          COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as total_page_views,
          COUNT(DISTINCT session_id) as sessions_with_events
        FROM ab_test_events
        WHERE timestamp >= $1 AND timestamp <= $2 ${variantFilter}
        GROUP BY variant
        ORDER BY variant
      `, queryParams);

      // Get real-time conversion data
      const conversionData = await pool.query(`
        SELECT 
          variant,
          COUNT(*) as total_conversions,
          COUNT(DISTINCT session_id) as converted_sessions
        FROM ab_test_conversions
        WHERE timestamp >= $1 AND timestamp <= $2 ${variantFilter}
        GROUP BY variant
        ORDER BY variant
      `, queryParams);

      // Merge the data
      const variants = ['seller_first', 'buyer_first'];
      const summary = variants.map(variantName => {
        const sessions = sessionData.rows.find(r => r.variant === variantName) || { total_sessions: 0, unique_users: 0 };
        const events = eventData.rows.find(r => r.variant === variantName) || { total_events: 0, total_page_views: 0, sessions_with_events: 0 };
        const conversions = conversionData.rows.find(r => r.variant === variantName) || { total_conversions: 0, converted_sessions: 0 };

        const totalSessions = parseInt(sessions.total_sessions) || 0;
        const totalConversions = parseInt(conversions.total_conversions) || 0;
        const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;

        return {
          variant: variantName,
          total_sessions: totalSessions,
          total_page_views: parseInt(events.total_page_views) || 0,
          total_conversions: totalConversions,
          conversion_rate: Math.round(conversionRate * 100) / 100,
          total_unique_users: parseInt(sessions.unique_users) || 0,
          avg_bounce_rate: 0 // Calculate separately if needed
        };
      });

      // Get hourly breakdown for trends
      const hourlyData = await pool.query(`
        SELECT 
          variant,
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(DISTINCT session_id) as sessions,
          COUNT(*) as events,
          COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views
        FROM ab_test_events
        WHERE timestamp >= $1 AND timestamp <= $2 ${variantFilter}
        GROUP BY variant, hour
        ORDER BY hour, variant
      `, queryParams);

      // Get event breakdown
      const eventBreakdown = await pool.query(`
        SELECT 
          variant,
          event_type,
          COUNT(*) as event_count,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM ab_test_events
        WHERE timestamp >= $1 AND timestamp <= $2 ${variantFilter}
        GROUP BY variant, event_type
        ORDER BY variant, event_count DESC
      `, queryParams);

      // Calculate statistical significance
      const significance = await this.calculateStatisticalSignificance(summary);

      return {
        summary,
        daily: hourlyData.rows,
        hourlyBreakdown: hourlyData.rows,
        events: eventBreakdown.rows,
        funnel: await this.getConversionFunnel(startDate, endDate),
        significance,
        dateRange: {
          start: startDate,
          end: endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        },
        realTime: true
      };
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      throw error;
    }
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(startDate, endDate) {
    try {
      const funnelSteps = [
        'page_view',
        'form_interaction',
        'form_complete',
        'signup',
        'business_submit'
      ];

      const funnelData = {};

      for (const variant of ['seller_first', 'buyer_first']) {
        funnelData[variant] = {};

        for (let i = 0; i < funnelSteps.length; i++) {
          const step = funnelSteps[i];
          const prevStep = i > 0 ? funnelSteps[i - 1] : null;

          if (prevStep) {
            // Users who completed previous step
            const prevStepUsers = await pool.query(`
              SELECT DISTINCT session_id 
              FROM ab_test_events 
              WHERE variant = $1 
                AND event_type = $2
                AND timestamp >= $3 AND timestamp <= $4
            `, [variant, prevStep, startDate, endDate]);

            if (prevStepUsers.rows.length > 0) {
              const prevStepSessionIds = prevStepUsers.rows.map(row => row.session_id);

              // Users who completed current step (from those who completed previous)
              const currentStepUsers = await pool.query(`
                SELECT COUNT(DISTINCT session_id) as count
                FROM ab_test_events 
                WHERE variant = $1 
                  AND event_type = $2
                  AND session_id = ANY($3)
                  AND timestamp >= $4 AND timestamp <= $5
              `, [variant, step, prevStepSessionIds, startDate, endDate]);

              funnelData[variant][step] = {
                count: parseInt(currentStepUsers.rows[0]?.count) || 0,
                total_possible: prevStepUsers.rows.length,
                conversion_rate: prevStepUsers.rows.length > 0 ? 
                  (parseInt(currentStepUsers.rows[0]?.count) || 0) / prevStepUsers.rows.length : 0
              };
            } else {
              funnelData[variant][step] = { count: 0, total_possible: 0, conversion_rate: 0 };
            }
          } else {
            // First step - all sessions
            const firstStepUsers = await pool.query(`
              SELECT COUNT(DISTINCT session_id) as count
              FROM ab_test_events 
              WHERE variant = $1 
                AND event_type = $2
                AND timestamp >= $3 AND timestamp <= $4
            `, [variant, step, startDate, endDate]);

            funnelData[variant][step] = {
              count: parseInt(firstStepUsers.rows[0]?.count) || 0,
              total_possible: null,
              conversion_rate: 1.0
            };
          }
        }
      }

      return funnelData;
    } catch (error) {
      console.error('Error getting funnel data:', error);
      return {};
    }
  }

  /**
   * Calculate statistical significance between variants
   */
  async calculateStatisticalSignificance(summaryData) {
    try {
      if (!summaryData || summaryData.length < 1) {
        return { 
          significant: false, 
          confidence: 0, 
          lift: 0,
          message: 'No data available' 
        };
      }

      if (summaryData.length < 2) {
        return { 
          significant: false, 
          confidence: 0, 
          lift: 0,
          message: 'Need at least 2 variants for comparison' 
        };
      }

      const variantA = summaryData.find(v => v.variant === 'seller_first');
      const variantB = summaryData.find(v => v.variant === 'buyer_first');

      if (!variantA || !variantB) {
        return { 
          significant: false, 
          confidence: 0, 
          lift: 0,
          message: 'Missing variant data for comparison' 
        };
      }

      const nA = parseInt(variantA.total_sessions) || 0;
      const nB = parseInt(variantB.total_sessions) || 0;
      const xA = parseInt(variantA.total_conversions) || 0;
      const xB = parseInt(variantB.total_conversions) || 0;

      // Validate data integrity
      if (xA > nA || xB > nB) {
        console.warn('Data integrity issue: conversions exceed sessions', { variantA, variantB });
        return { 
          significant: false, 
          confidence: 0, 
          lift: 0,
          message: 'Data integrity issue detected' 
        };
      }

      if (nA < 30 || nB < 30) {
        const totalSessions = nA + nB;
        let message = `Need at least 30 sessions per variant (A: ${nA}, B: ${nB})`;
        
        if (totalSessions > 0) {
          const preliminaryA = nA > 0 ? (xA / nA) * 100 : 0;
          const preliminaryB = nB > 0 ? (xB / nB) * 100 : 0;
          const preliminaryLift = preliminaryA > 0 ? ((preliminaryB - preliminaryA) / preliminaryA) * 100 : 0;
          
          return { 
            significant: false, 
            confidence: 0, 
            lift: Math.round(preliminaryLift * 100) / 100,
            preliminaryData: {
              variantA: { rate: preliminaryA, sessions: nA, conversions: xA },
              variantB: { rate: preliminaryB, sessions: nB, conversions: xB }
            },
            message 
          };
        }
        
        return { 
          significant: false, 
          confidence: 0, 
          lift: 0,
          message 
        };
      }

      const pA = xA / nA;
      const pB = xB / nB;
      
      // Handle edge cases where rates are 0 or 1
      if (pA === 0 && pB === 0) {
        return {
          significant: false,
          confidence: 0,
          lift: 0,
          variantA: { rate: pA, sessions: nA, conversions: xA },
          variantB: { rate: pB, sessions: nB, conversions: xB },
          message: 'No conversions in either variant'
        };
      }

      const pPool = (xA + xB) / (nA + nB);
      
      // Avoid division by zero
      if (pPool === 0 || pPool === 1) {
        const lift = pA > 0 ? ((pB - pA) / pA) * 100 : (pB > 0 ? 100 : 0);
        return {
          significant: false,
          confidence: 0,
          lift: Math.round(lift * 100) / 100,
          variantA: { rate: pA, sessions: nA, conversions: xA },
          variantB: { rate: pB, sessions: nB, conversions: xB },
          message: pPool === 0 ? 'No conversions detected' : 'All sessions converted'
        };
      }
      
      const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
      
      // Avoid division by zero in standard error
      if (se === 0) {
        return {
          significant: false,
          confidence: 0,
          lift: 0,
          variantA: { rate: pA, sessions: nA, conversions: xA },
          variantB: { rate: pB, sessions: nB, conversions: xB },
          message: 'Cannot calculate significance (zero standard error)'
        };
      }
      
      const zScore = Math.abs(pA - pB) / se;
      
      // Convert z-score to confidence level
      const confidence = this.zScoreToConfidence(zScore);
      const significant = confidence >= 0.95;

      // Calculate lift percentage safely
      const lift = pA > 0 ? ((pB - pA) / pA) * 100 : (pB > 0 ? 100 : 0);

      return {
        significant,
        confidence: Math.round(confidence * 10000) / 100, // Round to 2 decimal places
        zScore: Math.round(zScore * 1000) / 1000,
        variantA: { rate: Math.round(pA * 10000) / 100, sessions: nA, conversions: xA },
        variantB: { rate: Math.round(pB * 10000) / 100, sessions: nB, conversions: xB },
        difference: Math.round(Math.abs(pA - pB) * 10000) / 100,
        lift: Math.round(lift * 100) / 100,
        winner: pA > pB ? 'seller_first' : (pB > pA ? 'buyer_first' : 'tie'),
        message: significant ? 
          `Statistically significant at ${Math.round(confidence * 100)}% confidence` :
          `Not statistically significant (${Math.round(confidence * 100)}% confidence)`
      };
    } catch (error) {
      console.error('Error calculating statistical significance:', error);
      return { 
        significant: false, 
        confidence: 0, 
        lift: 0,
        message: 'Error calculating significance',
        error: error.message 
      };
    }
  }

  /**
   * Convert z-score to confidence level
   */
  zScoreToConfidence(zScore) {
    // Approximate conversion using normal distribution
    const table = [
      { z: 1.645, conf: 0.90 },
      { z: 1.96, conf: 0.95 },
      { z: 2.33, conf: 0.98 },
      { z: 2.58, conf: 0.99 }
    ];

    for (let i = table.length - 1; i >= 0; i--) {
      if (zScore >= table[i].z) {
        return table[i].conf;
      }
    }

    return Math.min(0.5 + (zScore / 3.29) * 0.4, 0.89); // Linear approximation for lower values
  }

  /**
   * Log event to file for backup/analysis
   */
  async logToFile(eventData) {
    try {
      const logFile = path.join(this.dataDirectory, 'ab-test-data.jsonl');
      const logEntry = JSON.stringify({
        ...eventData,
        timestamp: new Date().toISOString()
      }) + '\n';

      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Error logging to file:', error);
    }
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up events older than retention period
      await pool.query(`
        DELETE FROM ab_test_events 
        WHERE timestamp < $1
      `, [cutoffDate]);

      // Clean up sessions older than retention period
      await pool.query(`
        DELETE FROM ab_test_sessions 
        WHERE assigned_at < $1
      `, [cutoffDate]);

      // Keep summary data longer (1 year)
      const summaryCutoffDate = new Date();
      summaryCutoffDate.setDate(summaryCutoffDate.getDate() - 365);

      await pool.query(`
        DELETE FROM ab_test_analytics_summary 
        WHERE date_recorded < $1
      `, [summaryCutoffDate.toISOString().split('T')[0]]);

      console.log(`Cleaned up A/B test data older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }
}

export default ABTestAnalytics;
