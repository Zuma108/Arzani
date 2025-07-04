/**
 * Enhanced OAuth Handler with Modern UI Integration
 * Handles Google and Microsoft OAuth with proper error handling and UI feedback
 */

class EnhancedOAuthHandler {
  constructor() {
    this.isGoogleLoaded = false;
    this.isMicrosoftLoaded = false;
    this.initializeServices();
  }

  async initializeServices() {
    // Load Google Identity Services
    await this.loadGoogleScript();
    
    // Initialize Microsoft MSAL if needed (for advanced flows)
    // For now, we'll use direct OAuth flow
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

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isGoogleLoaded = true;
        this.initializeGoogle();
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        reject(new Error('Failed to load Google services'));
      };
      document.head.appendChild(script);
    });
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

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleGoogleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true
      });
    } catch (error) {
      console.error('Failed to initialize Google Identity Services:', error);
    }
  }

  /**
   * Get Google Client ID from various sources
   */
  getGoogleClientId() {
    // Try meta tag first
    const metaTag = document.querySelector('meta[name="google-client-id"]');
    if (metaTag && metaTag.getAttribute('content')) {
      return metaTag.getAttribute('content');
    }

    // Environment-based fallback
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Replace with your actual Google Client IDs
    return isDev ? 
      '1089717985687-94dcvpkpjp7s1m4eo8t5ifrjlhf80g8c.apps.googleusercontent.com' : 
      '1089717985687-94dcvpkpjp7s1m4eo8t5ifrjlhf80g8c.apps.googleusercontent.com';
  }

  /**
   * Handle Google credential response from Sign-In with Google
   */
  async handleGoogleCredentialResponse(response) {
    try {
      this.setLoadingState('google', true);
      const returnTo = this.getReturnUrl();
      
      const result = await fetch('/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          credential: response.credential,
          returnTo: returnTo
        })
      });

      const data = await result.json();

      if (data.success) {
        // Store token for client-side use
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Redirect to specified URL
        window.location.href = data.redirectTo || '/marketplace2';
      } else {
        throw new Error(data.message || 'Google authentication failed');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      this.showError('Google authentication failed. Please try again.');
    } finally {
      this.setLoadingState('google', false);
    }
  }

  /**
   * Handle Google button click (for cases where one-tap doesn't work)
   */
  async handleGoogleSignIn() {
    try {
      if (!this.isGoogleLoaded || !window.google?.accounts?.id) {
        await this.loadGoogleScript();
      }

      // Try one-tap prompt first
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to traditional OAuth flow
          this.redirectToGoogleOAuth();
        }
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      // Fallback to traditional OAuth flow
      this.redirectToGoogleOAuth();
    }
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
    this.setLoadingState('microsoft', true);
    const returnTo = this.getReturnUrl();
    window.location.href = `/auth/microsoft?returnTo=${encodeURIComponent(returnTo)}`;
  }

  /**
   * Get return URL from various sources
   */
  getReturnUrl() {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo') || urlParams.get('returnUrl');
    if (returnTo) return returnTo;

    // Check meta tag
    const metaTag = document.querySelector('meta[name="login-return-to"]');
    if (metaTag) return metaTag.getAttribute('content');

    // Default
    return '/marketplace2';
  }

  /**
   * Set loading state for buttons
   */
  setLoadingState(provider, isLoading) {
    const button = document.querySelector(`[data-oauth-provider="${provider}"]`);
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.style.opacity = '0.6';
      const originalText = button.querySelector('.oauth-button-text');
      if (originalText) {
        originalText.textContent = 'Signing in...';
      }
    } else {
      button.disabled = false;
      button.style.opacity = '1';
      const originalText = button.querySelector('.oauth-button-text');
      if (originalText) {
        originalText.textContent = provider === 'google' ? 'Continue with Google' : 'Continue with Microsoft';
      }
    }
  }

  /**
   * Show error message with modern styling
   */
  showError(message) {
    // Remove existing error
    const existingError = document.getElementById('oauth-error');
    if (existingError) {
      existingError.remove();
    }

    // Create new error element
    const errorElement = document.createElement('div');
    errorElement.id = 'oauth-error';
    errorElement.className = 'px-4 py-3 mb-4 border border-red-200 rounded-2xl bg-red-50 text-red-800 text-sm flex items-center gap-2';
    errorElement.innerHTML = `
      <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
      </svg>
      <span>${message}</span>
    `;
    
    // Insert before the first form or OAuth container
    const container = document.getElementById('oauth-buttons-container') || document.querySelector('form');
    if (container) {
      container.parentNode.insertBefore(errorElement, container);
    } else {
      document.body.appendChild(errorElement);
    }
    
    // Auto-hide after 7 seconds
    setTimeout(() => {
      if (errorElement && errorElement.parentNode) {
        errorElement.remove();
      }
    }, 7000);
  }

  /**
   * Create modern OAuth buttons with improved styling
   */
  createOAuthButtons() {
    return `
      <div class="space-y-3 mb-6">
        <button type="button" 
                data-oauth-provider="google"
                onclick="window.enhancedOAuthHandler.handleGoogleSignIn()" 
                class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-full text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm">
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span class="oauth-button-text">Continue with Google</span>
        </button>
        
        <button type="button" 
                data-oauth-provider="microsoft"
                onclick="window.enhancedOAuthHandler.handleMicrosoftSignIn()" 
                class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-full text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm">
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#f25022" d="M11.4 11.4H0V0h11.4v11.4z"/>
            <path fill="#00a4ef" d="M24 11.4H12.6V0H24v11.4z"/>
            <path fill="#7fba00" d="M11.4 24H0V12.6h11.4V24z"/>
            <path fill="#ffb900" d="M24 24H12.6V12.6H24V24z"/>
          </svg>
          <span class="oauth-button-text">Continue with Microsoft</span>
        </button>
      </div>
      
      <div class="relative flex items-center justify-center mb-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-200"></div>
        </div>
        <div class="relative bg-white px-4 text-sm text-gray-500">
          Or continue with email
        </div>
      </div>
    `;
  }

  /**
   * Initialize OAuth buttons
   */
  init() {
    const container = document.getElementById('oauth-buttons-container');
    if (container) {
      container.innerHTML = this.createOAuthButtons();
    }
  }

  /**
   * Handle URL parameters for OAuth errors
   */
  handleUrlErrors() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      switch (error) {
        case 'google_auth_failed':
          errorMessage = 'Google authentication failed. Please try again.';
          break;
        case 'microsoft_auth_failed':
          errorMessage = 'Microsoft authentication failed. Please try again.';
          break;
        case 'invalid_state':
          errorMessage = 'Security validation failed. Please try again.';
          break;
        case 'no_authorization_code':
          errorMessage = 'Authorization was cancelled or failed.';
          break;
        case 'user_processing_failed':
          errorMessage = 'Failed to process user account. Please contact support.';
          break;
        default:
          errorMessage = decodeURIComponent(error);
      }
      
      this.showError(errorMessage);
      
      // Clean up URL
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.pathname + (window.location.search.replace(/[?&]error=[^&]*/g, '').replace(/^&/, '?'));
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }
}

// Initialize enhanced OAuth handler
const enhancedOAuthHandler = new EnhancedOAuthHandler();

// Export for global access
window.enhancedOAuthHandler = enhancedOAuthHandler;

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    enhancedOAuthHandler.init();
    enhancedOAuthHandler.handleUrlErrors();
  });
} else {
  enhancedOAuthHandler.init();
  enhancedOAuthHandler.handleUrlErrors();
}

// Legacy compatibility
window.oauthHandler = enhancedOAuthHandler;
