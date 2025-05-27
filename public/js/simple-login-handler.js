// Simple Login Handler - Email-only authentication
// No OAuth providers (Google, Microsoft, LinkedIn)

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const emailErrorElement = document.getElementById('email-error');
  
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
