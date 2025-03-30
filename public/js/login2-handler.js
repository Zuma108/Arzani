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
        
        // Parse response
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          console.log('Response data received');
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 200) + '...'); // Log only first part
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
        
        // Always redirect to marketplace2 after successful login with proper domain based on environment
        window.location.href = getBaseUrl() + '/marketplace2';
        
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
      const formContainer = document.querySelector('.form-container');
      
      // Hide the login form
      loginForm.style.display = 'none';
      
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
      
      // Add event listener to the reset button
      document.getElementById('send-reset-link').addEventListener('click', async (e) => {
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
                <strong>Password Reset Email Sent!</strong>
                <p>Please check your email for instructions to set your password.</p>
              </div>
              <div class="input-wrapper" style="text-align: center; margin-top: 20px;">
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
          
          document.getElementById('try-again').addEventListener('click', () => {
            window.location.reload();
          });
        }
      });
    }
  }
  
  // Helper function to show resend verification option with improved error handling
  function showResendVerificationOption(email) {
    // Create verification section if it doesn't exist
    if (!document.getElementById('verification-section')) {
      const formContainer = document.querySelector('.form-container');
      
      // Hide the login form
      loginForm.style.display = 'none';
      
      // Create verification section
      const verificationSection = document.createElement('div');
      verificationSection.id = 'verification-section';
      verificationSection.className = 'form-container';
      verificationSection.innerHTML = `
        <div class="alert alert-warning">
          <strong>Email Verification Required</strong>
          <p>You need to verify your email before logging in. Click the button below to resend the verification email.</p>
          <p>If you've already clicked the verification link in your email, there might be a technical issue with the verification process.</p>
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
      
      // Add event listener to the resend verification button
      document.getElementById('resend-verification').addEventListener('click', async (e) => {
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
            if (data.alreadyVerified) {
              verificationSection.innerHTML = `
                <div class="alert alert-success">
                  <strong>Already Verified!</strong>
                  <p>Your email is already verified in our system.</p>
                  <p>If you're still having trouble logging in, please contact support.</p>
                </div>
                <button id="try-login-again" class="login-button">Try Login Again</button>
              `;
              
              document.getElementById('try-login-again').addEventListener('click', () => {
                loginForm.style.display = 'block';
                verificationSection.remove();
              });
            } else {
              verificationSection.innerHTML = `
                <div class="alert alert-success">
                  <strong>Verification Email Sent!</strong>
                  <p>Please check your email (including spam folder) and click on the verification link.</p>
                  <p>After clicking the link, return here to login.</p>
                </div>
                <button id="try-login-again" class="login-button" style="margin-top: 10px">Try Login Again</button>
                <div class="input-wrapper" style="text-align: center; margin-top: 20px;">
                  <a href="/auth/login" class="other-page-link">Back to Login Page</a>
                </div>
              `;
              
              document.getElementById('try-login-again').addEventListener('click', () => {
                loginForm.style.display = 'block';
                verificationSection.remove();
              });
            }
          } else {
            throw new Error(data.message || 'Failed to send verification email');
          }
        } catch (error) {
          console.error('Verification error:', error);
          verificationSection.innerHTML = `
            <div class="alert alert-danger">
              <strong>Error</strong>
              <p>${error.message || 'Failed to send verification email. Please try again later.'}</p>
            </div>
            <button id="try-again" class="login-button">Try Again</button>
            <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
              <a href="/auth/login" class="other-page-link">Back to Login</a>
            </div>
          `;
          
          document.getElementById('try-again').addEventListener('click', () => {
            window.location.reload();
          });
        }
      });
      
      // Add event listener for the "I Already Verified" button
      document.getElementById('manual-verify-attempt').addEventListener('click', async (e) => {
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
                <li>There was a technical issue with verification</li>
              </ul>
              <p>Please try these steps:</p>
              <ol>
                <li>Check your email for the verification link and click it</li>
                <li>Try refreshing this page and logging in again</li>
                <li>Request a new verification email</li>
              </ol>
            </div>
            <button id="resend-btn" class="login-button">Resend Verification Email</button>
            <button id="refresh-btn" class="login-button" style="margin-top: 10px; background-color: #5bc0de;">Refresh & Try Again</button>
            <div class="input-wrapper" style="margin-top: 20px; text-align: center;">
              <a href="/auth/login" class="other-page-link">Back to Login</a>
            </div>
          `;
          
          document.getElementById('resend-btn').addEventListener('click', async () => {
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
                alert('Verification email sent! Please check your inbox and spam folder.');
                window.location.reload();
              } else {
                throw new Error(data.message);
              }
            } catch (err) {
              alert('Error sending verification email: ' + (err.message || 'Unknown error'));
            }
          });
          
          document.getElementById('refresh-btn').addEventListener('click', () => {
            window.location.reload();
          });
        }
      });
    }
  }
  
  // Add this helper function to attempt login
  async function attemptLogin(email) {
    // Get password from the form
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember')?.checked || false;
    
    if (!password) {
      throw new Error('Password is required');
    }
    
    // Try login
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
    
    // If we get here, login succeeded
    // Store auth data
    if (data.token) {
      localStorage.setItem('token', data.token);
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      // Store token expiry
      const expiresIn = data.expiresIn || 4 * 60 * 60 * 1000;
      const expiryTime = Date.now() + expiresIn;
      localStorage.setItem('tokenExpiry', expiryTime);
      
      // Store user info
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      // Clear the email from localStorage
      localStorage.removeItem('email');
    }
    
    // Always redirect to marketplace2 with proper domain based on environment
    window.location.href = getBaseUrl() + '/marketplace2';
  }
  
  // Show success message if verification was successful
  const verified = urlParams.get('verified') === 'true';
  if (verified) {
    // Create success message element if it doesn't exist
    let successElem = document.getElementById('login-success');
    if (!successElem) {
      successElem = document.createElement('div');
      successElem.id = 'login-success';
      successElem.textContent = 'Email verified successfully! You can now log in.';
      
      // Insert at the beginning of the form container
      const formContainer = document.querySelector('.form-container');
      if (formContainer) {
        formContainer.insertBefore(successElem, formContainer.firstChild);
      }
    }
  }
  
  // If redirected from password reset
  const passwordReset = urlParams.get('passwordReset') === 'true';
  if (passwordReset) {
    let successElem = document.getElementById('login-success');
    if (!successElem) {
      successElem = document.createElement('div');
      successElem.id = 'login-success';
      successElem.textContent = 'Password reset successful! You can now log in with your new password.';
      
      const formContainer = document.querySelector('.form-container');
      if (formContainer) {
        formContainer.insertBefore(successElem, formContainer.firstChild);
      }
    }
  }
});
