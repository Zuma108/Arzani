document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const emailErrorElement = document.getElementById('email-error');
  
  // Initialize Google Sign In if available
  if (window.google && window.google.accounts && document.getElementById('google-signin-btn')) {
    const googleClientId = document.querySelector('meta[name="google-client-id"]')?.content;
    
    if (googleClientId) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
      });
      
      google.accounts.id.renderButton(
        document.getElementById('google-signin-btn'),
        {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left',
          width: '100%'
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
    if (!response.credential) {
      console.error('No credential received from Google');
      return;
    }
    
    fetch('/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        credential: response.credential
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
      
      // Redirect
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl') || '/marketplace2';
      window.location.href = returnUrl;
    })
    .catch(error => {
      console.error('Google authentication error:', error);
      showError(error.message || 'Google authentication failed');
    });
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
