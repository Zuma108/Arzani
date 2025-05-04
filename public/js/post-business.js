// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Post business page loaded');
    
    // Add immediate auth check to prevent even trying to load if not authenticated
    if (!getAuthToken()) {
        console.error('No authentication token found, redirecting to login');
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
    }
    
    // Log auth debug info
    console.log('Auth debug info:', {
        hasTokenInput: !!document.getElementById('auth-token'),
        tokenInputValue: document.getElementById('auth-token')?.value,
        localStorageToken: localStorage.getItem('token'),
        cookieToken: getCookie('token')
    });
    
    // Get S3 configuration if available
    const s3ConfigEl = document.getElementById('s3-config');
    if (s3ConfigEl) {
        try {
            const config = JSON.parse(s3ConfigEl.textContent);
            window.AWS_REGION = config.region || 'eu-west-2'; // Default to London region
            window.AWS_BUCKET_NAME = config.bucketName || 'arzani-images1';
            console.log('Using S3 config:', { region: window.AWS_REGION, bucket: window.AWS_BUCKET_NAME });
        } catch (e) {
            console.error('Failed to parse S3 config:', e);
            // Set defaults if parsing fails
            window.AWS_REGION = 'eu-west-2'; // London region
            window.AWS_BUCKET_NAME = 'arzani-images1';
        }
    } else {
        // Set defaults if config element is missing
        window.AWS_REGION = 'eu-west-2'; // London region
        window.AWS_BUCKET_NAME = 'arzani-images1';
        console.log('No S3 config found, using defaults:', { region: window.AWS_REGION, bucket: window.AWS_BUCKET_NAME });
    }
    
    // Get token from various sources
    let token = getAuthToken();
    if (!token) {
        // Try to extract token from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token');
        if (token) {
            // Store token in localStorage for future requests
            localStorage.setItem('token', token);
            console.log('Token found in URL and saved to localStorage');
            
            // Clean URL
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }
    
    // If we still don't have a token, redirect to login
    if (!token) {
        console.log('No authentication token found, redirecting to login');
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
    }

    try {
        // Make verification mandatory - use our debug endpoint
        console.log('Verifying token...');
        const response = await fetch('/api/token-debug/', { // Note the trailing slash to be safe
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Token verification failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('Token verification result:', data);
        
        if (data.authHeader.status !== 'valid') {
            throw new Error('Invalid token: ' + data.authHeader.status);
        }
        
        console.log('Token verified successfully for user:', data.authHeader.userId);
        
        // Initialize form now that we have a valid token
        initializeForm(token);
        
        // Initialize Google Maps with proper error handling
        initializeGoogleMaps();
        
    } catch (error) {
        console.error('Authentication check failed:', error);
        // Clear invalid tokens
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // Redirect to login
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}&error=invalid_token`;
    }
});

// Helper function to initialize Google Maps with error handling
function initializeGoogleMaps() {
    // If Google Maps already initialized via callback, don't do it again
    if (window.googleMapsLoaded) {
        console.log('Google Maps already initialized via callback');
        return;
    }
    
    // If we're in a known error state, don't try again
    if (window.mapsApiState && window.mapsApiState.error) {
        console.log('Maps API has already failed with error:', window.mapsApiState.error);
        enableManualLocationEntry();
        return;
    }
    
    // Check if Google Maps API is loaded
    if (typeof google !== 'undefined' && google.maps) {
        console.log('Google Maps API loaded successfully');
        
        try {
            // Check specifically for Places API
            if (google.maps.places && google.maps.places.Autocomplete) {
                console.log('Places API available, initializing autocomplete');
                initializeLocationAutocomplete();
            } else {
                console.warn('Places API not available despite Maps API loading');
                document.getElementById('maps-error').textContent = 
                    'Google Places API not activated. Please enable it in your Google Cloud Console.';
                document.getElementById('maps-error').style.display = 'block';
                enableManualLocationEntry();
            }
        } catch (error) {
            console.error('Error initializing location autocomplete:', error);
            document.getElementById('maps-error').style.display = 'block';
            enableManualLocationEntry();
        }
    } else {
        console.warn('Google Maps API not available. Location autocomplete will be disabled.');
        document.getElementById('maps-error').style.display = 'block';
        enableManualLocationEntry();
    }
}

// Helper function for enabling manual location entry when maps fails
function enableManualLocationEntry() {
    const locationInput = document.getElementById('location');
    if (locationInput) {
        locationInput.setAttribute('placeholder', 'Enter location manually (e.g., London, UK)');
        locationInput.removeAttribute('readonly');
        // Optional: Add a class to style the input differently
        locationInput.classList.add('manual-entry');
    }
}

// Helper function to initialize location autocomplete with Google Places API
function initializeLocationAutocomplete() {
    const locationInput = document.getElementById('location');
    if (!locationInput) {
        console.error('Location input not found');
        return;
    }

    console.log('Setting up location autocomplete');
    try {
        const autocomplete = new google.maps.places.Autocomplete(locationInput, {
            types: ['(cities)'],
            componentRestrictions: { country: 'gb' }
        });

        autocomplete.addListener('place_changed', function() {
            const place = autocomplete.getPlace();
            console.log('Place selected:', place.formatted_address);
            
            // Optional: Store latitude and longitude if needed
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                console.log(`Selected location coordinates: ${lat}, ${lng}`);
                
                // You could store these in hidden fields if needed
                // document.getElementById('latitude').value = lat;
                // document.getElementById('longitude').value = lng;
            }
        });
    } catch (error) {
        console.error('Failed to initialize autocomplete:', error);
        enableManualLocationEntry();
    }
}

// Helper function to get authentication token from any available source
function getAuthToken() {
    // First check hidden input field in the page
    const tokenInput = document.getElementById('auth-token');
    if (tokenInput && tokenInput.value) {
        console.log('Found token in hidden input field');
        return tokenInput.value;
    }
    
    // Try localStorage
    const localToken = localStorage.getItem('token');
    if (localToken) {
        console.log('Found token in localStorage');
        return localToken;
    }
    
    // Then try sessionStorage
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) {
        console.log('Found token in sessionStorage');
        return sessionToken;
    }
    
    // Finally try cookie
    const cookieToken = getCookie('token');
    if (cookieToken) {
        console.log('Found token in cookie');
        return cookieToken;
    }
    
    return null;
}

// Helper function to get a cookie value by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function initializeForm(token) {
    console.log('Initializing form with valid token');
    
    // Update Dropzone configuration with enhanced error handling
    imageDropzone = new Dropzone("#imageDropzone", {
        url: "/api/s3-upload", // Use dedicated S3 upload endpoint
        autoProcessQueue: true, 
        uploadMultiple: false,
        parallelUploads: 2,
        maxFiles: 5,
        minFiles: 3,
        acceptedFiles: "image/*",
        maxFilesize: 5, // 5MB
        addRemoveLinks: true,
        createImageThumbnails: true,
        dictDefaultMessage: "<span>Drop 3-5 images here or click to upload</span>",
        dictMaxFilesExceeded: "You can only upload up to 5 images",
        dictMinFilesExceeded: "You must upload at least 3 images",
        dictFileTooBig: "File is too large ({{filesize}}MB). Max size: {{maxFilesize}}MB.",
        dictRemoveFile: "Remove",
        
        // New: Custom preview template to make errors more manageable
        previewTemplate: `
            <div class="dz-preview dz-file-preview">
                <div class="dz-image">
                    <img data-dz-thumbnail />
                </div>
                <div class="dz-details">
                    <div class="dz-size"><span data-dz-size></span></div>
                    <div class="dz-filename"><span data-dz-name></span></div>
                </div>
                <div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
                <div class="dz-error-message"><span data-dz-errormessage></span></div>
                <div class="dz-success-mark">
                    <svg width="54px" height="54px" viewBox="0 0 54 54">
                        <circle cx="27" cy="27" r="25" fill="none" stroke="#71BF43" stroke-width="4"></circle>
                        <path fill="#71BF43" d="M22,38.5 L13.5,30 L16.5,27 L22,32.5 L37.5,17 L40.5,20 L22,38.5 Z"></path>
                    </svg>
                </div>
                <div class="dz-error-mark">
                    <svg width="54px" height="54px" viewBox="0 0 54 54">
                        <circle cx="27" cy="27" r="25" fill="none" stroke="#DF5D5D" stroke-width="4"></circle>
                        <path fill="#DF5D5D" d="M34.5,20.5 L33.5,19.5 L27,26 L20.5,19.5 L19.5,20.5 L26,27 L19.5,33.5 L20.5,34.5 L27,28 L33.5,34.5 L34.5,33.5 L28,27 L34.5,20.5 Z"></path>
                    </svg>
                </div>
                <div class="dz-action-buttons">
                    <button type="button" class="btn btn-sm btn-danger dz-remove" data-dz-remove>Remove</button>
                </div>
            </div>
        `,
        
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-AWS-Region': window.AWS_REGION || 'eu-west-2',
            'X-AWS-Bucket': window.AWS_BUCKET_NAME || 'arzani-images1'
        },
        init: function() {
            const dz = this;
            window.submitDropzone = dz;
            
            // Log file count for debugging
            console.log(`Dropzone initialized with ${dz.files.length} files`);
            
            this.on("sending", function(file, xhr, formData) {
                // ...existing code...
            });

            // Enhanced success handling
            this.on("success", function(file, response) {
                // ...existing code...
            });

            // New: Add file validation before it gets added to the queue
            this.on("addedfile", file => {
                console.log(`File added: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
                
                // Create a clear and immediate way to validate files
                let isValid = true;
                let errorMessage = '';
                
                // Validate file type more strictly
                if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/i)) {
                    isValid = false;
                    errorMessage = 'Only JPG, PNG, GIF and WebP images are allowed.';
                }
                
                // Validate file size with customized UI handling
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    isValid = false;
                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    errorMessage = `File is too large (${sizeMB}MB). Maximum size is 5MB.`;
                    
                    // Add a class to make the error more visible but compact
                    file.previewElement.classList.add('dz-error');
                    file.previewElement.classList.add('dz-size-error');
                    
                    // Add a clear error message
                    const errorDisplay = file.previewElement.querySelector('.dz-error-message span');
                    if (errorDisplay) {
                        errorDisplay.textContent = errorMessage;
                    }
                    
                    // Make the remove button more visible
                    const removeButton = file.previewElement.querySelector('[data-dz-remove]');
                    if (removeButton) {
                        removeButton.style.display = 'block';
                        removeButton.textContent = 'Remove Oversized File';
                        removeButton.classList.add('btn-block');
                    }
                    
                    // No need to call removeFile here, just mark it as rejected
                    file.status = Dropzone.REJECTED;
                    file.rejected = true;
                    
                    // Show user friendly message in status area
                    updateUploadStatus();
                    
                    // Prevent default error handling
                    return;
                }
                
                // Check for empty files
                if (file.size === 0) {
                    isValid = false;
                    errorMessage = 'Empty file detected. Please select a valid image.';
                }
                
                // If file is invalid but not caught by the size check above
                if (!isValid) {
                    dz.removeFile(file);
                    
                    // Show user-friendly error in a toast or status area instead of alert
                    const uploadStatus = document.getElementById('uploadStatus');
                    if (uploadStatus) {
                        const errorElement = document.createElement('div');
                        errorElement.className = 'alert alert-danger alert-dismissible fade show';
                        errorElement.innerHTML = `
                            <strong>Error:</strong> ${errorMessage}
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                        uploadStatus.appendChild(errorElement);
                        
                        // Auto-dismiss after 5 seconds
                        setTimeout(() => {
                            errorElement.classList.remove('show');
                            setTimeout(() => errorElement.remove(), 150);
                        }, 5000);
                    }
                    return;
                }
                
                // Update message based on current file count
                updateDropzoneMessage(dz);
            });

            this.on("removedfile", file => {
                updateDropzoneMessage(dz);
                updateUploadStatus();
            });

            this.on("maxfilesexceeded", file => {
                // Instead of alert, use our status area
                const uploadStatus = document.getElementById('uploadStatus');
                if (uploadStatus) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'alert alert-warning alert-dismissible fade show';
                    errorElement.innerHTML = `
                        <strong>Maximum Files:</strong> You can only upload up to 5 images. 
                        The file "${file.name}" was not added.
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    `;
                    uploadStatus.appendChild(errorElement);
                    
                    // Auto-dismiss after 5 seconds
                    setTimeout(() => {
                        errorElement.classList.remove('show');
                        setTimeout(() => errorElement.remove(), 150);
                    }, 5000);
                }
                
                // Remove the file but don't show an alert
                dz.removeFile(file);
            });

            // Enhanced error handling
            this.on("error", function(file, errorMessage, xhr) {
                console.error("File upload error:", {
                    file: file.name,
                    error: errorMessage,
                    status: xhr?.status,
                    responseText: xhr?.responseText
                });
                
                // Parse error if it's a string that might be JSON
                if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
                    try {
                        const parsedError = JSON.parse(errorMessage);
                        errorMessage = parsedError.error || parsedError.message || errorMessage;
                    } catch (e) {
                        // Not JSON, use as is
                    }
                }
                
                // For oversized files, handle specially
                if (errorMessage.includes('File is too large')) {
                    // Add a class to style the error differently
                    file.previewElement.classList.add('dz-size-error');
                    
                    // Make the remove button more prominent
                    const removeButton = file.previewElement.querySelector('[data-dz-remove]');
                    if (removeButton) {
                        removeButton.classList.add('btn-block');
                        removeButton.textContent = 'Remove Oversized File';
                    }
                }
                
                // Clearly mark as error
                file.status = Dropzone.ERROR;
                file.previewElement.classList.add('dz-error');
                file.uploadFailed = true;
                
                // Set an error flag on the file for later reference
                file.uploadError = errorMessage;
                
                // Show error on the file
                const errorDisplay = file.previewElement.querySelector('.dz-error-message span');
                if (errorDisplay) {
                    // Make error messages more compact
                    let shortError = errorMessage;
                    if (shortError.length > 50) {
                        shortError = shortError.substring(0, 50) + '...';
                    }
                    errorDisplay.textContent = shortError;
                    
                    // Add tooltip for full error
                    errorDisplay.title = errorMessage;
                }
                
                // Force a status update
                if (typeof updateUploadStatus === 'function') {
                    updateUploadStatus();
                }
            });
            
            // ...existing code...
        }
    });
    
    // ...existing code...
}

// Update the upload status function to handle errors better
function updateUploadStatus() {
    const uploadStatusElement = document.getElementById('uploadStatus');
    if (!uploadStatusElement) return;
    
    // Get all successfully uploaded files
    const successfulUploads = imageDropzone.files.filter(file => 
        file.status === "success" && file.s3Url).length;
    
    // Get all failed uploads
    const failedUploads = imageDropzone.files.filter(file => 
        file.status === "error" || file.uploadFailed || file.rejected).length;
    
    // Get all in-progress uploads
    const inProgressUploads = imageDropzone.files.filter(file => 
        file.status === "uploading").length;
    
    // Get rejected files specifically (too large, wrong format)
    const rejectedFiles = imageDropzone.files.filter(file => 
        file.status === Dropzone.REJECTED).length;
    
    // Create status message
    let statusHTML = '';
    
    // First show information about rejected files if any
    if (rejectedFiles > 0) {
        statusHTML += `<div class="alert alert-warning">
            <strong>Attention:</strong> ${rejectedFiles} file${rejectedFiles !== 1 ? 's' : ''} cannot be uploaded.
            <button type="button" class="btn btn-sm btn-warning ms-2" id="clear-rejected-files">
                Remove Problem Files
            </button>
        </div>`;
    }
    
    if (successfulUploads < 3) {
        // Not enough images yet
        statusHTML += `<div class="alert alert-warning">
            <strong>More images needed:</strong> ${successfulUploads} of 3 minimum required images uploaded.
            ${inProgressUploads > 0 ? `<br>${inProgressUploads} upload${inProgressUploads !== 1 ? 's' : ''} in progress...` : ''}
            ${failedUploads > 0 ? `<br><span class="text-danger">${failedUploads} upload${failedUploads !== 1 ? 's' : ''} failed. Please try again or remove problem files.</span>` : ''}
        </div>`;
    } else {
        // Enough images
        statusHTML += `<div class="alert alert-success">
            <strong>Ready to submit:</strong> ${successfulUploads} images successfully uploaded.
            ${inProgressUploads > 0 ? `<br>${inProgressUploads} more upload${inProgressUploads !== 1 ? 's' : ''} in progress...` : ''}
        </div>`;
    }
    
    uploadStatusElement.innerHTML = statusHTML;
    
    // Add click handler for clearing rejected files
    const clearButton = document.getElementById('clear-rejected-files');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            // Get all rejected files
            const rejectedFiles = imageDropzone.files.filter(file => 
                file.status === Dropzone.REJECTED || file.rejected);
            
            // Remove them one by one
            rejectedFiles.forEach(file => {
                imageDropzone.removeFile(file);
            });
            
            // Update status
            updateUploadStatus();
        });
    }
    
    // Disable or enable submit button based on image count
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
        const isGalleryMode = document.getElementById('gallery-tab').classList.contains('active');
        const hasEnoughImages = isGalleryMode ? 
            (selectedStockImages.length >= 3) : 
            (successfulUploads >= 3 && inProgressUploads === 0);
        
        submitButton.disabled = !hasEnoughImages;
        
        if (!hasEnoughImages) {
            submitButton.title = "Please upload at least 3 images before submitting";
        } else {
            submitButton.title = "";
        }
    }
}

// ...existing code...