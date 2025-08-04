/**
 * Onboarding Test Script
 * Use this in the browser console to test the one-time onboarding behavior
 */

// Test functions for onboarding behavior
window.onboardingTests = {
  
  // Test 1: Check current onboarding status
  checkStatus: async function() {
    console.log('=== Onboarding Status Check ===');
    
    // Check localStorage
    const localStatus = localStorage.getItem('onboarding_completed');
    console.log('localStorage onboarding_completed:', localStatus);
    
    // Check server status
    try {
      const response = await fetch('/users/onboarding-status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('Server onboarding status:', data);
        return data;
      } else {
        console.log('Server response error:', response.status);
      }
    } catch (error) {
      console.error('Error checking server status:', error);
    }
  },
  
  // Test 2: Reset onboarding and reload
  resetAndReload: function() {
    console.log('=== Resetting Onboarding ===');
    localStorage.removeItem('onboarding_completed');
    console.log('localStorage cleared');
    console.log('Reloading page in 2 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  },
  
  // Test 3: Force show onboarding modal
  forceShow: function() {
    console.log('=== Force Showing Onboarding ===');
    if (window.showOnboarding) {
      window.showOnboarding(true);
    } else {
      console.error('showOnboarding function not available');
    }
  },
  
  // Test 4: Complete onboarding programmatically
  completeOnboarding: async function() {
    console.log('=== Completing Onboarding Programmatically ===');
    try {
      const response = await fetch('/users/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          discoverySource: 'test',
          onboardingData: { test: true, completedAt: new Date().toISOString() }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Onboarding completion result:', result);
        localStorage.setItem('onboarding_completed', 'true');
        console.log('localStorage updated');
      } else {
        console.error('Failed to complete onboarding:', response.status);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  },
  
  // Test 5: Full test cycle
  runFullTest: async function() {
    console.log('=== Running Full Onboarding Test ===');
    
    // Step 1: Check initial status
    console.log('Step 1: Initial status check');
    await this.checkStatus();
    
    // Step 2: Reset if needed
    console.log('Step 2: Reset onboarding');
    localStorage.removeItem('onboarding_completed');
    
    // Step 3: Check if modal would show
    console.log('Step 3: Check if modal would show');
    const localStatus = localStorage.getItem('onboarding_completed');
    console.log('Should show modal:', localStatus !== 'true');
    
    // Step 4: Complete onboarding
    console.log('Step 4: Complete onboarding');
    await this.completeOnboarding();
    
    // Step 5: Verify completion
    console.log('Step 5: Verify completion');
    await this.checkStatus();
    
    // Step 6: Try to show modal (should be blocked)
    console.log('Step 6: Try to show modal (should be blocked)');
    if (window.showOnboarding) {
      window.showOnboarding(); // Should be blocked
    }
    
    console.log('=== Test Complete ===');
  },
  
  // Test 6: Simulate post-login scenario
  simulatePostLogin: function() {
    console.log('=== Simulating Post-Login Scenario ===');
    
    // Reset first
    localStorage.removeItem('onboarding_completed');
    sessionStorage.setItem('justLoggedIn', 'true');
    
    // Add URL parameter
    const url = new URL(window.location);
    url.searchParams.set('login', 'success');
    window.history.replaceState({}, '', url);
    
    console.log('Post-login markers set. Triggering onboarding check...');
    
    // Trigger check if available
    if (window.triggerOnboardingCheck) {
      window.triggerOnboardingCheck();
    } else {
      console.log('triggerOnboardingCheck not available, reloading page...');
      setTimeout(() => window.location.reload(), 1000);
    }
  },
  
  // Test 7: Check timing issues
  checkTiming: function() {
    console.log('=== Checking Timing Issues ===');
    
    console.log('URL params:', new URLSearchParams(window.location.search).toString());
    console.log('SessionStorage justLoggedIn:', sessionStorage.getItem('justLoggedIn'));
    console.log('Document referrer:', document.referrer);
    console.log('localStorage onboarding_completed:', localStorage.getItem('onboarding_completed'));
    
    // Check auth state
    fetch('/users/onboarding-status', { credentials: 'include' })
      .then(response => {
        console.log('Auth check response status:', response.status);
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      })
      .then(data => {
        console.log('Auth check successful:', data);
      })
      .catch(error => {
        console.log('Auth check failed:', error);
      });
  },
};

console.log('Onboarding test functions loaded. Use:');
console.log('- onboardingTests.checkStatus() - Check current status');
console.log('- onboardingTests.resetAndReload() - Reset and reload page');
console.log('- onboardingTests.forceShow() - Force show modal');
console.log('- onboardingTests.completeOnboarding() - Mark as completed');
console.log('- onboardingTests.runFullTest() - Run complete test cycle');
console.log('- onboardingTests.simulatePostLogin() - Simulate post-login scenario');
console.log('- onboardingTests.checkTiming() - Check timing and auth state');
console.log('- onboardingTests.simulatePostLogin() - Simulate post-login scenario');
console.log('- onboardingTests.checkTiming() - Check timing issues');
