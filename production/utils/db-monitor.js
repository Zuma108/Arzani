import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logDir = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create log files
const slowQueryLog = path.join(logDir, 'slow-queries.log');
const errorLog = path.join(logDir, 'db-errors.log');

class DatabaseMonitor {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.options = {
      slowQueryThreshold: 200, // ms
      logToConsole: true,
      logToFile: true,
      ...options
    };
    
    // Add error handler to pool
    this.pool.on('error', this.handlePoolError.bind(this));
    
    console.log('Database monitor initialized with options:', this.options);
  }
  
  // Handle pool errors
  handlePoolError(error, client) {
    this.logError('Pool error', error);
  }
  
  // Track query execution time
  async monitorQuery(text, params, callback) {
    const start = Date.now();
    let result;
    
    try {
      result = await callback();
      const duration = Date.now() - start;
      
      if (duration > this.options.slowQueryThreshold) {
        this.logSlowQuery(text, params, duration);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logError(`Query error after ${duration}ms`, error, { text, params });
      throw error;
    }
  }
  
  // Execute query with monitoring
  async query(text, params) {
    return this.monitorQuery(text, params, () => this.pool.query(text, params));
  }
  
  // Log slow query
  logSlowQuery(text, params, duration) {
    const timestamp = new Date().toISOString();
    const queryText = typeof text === 'string' ? text : JSON.stringify(text);
    const message = `[${timestamp}] Slow query (${duration}ms): ${queryText} - Params: ${JSON.stringify(params)}`;
    
    if (this.options.logToConsole) {
      console.warn(`Slow query detected: ${duration}ms - ${queryText.substring(0, 100)}...`);
    }
    
    if (this.options.logToFile) {
      fs.appendFile(slowQueryLog, message + '\n', (err) => {
        if (err) console.error('Error writing to slow query log:', err);
      });
    }
  }
  
  // Log error
  logError(message, error, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    if (this.options.logToConsole) {
      console.error(`DB Error: ${message}`, error);
    }
    
    if (this.options.logToFile) {
      fs.appendFile(
        errorLog, 
        JSON.stringify(logEntry, null, 2) + '\n\n',
        (err) => {
          if (err) console.error('Error writing to error log:', err);
        }
      );
    }
  }
  
  // Get database metrics
  async getMetrics() {
    try {
      const metrics = await this.pool.query(`
        SELECT
          pg_database_size(current_database()) as db_size,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
      `);
      
      const result = metrics.rows[0];
      const dbSizeMB = Math.round(result.db_size / (1024 * 1024));
      
      return {
        dbSizeMB,
        activeConnections: parseInt(result.active_connections),
        idleConnections: parseInt(result.idle_connections),
        totalConnections: parseInt(result.total_connections),
        maxConnections: parseInt(result.max_connections)
      };
    } catch (error) {
      this.logError('Error getting database metrics', error);
      return null;
    }
  }
}

export default DatabaseMonitor;
