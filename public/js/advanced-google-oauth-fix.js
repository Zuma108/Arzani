/**
 * Advanced Google OAuth diagnostics and fix helper
 * This script provides additional fixes and diagnostics for Google OAuth issues
 */

(function() {
  // Store the time this script loads
  const scriptLoadTime = Date.now();
  console.log('Advanced Google OAuth diagnostics loaded at:', new Date(scriptLoadTime).toISOString());

  // Wait for page load
  window.addEventListener('load', function() {
    console.log('Window load event fired after', (Date.now() - scriptLoadTime), 'ms');
    
    // Monitor for OAuth-related errors
    let postMessageErrorsDetected = 0;
    let lastReportedTime = 0;
    
    // Set up a special handler for the notorious transform_layer_library error
    const originalPostMessage = window.postMessage;
    let postMessagePatched = false;
    
    try {
      // Only patch if window.postMessage is still the native function
      if (window.postMessage.toString().includes('[native code]')) {
        // Create a safer version of postMessage that catches errors
        window.postMessage = function(message, targetOrigin, transfer) {
          try {
            return originalPostMessage.call(this, message, targetOrigin, transfer);
          } catch (e) {
            console.warn('Caught error in postMessage:', e);
            postMessageErrorsDetected++;
            
            // Only report once per second to avoid flooding
            if (Date.now() - lastReportedTime > 1000) {
              lastReportedTime = Date.now();
              console.log('Total postMessage errors caught:', postMessageErrorsDetected);
            }
            
            // Don't throw the error to prevent breaking the OAuth flow
            return undefined;
          }
        };
        postMessagePatched = true;
        console.log('Successfully patched window.postMessage');
      }
    } catch (e) {
      console.error('Failed to patch postMessage:', e);
    }
    
    // Test for the transform_layer_library issue specifically
    function testForTransformLayerIssue() {
      try {
        // This will trigger the error if the issue exists
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const iframeWin = iframe.contentWindow;
        if (iframeWin) {
          // Try to communicate with the iframe
          iframeWin.postMessage('test', '*');
          
          // Try some operations that might fail with the transform layer
          try { iframeWin.focus(); } catch(e) {}
          try { iframeWin.blur(); } catch(e) {}
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 100);
        }
        
        return false; // No error detected
      } catch (e) {
        if (e.message && (
            e.message.includes('postMessage') || 
            e.message.includes('null') || 
            e.stack && e.stack.includes('transform_layer')
        )) {
          console.warn('Detected transform_layer/postMessage vulnerability');
          return true;
        }
        return false;
      }
    }
    
    // Test for the issue and log results
    const hasTransformLayerIssue = testForTransformLayerIssue();
    console.log('Transform layer issue detected:', hasTransformLayerIssue);
    console.log('PostMessage patched:', postMessagePatched);
    
    // Add this info to window for debugging
    window.oauthAdvancedDiagnostics = {
      scriptLoadTime,
      hasTransformLayerIssue,
      postMessagePatched,
      getPostMessageErrorCount: () => postMessageErrorsDetected,
      testForIssueAgain: testForTransformLayerIssue
    };
  });
})();
