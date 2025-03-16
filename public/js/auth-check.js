/**
 * Adds authentication checks to navigation links
 */
document.addEventListener('DOMContentLoaded', () => {
  // Get auth token from localStorage or cookie
  const getAuthToken = () => {
    // First check localStorage
    const token = localStorage.getItem('token');
    if (token) return token;
    
    // Then try to parse from cookies
    const cookies = document.cookie.split(';')
      .map(cookie => cookie.trim().split('='))
      .reduce((acc, [name, value]) => ({...acc, [name]: value}), {});
    
    return cookies.token || null;
  };

  // Add authentication check to protected links
  const protectedLinks = [
    document.getElementById('post-business-link'),
    document.querySelector('a[href="/saved-searches"]'),
    document.querySelector('a[href="/market-trends"]'),
    document.querySelector('a[href="/history"]')
  ].filter(link => link !== null);

  // Add click event listeners to protected links
  protectedLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const token = getAuthToken();
      
      if (!token) {
        e.preventDefault();
        // Save intended destination for redirect after login
        const returnUrl = encodeURIComponent(this.getAttribute('href'));
        window.location.href = `/login2?returnTo=${returnUrl}`;
      }
    });
  });
});
