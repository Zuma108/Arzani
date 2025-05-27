/**
 * Google Authentication Fix
 * Handles Google Sign-In issues and provides fallback mechanisms
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if Google Identity Services is loaded
    let googleLoadAttempts = 0;
    const maxGoogleLoadAttempts = 10;
    
    function checkGoogleLoaded() {
        googleLoadAttempts++;
        
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('Google Identity Services loaded successfully');
            return true;
        }
        
        if (googleLoadAttempts < maxGoogleLoadAttempts) {
            setTimeout(checkGoogleLoaded, 500);
            return false;
        }
        
        console.error('Google Identity Services failed to load after', maxGoogleLoadAttempts, 'attempts');
        showGoogleSignInFallback();
        return false;
    }
    
    function showGoogleSignInFallback() {
        const googleBtn = document.getElementById('google-signin-btn');
        if (googleBtn) {
            googleBtn.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    padding: 12px;
                    background-color: white;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    color: #3c4043;
                    cursor: not-allowed;
                    opacity: 0.6;
                ">
                    <span style="margin-right: 10px;">⚠️</span>
                    <span>Google Sign-In temporarily unavailable</span>
                </div>
            `;
        }
    }
    
    // Start checking if Google is loaded
    checkGoogleLoaded();
    
    // Add error handling for Google Sign-In
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('google')) {
            console.error('Google Sign-In error:', e);
            showGoogleSignInFallback();
        }
    });
    
    // Enhanced credential response handler with better error handling
    window.handleCredentialResponse = function(response) {
        console.log('Google credential response received');
        
        if (!response || !response.credential) {
            console.error('Invalid credential response:', response);
            alert('Google Sign-In failed. Please try again or use email login.');
            return;
        }
        
        const returnTo = localStorage.getItem('authReturnTo') || '/marketplace2';
        
        // Show loading state
        const googleBtn = document.getElementById('google-signin-btn');
        if (googleBtn) {
            googleBtn.style.opacity = '0.5';
            googleBtn.style.pointerEvents = 'none';
        }
        
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
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.removeItem('authReturnTo');
                
                console.log('Google authentication successful, redirecting to:', data.redirectTo);
                window.location.href = data.redirectTo || returnTo;
            } else {
                throw new Error(data.message || 'Authentication failed');
            }
        })
        .catch(error => {
            console.error('Google authentication error:', error);
            
            // Restore button state
            if (googleBtn) {
                googleBtn.style.opacity = '1';
                googleBtn.style.pointerEvents = 'auto';
            }
            
            alert('Google Sign-In failed: ' + error.message + '\nPlease try using email login instead.');
        });
    };
});

