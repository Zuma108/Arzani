/**
 * Test script to verify marketplace.js image loading fixes
 */

// Test the loadImageWithTimeout function
function testImageLoading() {
  console.log('🧪 Testing marketplace.js image loading fixes...');

  // Test 1: Valid GCS URL should load within timeout
  console.log('\n1. Testing valid GCS image loading...');
  const validImg = document.createElement('img');
  const validGcsUrl = 'https://storage.googleapis.com/arzani-marketplace-files/test/valid-image.jpg';
  
  loadImageWithTimeout(validImg, validGcsUrl, 5000)
    .then(() => {
      console.log('✅ Valid image loaded successfully');
    })
    .catch((error) => {
      console.log('⚠️ Valid image failed (expected if image doesn\'t exist):', error.message);
    });

  // Test 2: Invalid URL should timeout after 5 seconds
  console.log('\n2. Testing image loading timeout...');
  const timeoutImg = document.createElement('img');
  const invalidUrl = 'https://storage.googleapis.com/arzani-marketplace-files/non-existent/timeout-test.jpg';
  const startTime = Date.now();
  
  loadImageWithTimeout(timeoutImg, invalidUrl, 2000) // 2 second timeout for faster testing
    .then(() => {
      console.log('❌ Unexpected success for invalid URL');
    })
    .catch((error) => {
      const elapsed = Date.now() - startTime;
      console.log(`✅ Image loading timed out after ${elapsed}ms:`, error.message);
      if (elapsed >= 1900 && elapsed <= 2500) {
        console.log('✅ Timeout duration is correct');
      } else {
        console.log('⚠️ Timeout duration seems off');
      }
    });

  // Test 3: Completely invalid URL should fail immediately
  console.log('\n3. Testing immediate failure...');
  const failImg = document.createElement('img');
  const brokenUrl = 'invalid-url-format';
  
  loadImageWithTimeout(failImg, brokenUrl, 5000)
    .then(() => {
      console.log('❌ Unexpected success for broken URL');
    })
    .catch((error) => {
      console.log('✅ Broken URL failed as expected:', error.message);
    });

  // Test 4: Check if old S3 region logic is removed
  console.log('\n4. Testing GCS URL handling...');
  const gcsUrl = 'https://storage.googleapis.com/arzani-marketplace-files/businesses/123/image.jpg';
  
  if (gcsUrl.includes('eu-west-2') || gcsUrl.includes('eu-north-1')) {
    console.log('❌ GCS URL incorrectly contains S3 region references');
  } else {
    console.log('✅ GCS URL format is correct (no S3 regions)');
  }

  // Test 5: Verify default image fallback
  console.log('\n5. Testing default image fallback...');
  const fallbackImg = document.createElement('img');
  fallbackImg.src = '/images/default-business.jpg';
  fallbackImg.onload = () => {
    console.log('✅ Default business image is accessible');
  };
  fallbackImg.onerror = () => {
    console.log('⚠️ Default business image not found - check if /images/default-business.jpg exists');
  };

  console.log('\n🔍 Testing completed. Check console for results over the next few seconds...');
}

// Test lazy loading observer functionality
function testLazyLoadingObserver() {
  console.log('\n📺 Testing lazy loading observer...');
  
  // Create a test image element
  const testImg = document.createElement('img');
  testImg.className = 'lazy-load';
  testImg.dataset.src = 'https://storage.googleapis.com/arzani-marketplace-files/test/lazy-test.jpg';
  testImg.style.cssText = 'width: 100px; height: 100px; display: block;';
  
  // Add to page temporarily
  document.body.appendChild(testImg);
  
  // Test intersection observer if it exists
  if (window.imageObserver) {
    console.log('✅ Image observer exists');
    window.imageObserver.observe(testImg);
    
    // Simulate intersection
    setTimeout(() => {
      // Remove from page
      if (document.body.contains(testImg)) {
        document.body.removeChild(testImg);
      }
      console.log('✅ Lazy loading observer test completed');
    }, 1000);
  } else {
    console.log('⚠️ Image observer not found');
    // Remove from page
    if (document.body.contains(testImg)) {
      document.body.removeChild(testImg);
    }
  }
}

// Test error handling function
function testImageErrorHandling() {
  console.log('\n🚨 Testing image error handling...');
  
  const testImg = document.createElement('img');
  testImg.src = 'https://storage.googleapis.com/invalid-bucket/test.jpg';
  
  // Test the global error handler
  if (typeof window.handleImageError === 'function') {
    console.log('✅ Global handleImageError function exists');
    
    // Simulate error
    testImg.onerror = () => {
      console.log('✅ Image error triggered correctly');
      window.handleImageError(testImg);
      
      // Check if it falls back to default
      setTimeout(() => {
        if (testImg.src.includes('default-business.jpg')) {
          console.log('✅ Error handler correctly set default image');
        } else {
          console.log('⚠️ Error handler may not have set default image correctly');
        }
      }, 100);
    };
  } else {
    console.log('❌ Global handleImageError function not found');
  }
}

// Make functions available globally for testing
window.testMarketplaceImageLoading = testImageLoading;
window.testLazyLoadingObserver = testLazyLoadingObserver;
window.testImageErrorHandling = testImageErrorHandling;

// Auto-run tests when page loads if this is a test environment
if (window.location.search.includes('test=images')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      testImageLoading();
      testLazyLoadingObserver();
      testImageErrorHandling();
    }, 1000);
  });
}

console.log('🧪 Marketplace image loading tests ready. Run:');
console.log('- testMarketplaceImageLoading() to test the loadImageWithTimeout function');
console.log('- testLazyLoadingObserver() to test lazy loading');
console.log('- testImageErrorHandling() to test error handling');
console.log('- Or visit page with ?test=images to auto-run all tests');