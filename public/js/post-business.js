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
        url: "/api/submit-business", 
        autoProcessQueue: false, 
        uploadMultiple: true,
        parallelUploads: 5,
        maxFiles: 5,
        minFiles: 3,
        acceptedFiles: "image/*",
        maxFilesize: 5,
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
                console.log(`Sending file: ${file.name}, size: ${file.size} bytes`);
                console.log(`Using region: ${window.AWS_REGION || 'eu-west-2'}, bucket: ${window.AWS_BUCKET_NAME || 'arzani-images1'}`);
            });

            // Enhanced file validation
            this.on("addedfile", file => {
                console.log(`File added: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
                
                // Validate file type more strictly
                if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
                    dz.removeFile(file);
                    alert('Only JPG and PNG images are allowed.');
                    return;
                }
                
                // Validate file size
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    dz.removeFile(file);
                    alert('File too large. Maximum size is 5MB.');
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
                
                // Check for authentication issues
                if (typeof errorMessage === 'string' && errorMessage.includes('Unauthorized')) {
                    alert('Your session has expired. Please log in again.');
                    window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
                    return;
                }
                
                // Show error on the file
                file.previewElement.classList.add('dz-error');
                const errorDisplay = file.previewElement.querySelector('.dz-error-message span');
                if (errorDisplay) {
                    errorDisplay.textContent = errorMessage;
                }
            });
        }
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
async function handleFormSubmission() {
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

        // Check if we have enough images
        if (imageDropzone && imageDropzone.files.length < 3) {
            throw new Error('Please upload at least 3 images of your business');
        }

        // Get the form data
        const form = document.getElementById('postBusinessForm');
        const formData = new FormData(form);
        
        // Make sure the numeric fields are properly sanitized
        const numericFields = [
            'price', 'cash_flow', 'gross_revenue', 'ebitda', 'inventory', 
            'sales_multiple', 'profit_margin', 'debt_service', 'cash_on_cash', 
            'down_payment', 'ffe', 'employees', 'years_in_operation'
        ];
        
        // Double-check that sanitized numeric fields don't include empty strings
        numericFields.forEach(field => {
            const value = formData.get(field);
            // If empty or not a valid number, set to null or 0
            if (value === '' || value === null || isNaN(parseFloat(value))) {
                formData.set(field, '0'); // Use '0' instead of empty string
            } else {
                // Make sure it's properly sanitized
                formData.set(field, sanitizeNumericInput(value));
            }
        });
        
        // Add field mappings for backward compatibility
        // This ensures both camelCase and snake_case field names work during transition
        const fieldMappings = {
            'cashFlow': 'cash_flow',
            'grossRevenue': 'gross_revenue',
            'salesMultiple': 'sales_multiple',
            'profitMargin': 'profit_margin',
            'debtService': 'debt_service',
            'cashOnCash': 'cash_on_cash',
            'downPayment': 'down_payment',
            'ffE': 'ffe',
            'yearsInOperation': 'years_in_operation',
            'reasonForSelling': 'reason_for_selling'
        };
        
        // Add cross-field compatibility - duplicate fields with both naming conventions 
        for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
            // If form has the camelCase version and no snake_case version, add it
            if (formData.has(camelCase) && !formData.has(snakeCase)) {
                formData.set(snakeCase, formData.get(camelCase));
            }
            // If form has the snake_case version and no camelCase version, add it
            else if (formData.has(snakeCase) && !formData.has(camelCase)) {
                formData.set(camelCase, formData.get(snakeCase));
            }
        }
        
        // Add S3 region information
        formData.append('awsRegion', window.AWS_REGION || 'eu-west-2');
        formData.append('awsBucket', window.AWS_BUCKET_NAME || 'arzani-images1');
        
        // Process images from Dropzone
        if (imageDropzone && imageDropzone.files.length > 0) {
            const imageFiles = imageDropzone.files;
            console.log(`Adding ${imageFiles.length} files from Dropzone`);
            
            // Clear existing files from formData to avoid duplicates
            formData.delete('images');
            
            // Add each file to the form data - IMPORTANT to use the same field name for all files
            // This is how multer recognizes them as an array
            for (let i = 0; i < imageFiles.length; i++) {
                formData.append('images', imageFiles[i], imageFiles[i].name);
                console.log(`Added image ${i+1}: ${imageFiles[i].name} to FormData`);
            }
        }
        
        // Log the form data before submission
        console.log('Submitting business data:');
        let imageCount = 0;
        for (const [key, value] of formData.entries()) {
            if (key === 'images') {
                imageCount++;
                console.log(`${key} [${imageCount}]: ${value instanceof File ? value.name : 'Not a file'}`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        console.log(`Total images in FormData: ${imageCount}`);
        
        // Add fields for new database columns
        if (formData.get('recurringRevenue')) {
            formData.append('recurring_revenue_percentage', formData.get('recurringRevenue'));
        }
        
        if (formData.get('growthRate')) {
            formData.append('growth_rate', formData.get('growthRate'));
        }
        
        if (formData.get('intellectualProperty')) {
            formData.append('intellectual_property', formData.get('intellectualProperty'));
        }
        
        if (formData.get('websiteTraffic')) {
            formData.append('website_traffic', formData.get('websiteTraffic'));
        }
        
        if (formData.get('socialFollowers')) {
            formData.append('social_media_followers', formData.get('socialFollowers'));
        }
        
        // Log the form data before submission
        console.log('Submitting business data with fields:');
        for (const [key, value] of formData.entries()) {
            if (key === 'images') {
                console.log(`${key}: [File object]`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        
        // Submit the form data to the server with the token
        const response = await fetch('/api/submit-business', {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Log the full response for debugging
        const responseText = await response.text();
        console.log('Server response:', responseText);
        
        // Try to parse response as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Server returned non-JSON response: ${responseText}`);
        }
        
        // Add detailed logging to see the exact structure
        console.log('Parsed response data structure:', {
            success: data.success,
            hasBusinessObject: !!data.business,
            businessKeys: data.business ? Object.keys(data.business) : 'N/A',
            businessId: data.business?.id,
            imagesArray: Array.isArray(data.images) ? `${data.images.length} URLs` : 'Not an array'
        });
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Failed to submit business');
        }

        // Log success information
        console.log('Business submission successful:', {
            id: data.business?.id,
            name: data.business?.business_name,
            userId: data.business?.user_id,
            images: data.images
        });
        
        // Modified check - also verify the id is a number
        if (!data.business?.id || typeof data.business.id !== 'number') {
            console.error('Invalid business object in response:', data.business);
            throw new Error('No valid business ID returned from server. Please try again.');
        }

        // Redirect to marketplace instead of the business detail page
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

    const formData = new FormData(document.querySelector('form'));
    const businessData = Object.fromEntries(formData);

    try {
        const response = await fetch('/business/calculate-valuation', {
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

function updateValuationUI(valuation, priceComparison) {
    // First, check if valuation details already exists
    let valuationDetails = document.querySelector('.valuation-details');
    
    // If it doesn't exist, create it
    if (!valuationDetails) {
        valuationDetails = document.createElement('div');
        valuationDetails.className = 'valuation-details';
        const form = document.querySelector('form');
        form.parentNode.insertBefore(valuationDetails, form.nextSibling);
    }
    
    // Update the valuation content
    valuationDetails.innerHTML = `
        <div class="valuation-header">
            <h3>Business Valuation Analysis</h3>
            <span class="confidence">Confidence: ${valuation.confidence}%</span>
        </div>
        
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
                ${Array.isArray(valuation.insights) ? 
                    valuation.insights.map(insight => `<li>${insight}</li>`).join('') :
                    `<li>${valuation.insights}</li>`}
            </ul>
        </div>
        
        <div class="valuation-disclaimer">
            Note: This valuation is an estimate based on current market data and industry standards.
            Not regulated by the FCA. For guidance purposes only.
        </div>
    `;
}

// Add real-time valuation check
async function checkValuation() {
    const token = await verifyAndRefreshToken();
    if (!token) return;

    const formData = new FormData(document.querySelector('form'));
    const businessData = Object.fromEntries(formData);

    try {
        const response = await fetch('/business/calculate-valuation', {
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
        
        const response = await fetch('/business/calculate-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });

        if (!response.ok) {
            throw new Error('Valuation request failed');
        }

        const data = await response.json();
        
        if (data.success) {
            updateValuationUI(data.valuation, data.priceComparison);
            valuationStatus.classList.remove('hidden');
            valuationStatus.classList.add('active');
        } else {
            throw new Error(data.error || 'Valuation failed');
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
    const formData = new FormData(document.getElementById('postBusinessForm'));
    const businessData = Object.fromEntries(formData);
    try {
        const response = await fetch('/business/calculate-advanced-valuation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(businessData)
        });
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