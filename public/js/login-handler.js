document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const emailErrorElement = document.getElementById('email-error');
  
  // Initialize Google Sign In if available
  if (window.google && window.google.accounts && document.getElementById('google-signin-btn')) {
    const googleClientId = document.querySelector('meta[name="google-client-id"]')?.content || 
                          window.config?.GOOGLE_CLIENT_ID;
    
    if (googleClientId) {
      console.log('Initializing Google Sign-In with client ID:', googleClientId);
      
      // Configure Google Sign-In with correct origin settings
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        context: 'signin',
        ux_mode: 'popup',
        state_cookie_domain: window.location.hostname,
        use_fedcm_for_prompt: false, // Disable Chrome's FedCM for more consistent behavior
        allowed_parent_origin: window.location.origin // Explicitly set allowed origin
      });
      
      // Render button with fixed width value
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 250 // Fixed pixel width instead of percentage
        }
      );
    }
  }
  
  // Handle email collection and redirect to login2
  if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      // Get email value
      const email = emailInput.value.trim();
      
      // Basic validation
      if (!email || !validateEmail(email)) {
        showError('Please enter a valid email address');
        return;
      }
      
      // Store email in localStorage for next page
      localStorage.setItem('email', email);
      
      // Redirect to login2 page with email parameter
      window.location.href = '/auth/login2?email=' + encodeURIComponent(email);
    });
  }
  
  // Initialize LinkedIn Sign-In button if available
  const linkedInButton = document.getElementById('linkedin-signin-btn');
  if (linkedInButton) {
    linkedInButton.addEventListener('click', function() {
      // Extract LinkedIn client ID and redirect URI from config
      const linkedInClientId = window.config?.LINKEDIN_CLIENT_ID;
      const linkedInRedirectURI = window.config?.LINKEDIN_REDIRECT_URI || 
                                 'http://localhost:5000/auth/linkedin/callback';
      
      if (!linkedInClientId) {
        console.error('LinkedIn client ID not configured');
        return;
      }
      
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization` +
                      `?response_type=code` +
                      `&client_id=${linkedInClientId}` +
                      `&redirect_uri=${encodeURIComponent(linkedInRedirectURI)}` +
                      `&scope=r_liteprofile%20r_emailaddress`;
      
      window.location.href = authUrl;
    });
  }
  
  // Handle Google credential response
  function handleCredentialResponse(response) {
    try {
      if (!response || !response.credential) {
        console.error('No credential received from Google');
        return;
      }
      
      // Get returnTo parameter from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo') || 
                      urlParams.get('returnUrl') || 
                      localStorage.getItem('authReturnTo') || 
                      '/marketplace2';
      
      console.log('Google OAuth handleCredentialResponse - returnTo:', returnTo);
      
      // Show loading indicator
      const googleBtn = document.getElementById('google-signin-btn');
      if (googleBtn) {
        googleBtn.innerHTML = '<div style="text-align: center;">Signing in...</div>';
      }
      
      fetch('/auth/google', {
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
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || 'Google authentication failed');
          });
        }
        return response.json();
      })
      .then(data => {
        if (!data.success || !data.token) {
          throw new Error(data.message || 'Authentication failed');
        }
        
        // Store token
        localStorage.setItem('token', data.token);
        
        // Store user data if available
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Use redirectTo from server response, fallback to returnUrl param or default
        let redirectUrl = data.redirectTo;
        if (!redirectUrl) {
          const urlParams = new URLSearchParams(window.location.search);
          redirectUrl = urlParams.get('returnUrl') || '/marketplace2';
        }
        
        console.log('Google OAuth successful, redirecting to:', redirectUrl);
        window.location.href = redirectUrl;
      })
      .catch(error => {
        console.error('Google authentication error:', error);
        // Restore the Google button if there was an error
        if (googleBtn) {
          google.accounts.id.renderButton(googleBtn, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: '100%'
          });
        }
        showError(error.message || 'Google authentication failed');
      });
    } catch (error) {
      console.error('Google Sign-In error:', error);
      // Show error in signin button
      const googleBtn = document.getElementById('google-signin-btn');
      if (googleBtn) {
        googleBtn.innerHTML = '<div style="color: red;">Google Sign-In failed. Please try again.</div>';
        // Re-render the button after a short delay
        setTimeout(() => {
          google.accounts.id.renderButton(googleBtn, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: '100%'
          });
        }, 3000);
      }
      showError(error.message || 'Google authentication failed');
    }
  }
  
  // Helper function to display errors
  function showError(message) {
    if (emailErrorElement) {
      emailErrorElement.textContent = message;
      emailErrorElement.style.display = 'block';
    } else {
      alert(message);
    }
  }
  
  // Helper function to validate email
  function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
});
