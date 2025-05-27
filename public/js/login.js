/**
 * Login Page JavaScript
 * Handles all login-related functionality
 */

class LoginHandler {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupEmailForm();
        this.setupGoogleSignIn();
        this.setupOtherProviders();
        this.handleUrlParams();
    }
    
    setupEmailForm() {
        const form = document.getElementById('login-form');
        const emailInput = document.getElementById('email');
        const errorElement = document.getElementById('email-error');
        
        if (form && emailInput) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const email = emailInput.value.trim();
                
                if (!this.validateEmail(email)) {
                    this.showError(errorElement, 'Please enter a valid email address');
                    return;
                }
                
                this.hideError(errorElement);
                
                // Store email and proceed to password step
                localStorage.setItem('email', email);
                
                const returnTo = localStorage.getItem('authReturnTo') || '';
                const url = `/auth/login2?email=${encodeURIComponent(email)}${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ''}`;
                
                window.location.href = url;
            });
        }
    }
    
    setupGoogleSignIn() {
        // Wait for Google to load
        const checkGoogle = () => {
            if (typeof google !== 'undefined' && google.accounts) {
                this.initializeGoogleSignIn();
            } else {
                setTimeout(checkGoogle, 100);
            }
        };
        
        checkGoogle();
    }
    
    initializeGoogleSignIn() {
        try {
            google.accounts.id.initialize({
                client_id: window.config?.GOOGLE_CLIENT_ID || '',
                callback: this.handleGoogleCallback.bind(this),
                auto_select: false,
                cancel_on_tap_outside: true
            });
            
            const buttonElement = document.getElementById('google-signin-btn');
            if (buttonElement) {
                google.accounts.id.renderButton(buttonElement, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'rectangular',
                    text: 'continue_with',
                    logo_alignment: 'left',
                    width: '100%'
                });
            }
        } catch (error) {
            console.error('Google Sign-In initialization error:', error);
            this.showGoogleError();
        }
    }
    
    handleGoogleCallback(response) {
        if (!response?.credential) {
            console.error('No credential in Google response');
            alert('Google Sign-In failed. Please try again.');
            return;
        }
        
        const returnTo = localStorage.getItem('authReturnTo') || '/marketplace2';
        
        // Show loading state
        this.setGoogleButtonLoading(true);
        
        fetch('/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                credential: response.credential,
                returnTo: returnTo
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.removeItem('authReturnTo');
                
                window.location.href = data.redirectTo || returnTo;
            } else {
                throw new Error(data.message || 'Authentication failed');
            }
        })
        .catch(error => {
            console.error('Google authentication error:', error);
            this.setGoogleButtonLoading(false);
            alert(`Google Sign-In failed: ${error.message}\n\nPlease try using email login instead.`);
        });
    }
    
    setGoogleButtonLoading(loading) {
        const button = document.getElementById('google-signin-btn');
        if (button) {
            if (loading) {
                button.style.opacity = '0.6';
                button.style.pointerEvents = 'none';
            } else {
                button.style.opacity = '1';
                button.style.pointerEvents = 'auto';
            }
        }
    }
    
    showGoogleError() {
        const button = document.getElementById('google-signin-btn');
        if (button) {
            button.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px;
                    background-color: #f8f9fa;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    color: #5f6368;
                ">
                    ⚠️ Google Sign-In unavailable
                </div>
            `;
        }
    }
    
    setupOtherProviders() {
        // Microsoft Sign-In
        const microsoftBtn = document.querySelector('[onclick="handleMicrosoftSignIn()"]');
        if (microsoftBtn) {
            microsoftBtn.addEventListener('click', this.handleMicrosoftSignIn.bind(this));
        }
        
        // LinkedIn Sign-In
        const linkedinBtn = document.getElementById('linkedin-signin-btn');
        if (linkedinBtn) {
            linkedinBtn.addEventListener('click', this.handleLinkedInSignIn.bind(this));
        }
    }
    
    handleMicrosoftSignIn() {
        const returnTo = localStorage.getItem('authReturnTo') || '/marketplace2';
        localStorage.setItem('microsoftReturnTo', returnTo);
        
        // Microsoft OAuth implementation
        console.log('Microsoft Sign-In clicked');
    }
    
    handleLinkedInSignIn() {
        const returnTo = localStorage.getItem('authReturnTo') || '/marketplace2';
        localStorage.setItem('linkedinReturnTo', returnTo);
        
        // LinkedIn OAuth implementation
        console.log('LinkedIn Sign-In clicked');
    }
    
    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Handle error messages
        const error = urlParams.get('error');
        if (error) {
            alert(decodeURIComponent(error));
        }
        
        // Handle verification success
        const verified = urlParams.get('verified');
        if (verified === 'true') {
            this.showSuccess('Email verified successfully! You can now log in.');
        }
        
        // Store return URL
        const returnTo = urlParams.get('returnTo');
        if (returnTo) {
            localStorage.setItem('authReturnTo', returnTo);
        }
    }
    
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
        }
    }
    
    hideError(element) {
        if (element) {
            element.style.display = 'none';
        }
    }
    
    showSuccess(message) {
        // Create or update success message element
        let successElement = document.getElementById('success-message');
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.id = 'success-message';
            successElement.style.cssText = `
                background-color: #d4edda;
                color: #155724;
                padding: 12px;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                margin-bottom: 20px;
            `;
            
            const form = document.querySelector('.form-container');
            if (form) {
                form.insertBefore(successElement, form.firstChild);
            }
        }
        
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (successElement) {
                successElement.style.display = 'none';
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginHandler();
});
