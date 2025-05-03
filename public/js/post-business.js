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
        autoProcessQueue: true, // Change to true to process uploads immediately when files are added
        uploadMultiple: false, // Upload one file at a time
        parallelUploads: 2, // Process two uploads in parallel for better performance
        maxFiles: 5,
        minFiles: 3,
        acceptedFiles: "image/*",
        maxFilesize: 5, // 5MB file size limit
        resizeWidth: 1200, // Add image resizing to reduce file size
        resizeHeight: 1200,
        resizeQuality: 0.7, // Reduce quality for smaller file sizes
        resizeMethod: 'contain',
        timeout: 120000, // Increase timeout to 2 minutes for larger uploads
        parallelChunkUploads: true,
        chunking: true, // Enable chunking for large files
        chunkSize: 1000000, // 1MB chunks
        retryChunks: true,
        retryChunksLimit: 3,
        acceptedFiles: "image/jpeg,image/png,image/jpg", // Restrict to common image formats
        addRemoveLinks: true,
        createImageThumbnails: true,
        dictDefaultMessage: "<span>Drop 3-5 images here or click to upload</span>",
        dictMaxFilesExceeded: "You can only upload up to 5 images",
        dictMinFilesExceeded: "You must upload at least 3 images",
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-AWS-Region': window.AWS_REGION || 'eu-west-2',
            'X-AWS-Bucket': window.AWS_BUCKET_NAME || 'arzani-images1'
        },
        init: function() {
            const dz = this;
            window.submitDropzone = dz; // Make it accessible for debugging
            
            // Log file count for debugging
            console.log(`Dropzone initialized with ${dz.files.length} files`);
            
            this.on("sending", function(file, xhr, formData) {
                // Always use the current token
                const currentToken = getAuthToken();
                xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
                
                // Add S3 configuration headers
                xhr.setRequestHeader('X-AWS-Region', window.AWS_REGION || 'eu-west-2');
                xhr.setRequestHeader('X-AWS-Bucket', window.AWS_BUCKET_NAME || 'arzani-images1');
                
                // Add the region and bucket to formData as well
                formData.append('awsRegion', window.AWS_REGION || 'eu-west-2');
                formData.append('awsBucket', window.AWS_BUCKET_NAME || 'arzani-images1');
                
                // Log what we're sending
                console.log(`Sending file: ${file.name}, size: ${file.size} bytes, status: ${file.status}`);
                console.log(`Using region: ${window.AWS_REGION || 'eu-west-2'}, bucket: ${window.AWS_BUCKET_NAME || 'arzani-images1'}`);
            });

            // Enhanced success handling
            this.on("success", function(file, response) {
                console.log('File uploaded successfully:', file.name, 'Status:', file.status);
                
                // Check if response is a string (might be JSON string)
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response);
                        console.log('Parsed JSON response:', response);
                    } catch (e) {
                        console.warn('Response is not JSON:', response);
                    }
                }
                
                if (response && response.success && response.url) {
                    // Store the S3 URL in the file object for later use
                    file.s3Url = response.url;
                    console.log('Assigned S3 URL to file:', file.s3Url);
                    
                    // Add a hidden field to the form with the S3 URL
                    const form = document.getElementById('postBusinessForm');
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'imageUrls[]';
                    input.value = response.url;
                    input.className = 's3-image-url';
                    form.appendChild(input);
                    
                    // Update the UI to show success
                    file.previewElement.classList.add('dz-success');
                } else {
                    console.warn('No valid URL returned in response:', response);
                }
                
                // Force a status update
                if (typeof updateUploadStatus === 'function') {
                    updateUploadStatus();
                }
            });

            // Enhanced file validation - check before upload
            this.on("addedfile", file => {
                console.log(`File added: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
                
                // Check file size before uploading
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    dz.removeFile(file);
                    alert('File too large. Maximum size is 5MB. Please compress your image before uploading.');
                    return;
                }
                
                // Validate file type more strictly
                if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
                    dz.removeFile(file);
                    alert('Only JPG and PNG images are allowed.');
                    return;
                }
                
                // Check for empty files
                if (file.size === 0) {
                    dz.removeFile(file);
                    alert('Empty file detected. Please select a valid image.');
                    return;
                }
                
                // Update message based on current file count
                updateDropzoneMessage(dz);
            });

            this.on("removedfile", file => {
                // When removing a file, also remove its hidden field if it was successfully uploaded
                if (file.s3Url) {
                    const hiddenFields = document.querySelectorAll('input.s3-image-url');
                    hiddenFields.forEach(field => {
                        if (field.value === file.s3Url) {
                            field.remove();
                        }
                    });
                }
                
                updateDropzoneMessage(dz);
            });

            this.on("maxfilesexceeded", file => {
                dz.removeFile(file);
                alert('Maximum 5 files allowed');
            });
            
            // Enhanced error handling
            this.on("error", function(file, errorMessage, xhr) {
                console.error("File upload error:", {
                    file: file.name,
                    error: errorMessage,
                    status: xhr?.status,
                    responseText: xhr?.responseText
                });
                
                let displayError = errorMessage;
                
                // Handle specific error codes
                if (xhr) {
                    if (xhr.status === 413) {
                        displayError = "File too large for server. Please compress your image or try a smaller file.";
                    } else if (xhr.status === 401) {
                        displayError = "Authentication error. Please log in again.";
                    } else if (xhr.status >= 500) {
                        displayError = "Server error. Please try again later.";
                    }
                }
                
                // Parse error if it's a string that might be JSON
                if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
                    try {
                        const parsedError = JSON.parse(errorMessage);
                        displayError = parsedError.error || parsedError.message || errorMessage;
                    } catch (e) {
                        // Not JSON, use as is or the displayError we set above
                    }
                }
                
                // Clearly mark as error
                file.status = Dropzone.ERROR;
                file.previewElement.classList.add('dz-error');
                file.uploadFailed = true;
                
                // Set an error flag on the file for later reference
                file.uploadError = displayError;
                
                // Show error on the file
                const errorDisplay = file.previewElement.querySelector('.dz-error-message span');
                if (errorDisplay) {
                    errorDisplay.textContent = displayError;
                }
                
                // Force a status update
                if (typeof updateUploadStatus === 'function') {
                    updateUploadStatus();
                }
                
                // Show error in general message area
                const errorElement = document.getElementById('errorMessage') || document.createElement('div');
                errorElement.id = 'errorMessage';
                errorElement.className = 'alert alert-danger mt-3';
                errorElement.textContent = `Error uploading ${file.name}: ${displayError}`;
                const form = document.getElementById('postBusinessForm');
                if (!document.getElementById('errorMessage')) {
                    form.prepend(errorElement);
                }
                
                // Remove file from queue after error to allow retrying
                setTimeout(() => {
                    if (file.status === Dropzone.ERROR) {
                        dz.removeFile(file);
                    }
                }, 3000);
            });
            
            // Add new handler for queuecomplete event
            this.on("queuecomplete", function() {
                console.log('All queued files processed');
                // Force a status update
                if (typeof updateUploadStatus === 'function') {
                    updateUploadStatus();
                }
            });
            
            // Handle when files are added
            this.on("addedfile", function(file) {
                console.log(`File added: ${file.name}, status: ${file.status}`);
                // Force upload to start immediately
                if (file.status !== Dropzone.UPLOADING && file.status !== Dropzone.SUCCESS) {
                    setTimeout(() => {
                        console.log(`Auto-processing file ${file.name}`);
                        dz.processFile(file);
                    }, 100);
                }
            });
        }
    });
    
    // Initialize the stock image gallery
    initializeStockImageGallery();
    
    // Add tab change event listener to handle image source switching
    document.querySelectorAll('#imageSourceTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            handleImageSourceChange(e.target.id);
        });
    });
    
    // Initialize form event listeners after we know authentication is valid
    const form = document.getElementById('postBusinessForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (form.checkValidity()) {
                handleFormSubmission();
            } else {
                e.stopPropagation();
                form.classList.add('was-validated');
            }
        });
    }
    
    // Add event listeners for valuation checks
    document.getElementById('checkValuation')?.addEventListener('click', checkValuation);
    document.getElementById('checkAdvancedValuation')?.addEventListener('click', async () => {
        const advValuationBtn = document.getElementById('checkAdvancedValuation');
        advValuationBtn.classList.add('loading');
        await checkAdvancedValuation();
        advValuationBtn.classList.remove('loading');
    });
}

// Add this variable at the top level to track submission state
let isSubmitting = false;

// Update handleFormSubmission
async function handleFormSubmission(event) {
    // Prevent multiple submissions
    if (isSubmitting) {
        return;
    }

    isSubmitting = true;
    const submitButton = document.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = 'Uploading...';
    submitButton.disabled = true;

    try {
        // Refresh token first
        const token = await verifyAndRefreshToken();
        if (!token) {
            throw new Error('Authentication required. Please log in again.');
        }

        console.log('Using authentication token for submission:', token.substring(0, 10) + '...');

        // Check if we have enough images - consider both upload and stock images
        const isGalleryMode = document.getElementById('gallery-tab').classList.contains('active');
        
        if (isGalleryMode) {
            // Check if we have enough stock images
            if (selectedStockImages.length < 3) {
                throw new Error('Please select at least 3 images from the gallery');
            }
        } else {
            // Check if we have enough uploaded images
            if (imageDropzone && imageDropzone.files.length < 3) {
                throw new Error('Please upload at least 3 images of your business');
            }
            
            // Check if any uploads are still in progress
            if (imageDropzone && imageDropzone.getUploadingFiles().length > 0) {
                throw new Error('Please wait for all images to finish uploading before submitting');
            }
        }

        // Get the form data
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        
        // Create an object to hold the data
        const submissionData = {};
        
        // Process form fields (excluding images)
        for (const [key, value] of formData.entries()) {
            if (key !== 'images') {
                submissionData[key] = value;
            }
        }
        
        // Process images based on the selected mode
        if (isGalleryMode) {
            // Use stock images
            submissionData.images = selectedStockImages.map(img => img.url);
            submissionData.useStockImages = true;
        } else {
            // Get the S3 URLs of successfully uploaded images
            if (imageDropzone && imageDropzone.files.length > 0) {
                submissionData.images = [];
                
                // Collect S3 URLs from successfully uploaded files
                let uploadedImageUrls = [];
                imageDropzone.files.forEach(file => {
                    if (file.status === "success" && file.s3Url) {
                        uploadedImageUrls.push(file.s3Url);
                    }
                });
                
                // Also collect from any hidden input fields (as backup)
                const hiddenFields = document.querySelectorAll('input.s3-image-url');
                hiddenFields.forEach(field => {
                    if (field.value && !uploadedImageUrls.includes(field.value)) {
                        uploadedImageUrls.push(field.value);
                    }
                });
                
                // Use collected URLs
                submissionData.images = uploadedImageUrls;
                
                console.log(`Submitting with ${uploadedImageUrls.length} image URLs:`, uploadedImageUrls);
            }
        }
        
        // Add S3 region information
        submissionData.awsRegion = window.AWS_REGION || 'eu-west-2';
        submissionData.awsBucket = window.AWS_BUCKET_NAME || 'arzani-images1';
        
        console.log('Submitting business data:', submissionData);
        
        // Submit the form data to the server with the token
        // Always use JSON submission for reliability
        const response = await fetch('/api/submit-business', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(submissionData)
        });

        // Check for non-200 responses
        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            
            // If the response is JSON, parse it
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
            } else {
                // If not JSON, get text and throw with status
                const errorText = await response.text();
                throw new Error(`Server returned error (${response.status}): ${errorText.substring(0, 100)}...`);
            }
        }

        // Parse the response
        const responseText = await response.text();
        console.log('Server response:', responseText);
        
        // Try to parse response as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}...`);
        }
        
        // Check for errors
        if (!data.success) {
            throw new Error(data.error || data.message || 'Failed to submit business');
        }

        // Log success information
        console.log('Business submission successful:', {
            id: data.business?.id,
            name: data.business?.business_name,
            userId: data.business?.user_id,
            images: data.business?.images
        });
        
        // Modified check - also verify the id is a number
        if (!data.business?.id || typeof data.business.id !== 'number') {
            console.error('Invalid business object in response:', data.business);
            throw new Error('No valid business ID returned from server. Please try again.');
        }

        // Redirect to marketplace
        window.location.href = '/marketplace2';

    } catch (error) {
        console.error('Error submitting business:', error);
        
        // Show error message
        const errorElement = document.getElementById('errorMessage') || 
                            document.createElement('div');
        
        if (!document.getElementById('errorMessage')) {
            errorElement.id = 'errorMessage';
            errorElement.className = 'alert alert-danger mt-3';
            const form = document.getElementById('postBusinessForm');
            form.prepend(errorElement);
        }
        
        errorElement.textContent = error.message || 'Failed to submit business. Please try again.';
        
        // Scroll to error
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
        // Re-enable submit button
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
        isSubmitting = false;
    }
}