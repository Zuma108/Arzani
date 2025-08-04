/**
 * Centralized logging utility with environment-aware configuration
 * Replaces scattered console.log statements across the codebase
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'info');
    
    // Define log levels (lower number = higher priority)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Check if a log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to log
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Format log message with timestamp and context
   * @param {string} level - Log level
   * @param {string} context - Context (e.g., module name)
   * @param {string} message - Log message
   * @returns {string} Formatted message
   */
  formatMessage(level, context, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  }

  /**
   * Sanitize sensitive data from objects before logging
   * @param {any} data - Data to sanitize
   * @returns {any} Sanitized data
   */
  sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'credential', 'auth',
      'jwt', 'session', 'cookie', 'private'
    ];

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive)
      );
      
      if (isSensitive) {
        sanitized[key] = '***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Log error message
   * @param {string} context - Context/module name
   * @param {string} message - Error message
   * @param {Error|Object} error - Error object or additional data
   */
  error(context, message, error = null) {
    if (!this.shouldLog('error')) return;
    
    console.error(this.formatMessage('error', context, message));
    if (error) {
      if (error instanceof Error) {
        console.error(`Stack: ${error.stack}`);
      } else {
        console.error('Data:', this.sanitizeData(error));
      }
    }
  }

  /**
   * Log warning message
   * @param {string} context - Context/module name
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   */
  warn(context, message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    console.warn(this.formatMessage('warn', context, message));
    if (data) {
      console.warn('Data:', this.sanitizeData(data));
    }
  }

  /**
   * Log info message
   * @param {string} context - Context/module name
   * @param {string} message - Info message
   * @param {Object} data - Additional data
   */
  info(context, message, data = null) {
    if (!this.shouldLog('info')) return;
    
    console.log(this.formatMessage('info', context, message));
    if (data) {
      console.log('Data:', this.sanitizeData(data));
    }
  }

  /**
   * Log debug message (only in development)
   * @param {string} context - Context/module name
   * @param {string} message - Debug message
   * @param {Object} data - Additional data
   */
  debug(context, message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    console.log(this.formatMessage('debug', context, message));
    if (data) {
      console.log('Data:', this.sanitizeData(data));
    }
  }

  /**
   * Log authentication events with special handling
   * @param {string} event - Auth event (login, logout, etc.)
   * @param {string} userId - User ID (will be partially masked)
   * @param {Object} metadata - Additional metadata
   */
  auth(event, userId, metadata = {}) {
    const maskedUserId = userId ? `${userId.substr(0, 3)}***` : 'unknown';
    this.info('AUTH', `${event} for user ${maskedUserId}`, this.sanitizeData(metadata));
  }

  /**
   * Log API request/response with sanitization
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in ms
   */
  api(method, path, statusCode, duration) {
    const level = statusCode >= 400 ? 'warn' : 'debug';
    const message = `${method} ${path} ${statusCode} (${duration}ms)`;
    
    if (level === 'warn') {
      this.warn('API', message);
    } else {
      this.debug('API', message);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export for CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
} else if (typeof exports !== 'undefined') {
  exports.logger = logger;
}

// For browser environments
if (typeof window !== 'undefined') {
  window.Logger = logger;
}

export default logger;
