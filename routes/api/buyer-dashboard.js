import express from 'express';
import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT ss.id) as saved_searches,
        COUNT(DISTINCT ba.id) as active_alerts,
        COUNT(DISTINCT bm.id) as meetings_booked,
        COUNT(DISTINCT bvt.id) as businesses_viewed
      FROM users u
      LEFT JOIN saved_searches ss ON u.id = ss.user_id AND ss.deleted_at IS NULL
      LEFT JOIN buyer_alerts ba ON u.id = ba.buyer_id AND ba.status = 'active'
      LEFT JOIN business_meetings bm ON u.id = bm.buyer_id AND bm.status IN ('scheduled', 'confirmed')
      LEFT JOIN buyer_view_tracking bvt ON u.id = bvt.buyer_id 
        AND bvt.viewed_at >= NOW() - INTERVAL '30 days'
      WHERE u.id = $1
    `;
    
    const result = await pool.query(statsQuery, [userId]);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      stats: {
        savedSearches: parseInt(stats.saved_searches) || 0,
        activeAlerts: parseInt(stats.active_alerts) || 0,
        meetingsBooked: parseInt(stats.meetings_booked) || 0,
        businessesViewed: parseInt(stats.businesses_viewed) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// Get recent alerts
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    const alertsQuery = `
      SELECT ba.*, 
             CASE 
               WHEN ba.alert_type = 'price_drop' THEN 'Price Drop Alert'
               WHEN ba.alert_type = 'new_listing' THEN 'New Business Listed'
               WHEN ba.alert_type = 'status_change' THEN 'Status Change'
               ELSE 'Business Alert'
             END as alert_title,
             ba.created_at,
             ba.criteria
      FROM buyer_alerts ba
      WHERE ba.buyer_id = $1 
        AND ba.status = 'active'
        AND ba.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ba.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(alertsQuery, [userId, limit]);
    
    const alerts = result.rows.map(alert => ({
      id: alert.id,
      title: alert.alert_title,
      description: alert.criteria ? 
        `${alert.criteria.business_type || 'Business'} in ${alert.criteria.location || 'Various locations'}` :
        'New business opportunity available',
      timeAgo: formatTimeAgo(alert.created_at),
      type: alert.alert_type,
      icon: getAlertIcon(alert.alert_type)
    }));
    
    res.json({ success: true, alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// Create new alert
router.post('/alerts', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, criteria, alert_type = 'new_listing' } = req.body;
    
    if (!name || !criteria) {
      return res.status(400).json({ success: false, error: 'Name and criteria are required' });
    }
    
    const insertQuery = `
      INSERT INTO buyer_alerts (buyer_id, name, criteria, alert_type, status, created_at)
      VALUES ($1, $2, $3, $4, 'active', NOW())
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [userId, name, JSON.stringify(criteria), alert_type]);
    
    res.json({ success: true, alert: result.rows[0] });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ success: false, error: 'Failed to create alert' });
  }
});

// Get upcoming meetings
router.get('/meetings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;
    
    const meetingsQuery = `
      SELECT bm.*, b.business_name, b.business_type,
             s.business_name as seller_business_name,
             u.username as seller_name
      FROM business_meetings bm
      JOIN businesses b ON bm.business_id = b.id
      LEFT JOIN users s ON b.seller_id = s.id
      LEFT JOIN users u ON s.id = u.id
      WHERE bm.buyer_id = $1 
        AND bm.status IN ('scheduled', 'confirmed')
        AND bm.scheduled_at >= NOW()
      ORDER BY bm.scheduled_at ASC
      LIMIT $2
    `;
    
    const result = await pool.query(meetingsQuery, [userId, limit]);
    
    const meetings = result.rows.map(meeting => ({
      id: meeting.id,
      businessName: meeting.business_name,
      businessType: meeting.business_type,
      sellerName: meeting.seller_name,
      scheduledAt: meeting.scheduled_at,
      status: meeting.status,
      meetingType: meeting.meeting_type || 'video'
    }));
    
    res.json({ success: true, meetings });
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch meetings' });
  }
});

// Get saved searches
router.get('/searches', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;
    
    const searchesQuery = `
      SELECT ss.*, 
             COUNT(b.id) as matching_businesses
      FROM saved_searches ss
      LEFT JOIN businesses b ON (
        (ss.criteria->>'business_type' IS NULL OR b.business_type ILIKE '%' || (ss.criteria->>'business_type') || '%')
        AND (ss.criteria->>'location' IS NULL OR b.location ILIKE '%' || (ss.criteria->>'location') || '%')
        AND (ss.criteria->>'min_price' IS NULL OR b.asking_price >= (ss.criteria->>'min_price')::numeric)
        AND (ss.criteria->>'max_price' IS NULL OR b.asking_price <= (ss.criteria->>'max_price')::numeric)
      )
      WHERE ss.user_id = $1 AND ss.deleted_at IS NULL
      GROUP BY ss.id
      ORDER BY ss.created_at DESC
      LIMIT $2
    `;
    
    const result = await pool.query(searchesQuery, [userId, limit]);
    
    const searches = result.rows.map(search => ({
      id: search.id,
      name: search.name,
      criteria: search.criteria,
      matchingBusinesses: parseInt(search.matching_businesses) || 0,
      createdAt: search.created_at
    }));
    
    res.json({ success: true, searches });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch saved searches' });
  }
});

// Create new saved search
router.post('/searches', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, criteria } = req.body;
    
    if (!name || !criteria) {
      return res.status(400).json({ success: false, error: 'Name and criteria are required' });
    }
    
    const insertQuery = `
      INSERT INTO saved_searches (user_id, name, criteria, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [userId, name, JSON.stringify(criteria)]);
    
    res.json({ success: true, search: result.rows[0] });
  } catch (error) {
    console.error('Error creating saved search:', error);
    res.status(500).json({ success: false, error: 'Failed to create saved search' });
  }
});

// Track business view
router.post('/track-view', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessId, sessionId } = req.body;
    
    if (!businessId) {
      return res.status(400).json({ success: false, error: 'Business ID is required' });
    }
    
    // Check if view already exists for this session
    const existingQuery = `
      SELECT id FROM buyer_view_tracking 
      WHERE buyer_id = $1 AND business_id = $2 AND session_id = $3
    `;
    
    const existing = await pool.query(existingQuery, [userId, businessId, sessionId]);
    
    if (existing.rows.length === 0) {
      const insertQuery = `
        INSERT INTO buyer_view_tracking (buyer_id, business_id, session_id, viewed_at)
        VALUES ($1, $2, $3, NOW())
      `;
      
      await pool.query(insertQuery, [userId, businessId, sessionId]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ success: false, error: 'Failed to track view' });
  }
});

// Update alert status
router.patch('/alerts/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.id;
    const { status } = req.body;
    
    if (!['active', 'paused', 'deleted'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    
    const updateQuery = `
      UPDATE buyer_alerts 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND buyer_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [status, alertId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, alert: result.rows[0] });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ success: false, error: 'Failed to update alert' });
  }
});

// Get dashboard analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    // Search activity over time
    const searchActivityQuery = `
      SELECT 
        DATE(viewed_at) as date,
        COUNT(*) as views
      FROM buyer_view_tracking 
      WHERE buyer_id = $1 
        AND viewed_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(viewed_at)
      ORDER BY date DESC
      LIMIT 30
    `;
    
    const searchActivity = await pool.query(searchActivityQuery, [userId]);
    
    // Alert trends
    const alertTrendsQuery = `
      SELECT 
        alert_type,
        COUNT(*) as count
      FROM buyer_alerts 
      WHERE buyer_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY alert_type
    `;
    
    const alertTrends = await pool.query(alertTrendsQuery, [userId]);
    
    res.json({
      success: true,
      analytics: {
        searchActivity: searchActivity.rows,
        alertTrends: alertTrends.rows
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// Helper functions
function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Less than an hour ago';
}

function getAlertIcon(alertType) {
  switch (alertType) {
    case 'price_drop': return 'fas fa-tag';
    case 'new_listing': return 'fas fa-exclamation';
    case 'status_change': return 'fas fa-info-circle';
    default: return 'fas fa-bell';
  }
}

export default router;
