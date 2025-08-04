/**
 * S3 Configuration Test Utility
 * This script helps diagnose issues with S3 configuration for image uploads
 */

document.addEventListener('DOMContentLoaded', async function() {
    console.log('S3 test script loaded');
    
    // Get the test container element
    const testContainer = document.getElementById('s3-test-container');
    if (!testContainer) {
        console.error('Test container not found');
        return;
    }
    
    // Show loading message
    testContainer.innerHTML = '<div class="loading">Testing S3 configuration...</div>';
    
    try {
        // Get token for authentication
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            testContainer.innerHTML = '<div class="alert alert-warning">Authentication required. Please <a href="/login2?returnTo=/s3-test">log in</a> to run S3 tests.</div>';
            return;
        }
        
        // Test connection to S3
        const response = await fetch('/api/test/s3-connection', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`S3 test failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('S3 connection test result:', data);
        
        // Display test results
        testContainer.innerHTML = `
            <h3>S3 Configuration Test Results</h3>
            <div class="alert ${data.success ? 'alert-success' : 'alert-danger'}">
                ${data.success ? 'S3 configuration is working correctly!' : 'S3 configuration has issues!'}
            </div>
            
            <div class="card mb-3">
                <div class="card-header">Main Region (eu-west-2)</div>
                <div class="card-body">
                    <div class="status ${data.mainRegion.success ? 'text-success' : 'text-danger'}">
                        ${data.mainRegion.success ? '✅ Connected' : '❌ Failed'}
                    </div>
                    <div class="details">
                        <strong>Bucket:</strong> ${data.mainRegion.bucket}
                    </div>
                </div>
            </div>
            
            <div class="card mb-3">
                <div class="card-header">Fallback Region (eu-north-1)</div>
                <div class="card-body">
                    <div class="status ${data.fallbackRegion.success ? 'text-success' : 'text-danger'}">
                        ${data.fallbackRegion.success ? '✅ Connected' : '❌ Failed'}
                    </div>
                    <div class="details">
                        <strong>Bucket:</strong> ${data.fallbackRegion.bucket}
                    </div>
                </div>
            </div>
            
            <div class="card mb-3">
                <div class="card-header">Credentials</div>
                <div class="card-body">
                    <div class="status ${data.credentials ? 'text-success' : 'text-danger'}">
                        ${data.credentials ? '✅ Valid' : '❌ Invalid'}
                    </div>
                </div>
            </div>
            
            ${data.testUpload ? `
            <div class="card mb-3">
                <div class="card-header">Test Upload</div>
                <div class="card-body">
                    <div class="status ${data.testUpload.success ? 'text-success' : 'text-danger'}">
                        ${data.testUpload.success ? '✅ Success' : '❌ Failed'}
                    </div>
                    ${data.testUpload.url ? `
                        <div class="test-image mt-3">
                            <p><strong>Test Image URL:</strong> ${data.testUpload.url}</p>
                            <img src="${data.testUpload.url}" 
                                 alt="Test upload" 
                                 class="img-fluid" 
                                 style="max-width: 300px"
                                 onerror="this.onerror=null; this.classList.add('image-error'); this.parentNode.innerHTML += '<p class=\'text-danger\'>Failed to load image</p>'">
                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <div class="card mb-3">
                <div class="card-header">Environment Variables</div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-2">
                                <strong>AWS_REGION:</strong> ${data.env?.AWS_REGION || 'Not set'}
                            </div>
                            <div class="mb-2">
                                <strong>AWS_BUCKET_NAME:</strong> ${data.env?.AWS_BUCKET_NAME || 'Not set'}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-2">
                                <strong>AWS_ACCESS_KEY_ID:</strong> ${data.env?.AWS_ACCESS_KEY_ID ? '***' : 'Not set'}
                            </div>
                            <div class="mb-2">
                                <strong>AWS_SECRET_ACCESS_KEY:</strong> ${data.env?.AWS_SECRET_ACCESS_KEY ? '***' : 'Not set'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mt-4">
                <h4>Actions</h4>
                <button id="run-upload-test" class="btn btn-primary mr-2">Run Upload Test</button>
                <button id="clear-cache" class="btn btn-secondary mr-2">Clear Image Cache</button>
                <button id="refresh-config" class="btn btn-info">Refresh Configuration</button>
            </div>
            
            <div id="test-result" class="mt-3"></div>
        `;
        
        // Add event listeners for the action buttons
        document.getElementById('run-upload-test').addEventListener('click', runUploadTest);
        document.getElementById('clear-cache').addEventListener('click', clearImageCache);
        document.getElementById('refresh-config').addEventListener('click', refreshConfiguration);
        
    } catch (error) {
        console.error('S3 test error:', error);
        testContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4>S3 Configuration Test Failed</h4>
                <p>${error.message}</p>
            </div>
            <div class="mt-3">
                <button id="retry-test" class="btn btn-primary">Retry Test</button>
            </div>
        `;
        
        document.getElementById('retry-test').addEventListener('click', () => {
            window.location.reload();
        });
    }
});

/**
 * Run a test to upload a test image to S3
 */
async function runUploadTest() {
    const resultEl = document.getElementById('test-result');
    resultEl.innerHTML = '<div class="loading">Running upload test...</div>';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        // Create a test file (1x1 transparent pixel)
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'test-upload.png', { type: 'image/png' });
        
        // Create form data
        const formData = new FormData();
        formData.append('testImage', file);
        
        // Upload to test endpoint
        const response = await fetch('/api/test/s3-upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Upload test failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Show result
        resultEl.innerHTML = `
            <div class="alert alert-success">
                <h4>Upload Test Successful</h4>
                <p>Test image uploaded successfully.</p>
            </div>
            <div class="card mt-3">
                <div class="card-header">Upload Details</div>
                <div class="card-body">
                    <p><strong>URL:</strong> ${data.url}</p>
                    <p><strong>Region:</strong> ${data.region}</p>
                    <p><strong>Key:</strong> ${data.key}</p>
                    <div class="mt-3">
                        <img src="${data.url}" alt="Test upload" class="img-fluid" style="max-width: 200px"
                            onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="alert alert-danger mt-2" style="display: none">Image failed to load</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Upload test error:', error);
        resultEl.innerHTML = `
            <div class="alert alert-danger">
                <h4>Upload Test Failed</h4>
                <p>${error.message}</p>
                <button class="btn btn-sm btn-outline-secondary mt-2" onclick="runUploadTest()">Try Again</button>
            </div>
        `;
    }
}

/**
 * Clear the browser's image cache
 */
function clearImageCache() {
    const resultEl = document.getElementById('test-result');
    
    // Clear image cache by forcing a reload of all images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.src && !img.src.startsWith('data:')) {
            const src = img.src;
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            setTimeout(() => {
                img.src = src + '?t=' + Date.now();
            }, 50);
        }
    });
    
    // Also clear localStorage cache if we have any
    try {
        localStorage.removeItem('imageCache');
    } catch (e) {
        // Ignore errors
    }
    
    resultEl.innerHTML = `
        <div class="alert alert-success">
            <p>Image cache cleared. Browser cache for images has been refreshed.</p>
        </div>
    `;
}

/**
 * Refresh S3 configuration on the server
 */
async function refreshConfiguration() {
    const resultEl = document.getElementById('test-result');
    resultEl.innerHTML = '<div class="loading">Refreshing configuration...</div>';
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        const response = await fetch('/api/test/refresh-s3-config', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Configuration refresh failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        resultEl.innerHTML = `
            <div class="alert alert-${data.success ? 'success' : 'warning'}">
                <h4>${data.success ? 'Configuration Refreshed' : 'Refresh Warning'}</h4>
                <p>${data.message}</p>
            </div>
            ${data.details ? `
            <div class="card mt-3">
                <div class="card-header">Details</div>
                <div class="card-body">
                    <pre>${JSON.stringify(data.details, null, 2)}</pre>
                </div>
            </div>
            ` : ''}
        `;
        
        // If successful, reload the page after a short delay
        if (data.success) {
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    } catch (error) {
        console.error('Configuration refresh error:', error);
        resultEl.innerHTML = `
            <div class="alert alert-danger">
                <h4>Configuration Refresh Failed</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}
