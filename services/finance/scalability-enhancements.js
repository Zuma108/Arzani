/**
 * Performance and Scalability Enhancements for Finance Agent
 * Implements caching, monitoring, and optimization strategies
 */

import { createHash } from 'crypto';

// In-memory cache for performance optimization
class FinanceAgentCache {
  constructor(maxSize = 100, ttlMs = 300000) { // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  generateKey(query, data = {}) {
    const normalized = {
      query: query.toLowerCase().trim(),
      data: JSON.stringify(data, Object.keys(data).sort())
    };
    return createHash('md5').update(JSON.stringify(normalized)).digest('hex');
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(key, value) {
    // Evict expired entries and manage size
    this.cleanup();
    
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttlMs,
      lastAccessed: Date.now()
    });
    
    this.stats.sets++;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }
}

// Performance monitoring class
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      totalTime: 0,
      aiCalls: 0,
      aiTime: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.startTime = Date.now();
  }

  recordRequest(duration, useAI = false, aiDuration = 0, cached = false, error = false) {
    this.metrics.requests++;
    this.metrics.totalTime += duration;
    
    if (useAI) {
      this.metrics.aiCalls++;
      this.metrics.aiTime += aiDuration;
    }
    
    if (cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    if (error) {
      this.metrics.errors++;
    }
  }

  getReport() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.metrics.requests > 0 
      ? (this.metrics.totalTime / this.metrics.requests).toFixed(2) 
      : 0;
    const avgAITime = this.metrics.aiCalls > 0 
      ? (this.metrics.aiTime / this.metrics.aiCalls).toFixed(2) 
      : 0;
    const errorRate = this.metrics.requests > 0 
      ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) 
      : 0;
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) 
      : 0;

    return {
      uptime: `${Math.floor(uptime / 1000 / 60)} minutes`,
      totalRequests: this.metrics.requests,
      avgResponseTime: `${avgResponseTime}ms`,
      avgAITime: `${avgAITime}ms`,
      aiCallsPercent: this.metrics.requests > 0 
        ? (this.metrics.aiCalls / this.metrics.requests * 100).toFixed(2) + '%' 
        : '0%',
      errorRate: `${errorRate}%`,
      cacheHitRate: `${cacheHitRate}%`,
      requestsPerMinute: this.metrics.requests > 0 
        ? (this.metrics.requests / (uptime / 1000 / 60)).toFixed(2) 
        : 0
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      totalTime: 0,
      aiCalls: 0,
      aiTime: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.startTime = Date.now();
  }
}

// Circuit breaker for AI service reliability
class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - AI service temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Rate limiter for API calls
class RateLimiter {
  constructor(maxRequests = 50, windowMs = 60000) { // 50 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  isAllowed() {
    const now = Date.now();
    
    // Remove requests outside the current window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getStatus() {
    const now = Date.now();
    const activeRequests = this.requests.filter(time => now - time < this.windowMs);
    
    return {
      currentRequests: activeRequests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      resetTime: activeRequests.length > 0 
        ? new Date(Math.min(...activeRequests) + this.windowMs).toISOString()
        : 'N/A'
    };
  }
}

// Export singleton instances for the finance agent
export const financeCache = new FinanceAgentCache();
export const performanceMonitor = new PerformanceMonitor();
export const aiCircuitBreaker = new CircuitBreaker();
export const rateLimiter = new RateLimiter();

// Utility function to wrap finance functions with performance monitoring
export function withMonitoring(fn, name) {
  return async (...args) => {
    const startTime = Date.now();
    let useAI = false;
    let aiDuration = 0;
    let cached = false;
    let error = false;

    try {
      // Check cache first for GET-like operations
      const query = args[2]; // Assuming query is the third parameter
      const data = args[3] || {};
      const cacheKey = financeCache.generateKey(query, data);
      
      const cachedResult = financeCache.get(cacheKey);
      if (cachedResult && name !== 'handleGeneralFinanceRequest') { // Cache valuation and tax scenarios
        cached = true;
        performanceMonitor.recordRequest(Date.now() - startTime, false, 0, true, false);
        return cachedResult;
      }

      const result = await fn(...args);
      
      // Cache successful results
      if (result && !error && name !== 'handleGeneralFinanceRequest') {
        financeCache.set(cacheKey, result);
      }

      return result;
    } catch (err) {
      error = true;
      throw err;
    } finally {
      const totalDuration = Date.now() - startTime;
      performanceMonitor.recordRequest(totalDuration, useAI, aiDuration, cached, error);
    }
  };
}

// Health check function
export function getSystemHealth() {
  return {
    timestamp: new Date().toISOString(),
    performance: performanceMonitor.getReport(),
    cache: financeCache.getStats(),
    circuitBreaker: aiCircuitBreaker.getStatus(),
    rateLimiter: rateLimiter.getStatus(),
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024,
      total: process.memoryUsage().heapTotal / 1024 / 1024
    }
  };
}
