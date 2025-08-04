// Enhanced Google OAuth2 Implementation based on Google's official documentation
// This file implements secure OAuth2 flow with proper origin validation, state management, and error handling

class SecureGoogleAuth {
    constructor(clientId) {
        this.clientId = clientId;
        this.oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
        this.tokenRevokeEndpoint = 'https://oauth2.googleapis.com/revoke';
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];
        this.initializeAuth();
    }

    // Generate cryptographically secure state parameter for CSRF protection
    generateSecureState() {
        const randomValues = new Uint32Array(2);
        window.crypto.getRandomValues(randomValues);
        
        const utf8Encoder = new TextEncoder();
        const utf8Array = utf8Encoder.encode(
            String.fromCharCode.apply(null, randomValues)
        );
        
        return btoa(String.fromCharCode.apply(null, utf8Array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    // Validate current origin against Google's origin validation rules
    validateOrigin() {
        const origin = window.location.origin;
        const url = new URL(origin);
        
        // Check Google's origin validation rules
        const validationRules = {
            // Must use HTTPS (except localhost)
            httpsRequired: !url.hostname.includes('localhost') && url.protocol !== 'https:',
            // Cannot be raw IP (except localhost)
            noRawIP: /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) && !url.hostname.includes('127.0.0.1'),
            // Cannot contain userinfo, path, query, or fragment
            noUserInfo: url.username || url.password,
            noPath: url.pathname !== '/',
            noQuery: url.search,
            noFragment: url.hash,
            // Cannot contain special characters
            noWildcards: url.hostname.includes('*'),
            // Cannot be googleusercontent.com
            notGoogleusercontent: url.hostname.includes('googleusercontent.com')
        };

        const violations = Object.entries(validationRules)
            .filter(([rule, violated]) => violated)
            .map(([rule]) => rule);

        if (violations.length > 0) {
            console.error('Origin validation failed:', violations);
            throw new Error(`Invalid origin: ${origin}. Violations: ${violations.join(', ')}`);
        }

        console.log('Origin validation passed:', origin);
        return true;
    }

    // Initialize Google Identity Services with proper configuration
    async initializeAuth() {
        try {
            // Validate origin first
            this.validateOrigin();

            // Wait for Google API to be available
            await this.waitForGoogleAPI();

            // Configure Google Sign-In with security best practices
            window.google.accounts.id.initialize({
                client_id: this.clientId,
                callback: this.handleCredentialResponse.bind(this),
                auto_select: false,
                cancel_on_tap_outside: true,
                itp_support: true,
                context: 'signin',
                ux_mode: 'popup',
                use_fedcm_for_prompt: false,
                allowed_parent_origin: window.location.origin,
                // Additional security configuration
                state_cookie_domain: window.location.hostname,
                hosted_domain: null // Allow any domain
            });

            console.log('Google OAuth2 initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Google OAuth2:', error);
            this.handleAuthError('initialization_failed', error.message);
            throw error;
        }
    }

    // Wait for Google API to be fully loaded
    waitForGoogleAPI(timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkAPI = () => {
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error('Google API failed to load within timeout'));
                    return;
                }
                
                setTimeout(checkAPI, 100);
            };
            
            checkAPI();
        });
    }

    // Handle credential response with comprehensive error handling
    async handleCredentialResponse(response) {
        try {
            console.log('Received Google credential response');
            
            if (!response.credential) {
                throw new Error('No credential in response');
            }

            // Send credential to server for verification
            const result = await this.verifyWithServer(response.credential);
            
            if (result.success) {
                console.log('Authentication successful');
                this.handleAuthSuccess(result);
            } else {
                throw new Error(result.message || 'Server verification failed');
            }
        } catch (error) {
            console.error('Credential handling failed:', error);
            this.handleAuthError('credential_verification_failed', error.message);
        }
    }

    // Verify credential with server
    async verifyWithServer(credential) {
        try {
            const response = await fetch('/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    credential: credential,
                    returnTo: this.getReturnUrl(),
                    origin: window.location.origin,
                    timestamp: Date.now()
                }),
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Server verification failed:', error);
            throw error;
        }
    }

    // Get return URL from various sources
    getReturnUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('returnTo') || 
               sessionStorage.getItem('oauth_return_url') || 
               '/marketplace2';
    }

    // Handle successful authentication
    handleAuthSuccess(result) {
        // Clear any stored error states
        this.clearAuthErrors();
        
        // Store token securely (if provided)
        if (result.token) {
            this.secureTokenStorage(result.token);
        }
        
        // Redirect to intended destination
        const redirectUrl = result.redirectTo || this.getReturnUrl();
        console.log('Redirecting to:', redirectUrl);
        
        // Use replace to prevent back button issues
        window.location.replace(redirectUrl);
    }

    // Handle authentication errors with specific error codes
    handleAuthError(errorType, errorMessage) {
        console.error(`Auth error [${errorType}]:`, errorMessage);
        
        // Display user-friendly error message
        const errorMappings = {
            'initialization_failed': 'Unable to initialize Google Sign-In. Please refresh the page.',
            'credential_verification_failed': 'Authentication failed. Please try again.',
            'origin_validation_failed': 'This page is not authorized for Google Sign-In.',
            'token_expired': 'Your session has expired. Please sign in again.',
            'invalid_client': 'Application configuration error. Please contact support.',
            'access_denied': 'Sign-in was cancelled.',
            'popup_blocked': 'Please allow popups for this site and try again.'
        };
        
        const userMessage = errorMappings[errorType] || 'Authentication error occurred.';
        this.displayError(userMessage);
        
        // Log detailed error for debugging
        this.logError(errorType, errorMessage);
    }

    // Secure token storage using best practices
    secureTokenStorage(token) {
        try {
            // Store in sessionStorage (more secure than localStorage)
            // In production, consider using secure HTTP-only cookies
            const tokenData = {
                token: token,
                timestamp: Date.now(),
                origin: window.location.origin
            };
            
            sessionStorage.setItem('auth_token', JSON.stringify(tokenData));
            
            // Set expiration timer
            setTimeout(() => {
                this.clearStoredToken();
            }, 4 * 60 * 60 * 1000); // 4 hours
            
        } catch (error) {
            console.error('Failed to store token securely:', error);
        }
    }

    // Clear stored authentication token
    clearStoredToken() {
        try {
            sessionStorage.removeItem('auth_token');
            localStorage.removeItem('oauth2-test-params'); // Legacy cleanup
        } catch (error) {
            console.error('Failed to clear stored token:', error);
        }
    }

    // Display error to user
    displayError(message) {
        // Try to find error display element
        let errorElement = document.getElementById('auth-error');
        
        if (!errorElement) {
            // Create error element if it doesn't exist
            errorElement = document.createElement('div');
            errorElement.id = 'auth-error';
            errorElement.className = 'alert alert-danger auth-error';
            errorElement.style.cssText = `
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                display: none;
            `;
            
            // Insert at the top of the main content
            const container = document.querySelector('.container') || document.body;
            container.insertBefore(errorElement, container.firstChild);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 10000);
    }

    // Clear error displays
    clearAuthErrors() {
        const errorElement = document.getElementById('auth-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Log error for debugging
    logError(errorType, errorMessage) {
        // In production, send to logging service
        const errorLog = {
            type: errorType,
            message: errorMessage,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            origin: window.location.origin
        };
        
        // Store in sessionStorage for debugging
        try {
            const existingLogs = JSON.parse(sessionStorage.getItem('auth_error_logs') || '[]');
            existingLogs.push(errorLog);
            
            // Keep only last 10 errors
            const recentLogs = existingLogs.slice(-10);
            sessionStorage.setItem('auth_error_logs', JSON.stringify(recentLogs));
        } catch (error) {
            console.error('Failed to log error:', error);
        }
    }

    // Render Google Sign-In button with proper configuration
    renderSignInButton(elementId, options = {}) {
        try {
            const defaultOptions = {
                theme: 'outline',
                size: 'large',
                width: 250,
                text: 'continue_with',
                logo_alignment: 'left',
                shape: 'rectangular'
            };
            
            const buttonOptions = { ...defaultOptions, ...options };
            
            const element = document.getElementById(elementId);
            if (!element) {
                throw new Error(`Element with ID '${elementId}' not found`);
            }
            
            window.google.accounts.id.renderButton(element, buttonOptions);
            console.log('Google Sign-In button rendered successfully');
            
        } catch (error) {
            console.error('Failed to render sign-in button:', error);
            this.handleAuthError('button_render_failed', error.message);
        }
    }

    // Programmatically revoke access token
    async revokeAccess(accessToken) {
        try {
            // Create form for revocation (CORS limitation)
            const form = document.createElement('form');
            form.setAttribute('method', 'post');
            form.setAttribute('action', this.tokenRevokeEndpoint);
            
            const tokenField = document.createElement('input');
            tokenField.setAttribute('type', 'hidden');
            tokenField.setAttribute('name', 'token');
            tokenField.setAttribute('value', accessToken);
            form.appendChild(tokenField);
            
            document.body.appendChild(form);
            form.submit();
            
            // Clear local storage
            this.clearStoredToken();
            
            console.log('Access token revoked successfully');
        } catch (error) {
            console.error('Failed to revoke access token:', error);
            throw error;
        }
    }

    // Check if user has valid authentication
    isAuthenticated() {
        try {
            const tokenData = sessionStorage.getItem('auth_token');
            if (!tokenData) return false;
            
            const parsed = JSON.parse(tokenData);
            const age = Date.now() - parsed.timestamp;
            const maxAge = 4 * 60 * 60 * 1000; // 4 hours
            
            if (age > maxAge) {
                this.clearStoredToken();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Failed to check authentication status:', error);
            return false;
        }
    }

    // Get debug information
    getDebugInfo() {
        return {
            clientId: this.clientId,
            origin: window.location.origin,
            isAuthenticated: this.isAuthenticated(),
            googleApiLoaded: !!(window.google && window.google.accounts),
            errorLogs: JSON.parse(sessionStorage.getItem('auth_error_logs') || '[]'),
            tokenStored: !!sessionStorage.getItem('auth_token')
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecureGoogleAuth;
} else {
    window.SecureGoogleAuth = SecureGoogleAuth;
}
