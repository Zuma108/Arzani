/**
 * Secure database utilities
 * Provides improved security for database operations
 */

import pg from 'pg';
import { promisify } from 'util';

// Create a secure pool with proper configuration
const createSecurePool = (config) => {
  const defaultConfig = {
    // Default to environment variables
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    
    // Security best practices
    ssl: process.env.ENABLE_SSL === 'true' ? {
      rejectUnauthorized: true // Verify SSL certificate in production
    } : false,
    
    // Connection pool settings
    max: 20,           // Maximum connections 
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 2000, // Connection timeout
    
    // Connection handling
    allowExitOnIdle: false,
    
    // Query timeout to prevent long-running queries (3 minutes)
    statement_timeout: 180000
  };

  // Merge with provided config
  const poolConfig = { ...defaultConfig, ...config };
  
  return new pg.Pool(poolConfig);
};

// Create default pool
const pool = createSecurePool();

/**
 * Execute a parameterized query safely
 * @param {string} text - SQL query with parameterized values ($1, $2, etc.)
 * @param {Array} params - Array of parameter values
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Query result
 */
export async function query(text, params = [], options = {}) {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries for optimization
    if (duration > 1000) {
      console.warn('Slow query detected:', {
        query: text,
        duration,
        rows: result.rowCount,
      });
    }
    
    return result;
  } catch (error) {
    // Log query error without exposing full parameters
    console.error('Database query error:', {
      query: text,
      error: error.message,
      code: error.code,
      duration: Date.now() - start
    });
    
    // Add security context to error
    error.securityContext = {
      isDbError: true,
      queryType: text.trim().split(' ')[0].toUpperCase(),
      time: new Date().toISOString()
    };
    
    throw error;
  }
}

/**
 * Execute a transaction safely
 * @param {Function} callback - Async function with client parameter
 * @returns {Promise<any>} - Transaction result
 */
export async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Sanitize a string for use in a SQL query
 * NOTE: Always prefer parameterized queries over string concatenation
 * @param {string} value - Value to sanitize
 * @returns {string} - Sanitized value
 */
export function sanitizeSql(value) {
  if (typeof value !== 'string') return value;
  
  // Replace single quotes with double quotes to prevent SQL injection
  return value.replace(/'/g, "''");
}

/**
 * Create a parameterized query builder
 * @returns {Object} - Query builder with methods
 */
export function createQueryBuilder() {
  let queryText = '';
  const params = [];
  
  const builder = {
    /**
     * Add raw SQL text to the query
     * @param {string} text - SQL text
     * @returns {Object} - Query builder
     */
    addText(text) {
      queryText += text;
      return builder;
    },
    
    /**
     * Add a parameterized value to the query
     * @param {any} value - Value to add
     * @returns {Object} - Query builder
     */
    addParam(value) {
      params.push(value);
      queryText += `$${params.length}`;
      return builder;
    },
    
    /**
     * Build the final query
     * @returns {Object} - { text, params }
     */
    build() {
      return {
        text: queryText,
        params
      };
    },
    
    /**
     * Execute the built query
     * @returns {Promise<Object>} - Query result
     */
    async execute() {
      return query(queryText, params);
    }
  };
  
  return builder;
}

// Helper functions for common operations

/**
 * Find a record by ID securely
 * @param {string} table - Table name
 * @param {number|string} id - ID to find
 * @param {string} idColumn - ID column name (default: 'id')
 * @returns {Promise<Object>} - Found record or null
 */
export async function findById(table, id, idColumn = 'id') {
  const result = await query(
    `SELECT * FROM ${table} WHERE ${idColumn} = $1`,
    [id]
  );
  
  return result.rows[0] || null;
}

/**
 * Create a new record securely
 * @param {string} table - Table name
 * @param {Object} data - Record data
 * @returns {Promise<Object>} - Created record
 */
export async function create(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');
  
  const result = await query(
    `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  
  return result.rows[0];
}

/**
 * Update a record securely
 * @param {string} table - Table name
 * @param {number|string} id - ID to update
 * @param {Object} data - Record data
 * @param {string} idColumn - ID column name (default: 'id')
 * @returns {Promise<Object>} - Updated record
 */
export async function update(table, id, data, idColumn = 'id') {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  
  const result = await query(
    `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  
  return result.rows[0];
}

/**
 * Delete a record securely
 * @param {string} table - Table name
 * @param {number|string} id - ID to delete
 * @param {string} idColumn - ID column name (default: 'id')
 * @returns {Promise<boolean>} - Success status
 */
export async function remove(table, id, idColumn = 'id') {
  const result = await query(
    `DELETE FROM ${table} WHERE ${idColumn} = $1 RETURNING *`,
    [id]
  );
  
  return result.rowCount > 0;
}

/**
 * Check database connection health
 * @returns {Promise<boolean>} Connection status
 */
export async function checkHealth() {
  try {
    const start = Date.now();
    const result = await query('SELECT NOW()');
    const duration = Date.now() - start;
    
    return {
      connected: true,
      responseTime: duration,
      timestamp: result.rows[0].now
    };
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return {
      connected: false,
      error: error.message
    };
  }
}

// Properly close the pool when the application shuts down
process.on('exit', () => {
  console.log('Closing database connection pool');
  pool.end();
});

export default {
  pool,
  query,
  transaction,
  sanitizeSql,
  createQueryBuilder,
  findById,
  create,
  update,
  remove,
  checkHealth
};