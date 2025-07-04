/**
 * OAuth Button Handler
 * Provides secure OAuth authentication for Google and Microsoft
 */

class OAuthHandler {
  constructor() {
    this.isGoogleLoaded = false;
    this.isMicrosoftLoaded = false;
    this.loadGoogleScript();
  }

  /**
   * Load Google Identity Services
   */
  async loadGoogleScript() {
    if (window.google?.accounts?.id) {
      this.isGoogleLoaded = true;
      this.initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.isGoogleLoaded = true;
      this.initializeGoogle();
    };
    script.onerror = () => {
      console.error('Failed to load Google Identity Services');
    };
    document.head.appendChild(script);
  }

  /**
   * Initialize Google Identity Services
   */
  initializeGoogle() {
    if (!window.google?.accounts?.id) return;

    const clientId = this.getGoogleClientId();
    if (!clientId) {
      console.error('Google Client ID not found');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: this.handleGoogleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true
    });
  }

  /**
   * Get Google Client ID from meta tag or config
   */
  getGoogleClientId() {
    // Try to get from meta tag first
    const metaTag = document.querySelector('meta[name="google-client-id"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    // Fallback to environment-based detection
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // You should set these as data attributes or meta tags in your HTML
    return isDev ? 
      '1089717985687-94dcvpkpjp7s1m4eo8t5ifrjlhf80g8c.apps.googleusercontent.com' : // Dev client ID
      '1089717985687-94dcvpkpjp7s1m4eo8t5ifrjlhf80g8c.apps.googleusercontent.com';   // Prod client ID
  }

  /**
   * Handle Google credential response
   */
  async handleGoogleCredentialResponse(response) {
    try {
      console.log('Handling Google credential response');
      const returnTo = this.getReturnUrl();
      
      const result = await fetch('/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          credential: response.credential,
          returnTo: returnTo
        })
      });

      console.log('OAuth response status:', result.status);
      console.log('OAuth response headers:', result.headers);

      if (!result.ok) {
        throw new Error(`HTTP error! status: ${result.status}`);
      }

      const contentType = result.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const data = await result.json();
      console.log('OAuth response data:', data);

      if (data.success) {
        // Store token for client-side use
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        
        // Redirect to specified URL
        window.location.href = data.redirectTo || '/marketplace2';
      } else {
        this.showError(data.message || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      this.showError('Authentication failed. Please try again.');
    }
  }

  /**
   * Handle Google button click
   */
  handleGoogleSignIn() {
    if (!this.isGoogleLoaded || !window.google?.accounts?.id) {
      this.showError('Google services are not available. Please try again.');
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback to traditional OAuth flow
        this.redirectToGoogleOAuth();
      }
    });
  }

  /**
   * Redirect to Google OAuth (traditional flow)
   */
  redirectToGoogleOAuth() {
    const returnTo = this.getReturnUrl();
    window.location.href = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  }

  /**
   * Handle Microsoft button click
   */
  handleMicrosoftSignIn() {
    const returnTo = this.getReturnUrl();
    window.location.href = `/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
  }

  /**
   * Get return URL
   */
  getReturnUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnTo') || urlParams.get('returnUrl') || '/marketplace2';
  }

  /**
   * Show error message
   */
  showError(message) {
    // Try to find an existing error container
    let errorContainer = document.getElementById('oauth-error');
    
    if (!errorContainer) {
      // Create error container if it doesn't exist
      errorContainer = document.createElement('div');
      errorContainer.id = 'oauth-error';
      errorContainer.className = 'px-4 py-3 mb-4 border border-red-200 rounded-2xl bg-red-50 text-red-800 text-sm';
      
      // Insert before the first form element
      const form = document.querySelector('form');
      if (form) {
        form.parentNode.insertBefore(errorContainer, form);
      } else {
        document.body.appendChild(errorContainer);
      }
    }
    
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  }

  /**
   * Create OAuth buttons HTML
   */
  createOAuthButtons() {
    // OAuth buttons disabled - return empty string
    return '';
  }

  /**
   * Initialize OAuth buttons
   */
  init() {
    // Find the container where OAuth buttons should be inserted
    const container = document.getElementById('oauth-buttons-container');
    if (container) {
      container.innerHTML = this.createOAuthButtons();
    }
  }
}

// Initialize OAuth handler
const oauthHandler = new OAuthHandler();

// Export for global access
window.oauthHandler = oauthHandler;

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => oauthHandler.init());
} else {
  oauthHandler.init();
}
