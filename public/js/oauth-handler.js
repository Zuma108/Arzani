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
    
    // Use the correct Client ID from .env file
    return '1039909939855-66mkfud3r7f3bk16besfn49m628q3o85.apps.googleusercontent.com';
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
    return `
      <div class="space-y-3 mb-6">
        <button type="button" onclick="oauthHandler.handleGoogleSignIn()" class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200">
          <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>
      </div>
    `;
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
