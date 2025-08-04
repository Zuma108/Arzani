/**
 * Client-Side Role Caching Utility
 * Manages role detection and caching on the client side for improved performance
 */

class RoleCacheManager {
  constructor() {
    this.cacheKeys = {
      role: 'arzani_user_role',
      confidence: 'arzani_role_confidence',
      expiration: 'arzani_role_expires',
      behavioralData: 'arzani_behavioral_data',
      routingMethod: 'arzani_routing_method',
      sessionData: 'arzani_session_data',
      abTestVariant: 'arzani_ab_variant'
    };
    
    this.defaultExpiration = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.behavioralExpiration = 24 * 60 * 60 * 1000;  // 24 hours
    
    this.initializeCache();
  }
  
  /**
   * Initialize cache and clean up expired entries
   */
  initializeCache() {
    this.cleanupExpiredEntries();
    this.startPeriodicCleanup();
  }
  
  /**
   * Get cached role data
   */
  getCachedRole() {
    try {
      const role = localStorage.getItem(this.cacheKeys.role);
      const confidence = parseFloat(localStorage.getItem(this.cacheKeys.confidence)) || 0;
      const expiration = parseInt(localStorage.getItem(this.cacheKeys.expiration)) || 0;
      const behavioralData = JSON.parse(localStorage.getItem(this.cacheKeys.behavioralData) || '{}');
      const routingMethod = sessionStorage.getItem(this.cacheKeys.routingMethod);
      
      // Check if cache is expired
      if (expiration && Date.now() > expiration) {
        this.clearRoleCache();
        return null;
      }
      
      return {
        role,
        confidence,
        expiration: new Date(expiration),
        behavioralData,
        routingMethod,
        isValid: role && confidence > 0
      };
    } catch (error) {
      console.error('Error getting cached role:', error);
      return null;
    }
  }
  
  /**
   * Cache role data
   */
  cacheRole(roleData) {
    try {
      const expiration = roleData.expiration || 
        new Date(Date.now() + this.defaultExpiration);
      
      localStorage.setItem(this.cacheKeys.role, roleData.role);
      localStorage.setItem(this.cacheKeys.confidence, roleData.confidence.toString());
      localStorage.setItem(this.cacheKeys.expiration, expiration.getTime().toString());
      
      if (roleData.behavioralData) {
        localStorage.setItem(this.cacheKeys.behavioralData, JSON.stringify(roleData.behavioralData));
      }
      
      if (roleData.routingMethod) {
        sessionStorage.setItem(this.cacheKeys.routingMethod, roleData.routingMethod);
      }
      
      // Dispatch custom event for other components
      this.dispatchRoleCacheUpdate(roleData);
      
      return true;
    } catch (error) {
      console.error('Error caching role:', error);
      return false;
    }
  }
  
  /**
   * Update behavioral data
   */
  updateBehavioralData(newBehaviorData) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.cacheKeys.behavioralData) || '{}');
      const merged = { ...existing, ...newBehaviorData };
      
      localStorage.setItem(this.cacheKeys.behavioralData, JSON.stringify(merged));
      
      return true;
    } catch (error) {
      console.error('Error updating behavioral data:', error);
      return false;
    }
  }
  
  /**
   * Track user behavior for role detection
   */
  trackBehavior(behaviorType, behaviorData) {
    try {
      const timestamp = Date.now();
      const existingData = JSON.parse(localStorage.getItem(this.cacheKeys.behavioralData) || '{}');
      
      if (!existingData.behaviors) {
        existingData.behaviors = [];
      }
      
      // Add new behavior
      existingData.behaviors.push({
        type: behaviorType,
        data: behaviorData,
        timestamp
      });
      
      // Keep only last 50 behaviors
      if (existingData.behaviors.length > 50) {
        existingData.behaviors = existingData.behaviors.slice(-50);
      }
      
      // Update role indicators based on behavior
      this.updateRoleIndicators(behaviorType, behaviorData, existingData);
      
      localStorage.setItem(this.cacheKeys.behavioralData, JSON.stringify(existingData));
      
      // Send to server if significant behavior change
      this.maybeUpdateServer(existingData);
      
    } catch (error) {
      console.error('Error tracking behavior:', error);
    }
  }
  
  /**
   * Update role indicators based on behavior
   */
  updateRoleIndicators(behaviorType, behaviorData, existingData) {
    if (!existingData.roleIndicators) {
      existingData.roleIndicators = {
        buyer: 0,
        seller: 0,
        professional: 0,
        investor: 0
      };
    }
    
    // Page view indicators
    if (behaviorType === 'page_view') {
      const page = behaviorData.page || window.location.pathname;
      
      const pageIndicators = {
        '/buyer-landing': { buyer: 0.3 },
        '/seller-landing': { seller: 0.3 },
        '/business-valuation': { seller: 0.25 },
        '/professional': { professional: 0.4 },
        '/submit-business': { seller: 0.4 },
        '/saved-businesses': { buyer: 0.3 },
        '/marketplace': { buyer: 0.2 }
      };
      
      Object.entries(pageIndicators).forEach(([pagePath, indicators]) => {
        if (page.includes(pagePath)) {
          Object.entries(indicators).forEach(([role, weight]) => {
            existingData.roleIndicators[role] += weight;
          });
        }
      });
    }
    
    // Search behavior indicators
    if (behaviorType === 'search') {
      const query = behaviorData.query?.toLowerCase() || '';
      
      if (query.includes('buy') || query.includes('acquire') || query.includes('purchase')) {
        existingData.roleIndicators.buyer += 0.2;
      }
      
      if (query.includes('sell') || query.includes('valuation') || query.includes('worth')) {
        existingData.roleIndicators.seller += 0.2;
      }
      
      if (query.includes('invest') || query.includes('roi') || query.includes('return')) {
        existingData.roleIndicators.investor += 0.2;
      }
    }
    
    // Click behavior indicators
    if (behaviorType === 'click') {
      const element = behaviorData.element || '';
      
      if (element.includes('contact-seller') || element.includes('view-business')) {
        existingData.roleIndicators.buyer += 0.15;
      }
      
      if (element.includes('list-business') || element.includes('get-valuation')) {
        existingData.roleIndicators.seller += 0.15;
      }
    }
    
    // Normalize scores to prevent inflation
    const maxScore = Math.max(...Object.values(existingData.roleIndicators));
    if (maxScore > 5) {
      Object.keys(existingData.roleIndicators).forEach(role => {
        existingData.roleIndicators[role] *= (5 / maxScore);
      });
    }
  }
  
  /**
   * Maybe update server with behavioral changes
   */
  maybeUpdateServer(behavioralData) {
    const lastUpdate = sessionStorage.getItem('arzani_last_behavior_update');
    const now = Date.now();
    
    // Update server every 30 seconds at most
    if (!lastUpdate || (now - parseInt(lastUpdate)) > 30000) {
      sessionStorage.setItem('arzani_last_behavior_update', now.toString());
      
      // Send behavioral data to server
      fetch('/api/user-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'behavioral_update',
          data: behavioralData
        })
      }).catch(error => {
        console.error('Error updating server with behavioral data:', error);
      });
    }
  }
  
  /**
   * Cache A/B test variant
   */
  cacheABTestVariant(variant, routingMethod = 'a_b_testing') {
    try {
      sessionStorage.setItem(this.cacheKeys.abTestVariant, variant);
      sessionStorage.setItem(this.cacheKeys.routingMethod, routingMethod);
      return true;
    } catch (error) {
      console.error('Error caching A/B test variant:', error);
      return false;
    }
  }
  
  /**
   * Get cached A/B test variant
   */
  getCachedABTestVariant() {
    try {
      return {
        variant: sessionStorage.getItem(this.cacheKeys.abTestVariant),
        routingMethod: sessionStorage.getItem(this.cacheKeys.routingMethod)
      };
    } catch (error) {
      console.error('Error getting cached A/B test variant:', error);
      return { variant: null, routingMethod: null };
    }
  }
  
  /**
   * Clear role cache
   */
  clearRoleCache() {
    Object.values(this.cacheKeys).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
  
  /**
   * Clear only session cache
   */
  clearSessionCache() {
    Object.values(this.cacheKeys).forEach(key => {
      sessionStorage.removeItem(key);
    });
  }
  
  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries() {
    try {
      const expiration = parseInt(localStorage.getItem(this.cacheKeys.expiration)) || 0;
      
      if (expiration && Date.now() > expiration) {
        this.clearRoleCache();
      }
      
      // Clean up old behavioral data
      const behavioralData = JSON.parse(localStorage.getItem(this.cacheKeys.behavioralData) || '{}');
      if (behavioralData.behaviors) {
        const cutoffTime = Date.now() - this.behavioralExpiration;
        behavioralData.behaviors = behavioralData.behaviors.filter(b => b.timestamp > cutoffTime);
        localStorage.setItem(this.cacheKeys.behavioralData, JSON.stringify(behavioralData));
      }
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
    }
  }
  
  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup() {
    // Clean up every hour
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Dispatch role cache update event
   */
  dispatchRoleCacheUpdate(roleData) {
    window.dispatchEvent(new CustomEvent('roleCacheUpdate', {
      detail: roleData
    }));
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    const cachedRole = this.getCachedRole();
    const behavioralData = JSON.parse(localStorage.getItem(this.cacheKeys.behavioralData) || '{}');
    
    return {
      hasValidCache: cachedRole?.isValid || false,
      role: cachedRole?.role,
      confidence: cachedRole?.confidence,
      behaviorCount: behavioralData.behaviors?.length || 0,
      roleIndicators: behavioralData.roleIndicators || {},
      cacheAge: cachedRole?.expiration ? Date.now() - cachedRole.expiration.getTime() : null
    };
  }
}

// Auto-tracking functionality
class AutoBehaviorTracker {
  constructor(roleCacheManager) {
    this.roleCache = roleCacheManager;
    this.isTracking = false;
    this.init();
  }
  
  init() {
    if (this.isTracking) return;
    this.isTracking = true;
    
    // Track page views
    this.trackPageView();
    
    // Track clicks on important elements
    this.setupClickTracking();
    
    // Track form interactions
    this.setupFormTracking();
    
    // Track search behavior
    this.setupSearchTracking();
    
    // Track time spent on page
    this.setupTimeTracking();
  }
  
  trackPageView() {
    this.roleCache.trackBehavior('page_view', {
      page: window.location.pathname,
      timestamp: Date.now(),
      referrer: document.referrer
    });
  }
  
  setupClickTracking() {
    document.addEventListener('click', (event) => {
      const element = event.target;
      const elementInfo = this.getElementInfo(element);
      
      if (elementInfo.isImportant) {
        this.roleCache.trackBehavior('click', {
          element: elementInfo.identifier,
          text: elementInfo.text,
          type: elementInfo.type,
          timestamp: Date.now()
        });
      }
    });
  }
  
  getElementInfo(element) {
    const classes = element.className || '';
    const id = element.id || '';
    const text = element.textContent?.trim().substring(0, 100) || '';
    
    // Important elements for role detection
    const importantSelectors = [
      'contact-seller',
      'view-business',
      'list-business',
      'get-valuation',
      'search-business',
      'save-business',
      'professional-verify',
      'buyer-signup',
      'seller-signup'
    ];
    
    const isImportant = importantSelectors.some(selector => 
      classes.includes(selector) || id.includes(selector)
    );
    
    return {
      isImportant,
      identifier: id || classes,
      text,
      type: element.tagName.toLowerCase()
    };
  }
  
  setupFormTracking() {
    document.addEventListener('input', (event) => {
      const form = event.target.closest('form');
      if (form) {
        const formInfo = this.getFormInfo(form);
        if (formInfo.isImportant) {
          this.roleCache.trackBehavior('form_interaction', {
            form: formInfo.identifier,
            field: event.target.name || event.target.id,
            timestamp: Date.now()
          });
        }
      }
    });
  }
  
  getFormInfo(form) {
    const action = form.action || '';
    const classes = form.className || '';
    const id = form.id || '';
    
    const importantForms = [
      'business-valuation',
      'contact-form',
      'search-form',
      'signup-form',
      'business-submission'
    ];
    
    const isImportant = importantForms.some(selector => 
      action.includes(selector) || classes.includes(selector) || id.includes(selector)
    );
    
    return {
      isImportant,
      identifier: id || classes || action
    };
  }
  
  setupSearchTracking() {
    const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search"]');
    
    searchInputs.forEach(input => {
      let searchTimeout;
      input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (input.value.length > 2) {
            this.roleCache.trackBehavior('search', {
              query: input.value,
              timestamp: Date.now()
            });
          }
        }, 1000);
      });
    });
  }
  
  setupTimeTracking() {
    const startTime = Date.now();
    let lastActivityTime = startTime;
    
    // Track user activity
    ['click', 'scroll', 'keypress', 'mousemove'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        lastActivityTime = Date.now();
      });
    });
    
    // Send time spent data when user leaves page
    window.addEventListener('beforeunload', () => {
      const timeSpent = lastActivityTime - startTime;
      if (timeSpent > 5000) { // More than 5 seconds
        this.roleCache.trackBehavior('time_spent', {
          duration: timeSpent,
          page: window.location.pathname,
          timestamp: Date.now()
        });
      }
    });
  }
}

// Initialize global role cache manager
window.RoleCacheManager = new RoleCacheManager();
window.AutoBehaviorTracker = new AutoBehaviorTracker(window.RoleCacheManager);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RoleCacheManager, AutoBehaviorTracker };
}
