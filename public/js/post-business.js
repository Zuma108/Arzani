// Check authentication on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login2?redirect=/post-business';
            return;
        }

        // Verify token validity
        const response = await fetch('/api/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token invalid');
        }

        // Initialize form if token is valid
        initializeForm(token);
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login2?redirect=/post-business';
    }
});

function initializeForm(token) {
    // Update Dropzone configuration with valid token
    imageDropzone = new Dropzone("#imageDropzone", {
        url: "/business/submit-business", // Updated path
        autoProcessQueue: false, // Prevent auto upload
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
            'Authorization': `Bearer ${token}`
        },
        init: function() {
            const dz = this;
            
            this.on("sending", function(file, xhr, formData) {
                // Always use the current token
                const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
                xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
            });

            // Show preview of files but don't upload
            this.on("addedfile", file => {
                // Add file size validation
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    dz.removeFile(file);
                    alert('File too large. Maximum size is 5MB.');
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

            this.on("success", function(file, response) {
                // Store the S3 URL returned from the server
                file.s3url = response.url;
                console.log('File uploaded to S3:', response.url);
            });
            this.on("error", function(file, response) {
                if (response === 'Unauthorized') {
                    window.location.href = '/login2';
                }
                console.error("File upload error:", response);
            });
        }
    });
}

// Add token refresh before form submission
async function verifyAndRefreshToken() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login2?redirect=/post-business';
        return null;
    }

    try {
        const response = await fetch('/api/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Token verification failed');
        }

        const data = await response.json();
        return token;
    } catch (error) {
        console.error('Token verification failed:', error);
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        window.location.href = '/login2?redirect=/post-business';
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
        console.log('Form submission already in progress');
        return;
    }

    isSubmitting = true;
    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.innerHTML = 'Uploading...';
    submitButton.disabled = true;

    try {
        const token = await verifyAndRefreshToken();
        if (!token) {
            isSubmitting = false;
            submitButton.innerHTML = 'Submit';
            submitButton.disabled = false;
            return;
        }

        // Debug form fields
        console.log('Form data before submission:', {
            business_name: document.getElementById('title').value,
            industry: document.getElementById('industry').value,
            // ... log other fields
        });

        const formData = new FormData();
        
        // Validate images first
        if (!imageDropzone || !imageDropzone.files || imageDropzone.files.length < 3) {
            alert('Please upload at least 3 images');
            isSubmitting = false;
            submitButton.innerHTML = 'Submit';
            submitButton.disabled = false;
            return;
        }

        if (imageDropzone.files.length > 5) {
            alert('Maximum 5 images allowed');
            isSubmitting = false;
            submitButton.innerHTML = 'Submit';
            submitButton.disabled = false;
            return;
        }

        // Add all form fields with proper validation and sanitization
        const fields = {
            'business_name': document.getElementById('title').value,
            'industry': document.getElementById('industry').value,
            'price': sanitizeNumericInput(document.getElementById('price').value),
            'description': document.getElementById('description').value,
            'cash_flow': sanitizeNumericInput(document.getElementById('cashFlow').value),
            'gross_revenue': sanitizeNumericInput(document.getElementById('grossRevenue').value),
            'ebitda': sanitizeNumericInput(document.getElementById('ebitda').value),
            'inventory': sanitizeNumericInput(document.getElementById('inventory').value),
            'sales_multiple': sanitizeNumericInput(document.getElementById('salesMultiple').value),
            'profit_margin': sanitizeNumericInput(document.getElementById('profitMargin').value),
            'debt_service': sanitizeNumericInput(document.getElementById('debtService').value),
            'cash_on_cash': sanitizeNumericInput(document.getElementById('cashOnCash').value),
            'down_payment': sanitizeNumericInput(document.getElementById('downPayment').value),
            'location': document.getElementById('location').value,
            'ffe': sanitizeNumericInput(document.getElementById('ffE').value),
            'employees': document.getElementById('employees').value,
            'reason_for_selling': document.getElementById('reasonForSelling').value,
            'years_in_operation': document.getElementById('yearsInOperation').value
        };

        // Validate required fields
        const requiredFields = [
            'business_name',
            'industry',
            'price',
            'description',
            'location',
            'gross_revenue',
            'employees',
            'years_in_operation'
        ];

        const missingFields = requiredFields.filter(field => !fields[field]);
        if (missingFields.length > 0) {
            alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            isSubmitting = false;
            submitButton.innerHTML = 'Submit';
            submitButton.disabled = false;
            return;
        }

        // Append all fields to formData
        Object.entries(fields).forEach(([key, value]) => {
            if (value) formData.append(key, value);
        });

        // Add images
        imageDropzone.files.forEach(file => {
            formData.append('images', file);
        });

        // Add a request timestamp to help prevent duplicate submissions
        formData.append('requestTimestamp', Date.now().toString());

        const response = await fetch('/business/submit-business', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 409) {
                console.warn('Duplicate submission detected');
                alert('Your business listing was already submitted. Redirecting to marketplace.');
                window.location.href = '/marketplace2';
                return;
            }
            console.error('Submission error details:', data);
            throw new Error(data.error || 'Submission failed');
        }

        if (data.success) {
            alert('Business posted successfully!');
            window.location.href = '/marketplace2';
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert('Error submitting business: ' + error.message);
    } finally {
        // Reset submission state
        isSubmitting = false;
        submitButton.innerHTML = 'Submit';
        submitButton.disabled = false;
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