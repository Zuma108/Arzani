/**
 * Enhanced rate limiting middleware
 * Provides protection against brute force attacks and API abuse
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

// Create Redis client if available in production
let redisClient;
try {
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false
      }
    });
    redisClient.on('error', err => console.error('Redis error:', err));
    redisClient.connect().catch(err => console.error('Redis connection error:', err));
  }
} catch (error) {
  console.warn('Redis client not available, using memory store for rate limiting');
}

// Default options for rate limiters
const defaultOptions = {
  standardWindow: 15 * 60 * 1000, // 15 minutes
  standardMax: 100,               // 100 requests per window
  
  authWindow: 60 * 60 * 1000,     // 1 hour
  authMax: 5,                     // 5 failed attempts per hour
  
  apiWindow: 60 * 1000,           // 1 minute
  apiMax: 30                      // 30 requests per minute
};

/**
 * Create appropriate store based on environment
 */
function createStore() {
  if (redisClient) {
    return new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      // Add prefix to Redis key to avoid collisions with other applications
      prefix: 'ratelimit:'
    });
  }
  return undefined; // Use default memory store
}

/**
 * Standard rate limiter for general routes
 */
export const standardLimiter = rateLimit({
  windowMs: defaultOptions.standardWindow,
  max: defaultOptions.standardMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  message: { 
    success: false, 
    message: 'Too many requests, please try again later.' 
  }
});

/**
 * Strict rate limiter for authentication routes
 */
export const authLimiter = rateLimit({
  windowMs: defaultOptions.authWindow,
  max: defaultOptions.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  skipSuccessfulRequests: true, // Only count failed attempts
  message: { 
    success: false, 
    message: 'Too many login attempts, please try again later.' 
  }
});

/**
 * API rate limiter for endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: defaultOptions.apiWindow,
  max: defaultOptions.apiMax,
  standardHeaders: true, 
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.userId || req.ip;
  },
  message: { 
    success: false, 
    message: 'API rate limit exceeded, please slow down requests.' 
  }
});

/**
 * S3 upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore(),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.userId || req.ip;
  },
  message: { 
    success: false, 
    message: 'Upload limit exceeded, please try again later.' 
  }
});

/**
 * Generate a custom rate limiter with specific settings
 */
export function createCustomLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(),
    message: { success: false, message }
  });
}

/**
 * Progressive rate limiter that increases delay with each failed attempt
 */
export const progressiveAuthLimiter = (() => {
  const attempts = new Map(); // Store failed attempts in memory
  const MAX_ATTEMPTS = 5;     // Max failed attempts before delay
  const BASE_DELAY = 1000;    // Base delay in ms (1 second)
  
  return (req, res, next) => {
    const key = req.ip;
    
    // Reset attempts if missing or expired
    if (!attempts.has(key)) {
      attempts.set(key, {
        count: 0,
        resetAt: Date.now() + 60 * 60 * 1000 // 1 hour
      });
    }
    
    const attempt = attempts.get(key);
    
    // Reset if expired
    if (attempt.resetAt < Date.now()) {
      attempts.set(key, {
        count: 0,
        resetAt: Date.now() + 60 * 60 * 1000 // 1 hour
      });
    }
    
    // Apply exponential backoff for repeated failures
    const currentCount = attempt.count;
    if (currentCount >= MAX_ATTEMPTS) {
      const delay = BASE_DELAY * Math.pow(2, currentCount - MAX_ATTEMPTS);
      
      res.set('Retry-After', Math.ceil(delay / 1000));
      return res.status(429).json({
        success: false,
        message: `Too many login attempts. Please try again later.`,
        retryAfter: Math.ceil(delay / 1000)
      });
    }
    
    // Store original send function to intercept responses
    const originalSend = res.send;
    res.send = function(body) {
      const response = typeof body === 'string' ? JSON.parse(body) : body;
      
      // Increment count on failure (status 401)
      if (res.statusCode === 401) {
        attempts.set(key, {
          count: attempt.count + 1,
          resetAt: attempt.resetAt
        });
      } 
      // Reset on success
      else if (res.statusCode === 200 && response.success === true) {
        attempts.set(key, {
          count: 0,
          resetAt: Date.now() + 60 * 60 * 1000
        });
      }
      
      // Continue with original send
      originalSend.call(this, body);
      return this;
    };
    
    next();
  };
})();

/**
 * Apply all rate limiters to app routes
 */
export function applyRateLimiters(app) {
  // Apply standard limiter globally with exceptions
  app.use((req, res, next) => {
    // Skip static files and public assets
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/i)) {
      return next();
    }
    
    // Apply standard limiter
    return standardLimiter(req, res, next);
  });
  
  // Apply strict authentication rate limiting
  app.use('/api/auth/login', progressiveAuthLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/auth/login', progressiveAuthLimiter); 
  app.use('/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
  
  // Apply API rate limiting
  app.use('/api/', apiLimiter);
  
  // Apply upload rate limiting
  app.use('/api/s3-upload', uploadLimiter);
  app.use('/api/upload-to-s3', uploadLimiter);
  app.use('/api/submit-business', uploadLimiter);
}

export default {
  standardLimiter,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  progressiveAuthLimiter,
  createCustomLimiter,
  applyRateLimiters
};