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
        maxFilesize: 5,
        addRemoveLinks: true,
        createImageThumbnails: true,
        dictDefaultMessage: "<span>Drop 3-5 images here or click to upload</span>",
        dictMaxFilesExceeded: "You can only upload up to 5 images",
        dictMinFilesExceeded: "You must upload at least 3 images",
        dictFileTooBig: "Image is too large ({{filesize}}MB). Max size: {{maxFilesize}}MB.",
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
                console.log('S3 upload response:', response);
                
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

            // Enhanced file validation
            this.on("addedfile", file => {
                console.log(`File added: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
                
                // Pre-validate file type and size before upload attempt
                let errorMessage = null;
                
                // Validate file type more strictly
                if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
                    errorMessage = 'Only JPG and PNG images are allowed.';
                }
                // Validate file size
                else if (file.size > 5 * 1024 * 1024) { // 5MB
                    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                    errorMessage = `File too large (${fileSizeMB}MB). Maximum size is 5MB.`;
                }
                // Check for empty files
                else if (file.size === 0) {
                    errorMessage = 'Empty file detected. Please select a valid image.';
                }
                
                // Handle validation errors
                if (errorMessage) {
                    // Create a friendly error message on the preview
                    file.previewElement.classList.add('dz-error');
                    
                    // Find error message element
                    const errorElement = file.previewElement.querySelector('.dz-error-message span');
                    if (errorElement) {
                        errorElement.textContent = errorMessage;
                    }
                    
                    // Add a custom error UI with easy-to-click remove button
                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'custom-remove-button';
                    removeBtn.innerHTML = '×';
                    removeBtn.title = 'Remove file';
                    removeBtn.style.position = 'absolute';
                    removeBtn.style.top = '5px';
                    removeBtn.style.right = '5px';
                    removeBtn.style.backgroundColor = '#f44336';
                    removeBtn.style.color = 'white';
                    removeBtn.style.borderRadius = '50%';
                    removeBtn.style.width = '20px';
                    removeBtn.style.height = '20px';
                    removeBtn.style.textAlign = 'center';
                    removeBtn.style.lineHeight = '20px';
                    removeBtn.style.cursor = 'pointer';
                    removeBtn.style.zIndex = '999';
                    
                    // Add click event to remove the file
                    removeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dz.removeFile(file);
                    });
                    
                    // Add the button to preview
                    file.previewElement.appendChild(removeBtn);
                    
                    // Let the file get created in the UI, then remove it after a short delay
                    setTimeout(() => {
                        // Don't remove automatically - let user click on the button instead
                        // But tell them what's wrong
                        const errorBoxElement = document.createElement('div');
                        errorBoxElement.className = 'custom-error-message';
                        errorBoxElement.innerHTML = errorMessage;
                        errorBoxElement.style.backgroundColor = '#ffebee';
                        errorBoxElement.style.color = '#d32f2f';
                        errorBoxElement.style.padding = '6px';
                        errorBoxElement.style.margin = '6px';
                        errorBoxElement.style.borderRadius = '4px';
                        errorBoxElement.style.fontSize = '12px';
                        errorBoxElement.style.textAlign = 'center';
                        
                        // Insert after the thumbnail
                        const thumbnailElement = file.previewElement.querySelector('.dz-image');
                        if (thumbnailElement && thumbnailElement.parentNode) {
                            thumbnailElement.parentNode.insertBefore(errorBoxElement, thumbnailElement.nextSibling);
                        } else {
                            file.previewElement.appendChild(errorBoxElement);
                        }
                    }, 10);
                    
                    return;
                }
                
                // Update message based on current file count
                updateDropzoneMessage(dz);
            });

            this.on("removedfile", file => {
                updateDropzoneMessage(dz);
            });

            this.on("maxfilesexceeded", file => {
                dz.removeFile(file);
                alert('Maximum 5 files allowed');
            });

            // Enhanced success handling
            this.on("success", function(file, response) {
                console.log('File uploaded successfully:', file.name);
                if (response && response.images && response.images.length > 0) {
                    // Find the matching image URL for this file
                    const imageUrl = response.images.find(url => url.includes(file.name.replace(/[^a-zA-Z0-9.-]/g, '_')));
                    file.s3url = imageUrl || response.images[0];
                    console.log('Assigned S3 URL:', file.s3url);
                } else {
                    console.warn('No image URLs returned in response:', response);
                }
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
                
                // Clearly mark as error
                file.status = Dropzone.ERROR;
                file.previewElement.classList.add('dz-error');
                file.uploadFailed = true;
                
                // Set an error flag on the file for later reference
                file.uploadError = errorMessage;
                
                // Show error on the file
                const errorDisplay = file.previewElement.querySelector('.dz-error-message span');
                if (errorDisplay) {
                    errorDisplay.textContent = errorMessage;
                }
                
                // Add a custom error UI with easy-to-click remove button
                const removeBtn = document.createElement('div');
                removeBtn.className = 'custom-remove-button';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove file';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '5px';
                removeBtn.style.right = '5px';
                removeBtn.style.backgroundColor = '#f44336';
                removeBtn.style.color = 'white';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '20px';
                removeBtn.style.height = '20px';
                removeBtn.style.textAlign = 'center';
                removeBtn.style.lineHeight = '20px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.zIndex = '999';
                
                // Add click event to remove the file
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dz.removeFile(file);
                });
                
                // Add the button to preview
                if (file.previewElement && !file.previewElement.querySelector('.custom-remove-button')) {
                    file.previewElement.appendChild(removeBtn);
                }
                
                // Force a status update
                if (typeof updateUploadStatus === 'function') {
                    updateUploadStatus();
                }
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

// Add these new functions for stock image handling
const selectedStockImages = [];
const MAX_SELECTED_IMAGES = 5;

// Function to initialize the stock image gallery
function initializeStockImageGallery() {
    const stockImagesContainer = document.getElementById('stock-images-container');
    if (!stockImagesContainer) return;
    
    // Define stock images (these URLs should point to your pre-uploaded S3 images)
    const stockImages = [
        { id: 'stock1', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_1.jpg', title: 'Stock Image 1' },
        { id: 'stock2', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_2.jpg', title: 'Stock Image 2' },
        { id: 'stock3', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_3.jpg', title: 'Stock Image 3' },
        { id: 'stock4', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_4.png', title: 'Stock Image 4' },
        { id: 'stock5', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_5.jpg', title: 'Stock Image 5' },
        { id: 'stock6', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_6.jpg', title: 'Stock Image 6' },
        { id: 'stock7', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_7.jpeg', title: 'Stock Image 7' },
        { id: 'stock8', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_8.jpg', title: 'Stock Image 8' },
        { id: 'stock9', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_9.jpg', title: 'Stock Image 9' },
        { id: 'stock10', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_10.jpg', title: 'Stock Image 10' },
        { id: 'stock11', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_11.jpg', title: 'Stock Image 11' },
        { id: 'stock12', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_12.jpg', title: 'Stock Image 12' },
        { id: 'stock13', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_13.png', title: 'Stock Image 13' },
        { id: 'stock14', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_14.png', title: 'Stock Image 14' },
        { id: 'stock15', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_15.jpg', title: 'Stock Image 15' },
        { id: 'stock16', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_16.jpg', title: 'Stock Image 16' },
        { id: 'stock17', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_17.jpg', title: 'Stock Image 17' },
        { id: 'stock18', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_18.jpg', title: 'Stock Image 18' },
        { id: 'stock19', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_19.jpg', title: 'Stock Image 19' },
        { id: 'stock20', url: 'https://arzani-images1.s3.eu-west-2.amazonaws.com/stock/business_20.jpg', title: 'Stock Image 20' }
    ];
    
    // Clear loading message
    stockImagesContainer.innerHTML = '';
    
    // Generate stock image elements
    stockImages.forEach(image => {
        const imageElement = document.createElement('div');
        imageElement.className = 'stock-image-item';
        imageElement.dataset.id = image.id;
        imageElement.dataset.url = image.url;
        imageElement.innerHTML = `
            <img src="${image.url}" alt="${image.title}" title="${image.title}">
            <div class="selection-overlay">✓</div>
        `;
        
        // Add click handler to select/deselect image
        imageElement.addEventListener('click', () => toggleStockImageSelection(image));
        
        stockImagesContainer.appendChild(imageElement);
    });
    
    // Initialize the selection display area
    updateSelectedImagesDisplay();
}

// Function to toggle selection of a stock image
function toggleStockImageSelection(image) {
    const imageElement = document.querySelector(`.stock-image-item[data-id="${image.id}"]`);
    
    // Check if this image is already selected
    const isSelected = selectedStockImages.some(img => img.id === image.id);
    
    if (isSelected) {
        // Remove from selection
        const index = selectedStockImages.findIndex(img => img.id === image.id);
        if (index !== -1) {
            selectedStockImages.splice(index, 1);
        }
        imageElement?.classList.remove('selected');
    } else {
        // Add to selection if not at max
        if (selectedStockImages.length < MAX_SELECTED_IMAGES) {
            selectedStockImages.push(image);
            imageElement?.classList.add('selected');
        } else {
            alert(`You can only select up to ${MAX_SELECTED_IMAGES} images.`);
            return;
        }
    }
    
    // Update the selected images display
    updateSelectedImagesDisplay();
}

// Function to update the selected images display
function updateSelectedImagesDisplay() {
    const selectedImagesContainer = document.getElementById('selectedImagesContainer');
    const selectedImageCount = document.getElementById('selectedImageCount');
    const noSelectedImagesMsg = document.getElementById('noSelectedImagesMsg');
    
    // Update count
    selectedImageCount.textContent = selectedStockImages.length;
    
    // Show/hide empty message
    if (selectedStockImages.length === 0) {
        noSelectedImagesMsg.style.display = 'block';
        return;
    } else {
        noSelectedImagesMsg.style.display = 'none';
    }
    
    // Clear container except for the message
    Array.from(selectedImagesContainer.children)
        .filter(child => child !== noSelectedImagesMsg)
        .forEach(child => child.remove());
    
    // Add selected images
    selectedStockImages.forEach((image, index) => {
        const imageElement = document.createElement('div');
        imageElement.className = 'selected-image-item';
        imageElement.innerHTML = `
            <img src="${image.url}" alt="${image.title || 'Image ' + (index+1)}">
            <button type="button" class="remove-btn" data-id="${image.id}">×</button>
        `;
        
        // Add click handler to remove button
        imageElement.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStockImageSelection(image);
        });
        
        selectedImagesContainer.appendChild(imageElement);
    });
    
    // Add hidden fields for each selected stock image
    updateHiddenImageFields();
}

// Function to update hidden image fields in the form
function updateHiddenImageFields() {
    // Remove any existing stock image fields
    document.querySelectorAll('input.stock-image-url').forEach(el => el.remove());
    
    // Add new fields for each selected image
    if (selectedStockImages.length > 0) {
        const form = document.getElementById('postBusinessForm');
        selectedStockImages.forEach(image => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'stockImageUrls[]';
            input.value = image.url;
            input.className = 'stock-image-url';
            form.appendChild(input);
        });
    }
}

// Function to handle switching between image sources
function handleImageSourceChange(activeTabId) {
    // Update active tab for image source
    const isGalleryActive = activeTabId === 'gallery-tab';
    const isUploadActive = activeTabId === 'upload-tab';
    
    // Store the current mode
    window.currentImageMode = isGalleryActive ? 'gallery' : 'upload';
    
    // Enable/disable Dropzone based on tab
    if (window.submitDropzone) {
        if (isGalleryActive) {
            // When switching to gallery, disable Dropzone
            window.submitDropzone.disable();
        } else {
            // When switching to upload, enable Dropzone
            window.submitDropzone.enable();
        }
    }
}

// Add token refresh before form submission
async function verifyAndRefreshToken() {
    const token = getAuthToken();
    
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return null;
    }

    try {
        const response = await fetch('/api/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Token verification failed');
        }

        const data = await response.json();
        console.log('Token verified for user:', data.userId);
        return token;
    } catch (error) {
        console.error('Token verification failed:', error);
        // Clear invalid tokens
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        
        // Redirect to login
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}&error=auth_required`;
        return null;
    }
}

// Add this helper function
function sanitizeNumericInput(value) {
    if (!value) return '';
    // Remove currency symbols, commas, and spaces
    return value.toString().replace(/[£$,\s]/g, '');
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
        let imageUrls = [];
        
        if (isGalleryMode) {
            // Check if we have enough stock images
            if (selectedStockImages.length < 3) {
                throw new Error('Please select at least 3 images from the gallery');
            }
            // Use stock images
            imageUrls = selectedStockImages.map(img => img.url);
        } else {
            // Check if we have enough uploaded images
            if (!imageDropzone || imageDropzone.files.length < 3) {
                throw new Error('Please upload at least 3 images of your business');
            }
            
            // Check if any uploads are still in progress
            if (imageDropzone && imageDropzone.getUploadingFiles().length > 0) {
                throw new Error('Please wait for all images to finish uploading before submitting');
            }
            
            // Collect S3 URLs from completed uploads
            const successfulUploads = imageDropzone.files.filter(file => 
                file.status === "success" && file.s3Url);
                
            imageUrls = successfulUploads.map(file => file.s3Url);
            
            // If we don't have enough S3 URLs, try uploading any remaining files directly
            if (imageUrls.length < 3) {
                submitButton.innerHTML = 'Uploading remaining images...';
                
                // Try to upload each file that doesn't already have an S3 URL
                for (const file of imageDropzone.files) {
                    if (!file.s3Url && imageUrls.length < 5) {
                        submitButton.innerHTML = `Uploading ${file.name}...`;
                        const result = await uploadImageDirectly(file, token);
                        
                        if (result.success && result.url) {
                            imageUrls.push(result.url);
                            file.s3Url = result.url;
                            
                            // Update UI to show success
                            file.previewElement.classList.add('dz-success');
                        } else {
                            // Show error on the file element
                            file.previewElement.classList.add('dz-error');
                            const errorDisplay = file.previewElement.querySelector('.dz-error-message span');
                            if (errorDisplay) {
                                errorDisplay.textContent = result.error || 'Upload failed';
                            }
                        }
                    }
                }
                
                // Check if we have enough images now
                if (imageUrls.length < 3) {
                    throw new Error(`Failed to upload at least 3 images (${imageUrls.length} uploaded). Please try again with smaller image files.`);
                }
            }
        }

        // Now submit the business data as JSON with only the image URLs
        submitButton.innerHTML = 'Creating listing...';
        
        // Create a simple JSON object for submission (no FormData with files)
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        
        // Build a clean submission object
        const submissionData = {};
        for (const [key, value] of formData.entries()) {
            // Skip any file inputs or arrays from DOM
            if (key !== 'images' && !key.includes('[]')) {
                submissionData[key] = value;
            }
        }
        
        // Add the image URLs
        submissionData.images = imageUrls;
        
        console.log('Submitting business data:', {
            ...submissionData,
            images: `${imageUrls.length} image URLs collected`
        });
        
        // Submit the business data as JSON (not multipart/form-data)
        const response = await fetch('/api/submit-business', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(submissionData)
        });
        
        // Handle responses and errors
        if (!response.ok) {
            // Try to get more detailed error message
            const responseText = await response.text();
            let errorMessage = `Server error (${response.status})`;
            
            try {
                // Try to parse as JSON
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // Not JSON, just use as text if it's shorter than 100 chars
                if (responseText.length < 100) {
                    errorMessage = responseText;
                }
            }
            
            throw new Error(errorMessage);
        }

        // Get the response data
        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error('Server returned invalid response format');
        }
        
        console.log('Business submission successful:', data);

        // Show success message
        alert('Your business listing has been created successfully!');
        
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

// Modify the uploadImageDirectly function to handle larger files and provide better error feedback
async function uploadImageDirectly(file, token) {
    console.log(`Attempting direct upload for ${file.name} (${file.size} bytes)`);
    
    // First check if file is too large for direct upload
    if (file.size > 8 * 1024 * 1024) { // Increased to 8MB limit for direct uploads
        console.error(`File ${file.name} is too large (${file.size} bytes) for direct upload`);
        // Try compressing the image first
        try {
            const compressedFile = await compressImage(file);
            console.log(`Compressed ${file.name} from ${file.size} to ${compressedFile.size} bytes`);
            
            // If still too large, reject
            if (compressedFile.size > 8 * 1024 * 1024) {
                return {
                    success: false,
                    error: `File ${file.name} is too large even after compression. Please use an image under 8MB.`
                };
            }
            
            // Use the compressed file instead
            file = compressedFile;
        } catch (error) {
            console.error('Image compression failed:', error);
            // Continue with original file if compression fails
        }
    }
    
    // Update status to show upload in progress
    const statusElement = document.getElementById('uploadStatus');
    if (statusElement) {
        statusElement.innerHTML += `<div class="uploading-file" id="uploading-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}">
            <div class="spinner-border spinner-border-sm text-primary" role="status">
                <span class="visually-hidden">Uploading...</span>
            </div>
            Uploading ${file.name}...
        </div>`;
    }
    
    try {
        const formData = new FormData();
        formData.append('images', file);
        
        // Use the dedicated endpoint for image uploads only
        const response = await fetch('/api/post-business-upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const statusText = response.statusText;
            console.error(`Upload failed with status ${response.status} (${statusText})`);
            
            // Show more detailed error for 413 specifically
            if (response.status === 413) {
                throw new Error(`File ${file.name} is too large for the server. Please resize the image to be smaller than 5MB.`);
            }
            
            // Try to get more detailed error from response
            try {
                const errorData = await response.json();
                throw new Error(`Upload failed: ${errorData.message || errorData.error || statusText}`);
            } catch (e) {
                // If can't parse JSON, use the status text
                throw new Error(`Upload failed with status ${response.status} (${statusText})`);
            }
        }
        
        // Parse the response carefully
        let data;
        try {
            data = await response.json();
            console.log('Upload response data:', data);
        } catch (e) {
            console.error('Failed to parse response JSON:', e);
            throw new Error('Invalid response format from server');
        }
        
        // Check for success response with improved fallback handling
        if (data.success) {
            // First try standard structure
            if (data.files && data.files.length > 0) {
                console.log(`Successfully uploaded ${file.name} directly:`, data.files[0].s3Url);
                
                // Remove the uploading indicator
                document.getElementById(`uploading-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`)?.remove();
                
                return {
                    success: true,
                    url: data.files[0].s3Url
                };
            }
            // Then try direct URL property (backward compatibility)
            else if (data.url) {
                console.log(`Successfully uploaded ${file.name} directly:`, data.url);
                
                // Remove the uploading indicator
                document.getElementById(`uploading-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`)?.remove();
                
                return {
                    success: true,
                    url: data.url
                };
            }
            else {
                console.warn('Response indicates success but no URL found:', data);
                throw new Error('No valid URL returned in successful response');
            }
        } else {
            console.error('Upload failed:', data.message || 'Unknown error');
            throw new Error(data.message || 'Upload failed');
        }
    } catch (error) {
        console.error(`Failed to upload ${file.name} directly:`, error);
        
        // Update error in status area
        const uploadingIndicator = document.getElementById(`uploading-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (uploadingIndicator) {
            uploadingIndicator.innerHTML = `<div class="alert alert-danger">
                <strong>Error uploading ${file.name}:</strong> ${error.message || 'Unknown error'}
            </div>`;
        }
        
        return {
            success: false,
            error: error.message || `Failed to upload ${file.name}`
        };
    }
}

// Add this helper function for image compression
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                // Calculate target dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1200; // Max dimension
                
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                
                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress the image
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to blob with lower quality
                canvas.toBlob(
                    blob => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }
                        
                        // Create new file from blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    0.7 // quality: 0.7 = 70% quality, good balance between size and quality
                );
            };
            img.onerror = error => {
                reject(error);
            };
        };
        reader.onerror = error => {
            reject(error);
        };
    });
}

// Update Dropzone configuration
Dropzone.autoDiscover = false;
var imageDropzone;

function updateDropzoneMessage(dropzone) {
    const messageElement = dropzone.element.querySelector('.dz-message');
    if (!messageElement) {
        // Create message element if it doesn't exist
        const newMessage = document.createElement('div');
        newMessage.className = 'dz-message';
        newMessage.innerHTML = '<span></span>';
        dropzone.element.appendChild(newMessage);
    }
    
    const messageSpan = dropzone.element.querySelector('.dz-message span');
    const remainingFiles = 3 - dropzone.files.length;
    
    if (remainingFiles > 0) {
        messageSpan.textContent = 
            `Please upload ${remainingFiles} more image${remainingFiles !== 1 ? 's' : ''} (minimum 3, maximum 5)`;
    } else {
        messageSpan.textContent = 
            `You can add ${5 - dropzone.files.length} more image${5 - dropzone.files.length !== 1 ? 's' : ''}`;
    }
}

// Form validation
(function () {
    'use strict'
    var forms = document.querySelectorAll('.needs-validation')
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!form.checkValidity()) {
                    event.preventDefault()
                    event.stopPropagation()
                } else {
                    event.preventDefault();
                    // Handle form submission
                    handleFormSubmission();
                }
                form.classList.add('was-validated')
            }, false)
        })
})()

// Remove the showValuationFeedback function as we'll use updateValuationUI instead

// Update the checkValuation function
async function checkValuation() {
    const token = await verifyAndRefreshToken();
    if (!token) return;

    const valuationBtn = document.getElementById('checkValuation');
    valuationBtn.classList.add('loading');

    try {
        // Get form data and format it properly
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        const businessData = {};
        
        // Process form fields with proper type conversion
        for (const [key, value] of formData.entries()) {
            // Convert numeric fields to numbers
            if (['price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
                 'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash', 
                 'down_payment', 'ffe', 'employees', 'years_in_operation',
                 'recurring_revenue', 'growth_rate', 'website_traffic', 
                 'social_followers'].includes(key) && value) {
                businessData[key] = parseFloat(value) || 0;
            } else {
                businessData[key] = value;
            }
        }
        
        // Map camelCase fields to snake_case for consistency
        const fieldMappings = {
            'businessName': 'business_name',
            'cashFlow': 'cash_flow',
            'grossRevenue': 'gross_revenue',
            'salesMultiple': 'sales_multiple',
            'profitMargin': 'profit_margin',
            'debtService': 'debt_service',
            'cashOnCash': 'cash_on_cash',
            'downPayment': 'down_payment',
            'ffE': 'ffe',
            'yearsInOperation': 'years_in_operation',
            'reasonForSelling': 'reason_for_selling',
            'recurringRevenue': 'recurring_revenue',
            'growthRate': 'growth_rate',
            'websiteTraffic': 'website_traffic',
            'socialFollowers': 'social_media_followers',
            'intellectualProperty': 'intellectual_property'
        };
        
        // Ensure all fields are in snake_case format
        for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
            if (businessData[camelCase] !== undefined) {
                businessData[snakeCase] = businessData[camelCase];
            }
        }
        
        console.log('Sending business data for valuation:', businessData);
        
        // Fix the API endpoint URL - add /api/ prefix
        const response = await fetch('/api/post-business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });

        if (!response.ok) {
            throw new Error(`Valuation request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            updateValuationUI(data.valuation, data.priceComparison);
            document.querySelector('.valuation-status').classList.remove('hidden');
            document.querySelector('.valuation-status').classList.add('active');
        } else {
            throw new Error(data.error || data.message || 'Valuation failed');
        }
    } catch (error) {
        console.error('Valuation error:', error);
        alert('Failed to calculate valuation. Please ensure all required fields are filled.');
    } finally {
        valuationBtn?.classList.remove('loading');
    }
}

function updateValuationUI(valuation, priceComparison) {
    // Safety check for missing data
    if (!valuation || !valuation.valuationRange) {
        console.error('Missing valuation data:', valuation);
        
        // Show error message instead of trying to update UI elements
        const errorContainer = document.getElementById('valuation-loading') || document.createElement('div');
        errorContainer.innerHTML = `
            <div class="alert alert-warning">
                <p>We couldn't calculate a valuation with the provided information.</p>
                <p>Please make sure you've entered key financial information like revenue or EBITDA.</p>
            </div>
        `;
        
        // If we have a container, show it
        if (document.getElementById('valuation-loading')) {
            document.getElementById('valuation-loading').classList.remove('d-none');
        }
        
        // Hide results container if it exists
        const resultsContainer = document.getElementById('valuation-results');
        if (resultsContainer) {
            resultsContainer.classList.add('d-none');
        }
        
        return;
    }

    // Get all elements with null checks to prevent errors
    const rangeEl = document.getElementById('valuation-range');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceValue = document.getElementById('confidence-value');
    const priceAnalysisEl = document.getElementById('price-analysis');
    
    // Update valuation range with null check
    if (rangeEl) {
        rangeEl.textContent = `£${valuation.valuationRange.min.toLocaleString()} - £${valuation.valuationRange.max.toLocaleString()}`;
    }
    
    // Update confidence meter with null check
    if (confidenceBar && confidenceValue) {
        const confidenceScore = valuation.confidence || 0;
        confidenceBar.style.width = `${confidenceScore}%`;
        confidenceValue.textContent = `${confidenceScore}%`;
        
        // Update confidence bar color based on level
        if (confidenceScore < 40) {
            confidenceBar.className = 'progress-bar bg-danger';
        } else if (confidenceScore < 70) {
            confidenceBar.className = 'progress-bar bg-warning';
        } else {
            confidenceBar.className = 'progress-bar bg-success';
        }
    }
    
    // Update price analysis with null check
    if (priceAnalysisEl && priceComparison) {
        // Set analysis text
        let priceText = '';
        if (priceComparison.status === 'above') {
            priceText = `Your asking price is ${priceComparison.difference > 0 ? 
                `£${priceComparison.difference.toLocaleString()} above` : 'above'} typical market value`;
        } else if (priceComparison.status === 'below') {
            priceText = `Your asking price is ${priceComparison.difference > 0 ? 
                `£${priceComparison.difference.toLocaleString()} below` : 'below'} typical market value`;
        } else if (priceComparison.status === 'within') {
            priceText = 'Your asking price is within the expected market range';
        } else {
            priceText = 'Your asking price could not be compared to market value';
        }
        priceAnalysisEl.textContent = priceText;
    }
    
    // Update market insights with null check
    const marketInsightsEl = document.getElementById('market-insights');
    if (marketInsightsEl) {
        marketInsightsEl.innerHTML = valuation.explanation || 'No market insights available';
    }
    
    // Update industry insights with null check
    const industryInsightsEl = document.getElementById('industry-insights');
    if (industryInsightsEl) {
        let insightsHTML = '';
        
        if (Array.isArray(valuation.insights) && valuation.insights.length > 0) {
            insightsHTML = valuation.insights.map(insight => `<li>${insight}</li>`).join('');
        } else if (typeof valuation.insights === 'string') {
            insightsHTML = `<li>${valuation.insights}</li>`;
        } else {
            insightsHTML = '<li>No specific industry insights available</li>';
        }
        
        industryInsightsEl.innerHTML = insightsHTML;
    }
    
    // Show the valuation results section and hide loading
    const resultsContainer = document.getElementById('valuation-results');
    const loadingContainer = document.getElementById('valuation-loading');
    
    if (resultsContainer) {
        resultsContainer.classList.remove('d-none');
    }
    
    if (loadingContainer) {
        loadingContainer.classList.add('d-none');
    }
}

// Add real-time valuation check
async function checkValuation() {
    const token = await verifyAndRefreshToken();
    if (!token) return;

    const formData = new FormData(document.querySelector('form'));
    const businessData = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/post-business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });

        const data = await response.json();
        if (data.success) {
            updateValuationUI(data.valuation, data.priceComparison);
            document.querySelector('.valuation-status').classList.remove('hidden');
            document.querySelector('.valuation-status').classList.add('active');
        }
    } catch (error) {
        console.error('Valuation check error:', error);
    }
}

// Add event listeners for real-time valuation updates
document.querySelectorAll('input[name="price"], input[name="gross_revenue"], input[name="ebitda"]')
    .forEach(input => {
        input.addEventListener('change', checkValuation);
    });

// Update the valuation check handler
document.getElementById('checkValuation')?.addEventListener('click', async () => {
    const valuationBtn = document.getElementById('checkValuation');
    const valuationStatus = document.querySelector('.valuation-status');
    
    try {
        // Get current token
        const token = await verifyAndRefreshToken();
        if (!token) return;

        valuationBtn.classList.add('loading');
        const formData = new FormData(document.getElementById('postBusinessForm'));
        const businessData = Object.fromEntries(formData);
        
        // Fix the API endpoint URL - add /api/ prefix
        const response = await fetch('/api/post-business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });

        if (!response.ok) {
            throw new Error(`Valuation request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            updateValuationUI(data.valuation, data.priceComparison);
            valuationStatus.classList.remove('hidden');
            valuationStatus.classList.add('active');
        } else {
            throw new Error(data.error || data.message || 'Valuation failed');
        }
    } catch (error) {
        console.error('Valuation error:', error);
        alert('Failed to calculate valuation. Please ensure all required fields are filled.');
    } finally {
        valuationBtn?.classList.remove('loading');
    }
});

function updateValuationUI(valuation, priceComparison) {
    const valuationDetails = document.querySelector('.valuation-details');
    const confidenceValue = document.querySelector('.confidence-value');
    
    confidenceValue.textContent = `${valuation.confidence}%`;
    
    valuationDetails.innerHTML = `
        <div class="valuation-range">
            <div class="range-header">Suggested Value Range:</div>
            <div class="range-values">
                £${valuation.valuationRange.min.toLocaleString()} - £${valuation.valuationRange.max.toLocaleString()}
            </div>
            <div class="price-status ${priceComparison.status}">
                Your asking price is ${priceComparison.status} market value
                ${priceComparison.difference > 0 ? 
                    `by £${priceComparison.difference.toLocaleString()}` : 
                    ''}
            </div>
        </div>
        
        <div class="insights-panel">
            <div class="insights-header">Market Insights</div>
            <div class="insights-content">${valuation.explanation}</div>
        </div>
        
        <div class="insights-panel">
            <div class="insights-header">Industry-Specific Insights</div>
            <ul class="insights-list">
                ${valuation.insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
        
        <div class="valuation-disclaimer">
            Note: This valuation is an estimate based on current market data and industry standards.
            Not regulated by the FCA. For guidance purposes only.
        </div>
    `;
}

// New function to check advanced valuation
async function checkAdvancedValuation() {
    const token = await verifyAndRefreshToken();
    if (!token) return;
    
    const advValuationBtn = document.getElementById('checkAdvancedValuation');
    advValuationBtn.classList.add('loading');
    
    try {
        // Get form data and format it properly
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        const businessData = {};
        
        // Process all form fields with proper type conversion
        for (const [key, value] of formData.entries()) {
            // Convert numeric fields to numbers
            if (['price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
                 'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash', 
                 'down_payment', 'ffe', 'employees', 'years_in_operation',
                 'recurring_revenue', 'growth_rate', 'website_traffic', 
                 'social_followers'].includes(key) && value) {
                businessData[key] = parseFloat(value) || 0;
            } else {
                businessData[key] = value;
            }
        }
        
        // Map camelCase fields to snake_case for consistency
        const fieldMappings = {
            'businessName': 'business_name',
            'cashFlow': 'cash_flow',
            'grossRevenue': 'gross_revenue',
            'salesMultiple': 'sales_multiple',
            'profitMargin': 'profit_margin',
            'debtService': 'debt_service',
            'cashOnCash': 'cash_on_cash',
            'downPayment': 'down_payment',
            'ffE': 'ffe',
            'yearsInOperation': 'years_in_operation',
            'reasonForSelling': 'reason_for_selling',
            'recurringRevenue': 'recurring_revenue',
            'growthRate': 'growth_rate',
            'websiteTraffic': 'website_traffic',
            'socialFollowers': 'social_media_followers',
            'intellectualProperty': 'intellectual_property'
        };
        
        // Ensure all fields are in snake_case format
        for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
            if (businessData[camelCase] !== undefined) {
                businessData[snakeCase] = businessData[camelCase];
            }
        }
        
        console.log('Sending business data for advanced valuation:', businessData);
        
        // Use the correct API endpoint with /api prefix
        const response = await fetch('/api/business/calculate-advanced-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });
        
        if (!response.ok) {
            throw new Error('Advanced valuation request failed');
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateAdvancedValuationUI(data.advancedValuation);
            document.querySelector('.advanced-valuation-container').classList.remove('hidden');
            document.querySelector('.advanced-valuation-container').classList.add('active');
        } else {
            throw new Error(data.error || 'Advanced valuation failed');
        }
    } catch (error) {
        console.error('Advanced valuation error:', error);
        alert('Failed to calculate advanced valuation. Please ensure all required fields are filled.');
    } finally {
        advValuationBtn.classList.remove('loading');
    }
}

// New helper to update advanced valuation UI
function updateAdvancedValuationUI(advancedValuation) {
    const advancedDetails = document.querySelector('.advanced-valuation-details');
    advancedDetails.innerHTML = `
        <div class="advanced-range">
            <div class="range-header">Advanced Valuation Range:</div>
            <div class="range-values">
                £${advancedValuation.min.toLocaleString()} - £${advancedValuation.max.toLocaleString()}
            </div>
        </div>
        <div class="advanced-insights">
            <div class="insights-header">Advanced Insights</div>
            <div class="insights-content">${advancedValuation.explanation}</div>
        </div>
        <div class="advanced-disclaimer">
            Note: This advanced valuation incorporates real-time data and predictive analytics.
        </div>
    `;
}

// Event listener for advanced valuation check button
document.getElementById('checkAdvancedValuation')?.addEventListener('click', async () => {
    const advValuationBtn = document.getElementById('checkAdvancedValuation');
    advValuationBtn.classList.add('loading');
    await checkAdvancedValuation();
    advValuationBtn.classList.remove('loading');
});

// Modified function to submit questionnaire data without requiring authentication
async function submitQuestionnaireData(formData) {
    try {
        const response = await fetch('/api/business/submit-questionnaire', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to submit questionnaire');
        }
        
        return result;
    } catch (error) {
        console.error('Error submitting questionnaire:', error);
        throw error;
    }
}

// Add this function to prepare data from localStorage
function prepareQuestionnaireData() {
    // Get all relevant data from localStorage
    return {
        email: localStorage.getItem('sellerEmail'),
        revenueExact: localStorage.getItem('sellerRevenueExact'),
        revenuePrevYear: localStorage.getItem('sellerRevenuePrevYear'),
        revenue2YearsAgo: localStorage.getItem('sellerRevenue2YearsAgo'),
        revenue3YearsAgo: localStorage.getItem('sellerRevenue3YearsAgo'),
        ebitda: localStorage.getItem('sellerEbitda'),
        ebitdaPrevYear: localStorage.getItem('sellerEbitdaPrevYear'),
        cashOnCash: localStorage.getItem('sellerCashOnCash'),
        location: localStorage.getItem('sellerLocation'),
        ffeValue: localStorage.getItem('sellerFfeValue'),
        ffeItems: localStorage.getItem('sellerFfeItems'),
        growthRate: localStorage.getItem('sellerGrowthRate'),
        growthAreas: localStorage.getItem('sellerGrowthAreas'),
        growthChallenges: localStorage.getItem('sellerGrowthChallenges'),
        scalability: localStorage.getItem('sellerScalability'),
        totalDebtAmount: localStorage.getItem('sellerTotalDebtAmount'),
        debtTransferable: localStorage.getItem('sellerDebtTransferable'),
        debtNotes: localStorage.getItem('sellerDebtNotes'),
        debtItems: localStorage.getItem('sellerDebtItems')
    };
}

// Update this function to prepare data from localStorage without location
function prepareQuestionnaireData() {
    // Get all relevant data from localStorage
    return {
        email: localStorage.getItem('sellerEmail'),
        businessName: localStorage.getItem('sellerBusinessName'),
        industry: localStorage.getItem('sellerIndustry'),
        description: localStorage.getItem('sellerDescription'),
        yearEstablished: localStorage.getItem('sellerYearEstablished'),
        yearsInOperation: localStorage.getItem('sellerYearsInOperation'),
        contactName: localStorage.getItem('sellerContactName'),
        contactPhone: localStorage.getItem('sellerContactPhone'),
        revenueExact: localStorage.getItem('sellerRevenueExact'),
        revenuePrevYear: localStorage.getItem('sellerRevenuePrevYear'),
        revenue2YearsAgo: localStorage.getItem('sellerRevenue2YearsAgo'),
        revenue3YearsAgo: localStorage.getItem('sellerRevenue3YearsAgo'),
        ebitda: localStorage.getItem('sellerEbitda'),
        ebitdaPrevYear: localStorage.getItem('sellerEbitdaPrevYear'),
        ebitda2YearsAgo: localStorage.getItem('sellerEbitda2YearsAgo'),
        cashOnCash: localStorage.getItem('sellerCashOnCash'),
        ffeValue: localStorage.getItem('sellerFfeValue'),
        ffeItems: localStorage.getItem('sellerFfeItems'),
        growthRate: localStorage.getItem('sellerGrowthRate'),
        growthAreas: localStorage.getItem('sellerGrowthAreas'),
        growthChallenges: localStorage.getItem('sellerGrowthChallenges'),
        scalability: localStorage.getItem('sellerScalability'),
        totalDebtAmount: localStorage.getItem('sellerTotalDebtAmount'),
        debtTransferable: localStorage.getItem('sellerDebtTransferable'),
        debtNotes: localStorage.getItem('sellerDebtNotes'),
        debtItems: localStorage.getItem('sellerDebtItems')
    };
}

// Replace the multiple valuation functions with a single comprehensive one
async function calculateComprehensiveValuation() {
    // Don't attempt valuation until we have essential fields
    const essentialFields = ['business_name', 'industry', 'price'];
    const missingEssential = essentialFields.some(field => {
        const input = document.querySelector(`[name="${field}"]`);
        return !input || !input.value.trim();
    });

    if (missingEssential) {
        console.log('Missing essential fields for valuation');
        return;
    }

    try {
        const token = await verifyAndRefreshToken();
        if (!token) return;

        // Show loading state for valuation
        document.getElementById('valuation-loading').classList.remove('d-none');
        document.getElementById('valuation-results').classList.add('d-none');
        
        // Get all form data for comprehensive analysis
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        const businessData = {};
        
        // Process all form fields with proper type conversion
        for (const [key, value] of formData.entries()) {
            // Skip image fields
            if (key === 'images' || key.includes('stockImageUrls')) continue;
            
            // Convert numeric fields to numbers
            if (['price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
                'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash', 
                'down_payment', 'ffe', 'employees', 'yearsInOperation', 'years_in_operation',
                'recurringRevenue', 'recurring_revenue', 'growthRate', 'growth_rate', 
                'websiteTraffic', 'website_traffic', 'socialFollowers', 'social_followers'].includes(key) && value) {
                businessData[key] = parseFloat(value) || 0;
            } else {
                businessData[key] = value;
            }
        }
        
        // Map camelCase fields to snake_case for consistency
        const fieldMappings = {
            'businessName': 'business_name',
            'cashFlow': 'cash_flow',
            'grossRevenue': 'gross_revenue',
            'salesMultiple': 'sales_multiple',
            'profitMargin': 'profit_margin',
            'debtService': 'debt_service',
            'cashOnCash': 'cash_on_cash',
            'downPayment': 'down_payment',
            'ffe': 'ffe',
            'yearsInOperation': 'years_in_operation',
            'reasonForSelling': 'reason_for_selling',
            'recurringRevenue': 'recurring_revenue',
            'growthRate': 'growth_rate',
            'websiteTraffic': 'website_traffic',
            'socialFollowers': 'social_media_followers',
            'intellectualProperty': 'intellectual_property'
        };
        
        // Ensure all fields are in snake_case format
        for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
            if (businessData[camelCase] !== undefined) {
                businessData[snakeCase] = businessData[camelCase];
                delete businessData[camelCase];
            }
        }
        
        // Fix: Use the correct API endpoint with /api prefix
        const response = await fetch('/api/post-business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });

        if (!response.ok) {
            throw new Error(`Valuation request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            updateEnhancedValuationUI(data.valuation, data.priceComparison, businessData);
            document.querySelector('.valuation-status')?.classList.add('active');
            
            // Show results and hide loading
            document.getElementById('valuation-loading').classList.add('d-none');
            document.getElementById('valuation-results').classList.remove('d-none');
        } else {
            throw new Error(data.error || data.message || 'Valuation failed');
        }
    } catch (error) {
        console.error('Valuation error:', error);
        // Show user-friendly error in the UI
        document.getElementById('valuation-loading').innerHTML = `
            <div class="alert alert-warning">
                <p>We couldn't complete the valuation at this time.</p>
                <p class="small">Try adding more business details and try again.</p>
            </div>
        `;
        document.getElementById('valuation-loading').classList.remove('d-none');
        document.getElementById('valuation-results').classList.add('d-none');
    }
}

// New enhanced UI update function
function updateEnhancedValuationUI(valuation, priceComparison, businessData) {
    // Update value range
    const rangeEl = document.getElementById('valuation-range');
    rangeEl.textContent = `£${valuation.valuationRange.min.toLocaleString()} - £${valuation.valuationRange.max.toLocaleString()}`;
    
    // Update confidence meter
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceValue = document.getElementById('confidence-value');
    
    confidenceBar.style.width = `${valuation.confidence}%`;
    confidenceValue.textContent = `${valuation.confidence}%`;
    
    // Update confidence bar color based on level
    if (valuation.confidence < 40) {
        confidenceBar.className = 'progress-bar bg-danger';
    } else if (valuation.confidence < 70) {
        confidenceBar.className = 'progress-bar bg-warning';
    } else {
        confidenceBar.className = 'progress-bar bg-success';
    }
    
    // Update price analysis
    const priceAnalysisEl = document.getElementById('price-analysis');
    
    // Set status class
    priceAnalysisEl.className = 'mb-0 price-status ' + priceComparison.status;
    
    // Set analysis text
    let priceText = '';
    if (priceComparison.status === 'above') {
        priceText = `Your asking price is ${priceComparison.difference > 0 ? 
            `£${priceComparison.difference.toLocaleString()} above` : 'above'} typical market value`;
    } else if (priceComparison.status === 'below') {
        priceText = `Your asking price is ${priceComparison.difference > 0 ? 
            `£${priceComparison.difference.toLocaleString()} below` : 'below'} typical market value`;
    } else {
        priceText = 'Your asking price is within the expected market range';
    }
    priceAnalysisEl.textContent = priceText;
    
    // Update market insights
    const marketInsightsEl = document.getElementById('market-insights');
    marketInsightsEl.innerHTML = valuation.explanation;
    
    // Update industry insights
    const industryInsightsEl = document.getElementById('industry-insights');
    let insightsHTML = '';
    
    if (Array.isArray(valuation.insights)) {
        insightsHTML = valuation.insights.map(insight => `<li>${insight}</li>`).join('');
    } else if (typeof valuation.insights === 'string') {
        insightsHTML = `<li>${valuation.insights}</li>`;
    }
    
    industryInsightsEl.innerHTML = insightsHTML;
}

// Create a debounce function to limit how often valuation is triggered
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add event listeners for real-time valuation updates on key fields
document.addEventListener('DOMContentLoaded', function() {
    // Create a debounced version of the valuation function
    const debouncedValuation = debounce(calculateComprehensiveValuation, 1000);
    
    // List of fields that should trigger valuation
    const valuationTriggerFields = [
        'business_name', 'industry', 'price', 'cash_flow', 'gross_revenue', 
        'ebitda', 'inventory', 'sales_multiple', 'profit_margin', 'debt_service',
        'cash_on_cash', 'down_payment', 'location', 'ffe', 'employees',
        'reasonForSelling', 'yearsInOperation', 'recurringRevenue', 'growthRate',
        'intellectualProperty', 'websiteTraffic', 'socialFollowers'
    ];
    
    // Add event listeners to all relevant fields
    valuationTriggerFields.forEach(fieldName => {
        const element = document.querySelector(`[name="${fieldName}"]`);
        if (element) {
            element.addEventListener('change', debouncedValuation);
            element.addEventListener('blur', debouncedValuation);
            
            // For text inputs, also listen for keyup with a longer delay
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.addEventListener('keyup', debounce(calculateComprehensiveValuation, 1500));
            }
        }
    });
    
    // Initial calculation if form has some data
    setTimeout(calculateComprehensiveValuation, 1000);
});

// Update the comprehensive valuation function to better handle the API call
async function calculateComprehensiveValuation() {
    // Don't attempt valuation until we have essential fields
    const essentialFields = ['industry'];
    const missingEssential = essentialFields.some(field => {
        const input = document.querySelector(`[name="${field}"]`);
        return !input || !input.value.trim();
    });

    if (missingEssential) {
        console.log('Missing essential fields for valuation');
        return;
    }

    try {
        const token = await verifyAndRefreshToken();
        if (!token) return;

        // Show loading state for valuation
        const loadingElement = document.getElementById('valuation-loading');
        const resultsElement = document.getElementById('valuation-results');
        
        if (loadingElement) {
            loadingElement.classList.remove('d-none');
            loadingElement.innerHTML = `
                <div class="d-flex justify-content-center my-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <p class="text-center">Calculating business valuation...</p>
            `;
        }
        
        if (resultsElement) {
            resultsElement.classList.add('d-none');
        }
        
        // Get all form data for comprehensive analysis
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        const businessData = {};
        
        // Process all form fields with proper type conversion
        for (const [key, value] of formData.entries()) {
            // Skip image fields
            if (key === 'images' || key.includes('stockImageUrls')) continue;
            
            // Convert numeric fields to numbers - adding comprehensive list
            if (['price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
                'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash', 
                'down_payment', 'ffe', 'employees', 'years_in_operation',
                'recurring_revenue', 'growth_rate', 'website_traffic', 
                'social_followers'].includes(key) && value) {
                businessData[key] = parseFloat(value) || 0;
            } else {
                businessData[key] = value;
            }
        }
        
        // Log the data being sent for debugging
        console.log('Sending business data for valuation calculation:', {
            industry: businessData.industry || 'Not specified',
            gross_revenue: businessData.gross_revenue || 0,
            ebitda: businessData.ebitda || 0,
            cash_flow: businessData.cash_flow || 0
        });
        
        // Use the correct API endpoint
        const response = await fetch('/api/post-business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });

        if (!response.ok) {
            // Improved error handling to extract detailed error message
            let errorMessage = `Request failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // If can't parse JSON, use text
                const errorText = await response.text();
                if (errorText) errorMessage += `: ${errorText}`;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (data.success) {
            console.log('Valuation successful:', {
                estimatedValue: data.valuation.estimatedValue,
                range: data.valuation.valuationRange,
                confidence: data.valuation.confidence
            });
            
            updateEnhancedValuationUI(data.valuation, data.priceComparison);
            document.querySelector('.valuation-status')?.classList.add('active');
            
            // Show results and hide loading
            if (loadingElement) loadingElement.classList.add('d-none');
            if (resultsElement) resultsElement.classList.remove('d-none');
        } else {
            throw new Error(data.message || data.error || 'Valuation failed');
        }
    } catch (error) {
        console.error('Valuation error:', error);
        // Show user-friendly error in the UI
        const loadingElement = document.getElementById('valuation-loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="alert alert-warning">
                    <p><strong>Valuation Error:</strong> ${error.message || 'We couldn\'t complete the valuation at this time.'}</p>
                    <p class="small">Please ensure you've entered financial data (Revenue, EBITDA, or Cash Flow).</p>
                </div>
            `;
            loadingElement.classList.remove('d-none');
        }
        
        const resultsElement = document.getElementById('valuation-results');
        if (resultsElement) {
            resultsElement.classList.add('d-none');
        }
    }
}