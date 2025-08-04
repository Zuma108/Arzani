import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file for slow queries
const slowQueryLog = path.join(logDir, 'slow-queries.log');

// Create the optimized pool with cost-saving configurations
const createOptimizedPool = () => {
  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    // Cost optimization settings
    max: process.env.DB_MAX_CONNECTIONS || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    allowExitOnIdle: true
  });
};

// Track slow queries
const trackSlowQuery = (query, params, duration) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Slow query (${duration}ms): ${query} - Params: ${JSON.stringify(params)}\n`;
  
  fs.appendFile(slowQueryLog, logEntry, (err) => {
    if (err) console.error('Error logging slow query:', err);
  });
  
  console.warn(`Slow query detected: ${duration}ms - ${query.substring(0, 100)}...`);
};

// Execute query with timing and optimization
const optimizedQuery = async (pool, text, params, timeout = 5000) => {
  const start = Date.now();
  
  try {
    // Add query timeout
    const result = await Promise.race([
      pool.query(text, params),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
    
    const duration = Date.now() - start;
    
    // Log slow queries (> 200ms)
    if (duration > 200) {
      trackSlowQuery(text, params, duration);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Query error (${duration}ms):`, error);
    trackSlowQuery(text, params, duration);
    throw error;
  }
};

// Automatic scaling detection
const checkDatabaseLoad = async (pool) => {
  try {
    // Check current connections
    const result = await pool.query(`
      SELECT count(*) as connections
      FROM pg_stat_activity
      WHERE state = 'active'
    `);
    
    const connections = parseInt(result.rows[0].connections);
    const maxConnections = pool.options.max;
    const loadPercentage = (connections / maxConnections) * 100;
    
    console.log(`Current database load: ${loadPercentage.toFixed(2)}% (${connections}/${maxConnections} connections)`);
    
    // Recommend scaling if consistently high
    if (loadPercentage > 80) {
      console.warn(`High database load detected (${loadPercentage.toFixed(2)}%). Consider optimizing queries or scaling.`);
    }
    
    return {
      connections,
      maxConnections,
      loadPercentage
    };
  } catch (error) {
    console.error('Error checking database load:', error);
    return null;
  }
};

// Database metrics
const getDatabaseMetrics = async (pool) => {
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
    
    return {
      dbSizeMB,
      activeConnections: parseInt(result.active_connections),
      idleConnections: parseInt(result.idle_connections),
      totalConnections: parseInt(result.total_connections),
      maxConnections: parseInt(result.max_connections)
    };
  } catch (error) {
    console.error('Error getting database metrics:', error);
    return null;
  }
};

export {
  createOptimizedPool,
  optimizedQuery,
  checkDatabaseLoad,
  getDatabaseMetrics
};
