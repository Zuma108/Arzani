/**
 * Marketplace Debugging Tools
 * This script provides functions to diagnose marketplace issues
 */

// Check business listings API directly
async function debugBusinessListings() {
  console.log('Running business listings debug...');
  const debugOutput = document.getElementById('debug-output');
  if (debugOutput) {
    debugOutput.innerHTML = 'Running business listings check...';
  }
  
  try {
    // Check normal API
    const response = await fetch('/api/business/listings?page=1&limit=3');
    
    if (!response.ok) {
      throw new Error(`Listings API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Regular API response:', data);
    console.log('Businesses count:', data.businesses?.length || 0);
    
    let output = `<p>Found ${data.businesses?.length || 0} businesses</p>`;
    
    if (data.businesses && data.businesses.length > 0) {
      const firstBusiness = data.businesses[0];
      console.log('First business:', firstBusiness);
      
      output += `<p>Sample business: ${firstBusiness.business_name}</p>`;
      
      // Check image URLs
      if (firstBusiness.images && Array.isArray(firstBusiness.images)) {
        output += `<p>Image array length: ${firstBusiness.images.length}</p>`;
        
        // Show the raw image data
        output += `<p>Raw images: ${JSON.stringify(firstBusiness.images)}</p>`;
        
        // Check for non-string values
        const nonStringImages = firstBusiness.images.filter(img => typeof img !== 'string');
        if (nonStringImages.length > 0) {
          output += `<p style="color:red">⚠️ Found ${nonStringImages.length} non-string images!</p>`;
        }
        
        // Filter and use only string images
        const validImages = firstBusiness.images.filter(img => typeof img === 'string');
        if (validImages.length > 0) {
          const image = validImages[0];
          console.log('First valid image:', image);
          
          output += `<p>Testing image: ${image}</p>`;
          
          // Test image loading for both regions
          const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
          const westUrl = `https://${bucket}.s3.eu-west-2.amazonaws.com/businesses/${firstBusiness.id}/${image}`;
          const northUrl = `https://${bucket}.s3.eu-north-1.amazonaws.com/businesses/${firstBusiness.id}/${image}`;
          
          output += `<p>West URL: ${westUrl}</p>`;
          output += `<p>North URL: ${northUrl}</p>`;
          
          // Create test images (invisible)
          output += `<div id="test-images" style="display:none"></div>`;
          
          // We'll update these statuses after the fetch
          output += `<p id="west-status">West region: Testing...</p>`;
          output += `<p id="north-status">North region: Testing...</p>`;
        } else {
          output += `<p style="color:red">No valid string images found!</p>`;
        }
      } else {
        output += `<p>No images found or images not an array</p>`;
      }
      
      // Check processed images if available
      if (firstBusiness.processedImages && Array.isArray(firstBusiness.processedImages)) {
        output += `<p>Processed images: ${firstBusiness.processedImages.length}</p>`;
        output += `<p>First processed URL: ${firstBusiness.processedImages[0]}</p>`;
      } else {
        output += `<p style="color:orange">No processed images found</p>`;
      }
    }
    
    // Update debug panel
    if (debugOutput) {
      debugOutput.innerHTML = output;
      
      // Now test the images if we created the container
      const testImagesDiv = document.getElementById('test-images');
      if (testImagesDiv && data.businesses?.[0]?.images) {
        // Only use string images
        const validImages = data.businesses[0].images.filter(img => typeof img === 'string');
        if (validImages.length > 0) {
          const image = validImages[0];
          const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
          const businessId = data.businesses[0].id;
          
          // Test west region
          const westUrl = `https://${bucket}.s3.eu-west-2.amazonaws.com/businesses/${businessId}/${image}`;
          const westImg = new Image();
          westImg.onload = () => {
            document.getElementById('west-status').innerHTML = 
              '<p style="color:green">West region: SUCCESS ✅</p>';
          };
          westImg.onerror = () => {
            document.getElementById('west-status').innerHTML = 
              '<p style="color:red">West region: FAILED ❌</p>';
          };
          westImg.src = westUrl;
          testImagesDiv.appendChild(westImg);
          
          // Test north region
          const northUrl = `https://${bucket}.s3.eu-north-1.amazonaws.com/businesses/${businessId}/${image}`;
          const northImg = new Image();
          northImg.onload = () => {
            document.getElementById('north-status').innerHTML = 
              '<p style="color:green">North region: SUCCESS ✅</p>';
          };
          northImg.onerror = () => {
            document.getElementById('north-status').innerHTML = 
              '<p style="color:red">North region: FAILED ❌</p>';
          };
          northImg.src = northUrl;
          testImagesDiv.appendChild(northImg);
        }
      }
    }
    
    // Check debug API
    try {
      const debugResponse = await fetch('/api/debug/business/listings');
      
      if (!debugResponse.ok) {
        throw new Error(`Debug API returned status ${debugResponse.status}`);
      }
      
      const debugData = await debugResponse.json();
      console.log('Debug API response:', debugData);
      
      if (debugOutput) {
        debugOutput.innerHTML += `<hr><h5>Debug API Results:</h5>`;
        debugOutput.innerHTML += `<p>S3 Region: ${debugData.s3Config?.region || 'Not set'}</p>`;
        debugOutput.innerHTML += `<p>S3 Bucket: ${debugData.s3Config?.bucket || 'Not set'}</p>`;
        debugOutput.innerHTML += `<p>Has Access Key: ${debugData.s3Config?.hasAccessKey ? 'Yes' : 'No'}</p>`;
        
        if (debugData.sampleBusinesses?.length) {
          debugOutput.innerHTML += `<p>Sample businesses: ${debugData.sampleBusinesses.length}</p>`;
          
          // Add a test button for the first business
          const firstBusiness = debugData.sampleBusinesses[0];
          if (firstBusiness && firstBusiness.originalImages?.length) {
            const validImages = firstBusiness.originalImages.filter(img => typeof img === 'string');
            if (validImages.length > 0) {
              debugOutput.innerHTML += `
                <button class="btn btn-sm btn-primary" onclick="debugMarketplace.testImage('${firstBusiness.id}', '${validImages[0]}')">
                  Test First Image
                </button>
              `;
            }
          }
        }
      }
    } catch (debugError) {
      console.error('Debug API error:', debugError);
      if (debugOutput) {
        debugOutput.innerHTML += `<hr><p style="color:red">Debug API error: ${debugError.message}</p>`;
      }
    }
    
  } catch (error) {
    console.error('Debug process failed:', error);
    if (debugOutput) {
      debugOutput.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    }
  }
}

// Check S3 configuration
async function checkS3Config() {
  console.log('Checking S3 configuration...');
  const debugOutput = document.getElementById('debug-output');
  if (debugOutput) {
    debugOutput.innerHTML = 'Checking S3 configuration...';
  }
  
  try {
    const response = await fetch('/api/s3-debug');
    
    if (!response.ok) {
      throw new Error(`S3 debug API returned status ${response.status}`);
    }
    
    const config = await response.json();
    console.log('S3 configuration:', config);
    
    // Update window globals
    window.AWS_REGION = config.region;
    window.AWS_BUCKET_NAME = config.bucketName;
    window.AWS_ALTERNATE_REGIONS = config.alternateRegions || ['eu-north-1'];
    
    if (debugOutput) {
      let output = `
        <h5>S3 Configuration</h5>
        <p><strong>Region:</strong> ${config.region || 'Not set'}</p>
        <p><strong>Bucket:</strong> ${config.bucketName || 'Not set'}</p>
        <p><strong>Has Access Key:</strong> ${config.hasAccessKey ? 'Yes' : 'No'}</p>
        <p><strong>Has Secret Key:</strong> ${config.hasSecretKey ? 'Yes' : 'No'}</p>
        <p><strong>Alternate Regions:</strong> ${JSON.stringify(config.alternateRegions || ['eu-north-1'])}</p>
        <p><strong>Example URL:</strong> ${config.exampleUrl || 'Not provided'}</p>
      `;
      
      // Add test buttons
      output += `
        <div class="mt-3">
          <button class="btn btn-sm btn-primary" onclick="debugMarketplace.testS3Connection()">
            Test S3 Connection
          </button>
        </div>
      `;
      
      debugOutput.innerHTML = output;
    }
    
    return config;
  } catch (error) {
    console.error('Failed to fetch S3 configuration:', error);
    
    if (debugOutput) {
      debugOutput.innerHTML = `
        <p style="color:red">Error fetching S3 config: ${error.message}</p>
        <p>Using fallback configuration:</p>
        <p><strong>Region:</strong> eu-west-2</p>
        <p><strong>Bucket:</strong> arzani-images1</p>
        <p><strong>Alternate Regions:</strong> ["eu-north-1"]</p>
        
        <div class="alert alert-warning mt-3">
          <strong>Troubleshooting steps:</strong>
          <ol>
            <li>Check that the /api/s3-debug endpoint is properly defined in server.js</li>
            <li>Verify that your .env file has AWS_REGION and AWS_BUCKET_NAME</li>
            <li>Make sure you're running the latest server code</li>
          </ol>
        </div>
      `;
    }
    
    // Set fallback values
    window.AWS_REGION = 'eu-west-2';
    window.AWS_BUCKET_NAME = 'arzani-images1';
    window.AWS_ALTERNATE_REGIONS = ['eu-north-1'];
    
    return {
      region: 'eu-west-2',
      bucketName: 'arzani-images1',
      alternateRegions: ['eu-north-1'],
      error: error.message
    };
  }
}

// Test S3 connection
async function testS3Connection() {
  const debugOutput = document.getElementById('debug-output');
  if (debugOutput) {
    debugOutput.innerHTML += '<p>Testing S3 connection...</p>';
  }
  
  const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
  const regions = [window.AWS_REGION || 'eu-west-2', 'eu-north-1'];
  
  // Create a test image path - just testing if the bucket exists
  const testUrl = `https://${bucket}.s3.${regions[0]}.amazonaws.com/test-connection.jpg`;
  
  try {
    const response = await fetch(testUrl, { method: 'HEAD', mode: 'no-cors' });
    
    if (debugOutput) {
      debugOutput.innerHTML += '<p style="color:green">S3 connection successful ✅</p>';
    }
    
    return true;
  } catch (error) {
    console.error('S3 connection test failed:', error);
    
    if (debugOutput) {
      debugOutput.innerHTML += '<p style="color:red">S3 connection failed ❌</p>';
      debugOutput.innerHTML += `<p>Error: ${error.message}</p>`;
    }
    
    return false;
  }
}

// Try to load a business image with retry logic
function testImage(businessId, imagePath) {
  if (!businessId || !imagePath) {
    console.error('Missing parameters for image test');
    return;
  }
  
  console.log(`Testing image: Business #${businessId}, Image: ${imagePath}`);
  
  const debugOutput = document.getElementById('debug-output');
  if (debugOutput) {
    debugOutput.innerHTML = `
      <h5>Image Test</h5>
      <p><strong>Business ID:</strong> ${businessId}</p>
      <p><strong>Image Path:</strong> ${imagePath}</p>
      <div id="image-test-results">Testing...</div>
    `;
  }
  
  const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
  
  // Try west region
  const westUrl = `https://${bucket}.s3.eu-west-2.amazonaws.com/businesses/${businessId}/${imagePath}`;
  const westImg = new Image();
  westImg.width = 100;
  westImg.style.margin = '5px';
  westImg.onload = () => {
    console.log('West region image loaded successfully');
    const results = document.getElementById('image-test-results');
    if (results) {
      results.innerHTML = `
        <p style="color:green">West region: SUCCESS ✅</p>
        <img src="${westUrl}" style="max-width: 200px; max-height: 200px; border: 1px solid #ccc;">
      `;
    }
  };
  westImg.onerror = () => {
    console.log('West region image failed to load');
    
    // Try north region as fallback
    const northUrl = `https://${bucket}.s3.eu-north-1.amazonaws.com/businesses/${businessId}/${imagePath}`;
    const northImg = new Image();
    northImg.width = 100;
    northImg.style.margin = '5px';
    northImg.onload = () => {
      console.log('North region image loaded successfully');
      const results = document.getElementById('image-test-results');
      if (results) {
        results.innerHTML = `
          <p style="color:red">West region: FAILED ❌</p>
          <p style="color:green">North region: SUCCESS ✅</p>
          <img src="${northUrl}" style="max-width: 200px; max-height: 200px; border: 1px solid #ccc;">
        `;
      }
    };
    northImg.onerror = () => {
      console.log('North region image failed to load');
      const results = document.getElementById('image-test-results');
      if (results) {
        results.innerHTML = `
          <p style="color:red">West region: FAILED ❌</p>
          <p style="color:red">North region: FAILED ❌</p>
          <p>Both regions failed to load the image. The image may not exist or there may be permissions issues.</p>
          <p>URLs tested:</p>
          <ul>
            <li>${westUrl}</li>
            <li>${northUrl}</li>
          </ul>
        `;
      }
    };
    northImg.src = northUrl;
  };
  westImg.src = westUrl;
}

// Initialize debugging
function initDebugging() {
  console.log('Initializing marketplace debugging tools...');
  
  // Add these functions to window for console access
  window.debugMarketplace = {
    checkListings: debugBusinessListings,
    checkS3: checkS3Config,
    testImage: testImage,
    testS3Connection: testS3Connection
  };
  
  // Run S3 config check automatically
  checkS3Config().then(config => {
    console.log('S3 config initialized:', config);
  });
}

// Run when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Debug tools loaded');
  initDebugging();
  
  // Add debug panel if it doesn't exist
  if (!document.getElementById('debug-panel')) {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.display = 'none';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.background = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.maxWidth = '400px';
    debugPanel.style.maxHeight = '70vh';
    debugPanel.style.overflow = 'auto';
    
    debugPanel.innerHTML = `
      <h4>Marketplace Debug</h4>
      <div id="debug-output">Loading debug info...</div>
      <div class="mt-2">
        <button class="btn btn-sm btn-primary" onclick="debugMarketplace.checkListings()">Check Listings</button>
        <button class="btn btn-sm btn-info" onclick="debugMarketplace.checkS3()">Check S3</button>
        <button class="btn btn-sm btn-secondary" onclick="document.getElementById('debug-panel').style.display='none'">Close</button>
      </div>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Add keyboard shortcut
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
      }
    });
  }
});

// Automatically run the business listings debug after a short delay
setTimeout(function() {
  // Only run auto-debugger in development environment
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    debugBusinessListings();
  }
}, 2000);
