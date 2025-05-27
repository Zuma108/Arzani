/**
 * Manual Console Test for Google OAuth Fix
 * 
 * This script can be pasted in the browser console to verify the Google OAuth fix.
 * Access the browser console by pressing F12 or Ctrl+Shift+I while on the login page.
 */

(function() {
  console.clear();
  console.log('%c Google OAuth Fix Test Suite ', 'background: #4285F4; color: white; font-size: 16px; padding: 10px;');
  console.log('%c Run these tests on the login page to verify the fix ', 'background: #34A853; color: white; padding: 5px;');
  
  // Test 1: Check if debug script is loaded
  const test1 = {
    name: 'Debug Script Loaded',
    run: function() {
      return typeof window.googleOAuthDebug !== 'undefined';
    },
    errorMessage: 'Debug script not loaded. Make sure debug-google-oauth.js is included before Google API.'
  };
  
  // Test 2: Check if fix script is loaded
  const test2 = {
    name: 'Fix Script Loaded', 
    run: function() {
      return typeof window._patchedGoogleOneTap !== 'undefined';
    },
    errorMessage: 'Fix script not loaded or not working. Make sure google-oauth-fix.js is included before Google API.'
  };
  
  // Test 3: Check if Google API is loaded
  const test3 = {
    name: 'Google API Loaded',
    run: function() {
      return typeof window.google !== 'undefined' && 
             typeof window.google.accounts !== 'undefined';
    },
    errorMessage: 'Google API not loaded. Check network connection and content blockers.'
  };
  
  // Test 4: Check if popup is allowed
  const test4 = {
    name: 'Popup Allowed',
    run: function() {
      try {
        const popup = window.open('', '_blank', 'width=1,height=1');
        const isPopupAllowed = popup !== null;
        if (popup) popup.close();
        return isPopupAllowed;
      } catch (e) {
        return false;
      }
    },
    errorMessage: 'Popups are blocked. Please allow popups for this site in your browser settings.'
  };
  
  // Test 5: Check if we're in an iframe
  const test5 = {
    name: 'Not in iframe',
    run: function() {
      return window.self === window.top;
    },
    errorMessage: 'Page is running in an iframe, which can cause OAuth issues.'
  };
  
  // Run all tests
  const tests = [test1, test2, test3, test4, test5];
  const results = tests.map(test => {
    const passed = test.run();
    return {
      name: test.name,
      passed,
      message: passed ? 'PASSED' : 'FAILED: ' + test.errorMessage
    };
  });
  
  // Display results
  console.log('\n%c Test Results ', 'background: #333; color: white; padding: 5px;');
  results.forEach((result, i) => {
    if (result.passed) {
      console.log(`%c ✓ ${i+1}. ${result.name} `, 'color: green; font-weight: bold;');
    } else {
      console.log(`%c ✗ ${i+1}. ${result.name} `, 'color: red; font-weight: bold;');
      console.log(`   ${result.message}`);
    }
  });
  
  const overallPassed = results.every(r => r.passed);
  
  console.log('\n%c Summary ', 'background: #333; color: white; padding: 5px;');
  if (overallPassed) {
    console.log('%c All tests passed! The fix appears to be properly implemented. ', 'color: green; font-weight: bold;');
    console.log('Continue with testing the actual Google Sign-In button.');
  } else {
    console.log('%c Some tests failed. Please fix the issues before proceeding. ', 'color: red; font-weight: bold;');
  }
  
  console.log('\n%c Additional Diagnostics ', 'background: #333; color: white; padding: 5px;');
  console.log('Run these commands for more information:');
  console.log('%c googleOAuthDebug.getInfo() ', 'background: #eee; padding: 3px;', '- Show detailed debug info');
  console.log('%c googleOAuthDebug.detectIssues() ', 'background: #eee; padding: 3px;', '- List detected issues');
  console.log('%c googleOAuthDebug.checkPopup() ', 'background: #eee; padding: 3px;', '- Test popup functionality');
  
  return {
    results,
    overallPassed
  };
})();
