document.addEventListener('DOMContentLoaded', function() {
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const resetPasswordForm = document.getElementById('reset-password-form');
  const messageElement = document.getElementById('message');
  
  // Handle forgot password form
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
      }
      
      const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      
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
          showMessage('Password reset instructions have been sent to your email address', 'success');
          forgotPasswordForm.reset();
        } else {
          showMessage(data.message || 'Failed to process request', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again later.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
  
  // Handle password reset form
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const token = new URLSearchParams(window.location.search).get('token');
      
      if (!password) {
        showMessage('Please enter a new password', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
      }
      
      if (!token) {
        showMessage('Invalid reset link', 'error');
        return;
      }
      
      const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      
      try {
        const response = await fetch('/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            password,
            token
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          showMessage('Password reset successful!', 'success');
          
          // Redirect to login after a delay
          setTimeout(() => {
            window.location.href = '/auth/login2?passwordReset=true';
          }, 2000);
        } else {
          showMessage(data.message || 'Failed to reset password', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again later.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
  }
  
  // Helper function to display messages
  function showMessage(message, type) {
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.className = 'message ' + type;
      messageElement.style.display = 'block';
      
      // Scroll to message
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(message);
    }
  }
});
