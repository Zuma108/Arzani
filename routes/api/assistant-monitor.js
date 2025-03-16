import express from 'express';
import pool from '../../db.js';
import { authenticateToken } from '../../middleware/auth.js';
import { adminAuth } from '../../middleware/adminAuth.js';

const router = express.Router();

// Get assistant usage statistics for admins
router.get('/stats', authenticateToken, adminAuth, async (req, res) => {
  try {
    // Get overall usage stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_interactions,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(tokens_used) as total_tokens,
        AVG(tokens_used) as avg_tokens_per_interaction,
        MIN(created_at) as first_interaction,
        MAX(created_at) as last_interaction
      FROM assistant_interactions
    `);
    
    // Get daily usage for the last 30 days
    const dailyUsage = await pool.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as day,
        COUNT(*) as interactions,
        COUNT(DISTINCT user_id) as users
      FROM assistant_interactions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY day DESC
    `);
    
    // Get top users
    const topUsers = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(ai.id) as interactions,
        SUM(ai.tokens_used) as tokens_used
      FROM users u
      JOIN assistant_interactions ai ON u.id = ai.user_id
      GROUP BY u.id, u.username, u.email
      ORDER BY interactions DESC
      LIMIT 10
    `);
    
    res.json({
      stats: stats.rows[0],
      dailyUsage: dailyUsage.rows,
      topUsers: topUsers.rows
    });
  } catch (error) {
    console.error('Error fetching assistant stats:', error);
    res.status(500).json({ error: 'Failed to fetch assistant stats' });
  }
});

// Get assistant health check (public endpoint)
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    
    // Check assistant_interactions table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'assistant_interactions'
      )
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    res.json({
      status: 'healthy',
      database: 'connected',
      tables: {
        assistant_interactions: tableExists
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Assistant health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
