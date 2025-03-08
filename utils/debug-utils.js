// Debug utilities for monitoring performance and testing

// Performance monitoring
const performanceMarks = {};

/**
 * Start timing a particular operation
 * @param {string} label - Name of the operation to time
 */
export function startTiming(label) {
  performanceMarks[label] = {
    start: performance.now(),
    end: null,
    duration: null
  };
}

/**
 * End timing for an operation and log the result
 * @param {string} label - Name of the operation to stop timing
 * @param {boolean} logResult - Whether to log the result immediately
 * @returns {number} Duration in milliseconds
 */
export function endTiming(label, logResult = true) {
  if (!performanceMarks[label] || performanceMarks[label].end !== null) {
    console.warn(`No active timing found for "${label}"`);
    return 0;
  }

  performanceMarks[label].end = performance.now();
  performanceMarks[label].duration = performanceMarks[label].end - performanceMarks[label].start;

  if (logResult) {
    console.log(`⏱️ ${label}: ${performanceMarks[label].duration.toFixed(2)}ms`);
  }

  return performanceMarks[label].duration;
}

/**
 * Get all performance metrics collected so far
 * @returns {Object} All performance marks and their durations
 */
export function getAllMetrics() {
  return Object.fromEntries(
    Object.entries(performanceMarks).map(([key, value]) => [
      key, 
      value.duration !== null ? value.duration : 'incomplete'
    ])
  );
}

/**
 * Log all collected performance metrics
 */
export function logAllMetrics() {
  const metrics = getAllMetrics();
  console.log('📊 Performance Metrics:');
  console.table(metrics);
}

/**
 * Reset all performance metrics
 */
export function resetMetrics() {
  for (const key in performanceMarks) {
    delete performanceMarks[key];
  }
}

/**
 * Monitor function execution time
 * @param {Function} fn - Function to monitor
 * @param {string} label - Label for logging
 * @returns {Function} Wrapped function that logs execution time
 */
export function monitorFunction(fn, label) {
  return async function(...args) {
    startTiming(label);
    try {
      const result = await fn(...args);
      endTiming(label);
      return result;
    } catch (error) {
      endTiming(label);
      throw error;
    }
  };
}

// DOM Loading Monitor
export class DOMLoadMonitor {
  constructor() {
    this.resources = [];
    this.observer = null;
    this.startTime = performance.now();
  }

  start() {
    this.startTime = performance.now();

    // Monitor resource loading
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          this.resources.push({
            name: entry.name,
            type: entry.initiatorType,
            duration: entry.duration,
            size: entry.transferSize,
            startTime: entry.startTime
          });
        }
      });
    });

    this.observer.observe({ entryTypes: ['resource'] });
    
    console.log('🔍 DOM load monitoring started');
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      const totalTime = performance.now() - this.startTime;
      
      console.log(`🏁 DOM loaded in ${totalTime.toFixed(2)}ms`);
      
      // Group by resource type
      const byType = {};
      let totalSize = 0;
      
      this.resources.forEach(res => {
        if (!byType[res.type]) {
          byType[res.type] = { count: 0, size: 0, totalDuration: 0 };
        }
        byType[res.type].count++;
        byType[res.type].size += res.size || 0;
        byType[res.type].totalDuration += res.duration || 0;
        totalSize += res.size || 0;
      });
      
      console.log(`📦 Total resources: ${this.resources.length}, Size: ${(totalSize/1024).toFixed(2)}KB`);
      console.table(Object.entries(byType).map(([type, data]) => ({
        type,
        count: data.count,
        size: `${(data.size/1024).toFixed(2)}KB`,
        avgDuration: `${(data.totalDuration/data.count).toFixed(2)}ms`
      })));
      
      // Find slow resources (over 500ms)
      const slowResources = this.resources
        .filter(res => res.duration > 500)
        .sort((a, b) => b.duration - a.duration);
      
      if (slowResources.length > 0) {
        console.log('⚠️ Slow resources:');
        console.table(slowResources.map(res => ({
          name: res.name.split('/').pop(),
          type: res.type,
          duration: `${res.duration.toFixed(2)}ms`,
          size: res.size ? `${(res.size/1024).toFixed(2)}KB` : 'unknown'
        })));
      }
    }
  }
}

// Database Query Monitor
export const dbMonitor = {
  queries: [],
  
  logQuery(sql, params, duration) {
    this.queries.push({
      sql,
      params,
      duration,
      timestamp: new Date()
    });
    
    if (duration > 100) {
      console.warn(`⚠️ Slow query (${duration.toFixed(2)}ms): ${sql}`);
    }
  },
  
  getStats() {
    if (this.queries.length === 0) return {};
    
    const totalDuration = this.queries.reduce((sum, q) => sum + q.duration, 0);
    const avgDuration = totalDuration / this.queries.length;
    const maxDuration = Math.max(...this.queries.map(q => q.duration));
    const slowQueries = this.queries.filter(q => q.duration > 100).length;
    
    return {
      count: this.queries.length,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      avgDuration: `${avgDuration.toFixed(2)}ms`,
      maxDuration: `${maxDuration.toFixed(2)}ms`,
      slowQueries
    };
  },
  
  reset() {
    this.queries = [];
  }
};

// Network Request Monitor
export class NetworkMonitor {
  constructor() {
    this.requests = [];
    this.originalFetch = window.fetch;
  }
  
  start() {
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      let error = null;
      let response = null;
      
      try {
        response = await this.originalFetch.apply(window, args);
        return response;
      } catch (err) {
        error = err;
        throw err;
      } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.requests.push({
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status: response?.status || 0,
          duration,
          error: error?.message,
          timestamp: new Date()
        });
        
        if (duration > 500) {
          console.warn(`⚠️ Slow network request (${duration.toFixed(2)}ms): ${typeof url === 'string' ? url : url.url}`);
        }
        
        if (response && !response.ok) {
          console.error(`❌ Failed request: ${response.status} ${response.statusText} - ${typeof url === 'string' ? url : url.url}`);
        }
      }
    };
    
    console.log('🔍 Network monitoring started');
  }
  
  stop() {
    window.fetch = this.originalFetch;
    
    // Group by status code
    const byStatus = {};
    let totalDuration = 0;
    
    this.requests.forEach(req => {
      const statusGroup = Math.floor(req.status / 100) * 100;
      const statusKey = req.status === 0 ? 'Error' : `${statusGroup}s`;
      
      if (!byStatus[statusKey]) {
        byStatus[statusKey] = { count: 0, totalDuration: 0 };
      }
      
      byStatus[statusKey].count++;
      byStatus[statusKey].totalDuration += req.duration;
      totalDuration += req.duration;
    });
    
    console.log(`🌐 Total requests: ${this.requests.length}, Total time: ${totalDuration.toFixed(2)}ms`);
    console.table(Object.entries(byStatus).map(([status, data]) => ({
      status,
      count: data.count,
      avgDuration: `${(data.totalDuration/data.count).toFixed(2)}ms`,
      totalDuration: `${data.totalDuration.toFixed(2)}ms`
    })));
    
    // Find slowest endpoints
    const slowestRequests = [...this.requests]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
      
    if (slowestRequests.length > 0) {
      console.log('🐢 Slowest requests:');
      console.table(slowestRequests.map(req => ({
        url: new URL(req.url, window.location.origin).pathname,
        method: req.method,
        status: req.status || 'Error',
        duration: `${req.duration.toFixed(2)}ms`
      })));
    }
  }
}

// Export a default debug object with all utilities
export default {
  startTiming,
  endTiming,
  getAllMetrics,
  logAllMetrics,
  resetMetrics,
  monitorFunction,
  DOMLoadMonitor,
  dbMonitor,
  NetworkMonitor
};
