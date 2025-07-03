document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signup-form');
  const errorElement = document.getElementById('signup-error');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const termsCheckbox = document.getElementById('terms');
  const submitButton = signupForm.querySelector('button[type="submit"]');
  
  // Password strength elements
  const strengthBar = document.getElementById('password-strength-bar');
  const strengthText = document.getElementById('password-strength-text');
  const feedbackContainer = document.getElementById('password-feedback');
  
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
  
  // Set login link href
  const loginLink = document.getElementById('login-link');
  if (loginLink) {
    loginLink.href = getBaseUrl() + '/auth/login';
  }
  
  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Function to check password strength
  const checkPasswordStrength = debounce((password) => {
    let strength = 0;
    const feedback = [];
    
    // Reset feedback container
    feedbackContainer.innerHTML = '';
    
    // If password is empty, reset the strength bar
    if (!password) {
      strengthBar.style.width = '0%';
      strengthBar.style.backgroundColor = '#e0e0e0';
      strengthText.textContent = '';
      return;
    }
    
    // Create feedback items
    const criteria = [
      { 
        id: 'length', 
        test: password.length >= 8, 
        text: '8+ characters',
        valid: password.length >= 8
      },
      { 
        id: 'uppercase', 
        test: /[A-Z]/.test(password), 
        text: 'Uppercase',
        valid: /[A-Z]/.test(password)
      },
      { 
        id: 'lowercase', 
        test: /[a-z]/.test(password), 
        text: 'Lowercase',
        valid: /[a-z]/.test(password)
      },
      { 
        id: 'number', 
        test: /[0-9]/.test(password), 
        text: 'Number',
        valid: /[0-9]/.test(password)
      },
      { 
        id: 'special', 
        test: /[^A-Za-z0-9]/.test(password), 
        text: 'Special character',
        valid: /[^A-Za-z0-9]/.test(password)
      }
    ];
    
    // Add points for length
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Add points for character types and create feedback indicators
    criteria.forEach(criterion => {
      if (criterion.test) strength += 1;
      
      // Create feedback item
      const item = document.createElement('div');
      item.className = 'feedback-item ' + (criterion.valid ? 'valid' : 'invalid');
      item.innerHTML = `
        <span class="feedback-icon">${criterion.valid ? '✓' : '✗'}</span>
        ${criterion.text}
      `;
      feedbackContainer.appendChild(item);
    });
    
    // Calculate percentage
    const percentage = Math.min(100, Math.round((strength / 7) * 100));
    
    // Update UI
    strengthBar.style.width = `${percentage}%`;
    
    // Set color based on strength
    if (percentage < 30) {
      strengthBar.style.backgroundColor = '#ff4d4d'; // Red
      strengthText.textContent = 'Weak password';
    } else if (percentage < 60) {
      strengthBar.style.backgroundColor = '#ffa64d'; // Orange
      strengthText.textContent = 'Moderate password';
    } else if (percentage < 80) {
      strengthBar.style.backgroundColor = '#ffff4d'; // Yellow
      strengthText.textContent = 'Good password';
    } else {
      strengthBar.style.backgroundColor = '#4dff4d'; // Green
      strengthText.textContent = 'Strong password';
    }
  }, 300);
  
  // Monitor password input for strength
  passwordInput.addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
  });
  
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear any previous error messages
      if (errorElement) {
        errorElement.style.display = 'none';
      }
      
      // Basic validation
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const acceptTerms = termsCheckbox ? termsCheckbox.checked : true;
      
      if (!username) {
        showError('Username is required');
        return;
      }
      
      if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
      }
      
      if (!password) {
        showError('Password is required');
        return;
      }
      
      if (termsCheckbox && !acceptTerms) {
        showError('You must accept the terms and conditions');
        return;
      }
      
      // Save the button text for restoring later
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Creating Account...';
      
      try {
        const response = await fetch('/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            email,
            password,
            acceptTerms
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create account');
        }
        
        // Success - check if verification is required
        if (data.requiresVerification && data.userId) {
          // Store email temporarily to use for resending verification if needed
          localStorage.setItem('pendingVerificationEmail', email);
          
          // Redirect to verification page with userId parameter
          window.location.href = `/verify.html?userId=${data.userId}`;
        } else {
          // For backward compatibility with old flow
          // This is the old success path where verification might not be required
          errorElement.className = 'alert alert-success';
          errorElement.innerHTML = '<strong>Account Created Successfully!</strong><p>Please check your email to verify your account.</p>';
          errorElement.style.display = 'block';
          
          // Reset form
          signupForm.reset();
          
          // Append a registered=true parameter to the URL
          const url = new URL(window.location.href);
          url.searchParams.set('registered', 'true');
          window.history.replaceState({}, '', url);
        }
      } catch (error) {
        showError(error.message || 'Failed to create account');
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    });
    
    // Add real-time validation for form fields
    usernameInput.addEventListener('blur', () => {
      const username = usernameInput.value.trim();
      const usernameError = document.getElementById('username-error');
      
      if (username && username.length < 3) {
        usernameError.style.display = 'flex';
      } else {
        usernameError.style.display = 'none';
      }
    });
    
    emailInput.addEventListener('blur', () => {
      const email = emailInput.value.trim();
      const emailError = document.getElementById('email-error');
      
      if (email && !isValidEmail(email)) {
        emailError.style.display = 'flex';
      } else {
        emailError.style.display = 'none';
      }
    });
    
    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', () => {
        const termsError = document.getElementById('terms-error');
        termsError.style.display = termsCheckbox.checked ? 'none' : 'flex';
      });
    }
    
    // Handle resend verification email
    const resendButton = document.getElementById('resend-email-btn');
    if (resendButton) {
      resendButton.addEventListener('click', async () => {
        // Get email from form or session storage
        const email = emailInput.value.trim() || sessionStorage.getItem('signupEmail');
        
        if (!email || !isValidEmail(email)) {
          showError('Please enter a valid email address to resend verification');
          return;
        }
        
        try {
          resendButton.disabled = true;
          resendButton.textContent = 'Sending...';
          
          const response = await fetch('/auth/resend-verification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ email })
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
            errorElement.className = 'alert alert-success';
            errorElement.innerHTML = '<strong>Verification Email Sent!</strong><p>Please check your inbox and spam folders.</p>';
            errorElement.style.display = 'block';
            
            // Redirect to login page after a delay
            setTimeout(() => {
              window.location.href = getBaseUrl() + '/auth/login?email=' + encodeURIComponent(email) + '&verificationSent=true';
            }, 2000);
          } else {
            throw new Error(data.message || 'Failed to send verification email');
          }
        } catch (error) {
          console.error('Resend verification error:', error);
          showError(error.message || 'Failed to send verification email. Please try again later.');
        } finally {
          resendButton.disabled = false;
          resendButton.textContent = 'Resend';
        }
      });
    }
  }
  
  // Helper function to display errors
  function showError(message) {
    if (errorElement) {
      errorElement.className = 'alert alert-danger';
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    } else {
      alert(message);
    }
  }
  
  // Email validation
  function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
  
  // If redirected back here with a registered=true parameter,
  // show the success message
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('registered') === 'true') {
    errorElement.className = 'alert alert-success';
    errorElement.innerHTML = '<strong>Account Created Successfully!</strong><p>Please check your email to verify your account.</p>';
    errorElement.style.display = 'block';
  }
});
