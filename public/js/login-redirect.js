/**
 * Login redirect handler for Arzani Marketplace
 * This script helps preserve questionnaire data when a user is redirected to login
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page with a returnTo parameter
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    
    // Log the current situation
    console.log('Login redirect handler loaded');
    console.log('Return URL:', returnTo);

    // Check if we have pending questionnaire data
    const pendingData = localStorage.getItem('pendingQuestionnaireData');
    const pendingTime = localStorage.getItem('pendingQuestionnaireSaveTime');
    
    if (pendingData) {
        try {
            // Add a notification at the top of the page
            const loginForm = document.querySelector('form');
            if (loginForm) {
                const notification = document.createElement('div');
                notification.className = 'bg-blue-50 text-blue-700 p-4 mb-6 rounded-lg border border-blue-200';
                notification.innerHTML = `
                    <p class="font-medium">Your questionnaire data is saved</p>
                    <p class="text-sm">Log in to save your progress and continue where you left off.</p>
                `;
                loginForm.parentNode.insertBefore(notification, loginForm);
            }

            // Capture the login form submit event
            const form = document.querySelector('form');
            if (form) {
                form.addEventListener('submit', function() {
                    localStorage.setItem('loginRedirectWithData', 'true');
                    localStorage.setItem('loginRedirectTime', new Date().toISOString());
                    
                    // We'll keep the pendingQuestionnaireData in localStorage
                    // It will be submitted after successful login
                });
            }
        } catch (error) {
            console.error('Error handling login redirect with pending data:', error);
        }
    }
    
    // If the return URL is the questionnaire API, modify it to go to thank-you page instead
    if (returnTo && returnTo.includes('/api/business/save-questionnaire')) {
        // Find any forms on the page
        const loginForms = document.querySelectorAll('form');
        
        loginForms.forEach(form => {
            // Change the returnTo parameter to direct to the thank-you page
            const action = form.getAttribute('action') || '';
            if (action.includes('returnTo=')) {
                const newAction = action.replace(
                    /returnTo=[^&]+/, 
                    'returnTo=' + encodeURIComponent('/seller-questionnaire/thank-you')
                );
                form.setAttribute('action', newAction);
                console.log('Modified form action:', newAction);
            } else if (action) {
                // If action exists but doesn't have returnTo, add it
                const separator = action.includes('?') ? '&' : '?';
                form.setAttribute('action', 
                    action + separator + 'returnTo=' + 
                    encodeURIComponent('/seller-questionnaire/thank-you')
                );
                console.log('Added returnTo to form action');
            }
            
            // Also add a hidden field for return URL
            let hiddenField = form.querySelector('input[name="returnTo"]');
            if (!hiddenField) {
                hiddenField = document.createElement('input');
                hiddenField.type = 'hidden';
                hiddenField.name = 'returnTo';
                form.appendChild(hiddenField);
            }
            hiddenField.value = '/seller-questionnaire/thank-you';
        });
        
        // Update the URL in the browser without reloading
        urlParams.set('returnTo', '/seller-questionnaire/thank-you');
        const newUrl = window.location.pathname + '?' + urlParams.toString();
        window.history.replaceState({}, document.title, newUrl);
    }
});

/**
 * Login Redirect Handler
 * Manages redirects after successful authentication
 */

class LoginRedirectHandler {
    constructor() {
        this.init();
    }
    
    init() {
        // Check if we're on a login success page with token
        this.checkForTokenInUrl();
        
        // Handle OAuth redirects
        this.handleOAuthRedirect();
        
        // Set up redirect preservation
        this.preserveReturnUrl();
    }
    
    checkForTokenInUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            console.log('Token found in URL, processing login');
            
            // Store the token
            localStorage.setItem('token', token);
            
            // Get return URL
            const returnTo = localStorage.getItem('authReturnTo') || '/marketplace2';
            
            // Clean up
            localStorage.removeItem('authReturnTo');
            
            // Remove token from URL for security
            urlParams.delete('token');
            const newUrl = window.location.pathname + 
                          (urlParams.toString() ? '?' + urlParams.toString() : '') + 
                          window.location.hash;
            
            // Replace current URL to remove token
            history.replaceState({}, document.title, newUrl);
            
            // Redirect to intended destination
            setTimeout(() => {
                window.location.href = returnTo;
            }, 100);
        }
    }
    
    handleOAuthRedirect() {
        // Check if this is an OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('code') || urlParams.has('error')) {
            console.log('OAuth callback detected');
            
            if (urlParams.has('error')) {
                const error = urlParams.get('error');
                const errorDescription = urlParams.get('error_description');
                console.error('OAuth error:', error, errorDescription);
                
                alert('Authentication failed: ' + (errorDescription || error));
                window.location.href = '/login2';
            }
        }
    }
    
    preserveReturnUrl() {
        // Preserve return URL when navigating between login pages
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('returnTo');
        
        if (returnTo) {
            localStorage.setItem('authReturnTo', returnTo);
        }
    }
    
    static redirectAfterLogin(token, returnTo = null) {
        if (token) {
            localStorage.setItem('token', token);
        }
        
        const destination = returnTo || 
                           localStorage.getItem('authReturnTo') || 
                           '/marketplace2';
        
        localStorage.removeItem('authReturnTo');
        
        console.log('Redirecting after login to:', destination);
        window.location.href = destination;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginRedirectHandler();
});

// Export for use in other scripts
window.LoginRedirectHandler = LoginRedirectHandler;
