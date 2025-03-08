/**
 * Consolidated authentication module for client-side auth functionality
 */

// Initialize auth functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeAuthForms();
  initializeOAuthButtons();
  initializeTokenRefresh();
  checkAuthStatus();
});

// Initialize login and signup forms if they exist on the page
function initializeAuthForms() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  if (loginForm) setupLoginForm(loginForm);
  if (signupForm) setupSignupForm(signupForm);
}

// Setup login form submission handler
function setupLoginForm(form) {
  const errorElement = document.getElementById('login-error');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(errorElement);
    
    // Get form data
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!email || !password) {
      showError(errorElement, 'Email and password are required');
      return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Logging in...');
    
    try {
      // Send login request
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      // Parse response
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned invalid response format');
      }
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Successful login
      console.log('Login successful');
      storeAuthData(data);
      
      // Redirect to appropriate page
      const params = new URLSearchParams(window.location.search);
      const returnUrl = params.get('returnUrl') || '/marketplace2';
      window.location.href = returnUrl;
      
    } catch (error) {
      console.error('Login error:', error);
      showError(errorElement, error.message || 'Login failed. Please try again.');
      
      // Check database connectivity if login fails
      checkServerStatus();
    } finally {
      setButtonLoading(submitButton, false, 'Log In');
    }
  });
  
  // Setup password visibility toggle if available
  setupPasswordToggle();
}

// Setup signup form submission handler
function setupSignupForm(form) {
  const errorElement = document.getElementById('signup-error');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(errorElement);
    
    // Get form data
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    
    // Validate input
    const validationError = validateSignupForm(username, email, password, confirmPassword);
    if (validationError) {
      showError(errorElement, validationError);
      return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Signing up...');
    
    try {
      // Send signup request
      const response = await fetch('/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          password
        })
      });
      
      // Parse response
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Show success message and redirect
      alert('Registration successful! Please check your email to verify your account.');
      window.location.href = '/auth/login?registered=true';
      
    } catch (error) {
      console.error('Signup error:', error);
      showError(errorElement, error.message || 'Registration failed. Please try again.');
    } finally {
      setButtonLoading(submitButton, false, 'Sign Up');
    }
  });
  
  // Setup password visibility toggle if available
  setupPasswordToggle();
}

// Initialize OAuth sign-in buttons
function initializeOAuthButtons() {
  const googleButton = document.getElementById('google-signin-btn');
  const microsoftButton = document.getElementById('microsoft-signin-btn');
  const linkedinButton = document.getElementById('linkedin-signin-btn');
  
  // Google Sign-In
  if (googleButton) {
    googleButton.addEventListener('click', handleGoogleSignIn);
  }
  
  // Microsoft Sign-In
  if (microsoftButton) {
    microsoftButton.addEventListener('click', handleMicrosoftSignIn);
  }
  
  // LinkedIn Sign-In
  if (linkedinButton) {
    linkedinButton.addEventListener('click', handleLinkedInSignIn);
  }
}

// Set up token refresh mechanism
function initializeTokenRefresh() {
  // Check token expiration every minute
  setInterval(checkAndRefreshToken, 60000);
}

// Check if user is authenticated
function checkAuthStatus() {
  const token = localStorage.getItem('token');
  const isAuthPage = ['/login', '/signup', '/auth/login', '/auth/signup']
    .some(path => window.location.pathname.endsWith(path));
    
  if (token && isAuthPage) {
    // Redirect authenticated users away from auth pages
    window.location.href = '/marketplace2';
  } else if (!token && !isAuthPage && requiresAuth()) {
    // Redirect unauthenticated users to login
    window.location.href = `/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
  }
}

// Check if current page requires authentication
function requiresAuth() {
  // Define routes that require authentication
  const authRequiredPaths = [
    '/profile',
    '/dashboard',
    '/settings',
    '/marketplace/create',
    '/marketplace/edit'
  ];
  
  return authRequiredPaths.some(path => window.location.pathname.startsWith(path));
}

// Store authentication data
function storeAuthData(data) {
  localStorage.setItem('token', data.token);
  if (data.refreshToken) {
    localStorage.setItem('refreshToken', data.refreshToken);
  }
  
  // Store token expiry (default to 4 hours if not specified)
  const expiresIn = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
  const expiryTime = Date.now() + expiresIn;
  localStorage.setItem('tokenExpiry', expiryTime);
  
  // Store basic user info if available
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

// Check and refresh token if needed
async function checkAndRefreshToken() {
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  const refreshToken = localStorage.getItem('refreshToken');
  
  // If no expiry or refresh token, can't refresh
  if (!tokenExpiry || !refreshToken) return;
  
  // Check if token is nearing expiration (within 15 minutes)
  const timeToExpiry = parseInt(tokenExpiry) - Date.now();
  if (timeToExpiry > 15 * 60 * 1000) return; // Still more than 15 minutes left
  
  try {
    // Attempt to refresh token
    const response = await fetch('/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) throw new Error('Failed to refresh token');
    
    const data = await response.json();
    
    if (!data.success || !data.token) {
      throw new Error('Invalid response from refresh endpoint');
    }
    
    // Update token and expiry
    localStorage.setItem('token', data.token);
    const expiresIn = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    localStorage.setItem('tokenExpiry', Date.now() + expiresIn);
    
    console.log('Token refreshed successfully');
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Could redirect to login if critical
  }
}

// Clear authentication data (logout)
function logout() {
  // Clear local storage auth data
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('user');
  
  // Call logout endpoint to clear server-side session
  fetch('/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .finally(() => {
    // Redirect to login page regardless of logout endpoint result
    window.location.href = '/auth/login?logged_out=true';
  });
}

// Helper functions
function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  } else {
    alert(message);
  }
}

function clearErrors(element) {
  if (element) {
    element.style.display = 'none';
    element.textContent = '';
  }
}

function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Submit';
  }
}

function setupPasswordToggle() {
  const toggles = document.querySelectorAll('.toggle-password');
  
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const target = document.getElementById(this.dataset.target || 'password');
      if (!target) return;
      
      const type = target.type === 'password' ? 'text' : 'password';
      target.type = type;
      
      // Toggle icon if using Font Awesome
      const icon = this.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
    });
  });
}

function validateSignupForm(username, email, password, confirmPassword) {
  if (!username || username.length < 3) {
    return 'Username must be at least 3 characters';
  }
  
  if (!email || !email.includes('@')) {
    return 'Please enter a valid email address';
  }
  
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  
  if (confirmPassword && password !== confirmPassword) {
    return 'Passwords do not match';
  }
  
  return null;
}

async function handleGoogleSignIn() {
  try {
    if (window.google && window.google.accounts) {
      google.accounts.id.prompt();
    } else {
      // Fallback to redirect
      window.location.href = '/auth/google';
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
  }
}

function handleMicrosoftSignIn() {
  // Store current URL for return after auth
  localStorage.setItem('authReturnUrl', window.location.pathname);
  
  // Redirect to Microsoft OAuth endpoint
  window.location.href = '/auth/microsoft';
}

function handleLinkedInSignIn() {
  // Store current URL for return after auth
  localStorage.setItem('authReturnUrl', window.location.pathname);
  
  // Redirect to LinkedIn OAuth endpoint
  window.location.href = '/auth/linkedin';
}

async function checkServerStatus() {
  try {
    const response = await fetch('/auth/check-db', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Database connectivity issue');
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Database connectivity issue');
    }
    
    console.log('Database connectivity check successful');
  } catch (error) {
    console.error('Database connectivity check failed:', error);
  }
}