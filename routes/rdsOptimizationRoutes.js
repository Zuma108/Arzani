import express from 'express';
import pool from '../db.js';
import { adminAuth } from '../middleware/adminAuth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file for slow queries
const slowQueryLog = path.join(logDir, 'slow-queries.log');

// Track slow query
const trackSlowQuery = (query, params, duration) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Slow query (${duration}ms): ${query} - Params: ${JSON.stringify(params)}\n`;
  
  fs.appendFile(slowQueryLog, logEntry, (err) => {
    if (err) console.error('Error logging slow query:', err);
  });
  
  console.warn(`Slow query detected: ${duration}ms - ${query.substring(0, 100)}...`);
};

// Get database metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await pool.query(`
      SELECT
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM pg_stat_activity) as total_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);
    
    const result = metrics.rows[0];
    const dbSizeMB = Math.round(result.db_size / (1024 * 1024));
    
    console.log(`Database metrics:
      - Size: ${dbSizeMB} MB
      - Active connections: ${result.active_connections}
      - Idle connections: ${result.idle_connections}
      - Total connections: ${result.total_connections}
      - Max connections: ${result.max_connections}
    `);
    
    res.json({
      success: true,
      metrics: {
        dbSizeMB,
        activeConnections: parseInt(result.active_connections),
        idleConnections: parseInt(result.idle_connections),
        totalConnections: parseInt(result.total_connections),
        maxConnections: parseInt(result.max_connections),
        currentPoolSize: pool.totalCount || 'unknown',
        currentQueueSize: pool.waitingCount || 'unknown'
      }
    });
  } catch (error) {
    console.error('Error getting database metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database metrics'
    });
  }
});

// Check current load
router.get('/load', async (req, res) => {
  try {
    // Check current connections
    const result = await pool.query(`
      SELECT count(*) as connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `);
    
    const connections = parseInt(result.rows[0].connections);
    const maxConnections = parseInt(await pool.query(`
      SELECT setting FROM pg_settings WHERE name = 'max_connections'
    `).then(res => res.rows[0].setting));
    
    const loadPercentage = (connections / maxConnections) * 100;
    
    console.log(`Current database load: ${loadPercentage.toFixed(2)}% (${connections}/${maxConnections} connections)`);
    
    // Recommend scaling if consistently high
    const highLoad = loadPercentage > 80;
    
    res.json({
      success: true,
      load: {
        connections,
        maxConnections,
        loadPercentage,
        highLoad,
        recommendation: highLoad ? 
          'High load detected. Consider optimizing queries or scaling up.' :
          'Load is within acceptable limits.'
      }
    });
  } catch (error) {
    console.error('Error checking database load:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check database load'
    });
  }
});

// Get optimization recommendations
router.get('/recommendations', async (req, res) => {
  try {
    // Get database metrics
    const metricsQuery = await pool.query(`
      SELECT
        pg_database_size(current_database()) as db_size,
        (SELECT count(*) FROM pg_stat_activity) as total_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
    `);
    
    const metrics = metricsQuery.rows[0];
    const dbSizeMB = Math.round(metrics.db_size / (1024 * 1024));
    
    // Get slow queries (if pg_stat_statements is available)
    let slowQueries = [];
    try {
      const slowQueriesQuery = await pool.query(`
        SELECT * FROM pg_stat_statements
        ORDER BY mean_time DESC
        LIMIT 5
      `);
      slowQueries = slowQueriesQuery.rows;
    } catch (err) {
      console.log('pg_stat_statements extension not available, skipping slow query analysis');
    }
    
    // Generate recommendations
    const recommendations = [];
    
    // Size-based recommendations
    if (dbSizeMB < 100) {
      recommendations.push({
        type: 'instance_size',
        level: 'high',
        description: 'Your database is very small. Consider using the smallest RDS instance class (t3.micro).',
        potentialSavings: 'Up to 50% cost reduction from larger instances'
      });
    } else if (dbSizeMB < 1000) {
      recommendations.push({
        type: 'instance_size',
        level: 'medium',
        description: 'Your database is under 1GB. A t3.small instance should be sufficient.',
        potentialSavings: 'Up to 30% cost reduction'
      });
    }
    
    // Connection-based recommendations
    const activeConnections = parseInt(metrics.active_connections);
    const idleConnections = parseInt(metrics.idle_connections);
    
    if (idleConnections > activeConnections * 2) {
      recommendations.push({
        type: 'connection_pool',
        level: 'medium',
        description: `High number of idle connections (${idleConnections} idle vs ${activeConnections} active). Reduce your connection pool size.`,
        potentialSavings: 'Better resource utilization and reduced memory usage'
      });
    }
    
    // Add storage recommendations
    recommendations.push({
      type: 'storage',
      level: 'medium',
      description: `Current database size is ${dbSizeMB}MB. Set allocated storage to 20GB with auto-scaling enabled.`,
      potentialSavings: 'Pay only for storage you actually use'
    });
    
    // Add standard recommendations
    recommendations.push({
      type: 'scheduling',
      level: 'high',
      description: 'Schedule RDS instance to stop during non-business hours (e.g., nights and weekends).',
      potentialSavings: 'Up to 65% cost reduction by stopping instances when not in use'
    });
    
    res.json({
      success: true,
      metrics: {
        dbSizeMB,
        activeConnections,
        idleConnections,
        totalConnections: parseInt(metrics.total_connections),
        maxConnections: parseInt(metrics.max_connections)
      },
      slowQueries: slowQueries.map(q => ({
        query: q.query?.substring(0, 100) + '...',
        meanTime: q.mean_time,
        calls: q.calls
      })),
      recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

// Apply optimization settings - doesn't directly modify the pool
router.post('/optimize', async (req, res) => {
  try {
    const { recommendedSettings } = req.body;
    
    // Store recommended settings in database for future reference
    // instead of trying to modify the pool directly
    await pool.query(`
      INSERT INTO system_settings (key, value, created_by)
      VALUES ('rds_optimization_settings', $1, $2)
      ON CONFLICT (key) 
      DO UPDATE SET value = $1, updated_at = NOW()
    `, [JSON.stringify(recommendedSettings), req.user.userId]);
    
    res.json({
      success: true,
      message: 'Optimization settings saved',
      settings: recommendedSettings
    });
  } catch (error) {
    console.error('Error saving optimization settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save optimization settings'
    });
  }
});

export default router;
