document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const errorElement = document.getElementById('login-error');
  const emailField = document.getElementById('email');
  const passwordField = document.getElementById('password');
  
  // Check if email is provided in URL params
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  
  // Set email from URL parameters or localStorage
  if (emailField && !emailField.value) {
    if (emailParam) {
      emailField.value = emailParam;
    } else {
      const storedEmail = localStorage.getItem('email');
      if (storedEmail) {
        emailField.value = storedEmail;
      } else {
        // If no email available, redirect back to first login page
        window.location.href = '/auth/login';
      }
    }
  }
  
  // Get the base URL for redirects based on environment
  function getBaseUrl() {
    const environmentMeta = document.querySelector('meta[name="site-environment"]');
    const productionDomainMeta = document.querySelector('meta[name="production-domain"]');
    
    const isProduction = environmentMeta && environmentMeta.content === 'production';
    const productionDomain = productionDomainMeta ? productionDomainMeta.content : 'www.arzani.co.uk';
    
    if (isProduction) {
        return 'https://' + productionDomain;
    }
    
    // For development, use relative URLs
    return '';
  }
  
  // Set correct href on all login/signup links
  const loginLinks = document.querySelectorAll('a[href*="/login"]');
  const signupLinks = document.querySelectorAll('a[href*="/signup"]');
  
  loginLinks.forEach(link => {
    if (link.getAttribute('href').includes('arzani.co.uk')) return; // Already absolute
    
    const path = link.getAttribute('href').replace(/^https?:\/\/[^\/]+/, '');
    link.setAttribute('href', getBaseUrl() + path);
  });
  
  signupLinks.forEach(link => {
    if (link.getAttribute('href').includes('arzani.co.uk')) return; // Already absolute
    
    const path = link.getAttribute('href').replace(/^https?:\/\/[^\/]+/, '');
    link.setAttribute('href', getBaseUrl() + path);
  });
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear any previous error messages
      if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      }

      // Get form fields
      const email = emailField.value.trim();
      const password = passwordField.value;
      const rememberMe = document.getElementById('remember')?.checked || false;
      
      // Basic validation
      if (!email) {
        showError('Email is required. Please return to the previous step.');
        return;
      }
      
      if (!password) {
        showError('Password is required');
        return;
      }
      
      // Store the button text BEFORE the try block to keep it in scope for the finally block
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton ? submitButton.textContent : 'Login';
      
      try {
        // Show loading state
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Logging in...';
        }
        
        console.log('Sending login request for:', email);
        console.log('Request URL:', '/auth/login');
        console.log('Request method:', 'POST');
        console.log('Environment:', window.location.hostname);
        
        // Use the standard /auth/login endpoint
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            email, 
            password,
            remember: rememberMe
          }),
          // Include credentials to ensure cookies are sent with the request
          credentials: 'same-origin'
        });
        
        console.log('Login response status:', response.status);
        console.log('Login response headers:', Object.fromEntries(response.headers.entries()));
        
        // Parse response
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log('Response data received:', data);
        } else {
          const text = await response.text();
          console.error('Non-JSON response content type:', contentType);
          console.error('Non-JSON response text:', text.substring(0, 500) + '...'); // Log more content
          throw new Error('Server returned invalid response format');
        }
        
        if (!response.ok) {
          // Handle specific error cases
          if (data.requiresReset) {
            // This is a special case where the account exists but needs password reset
            showPasswordResetOption(email);
            throw new Error(data.message || 'Password reset required');
          } else if (data.verificationRequired) {
            // Email verification required
            showResendVerificationOption(email);
            throw new Error(data.message || 'Email verification required');
          } else {
            throw new Error(data.message || data.error || 'Login failed with status ' + response.status);
          }
        }
        
        if (data.success === false) {
          throw new Error(data.message || 'Login failed');
        }
          // Store authentication data
        if (data.token) {
          localStorage.setItem('token', data.token);
          
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          
          // Store token expiry (default to 4 hours if not specified)
          const expiresIn = data.expiresIn || 4 * 60 * 60 * 1000; // 4 hours in milliseconds
          const expiryTime = Date.now() + expiresIn;
          localStorage.setItem('tokenExpiry', expiryTime);
          
          // Store basic user info if available
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
          
          // Clear the email from localStorage since we've completed login
          localStorage.removeItem('email');
        }
        
        // Use server-provided redirect URL or fall back to marketplace2
        const redirectTo = data.redirectTo || getBaseUrl() + '/marketplace2';
        console.log('Regular login successful, redirecting to:', redirectTo);
        
        // Redirect to the appropriate URL
        window.location.href = redirectTo;
        
      } catch (error) {
        console.error('Login error:', error);
        
        // Don't show generic error if we're showing a special message already
        if (!document.getElementById('password-reset-section') && 
            !document.getElementById('verification-section')) {
          
          // Handle specific error messages more user-friendly
          if (error.message.includes('Invalid account configuration') || 
              error.message.includes('Password reset required')) {
            showError('This account needs setup. Please use the "Forgot Password" option below.');
          } else if (error.message.includes('Invalid email or password')) {
            showError('Incorrect email or password. Please try again.');
          } else {
            showError(error.message || 'Login failed. Please try again.');
          }
        }
      } finally {
        // Restore button state - originalButtonText is now in scope
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      }
    });
  }
  
  // Helper function to display errors
  function showError(message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      
      // Scroll to error message for better visibility
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(message);
    }
  }

  // Helper function to display password reset option
  function showPasswordResetOption(email) {
    // Create reset section if it doesn't exist
    if (!document.getElementById('password-reset-section')) {
      // Use the login form's parent as the container, or fallback to body
      const formContainer = loginForm ? loginForm.parentElement : document.body;
      
      if (!formContainer) {
        console.error('Could not find container for password reset section');
        return;
      }
      
      // Hide the login form
      if (loginForm) {
        loginForm.style.display = 'none';
      }
      
      // Create reset section
      const resetSection = document.createElement('div');
      resetSection.id = 'password-reset-section';
      resetSection.className = 'form-container';
      resetSection.innerHTML = `
        <div class="alert alert-warning">
          <strong>Account Setup Required</strong>
          <p>Your account needs to be set up with a password. Click the button below to send a password reset link to your email.</p>
        </div>
        <div class="input-wrapper">
          <input class="input-field" type="email" id="reset-email" value="${email}" readonly>
          <label class="label-field" for="reset-email">Email</label>
        </div>
        <button id="send-reset-link" class="login-button">Send Password Reset Link</button>
        <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
          <a href="/auth/login" class="other-page-link">Back to Login</a>
        </div>
      `;
      
      formContainer.appendChild(resetSection);
      
      // Add event listener to the reset button with null check
      const resetButton = document.getElementById('send-reset-link');
      if (resetButton) {
        resetButton.addEventListener('click', async (e) => {
          e.preventDefault();
          e.target.disabled = true;
          e.target.textContent = 'Sending...';
          
          try {
            const response = await fetch('/auth/forgot-password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resetSection.innerHTML = `
                <div class="alert alert-success">
                  <strong>Email Sent!</strong>
                  <p>A password reset link has been sent to your email address. Please check your inbox and follow the instructions.</p>
                </div>
                <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
                  <a href="/auth/login" class="other-page-link">Back to Login</a>
                </div>
              `;
            } else {
              throw new Error(data.message || 'Failed to send reset email');
            }
          } catch (error) {
            console.error('Reset error:', error);
            resetSection.innerHTML = `
              <div class="alert alert-danger">
                <strong>Error</strong>
                <p>${error.message || 'Failed to send password reset email. Please try again later.'}</p>
              </div>
              <button id="try-again" class="login-button">Try Again</button>
              <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
                <a href="/auth/login" class="other-page-link">Back to Login</a>
              </div>
            `;
            
            const tryAgainButton = document.getElementById('try-again');
            if (tryAgainButton) {
              tryAgainButton.addEventListener('click', () => {
                window.location.reload();
              });
            }
          }
        });
      }
    }
  }

  // Helper function to show resend verification option with improved error handling
  function showResendVerificationOption(email) {
    // Create verification section if it doesn't exist
    if (!document.getElementById('verification-section')) {
      // Use the login form's parent as the container, or fallback to body
      const formContainer = loginForm ? loginForm.parentElement : document.body;
      
      if (!formContainer) {
        console.error('Could not find container for verification section');
        return;
      }
      
      // Hide the login form
      if (loginForm) {
        loginForm.style.display = 'none';
      }
      
      // Create verification section
      const verificationSection = document.createElement('div');
      verificationSection.id = 'verification-section';
      verificationSection.className = 'form-container';
      verificationSection.innerHTML = `
        <div class="alert alert-warning">
          <strong>Email Verification Required</strong>
          <p>You need to verify your email before logging in. Click the button below to resend the verification email.</p>
        </div>
        <div class="input-wrapper">
          <input class="input-field" type="email" id="verification-email" value="${email}" readonly>
          <label class="label-field" for="verification-email">Email</label>
        </div>
        <button id="resend-verification" class="login-button">Resend Verification Email</button>
        <button id="manual-verify-attempt" class="login-button" style="margin-top: 10px; background-color: #5bc0de;">I Already Verified My Email</button>
        <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
          <a href="/auth/login" class="other-page-link">Back to Login</a>
        </div>
      `;
      
      formContainer.appendChild(verificationSection);
      
      // Add event listener to the resend verification button with null check
      const resendButton = document.getElementById('resend-verification');
      if (resendButton) {
        resendButton.addEventListener('click', async (e) => {
          e.preventDefault();
          e.target.disabled = true;
          e.target.textContent = 'Sending...';
          
          try {
            const response = await fetch('/auth/resend-verification', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
              verificationSection.innerHTML = `
                <div class="alert alert-success">
                  <strong>Verification Email Sent!</strong>
                  <p>A new verification email has been sent to your address. Please check your inbox and click the verification link.</p>
                </div>
                <button id="try-login-again" class="login-button">Try Login Again</button>
                <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
                  <a href="/auth/login" class="other-page-link">Back to Login</a>
                </div>
              `;
              
              const tryLoginButton = document.getElementById('try-login-again');
              if (tryLoginButton) {
                tryLoginButton.addEventListener('click', () => {
                  if (loginForm) {
                    loginForm.style.display = 'block';
                  }
                  verificationSection.remove();
                });
              }
            } else {
              verificationSection.innerHTML = `
                <div class="alert alert-danger">
                  <strong>Error</strong>
                  <p>${data.message || 'Failed to send verification email. Please try again later.'}</p>
                </div>
                <button id="try-login-again" class="login-button">Try Login Again</button>
                <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
                  <a href="/auth/login" class="other-page-link">Back to Login</a>
                </div>
              `;
              
              const tryLoginButton = document.getElementById('try-login-again');
              if (tryLoginButton) {
                tryLoginButton.addEventListener('click', () => {
                  if (loginForm) {
                    loginForm.style.display = 'block';
                  }
                  verificationSection.remove();
                });
              }
            }
          } catch (error) {
            console.error('Verification error:', error);
            verificationSection.innerHTML = `
              <div class="alert alert-danger">
                <strong>Error</strong>
                <p>Failed to send verification email. Please try again later.</p>
              </div>
              <button id="try-again" class="login-button">Try Again</button>
              <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
                <a href="/auth/login" class="other-page-link">Back to Login</a>
              </div>
            `;
            
            const tryAgainButton = document.getElementById('try-again');
            if (tryAgainButton) {
              tryAgainButton.addEventListener('click', () => {
                window.location.reload();
              });
            }
          }
        });
      }
      
      // Add event listener for the "I Already Verified" button with null check
      const manualVerifyButton = document.getElementById('manual-verify-attempt');
      if (manualVerifyButton) {
        manualVerifyButton.addEventListener('click', async (e) => {
          e.preventDefault();
          e.target.disabled = true;
          e.target.textContent = 'Checking...';
          
          try {
            // Try the login again - the server may recognize the verification now
            await attemptLogin(email);
          } catch (error) {
            console.error('Manual verification check failed:', error);
            
            // Show helpful message
            verificationSection.innerHTML = `
              <div class="alert alert-info">
                <strong>Verification Issue</strong>
                <p>We're still seeing your account as unverified. This could happen if:</p>
                <ul>
                  <li>You recently clicked the verification link (it can take a few minutes)</li>
                  <li>The verification link has expired</li>
                  <li>Check your spam folder</li>
                </ul>
                <p>Please try one of the options below:</p>
              </div>
              <button id="resend-btn" class="login-button">Resend Verification Email</button>
              <button id="refresh-btn" class="login-button" style="margin-top: 10px; background-color: #5bc0de;">Refresh & Try Again</button>
              <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
                <a href="/auth/login" class="other-page-link">Back to Login</a>
              </div>
            `;
            
            const resendBtn = document.getElementById('resend-btn');
            if (resendBtn) {
              resendBtn.addEventListener('click', async () => {
                try {
                  const response = await fetch('/auth/resend-verification', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email })
                  });
                  
                  const data = await response.json();
                  if (data.success) {
                    alert('Verification email sent successfully!');
                  } else {
                    throw new Error(data.message || 'Failed to send verification email');
                  }
                } catch (err) {
                  alert('Error sending verification email: ' + (err.message || 'Unknown error'));
                }
              });
            }
            
            const refreshBtn = document.getElementById('refresh-btn');
            if (refreshBtn) {
              refreshBtn.addEventListener('click', () => {
                window.location.reload();
              });
            }
          }
        });
      }
    }
  }

  // Add this helper function to attempt login
  async function attemptLogin(email) {
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember')?.checked || false;
    
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password,
        remember: rememberMe
      }),
      credentials: 'same-origin'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }
    
    if (data.success === false) {
      throw new Error(data.message || 'Login failed');
    }
    
    // Store authentication data
    if (data.token) {
      localStorage.setItem('token', data.token);
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      const expiresIn = data.expiresIn || 4 * 60 * 60 * 1000;
      const expiryTime = Date.now() + expiresIn;
      localStorage.setItem('tokenExpiry', expiryTime);
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      localStorage.removeItem('email');
    }
    
    const redirectTo = data.redirectTo || getBaseUrl() + '/marketplace2';
    window.location.href = redirectTo;
  }

  // Handle post-reset success message
  if (window.location.search.includes('resetSuccess=true')) {
    let successElem = document.getElementById('login-success');
    
    if (!successElem) {
      successElem = document.createElement('div');
      successElem.id = 'login-success';
      successElem.textContent = 'Password reset successful! You can now log in with your new password.';
      
      const formContainer = loginForm ? loginForm.parentElement : document.body;
      if (formContainer) {
        formContainer.insertBefore(successElem, formContainer.firstChild);
      }
    }
  }
});
