/**
 * Marketplace Debug Tool 
 * Helps troubleshoot performance issues in marketplace2
 */

// Performance tracking
const performance = {
  marks: {},
  measures: {},

  mark(name) {
    this.marks[name] = performance.now();
    console.log(`⏱️ MARK: ${name}`);
    return this.marks[name];
  },

  measure(name, startMark, endMark) {
    if (!this.marks[startMark]) {
      console.error(`Start mark "${startMark}" not found`);
      return null;
    }

    const endTime = endMark ? this.marks[endMark] : performance.now();
    if (!endTime) {
      console.error(`End mark "${endMark}" not found`);
      return null;
    }

    this.measures[name] = endTime - this.marks[startMark];
    console.log(`📏 MEASURE: ${name} = ${this.measures[name].toFixed(2)}ms`);
    return this.measures[name];
  },

  summary() {
    console.log('⏱️ Performance Summary:');
    console.table(Object.entries(this.measures).map(([key, value]) => ({
      Measurement: key,
      'Time (ms)': value.toFixed(2)
    })));
  }
};

// Network request tracking
class NetworkTracker {
  constructor() {
    this.requests = [];
    this.originalFetch = window.fetch;
    this.originalXHR = window.XMLHttpRequest.prototype.open;
  }

  start() {
    // Monkey patch fetch API
    window.fetch = async (...args) => {
      const url = args[0];
      const startTime = performance.now();
      let status = null;
      let error = null;

      try {
        const response = await this.originalFetch.apply(window, args);
        status = response.status;
        return response;
      } catch (e) {
        error = e;
        throw e;
      } finally {
        const duration = performance.now() - startTime;
        this.logRequest({
          type: 'fetch',
          url: typeof url === 'string' ? url : url.url,
          method: args[1]?.method || 'GET',
          status,
          duration,
          error: error?.message
        });
      }
    };

    // Patch XMLHttpRequest
    window.XMLHttpRequest.prototype.open = function(...args) {
      const xhr = this;
      const method = args[0];
      const url = args[1];
      const startTime = performance.now();

      xhr.addEventListener('loadend', function() {
        const duration = performance.now() - startTime;
        networkTracker.logRequest({
          type: 'xhr',
          url,
          method,
          status: xhr.status,
          duration,
          error: xhr.status >= 400 ? 'HTTP Error' : null
        });
      });

      return networkTracker.originalXHR.apply(this, args);
    };

    console.log('🌐 Network tracking started');
  }

  logRequest(req) {
    this.requests.push({
      ...req,
      timestamp: new Date()
    });

    const statusEmoji = req.status >= 200 && req.status < 300 ? '✅' : '❌';
    const durationEval = req.duration > 500 ? '⚠️ SLOW' : '';
    
    console.log(
      `${statusEmoji} ${req.type.toUpperCase()} ${req.method} ${req.url} - ${req.status} - ${req.duration.toFixed(2)}ms ${durationEval}`
    );
  }

  stop() {
    window.fetch = this.originalFetch;
    window.XMLHttpRequest.prototype.open = this.originalXHR;
    console.log('🌐 Network tracking stopped');
  }

  summary() {
    if (this.requests.length === 0) {
      console.log('No network requests tracked');
      return;
    }

    const totalTime = this.requests.reduce((sum, req) => sum + req.duration, 0);
    const avgTime = totalTime / this.requests.length;
    const slowRequests = this.requests.filter(req => req.duration > 500);
    
    console.log(`🌐 Network Summary: ${this.requests.length} requests, ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(2)}ms avg`);
    
    if (slowRequests.length > 0) {
      console.log(`⚠️ ${slowRequests.length} slow requests (>500ms):`);
      console.table(slowRequests.map(req => ({
        URL: req.url,
        Method: req.method,
        Status: req.status,
        'Duration (ms)': req.duration.toFixed(2)
      })));
    }
  }
}

const networkTracker = new NetworkTracker();

// DOM Element monitor
class DOMMonitor {
  constructor() {
    this.mutations = [];
    this.observer = null;
  }

  start() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          Array.from(mutation.addedNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.logElementAdded(node);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, { 
      childList: true,
      subtree: true 
    });
    
    console.log('🔍 DOM monitoring started');
  }

  logElementAdded(element) {
    if (element.id || element.classList.length > 0) {
      this.mutations.push({
        tagName: element.tagName.toLowerCase(),
        id: element.id || null,
        classes: Array.from(element.classList).join(' ') || null,
        timestamp: new Date()
      });
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      console.log('🔍 DOM monitoring stopped');
    }
  }

  summary() {
    if (this.mutations.length > 0) {
      console.log(`🔍 DOM Changes: ${this.mutations.length} significant elements added`);
      
      // Group by tag name
      const tagCounts = {};
      this.mutations.forEach(m => {
        tagCounts[m.tagName] = (tagCounts[m.tagName] || 0) + 1;
      });
      
      console.table(Object.entries(tagCounts).map(([tag, count]) => ({
        'Tag': tag,
        'Count': count
      })));
    } else {
      console.log('No significant DOM changes tracked');
    }
  }
}

// Resource loader monitor
class ResourceMonitor {
  start() {
    this.resourceEntries = [];
    
    // Create performance observer
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          this.resourceEntries.push({
            name: entry.name,
            type: entry.initiatorType,
            duration: entry.duration,
            size: entry.transferSize || 0,
            timestamp: new Date()
          });
        }
      });
    });
    
    this.observer.observe({ entryTypes: ['resource'] });
    console.log('📦 Resource monitoring started');
    
    // Check for existing entries
    const existingEntries = performance.getEntriesByType('resource');
    existingEntries.forEach((entry) => {
      this.resourceEntries.push({
        name: entry.name,
        type: entry.initiatorType,
        duration: entry.duration,
        size: entry.transferSize || 0,
        timestamp: new Date()
      });
    });
  }
  
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      console.log('📦 Resource monitoring stopped');
    }
  }
  
  summary() {
    if (this.resourceEntries.length === 0) {
      console.log('No resources tracked');
      return;
    }
    
    // Group by type
    const byType = {};
    let totalSize = 0;
    let totalDuration = 0;
    
    this.resourceEntries.forEach(res => {
      if (!byType[res.type]) {
        byType[res.type] = { count: 0, size: 0, totalDuration: 0 };
      }
      
      byType[res.type].count++;
      byType[res.type].size += res.size || 0;
      byType[res.type].totalDuration += res.duration || 0;
      totalSize += res.size || 0;
      totalDuration += res.duration || 0;
    });
    
    console.log(`📦 Resources: ${this.resourceEntries.length} total, ${(totalSize/1024).toFixed(2)}KB, ${totalDuration.toFixed(2)}ms combined load time`);
    
    console.table(Object.entries(byType).map(([type, data]) => ({
      Type: type,
      Count: data.count,
      Size: `${(data.size/1024).toFixed(2)}KB`,
      'Avg Duration': `${(data.totalDuration/data.count).toFixed(2)}ms`
    })));
    
    // Find large resources
    const largeResources = this.resourceEntries
      .filter(res => res.size > 512 * 1024) // >500KB
      .sort((a, b) => b.size - a.size);
      
    if (largeResources.length > 0) {
      console.log(`⚠️ Large resources (>500KB): ${largeResources.length}`);
      console.table(largeResources.map(res => ({
        Name: new URL(res.name).pathname.split('/').pop(),
        Type: res.type,
        Size: `${(res.size/1024/1024).toFixed(2)}MB`,
        Duration: `${res.duration.toFixed(2)}ms`
      })));
    }
  }
}

// Initialize monitors
const domMonitor = new DOMMonitor();
const resourceMonitor = new ResourceMonitor();

// Marketplace specific debug
class MarketplaceDebugger {
  constructor() {
    this.routeChanges = [];
    this.apiCalls = [];
    this.loadingEvents = [];
    this.errors = [];
  }
  
  start() {
    // Mark initial page load
    performance.mark('pageLoad');
    
    // Start monitors
    networkTracker.start();
    domMonitor.start();
    resourceMonitor.start();
    
    // Listen for loading events
    document.addEventListener('DOMContentLoaded', () => {
      performance.measure('domLoaded', 'pageLoad');
      this.logLoadEvent('DOMContentLoaded');
    });
    
    window.addEventListener('load', () => {
      performance.measure('windowLoaded', 'pageLoad');
      this.logLoadEvent('WindowLoad');
      
      // Check for listings load time
      setTimeout(() => this.checkListingsLoaded(), 100);
    });
    
    // Log errors
    window.addEventListener('error', (event) => {
      this.logError(event.error || new Error(event.message));
    });
    
    // Track promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(event.reason || new Error('Unhandled Promise rejection'));
    });
    
    // Track API calls by extending fetch
    this.originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      const method = args[1]?.method || 'GET';
      
      // Only track API calls
      if (typeof url === 'string' && url.includes('/api/')) {
        const apiStartTime = performance.now();
        
        try {
          const response = await this.originalFetch.apply(window, args);
          const apiEndTime = performance.now();
          
          this.logApiCall({
            url,
            method,
            status: response.status,
            duration: apiEndTime - apiStartTime
          });
          
          return response;
        } catch (error) {
          const apiEndTime = performance.now();
          
          this.logApiCall({
            url,
            method,
            status: 'ERROR',
            duration: apiEndTime - apiStartTime,
            error: error.message
          });
          
          throw error;
        }
      }
      
      return this.originalFetch.apply(window, args);
    };
    
    console.log('🛠️ Marketplace debugger started');
  }
  
  logLoadEvent(eventType) {
    this.loadingEvents.push({
      type: eventType,
      timestamp: new Date()
    });
    console.log(`🔄 ${eventType} event fired`);
  }
  
  logError(error) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
    console.error('❌ Error:', error);
  }
  
  logApiCall(call) {
    this.apiCalls.push({
      ...call,
      timestamp: new Date()
    });
    
    const emoji = call.status >= 200 && call.status < 300 ? '✅' : '❌';
    console.log(`${emoji} API ${call.method} ${call.url} - ${call.status} - ${call.duration.toFixed(2)}ms`);
  }
  
  checkListingsLoaded() {
    const listingsContainer = document.getElementById('listings-container');
    if (listingsContainer) {
      const listings = listingsContainer.querySelectorAll('.col');
      performance.measure('listingsLoaded', 'pageLoad');
      console.log(`📋 Listings loaded: ${listings.length} items in ${performance.measures.listingsLoaded.toFixed(2)}ms`);
    }
  }
  
  stop() {
    // Stop all monitors
    networkTracker.stop();
    domMonitor.stop();
    resourceMonitor.stop();
    
    // Restore fetch
    window.fetch = this.originalFetch;
    
    console.log('🛠️ Marketplace debugger stopped');
  }
  
  summary() {
    console.log('🔍 MARKETPLACE DEBUG SUMMARY:');
    console.log('--------------------------');
    
    // Page load metrics
    console.log('⏱️ Page load metrics:');
    performance.summary();
    
    // Network summary
    networkTracker.summary();
    
    // API calls summary
    if (this.apiCalls.length > 0) {
      const totalApiTime = this.apiCalls.reduce((sum, call) => sum + call.duration, 0);
      const avgApiTime = totalApiTime / this.apiCalls.length;
      
      console.log(`🌐 API calls: ${this.apiCalls.length}, ${totalApiTime.toFixed(2)}ms total, ${avgApiTime.toFixed(2)}ms avg`);
      
      // Show slowest API calls
      const slowApiCalls = this.apiCalls
        .filter(call => call.duration > 200)
        .sort((a, b) => b.duration - a.duration);
        
      if (slowApiCalls.length > 0) {
        console.log(`⚠️ Slow API calls (>200ms): ${slowApiCalls.length}`);
        console.table(slowApiCalls.map(call => ({
          URL: call.url,
          Method: call.method,
          Status: call.status,
          'Duration (ms)': call.duration.toFixed(2)
        })));
      }
    }
    
    // DOM changes
    domMonitor.summary();
    
    // Resources
    resourceMonitor.summary();
    
    // Errors
    if (this.errors.length > 0) {
      console.log(`❌ Errors: ${this.errors.length}`);
      console.table(this.errors.map(e => ({
        Message: e.message,
        Time: e.timestamp.toLocaleTimeString()
      })));
    }
    
    // Load events
    if (this.loadingEvents.length > 0) {
      console.log('🔄 Load events:');
      console.table(this.loadingEvents.map(e => ({
        Event: e.type,
        Time: e.timestamp.toLocaleTimeString()
      })));
    }
    
    console.log('--------------------------');
    console.log('Recommendations:');
    this.provideRecommendations();
  }
  
  provideRecommendations() {
    const issues = [];
    
    // Check page load time
    if (performance.measures.windowLoaded > 3000) {
      issues.push('🐢 Page load time is high (>3s). Consider optimizing initial load.');
    }
    
    // Check API performance
    const slowApiCalls = this.apiCalls.filter(call => call.duration > 200);
    if (slowApiCalls.length > 0) {
      issues.push(`🐌 ${slowApiCalls.length} slow API calls detected. Consider optimizing backend queries.`);
    }
    
    // Check large resources
    const largeResources = resourceMonitor.resourceEntries
      .filter(res => res.size > 512 * 1024); // >500KB
    if (largeResources.length > 0) {
      issues.push(`📦 ${largeResources.length} large resources detected. Consider compressing images and optimizing assets.`);
    }
    
    // Check for errors
    if (this.errors.length > 0) {
      issues.push(`❌ ${this.errors.length} JavaScript errors detected. Fix these to improve stability.`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No major performance issues detected!');
    } else {
      issues.forEach(issue => console.log(issue));
      
      console.log('\nSuggested actions:');
      console.log('1. Enable lazy loading for images');
      console.log('2. Implement pagination if not already present');
      console.log('3. Add proper caching headers for static resources');
      console.log('4. Consider using a CDN for images and static assets');
      console.log('5. Add debounce to filter inputs');
    }
  }
}

// Create singleton instance
const marketplaceDebugger = new MarketplaceDebugger();

// Start debugging automatically
document.addEventListener('DOMContentLoaded', () => {
  // Attach to window for console access
  window.debugTools = {
    marketplaceDebugger,
    networkTracker,
    domMonitor,
    resourceMonitor,
    performanceTracker: performance,
    
    start: () => marketplaceDebugger.start(),
    stop: () => marketplaceDebugger.stop(),
    summary: () => marketplaceDebugger.summary(),
    
    // Utility to force generate test listings
    generateTestListings: (count = 20) => {
      const container = document.getElementById('listings-container');
      if (!container) return false;
      
      container.innerHTML = '';
      
      for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        
        // Create random business data for testing
        const business = {
          id: `test-${i + 1}`,
          business_name: `Test Business ${i + 1}`,
          industry: ['Retail', 'Technology', 'Food & Beverage', 'Manufacturing', 'Services'][Math.floor(Math.random() * 5)],
          price: Math.floor(Math.random() * 900000) + 100000,
          description: 'This is a test business listing for performance testing purposes.',
          cash_flow: Math.floor(Math.random() * 200000) + 50000,
          gross_revenue: Math.floor(Math.random() * 1000000) + 200000,
          location: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'][Math.floor(Math.random() * 5)],
          images: [`https://picsum.photos/id/${i + 10}/800/600`]
        };
        
        // Create HTML for the card
        card.innerHTML = `
          <div class="card">
            <div class="card-image-carousel">
              <button class="save-business-btn" data-business-id="${business.id}">
                <i class="bi bi-bookmark"></i>
              </button>
              <div class="carousel-inner">
                <div class="carousel-item active" data-index="0">
                  <img src="${business.images[0]}" class="card-img-top" alt="${business.business_name}" loading="lazy">
                </div>
              </div>
            </div>
            <div class="card-body">
              <h5 class="business-name">${business.business_name}</h5>
              <div class="price-metrics-container">
                <div class="price-section">
                  <span class="metric-label">Price</span>
                  <h3 class="price">£${business.price.toLocaleString()}</h3>
                </div>
                <div class="metrics-group">
                  <div class="metric-item">
                    <span class="metric-label">Cash Flow</span>
                    <div class="metric-value">£${business.cash_flow.toLocaleString()}</div>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Revenue</span>
                    <div class="metric-value">£${business.gross_revenue.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <p class="card-text mt-2">${business.description}</p>
              <div class="d-flex justify-content-between mt-3">
                <button class="btn btn-sm btn-outline-primary view-details-btn">View Details</button>
                <button class="btn btn-sm btn-outline-secondary contact-btn">Contact</button>
              </div>
            </div>
          </div>
        `;
        
        container.appendChild(card);
      }
      
      console.log(`Generated ${count} test listings`);
      return true;
    },
    
    // Test API response times
    testApiEndpoints: async () => {
      const endpoints = [
        '/api/business/listings',
        '/api/business/listings?page=1&limit=12',
        '/api/profile',
        '/api/market/trends'
      ];
      
      console.log('🧪 Testing API endpoints...');
      
      const results = [];
      for (const endpoint of endpoints) {
        performance.mark(`api-${endpoint}-start`);
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
          });
          const data = await response.json();
          performance.mark(`api-${endpoint}-end`);
          performance.measure(`api-${endpoint}`, `api-${endpoint}-start`, `api-${endpoint}-end`);
          
          results.push({
            endpoint,
            status: response.status,
            time: performance.measures[`api-${endpoint}`],
            success: response.ok,
            dataSize: JSON.stringify(data).length
          });
          
        } catch (error) {
          performance.mark(`api-${endpoint}-end`);
          performance.measure(`api-${endpoint}`, `api-${endpoint}-start`, `api-${endpoint}-end`);
          
          results.push({
            endpoint,
            status: 'Error',
            time: performance.measures[`api-${endpoint}`],
            success: false,
            error: error.message
          });
        }
      }
      
      console.table(results.map(r => ({
        Endpoint: r.endpoint,
        Status: r.status,
        'Time (ms)': r.time.toFixed(2),
        Success: r.success,
        'Data Size': r.dataSize ? `${(r.dataSize / 1024).toFixed(2)} KB` : 'N/A'
      })));
      
      return results;
    },
    
    // Test image loading
    testImageLoading: () => {
      const images = document.querySelectorAll('img');
      
      if (images.length === 0) {
        console.log('No images found on page');
        return;
      }
      
      console.log(`Testing load time for ${images.length} images...`);
      
      // Force reload images to test load time
      images.forEach((img, index) => {
        const originalSrc = img.src;
        const testId = `img-${index}`;
        
        img.addEventListener('load', () => {
          performance.measure(testId + '-loaded', testId + '-start');
          console.log(`✅ Loaded: ${originalSrc.split('/').pop()} - ${performance.measures[testId + '-loaded'].toFixed(2)}ms`);
        });
        
        img.addEventListener('error', () => {
          performance.measure(testId + '-error', testId + '-start');
          console.log(`❌ Failed: ${originalSrc.split('/').pop()} - ${performance.measures[testId + '-error'].toFixed(2)}ms`);
        });
        
        // Force reload by clearing and resetting src
        performance.mark(testId + '-start');
        img.src = '';
        setTimeout(() => {
          img.src = originalSrc;
        }, 10);
      });
    },
    
    // Simulate user interactions
    simulateUserJourney: async () => {
      console.log('🤖 Simulating user journey...');
      
      // 1. Filter businesses
      const industryDropdown = document.querySelector('.dropdown-toggle');
      if (industryDropdown) {
        console.log('Clicking industry dropdown...');
        industryDropdown.click();
        await new Promise(r => setTimeout(r, 1000));
        
        const firstIndustryOption = document.querySelector('.dropdown-item');
        if (firstIndustryOption) {
          console.log('Selecting industry option...');
          firstIndustryOption.click();
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      // 2. Click on a business card
      const firstBusinessCard = document.querySelector('.view-details-btn');
      if (firstBusinessCard) {
        console.log('Clicking on first business card...');
        firstBusinessCard.click();
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // 3. Return to listings (simulate browser back)
      console.log('Returning to listings...');
      window.history.back();
      await new Promise(r => setTimeout(r, 1000));
      
      console.log('User journey simulation completed!');
    },
    
    // Check for memory leaks
    checkMemoryUsage: () => {
      if (!performance.memory) {
        console.log('Memory API not available in this browser');
        return;
      }
      
      const memoryUsage = {
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
      
      const usageRatio = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
      
      console.log('📊 Memory Usage:');
      console.table({
        'Used Heap': `${(memoryUsage.usedJSHeapSize / (1024 * 1024)).toFixed(2)} MB`,
        'Total Heap': `${(memoryUsage.totalJSHeapSize / (1024 * 1024)).toFixed(2)} MB`,
        'Heap Limit': `${(memoryUsage.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)} MB`,
        'Usage Ratio': `${usageRatio.toFixed(2)}%`
      });
      
      if (usageRatio > 80) {
        console.warn('⚠️ High memory usage detected! Consider checking for memory leaks.');
      }
    }
  };
  
  // Auto-start debugging
  marketplaceDebugger.start();
  
  // Debug button creation disabled - image issues resolved
  const createDebugButton = () => {
    // Debug button disabled - no longer needed
    console.log('Debug button creation disabled - marketplace images fixed');
  };
  
  // Debug button disabled - image issues resolved
  // setTimeout(createDebugButton, 2000);
});

// Expose debug tools to global scope for console access
window.debugMarketplace = (command) => {
  if (!window.debugTools) {
    console.error('Debug tools not initialized yet');
    return;
  }
  
  switch (command) {
    case 'start':
      window.debugTools.start();
      break;
    case 'stop':
      window.debugTools.stop();
      break;
    case 'summary':
      window.debugTools.summary();
      break;
    case 'test-api':
      window.debugTools.testApiEndpoints();
      break;
    case 'test-images':
      window.debugTools.testImageLoading();
      break;
    case 'simulate':
      window.debugTools.simulateUserJourney();
      break;
    case 'memory':
      window.debugTools.checkMemoryUsage();
      break;
    case 'generate':
      window.debugTools.generateTestListings(20);
      break;
    default:
      console.log('Available commands: start, stop, summary, test-api, test-images, simulate, memory, generate');
  }
};

console.log('📊 Marketplace debug tools loaded. Access via window.debugMarketplace() or open browser console and type debugMarketplace("summary")');

/**
 * Debug version of marketplace.js with enhanced logging
 */

console.log('🔍 DEBUG: Loading marketplace-debug.js');

// Use a single loading state
let isLoading = false;
let imageObserver; // Global IntersectionObserver for lazy loading

// Add S3 config - supports multiple regions
const S3_CONFIG = {
  primaryRegion: 'eu-west-2',
  fallbackRegion: 'eu-north-1',
  bucket: 'arzani-images1',
  retryAttempts: 2
};

export async function loadPage(pageNumber = 1, filters = {}) {
  console.log('🔍 DEBUG: loadPage called with:', { pageNumber, filters });
  
  // Set loading state
  isLoading = true;
  const listingsContainer = document.getElementById('listings-container');
  if (listingsContainer) {
    listingsContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';
  } else {
    console.error('🔍 DEBUG: listings-container element not found!');
  }
  
  // Parse numeric values properly
  const query = new URLSearchParams({
    page: pageNumber.toString(),
    location: filters.location || '',
    industries: filters.industries || '',
    priceMin: filters.priceRange?.split('-')[0] || '',
    priceMax: filters.priceRange?.split('-')[1] || '',
    revenueRange: filters.revenueRange || '',
    cashflowRange: filters.cashflowRange || ''
  }).toString();

  console.log(`🔍 DEBUG: Fetching listings with query: ${query}`);
  
  try {
    const response = await fetch(`/api/business/listings?${query}`);
    console.log(`🔍 DEBUG: API Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🔍 DEBUG: Received ${data.businesses?.length || 0} businesses out of ${data.totalCount || 0} total`);
    
    if (data.businesses && Array.isArray(data.businesses)) {
      renderBusinesses(data.businesses);
      renderPaginationControls(pageNumber, data.totalPages);
    } else {
      console.error('🔍 DEBUG: Invalid data structure received:', data);
      if (listingsContainer) {
        listingsContainer.innerHTML = '<div class="alert alert-danger">Invalid data received from server</div>';
      }
    }
  } catch (error) {
    console.error('🔍 DEBUG: Error loading businesses:', error);
    if (listingsContainer) {
      listingsContainer.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
  } finally {
    isLoading = false;
  }
}

function renderBusinesses(businesses) {
  console.log('🔍 DEBUG: Rendering businesses:', businesses.length);
  
  const listingsContainer = document.getElementById('listings-container');
  if (!listingsContainer) {
    console.error('🔍 DEBUG: listings-container element not found during rendering!');
    return;
  }
  
  listingsContainer.innerHTML = '';

  if (!businesses || businesses.length === 0) {
    console.log('🔍 DEBUG: No businesses to display');
    listingsContainer.innerHTML = '<div class="alert alert-info">No businesses found matching your criteria.</div>';
    return;
  }

  // Create document fragment for batch DOM updates
  const fragment = document.createDocumentFragment();
  
  businesses.forEach((business, index) => {
    console.log(`🔍 DEBUG: Processing business #${index}:`, business.business_name);
    
    const businessCard = document.createElement('div');
    businessCard.className = 'col-md-4 mb-4';

    // Only load first image initially for visible businesses
    const isVisible = index < 9; // First 9 businesses (assuming 3x3 grid)
    
    // Process image URLs with multi-region awareness
    try {
      business.processedImages = processBusinessImages(business);
      console.log(`🔍 DEBUG: Processed ${business.processedImages.length} images for business #${business.id}`);
    } catch (error) {
      console.error(`🔍 DEBUG: Error processing images for business #${business.id}:`, error);
      business.processedImages = ['/images/default-business.jpg'];
    }
    
    // Create card with optimized image loading
    try {
      businessCard.innerHTML = generateBusinessCard(business, isVisible);
    } catch (error) {
      console.error(`🔍 DEBUG: Error generating card for business #${business.id}:`, error);
      businessCard.innerHTML = `
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${business.business_name || 'Unnamed business'}</h5>
            <p class="text-danger">Error rendering business card</p>
          </div>
        </div>
      `;
    }
    
    fragment.appendChild(businessCard);
  });
  
  // Batch DOM update
  console.log('🔍 DEBUG: Appending all business cards to container');
  listingsContainer.appendChild(fragment);
  
  // Initialize lazy loading for images
  initLazyLoading();
  
  // Initialize tooltips and event handlers
  try {
    initTooltips();
    initEventHandlers();
  } catch (error) {
    console.error('🔍 DEBUG: Error initializing tooltips or event handlers:', error);
  }
}

/**
 * Process business images to ensure URLs use the correct S3 region format
 * @param {Object} business - Business object with images array
 * @returns {Array} - Array of processed image URLs
 */
function processBusinessImages(business) {
  console.log(`🔍 DEBUG: Processing images for business #${business.id}:`, 
              business.images ? (Array.isArray(business.images) ? business.images.length : 'Not an array') : 'No images');
  
  if (!business.images) {
    console.log(`🔍 DEBUG: No images for business #${business.id}, using default`);
    return ['/images/default-business.jpg'];
  }
  
  // Parse PostgreSQL array if needed
  let images = business.images;
  if (typeof images === 'string') {
    console.log(`🔍 DEBUG: Images is a string: "${images.substring(0, 100)}..."`);
    
    if (images.startsWith('{') && images.endsWith('}')) {
      // Parse PostgreSQL array format {url1,url2,url3}
      images = images.substring(1, images.length - 1).split(',');
      console.log(`🔍 DEBUG: Parsed PostgreSQL array, got ${images.length} images`);
    } else {
      // Single image string
      images = [images];
      console.log('🔍 DEBUG: Single image string, converted to array with 1 item');
    }
  } else if (!Array.isArray(images)) {
    console.log(`🔍 DEBUG: Images is not an array or string, type: ${typeof images}`);
    return ['/images/default-business.jpg'];
  }
  
  // Filter out empty values and process each image
  return images.filter(Boolean).map(image => {
    if (!image) return '/images/default-business.jpg';
    
    // If already a full URL, return as is
    if (image.startsWith('http')) {
      return image;
    }
    
    // If it's a relative upload path, convert to S3 URL with primary region
    if (image.startsWith('/uploads/')) {
      const filename = image.substring('/uploads/'.length);
      return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.primaryRegion}.amazonaws.com/businesses/${business.id}/${filename}`;
    }
    
    // Otherwise it's just a filename, construct the URL
    return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.primaryRegion}.amazonaws.com/businesses/${business.id}/${image}`;
  });
}

// ...existing code continues the same as in marketplace.js with added debug logs...