/**
 * Arzani-X API Standardization Helper
 * Provides consistent API access with authentication for the Arzani-X frontend
 */

class ArzaniApiHelper {
  constructor() {
    this.baseUrl = window.location.origin;
    this.authToken = null;    this.endpoints = {
      // Threads API endpoints (correct integration)
      sessions: {
        create: '/api/threads',
        list: '/api/threads',
        get: (id) => `/api/threads/${id}/messages`,
        update: (id) => `/api/threads/${id}/title`,
        delete: (id) => `/api/threads/${id}`
      },
      messages: {
        create: (sessionId) => `/api/threads/${sessionId}/send`,
        list: (sessionId) => `/api/threads/${sessionId}/messages`,
        get: (id) => `/api/threads/messages/${id}`,
        update: (id) => `/api/threads/messages/${id}`,
        delete: (id) => `/api/threads/messages/${id}`
      },
      // Legacy a2a endpoints for non-chat features only
      interactions: {
        log: '/api/a2a/log-interaction',
        list: '/api/a2a/interactions/recent'
      },
      transitions: {
        log: '/api/a2a/log-transition'
      },
      files: {
        upload: '/api/a2a/log-file-upload'
      },
      // Remove task endpoints - not needed for threads API
      analytics: {
        log: '/api/a2a/logs',
        get: (sessionId) => `/api/a2a/analytics/${sessionId}`
      },
      cache: {
        set: '/api/a2a/cache',
        get: (key) => `/api/a2a/cache/${encodeURIComponent(key)}`
      }
    };
  }

  /**
   * Set the authentication token for API requests
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get the current authentication token
   */
  getAuthToken() {
    if (this.authToken) return this.authToken;
    
    // Try meta tag first
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) {
      this.authToken = metaToken;
      return metaToken;
    }
    
    // Try localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) {
      this.authToken = localToken;
      return localToken;
    }
    
    // Try cookie
    const cookieToken = this.getCookie('token');
    if (cookieToken) {
      this.authToken = cookieToken;
      return cookieToken;
    }
    
    return null;
  }

  /**
   * Get a cookie value by name
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders() {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Make an authenticated API request
   */
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.getAuthHeaders();
      
      const fetchOptions = {
        method: options.method || 'GET',
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      };
      
      if (options.body) {
        fetchOptions.body = typeof options.body === 'string' 
          ? options.body 
          : JSON.stringify(options.body);
      }
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied.');
        }
        
        // Try to get error details from response
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } catch (e) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error(`API request failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Session-related API methods
   */
  async createSession(data) {
    return this.request(this.endpoints.sessions.create, {
      method: 'POST',
      body: data
    });
  }
  
  async getSessions() {
    return this.request(this.endpoints.sessions.list);
  }
  
  async getSession(id) {
    return this.request(this.endpoints.sessions.get(id));
  }
  
  async updateSession(id, data) {
    return this.request(this.endpoints.sessions.update(id), {
      method: 'PUT',
      body: data
    });
  }
  
  async deleteSession(id) {
    return this.request(this.endpoints.sessions.delete(id), {
      method: 'DELETE'
    });
  }

  /**
   * Message-related API methods
   */
  async createMessage(data) {
    return this.request(this.endpoints.messages.create, {
      method: 'POST',
      body: data
    });
  }
  
  async getSessionMessages(sessionId) {
    return this.request(this.endpoints.messages.list(sessionId));
  }
  
  /**
   * Context-related API methods
   */
  async getSessionContext() {
    return this.request(this.endpoints.context.get);
  }
  
  async updateSessionContext(data) {
    return this.request(this.endpoints.context.update, {
      method: 'PUT',
      body: data
    });
  }
  
  /**
   * Logging-related API methods
   */
  async logInteraction(data) {
    return this.request(this.endpoints.interactions.log, {
      method: 'POST',
      body: data
    });
  }
  
  async logTransition(data) {
    return this.request(this.endpoints.transitions.log, {
      method: 'POST',
      body: data
    });
  }
  
  async logFileUpload(data) {
    return this.request(this.endpoints.files.upload, {
      method: 'POST',
      body: data
    });
  }
  
  /**
   * Task-related API methods
   */
  async createTask(data) {
    return this.request(this.endpoints.tasks.create, {
      method: 'POST',
      body: data
    });
  }
  
  async getActiveTasks() {
    return this.request(this.endpoints.tasks.active);
  }
  
  async updateTask(id, data) {
    return this.request(this.endpoints.tasks.update(id), {
      method: 'PUT',
      body: data
    });
  }
  
  async getTaskStatus(id) {
    return this.request(this.endpoints.tasks.status(id));
  }
  
  /**
   * Cache-related API methods
   */
  async setCacheValue(data) {
    return this.request(this.endpoints.cache.set, {
      method: 'POST',
      body: data
    });
  }
  
  async getCacheValue(key) {
    return this.request(this.endpoints.cache.get(key));
  }
  
  /**
   * Analytics-related API methods
   */
  async getAnalytics(sessionId) {
    return this.request(this.endpoints.analytics.get(sessionId));
  }
  
  async logAnalyticsEvent(data) {
    return this.request(this.endpoints.analytics.log, {
      method: 'POST',
      body: data
    });
  }
}

// Export as global or module
if (typeof window !== 'undefined') {
  window.ArzaniApiHelper = ArzaniApiHelper;
}

if (typeof module !== 'undefined') {
  module.exports = ArzaniApiHelper;
}
