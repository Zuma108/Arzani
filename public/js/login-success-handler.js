/**
 * Login Success Handler
 * Call this script after successful login to ensure onboarding triggers properly
 */

// Mark that user just logged in
if (typeof sessionStorage !== 'undefined') {
  sessionStorage.setItem('justLoggedIn', 'true');
  console.log('Marked user as just logged in for onboarding check');
}

// If we're being redirected to marketplace2, add a URL parameter to help detect post-login state
if (window.location.pathname === '/marketplace2' || 
    window.location.href.includes('marketplace2')) {
  
  // Add URL parameter if not already present
  const url = new URL(window.location);
  if (!url.searchParams.has('login')) {
    url.searchParams.set('login', 'success');
    window.history.replaceState({}, '', url);
  }
  
  // Trigger onboarding check if the function is available
  setTimeout(() => {
    if (typeof window.triggerOnboardingCheck === 'function') {
      window.triggerOnboardingCheck();
    }
  }, 1000);
}

console.log('Login success handler executed');
