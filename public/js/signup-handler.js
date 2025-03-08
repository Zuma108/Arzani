document.addEventListener('DOMContentLoaded', function() {
  const signupForm = document.getElementById('signup-form');
  const errorElement = document.getElementById('signup-error');
  
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Clear any previous error messages
      if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      }

      // Get form fields
      const username = document.getElementById('username')?.value?.trim();
      const email = document.getElementById('email')?.value?.trim();
      const password = document.getElementById('password')?.value;
      const confirmPassword = document.getElementById('confirm-password')?.value;
      const termsCheckbox = document.getElementById('terms');
      
      // Validate inputs
      if (!username || username.length < 3) {
        showError('Username must be at least 3 characters long');
        return;
      }
      
      if (!email || !isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
      }
      
      if (!password || password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
      }
      
      if (confirmPassword && password !== confirmPassword) {
        showError('Passwords do not match');
        return;
      }
      
      if (termsCheckbox && !termsCheckbox.checked) {
        showError('You must agree to the Terms & Conditions');
        return;
      }
      
      try {
        // Show loading state
        const submitButton = signupForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        // Send signup request
        const response = await fetch('/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username, email, password })
        });
        
        // Parse response
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to create account');
        }
        
        // Success - show message
        signupForm.innerHTML = `
          <div class="success-message">
            <h3>Account Created Successfully!</h3>
            <p>${data.message || 'Please check your email to verify your account.'}</p>
            <p>You will be redirected to the login page in a few seconds...</p>
          </div>
        `;
        
        // Redirect after a delay
        setTimeout(() => {
          window.location.href = '/auth/login?registered=true&email=' + encodeURIComponent(email);
        }, 3000);
        
      } catch (error) {
        console.error('Signup error:', error);
        showError(error.message || 'Failed to create account. Please try again.');
      } finally {
        // Restore button state if still exists
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Create Account';
        }
      }
    });
    
    // Add password visibility toggle functionality
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
      button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        if (passwordInput) {
          const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
          passwordInput.setAttribute('type', type);
          
          // Toggle eye icon if using Font Awesome icons
          const icon = this.querySelector('i');
          if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
          }
        }
      });
    });
  }
  
  // Helper function to display errors
  function showError(message) {
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
      
      // Scroll to error message
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(message);
    }
  }
  
  // Email validation
  function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
});
