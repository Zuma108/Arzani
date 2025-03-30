/**
 * Auth Token Synchronization
 * Ensures consistent token handling between different pages
 */

(function() {
  // Run immediately
  syncAuthToken();
  
  // Function to synchronize auth token
  function syncAuthToken() {
    // Get token from various sources
    const localStorageToken = localStorage.getItem('token');
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    const cookieToken = getCookie('token');
    
    // Store the best token (prioritize localStorage > meta > cookie)
    const bestToken = localStorageToken || metaToken || cookieToken;
    
    if (bestToken) {
      // Ensure all storage methods have the token
      if (!localStorageToken && bestToken) {
        localStorage.setItem('token', bestToken);
        console.log('AuthSync: Stored token to localStorage');
      }
      
      if (!cookieToken && bestToken) {
        document.cookie = `token=${bestToken}; path=/; max-age=14400`; // 4 hours
        console.log('AuthSync: Stored token to cookie');
      }
      
      // Log debug info
      console.log('AuthSync: Token synchronized', {
        hadLocalStorage: !!localStorageToken,
        hadMeta: !!metaToken,
        hadCookie: !!cookieToken
      });
    }
  }
  
  // Helper to get a cookie by name
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }
  
  // Run when page visibility changes (from other tabs)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      syncAuthToken();
    }
  });
  
  // Expose function globally
  window.syncAuthToken = syncAuthToken;
})();
