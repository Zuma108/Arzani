/**
 * Profile Management
 * Handles user profile data retrieval and updates
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    initializeUI();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user profile data
    loadUserProfile();
    
    // Load buyer status
    loadBuyerStatus();
});

/**
 * Initialize UI components
 */
function initializeUI() {
    // Initialize Bootstrap components
    initBootstrapComponents();
    
    // Setup image preview for profile picture upload
    setupImagePreview();
}

/**
 * Initialize Bootstrap components
 */
function initBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Setup event listeners for user interactions
 */
function setupEventListeners() {
    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    
    if (sidebarToggle && sidebar && sidebarBackdrop) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            sidebarBackdrop.classList.toggle('show');
        });
        
        sidebarBackdrop.addEventListener('click', function() {
            sidebar.classList.remove('show');
            sidebarBackdrop.classList.remove('show');
        });
    }
    
    // Profile form submission
    const profileForm = document.getElementById('profile-edit-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    // Profile picture upload
    const profilePictureInput = document.getElementById('profile-picture-input');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', handleProfilePictureSelection);
    }
    
    // Save profile picture button
    const saveProfilePictureBtn = document.getElementById('saveProfilePictureBtn');
    if (saveProfilePictureBtn) {
        saveProfilePictureBtn.addEventListener('click', uploadProfilePicture);
    }
    
    // Change password button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
            passwordModal.show();
        });
    }
    
    // Save password button
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', handlePasswordUpdate);
    }
    
    // Upgrade button
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', function() {
            window.location.href = '/off-market-leads';
        });
    }
    
    // Sign out button
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
}

/**
 * Setup image preview for profile picture upload
 */
function setupImagePreview() {
    const fileInput = document.getElementById('profile_picture');
    const previewContainer = document.querySelector('.preview-container');
    const preview = document.getElementById('image-preview');
    
    if (fileInput && previewContainer && preview) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    previewContainer.classList.remove('d-none');
                }
                
                reader.readAsDataURL(this.files[0]);
            } else {
                previewContainer.classList.add('d-none');
            }
        });
    }
}

/**
 * Load user profile data from API
 */
function loadUserProfile() {
    const token = getAuthToken();
    
    if (!token) {
        console.warn('No auth token found, skipping profile fetch');
        return;
    }
    
    fetch('/api/profile', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('AUTH_FAILED');
            }
            throw new Error(`Profile fetch failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.profile) {
            updateProfileUI(data.profile);
        }
    })
    .catch(error => {
        console.error('Error fetching profile:', error);
        
        if (error.message === 'AUTH_FAILED') {
            window.location.href = '/login2?returnTo=' + encodeURIComponent(window.location.pathname);
        }
    });
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

/**
 * Load buyer status from API
 */
function loadBuyerStatus() {
    const token = getAuthToken();
    
    if (!token) {
        console.warn('No auth token found, skipping buyer status fetch');
        updateBuyerStatusUI(null);
        return;
    }
    
    console.log('Loading buyer status with token:', token.substring(0, 20) + '...');
    
    // First test if the buyer API is reachable
    fetch('/api/buyer/test', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Buyer API test response:', response.status);
        if (response.ok) {
            console.log('Buyer API is reachable, proceeding with status fetch');
            return fetchBuyerStatus(token);
        } else {
            throw new Error('Buyer API test failed');
        }
    })
    .catch(error => {
        console.error('Buyer API test failed:', error);
        updateBuyerStatusUI(null);
        showToast('Buyer API is not available. Please contact support.', 'error');
    });
}

/**
 * Fetch buyer status (separated for easier testing)
 */
function fetchBuyerStatus(token) {
    fetch('/api/buyer/status', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Buyer status response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Buyer status error response:', text);
                throw new Error(`Failed to fetch buyer status: ${response.status} - ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Buyer status data received:', data);
        updateBuyerStatusUI(data);
    })
    .catch(error => {
        console.error('Error fetching buyer status:', error);
        updateBuyerStatusUI(null);
        
        // Show user-friendly error message
        showToast('Unable to load buyer status. Please refresh the page.', 'error');
    });
}

/**
 * Update UI with buyer status
 * @param {Object|null} status - Buyer status data
 */
function updateBuyerStatusUI(status) {
    const buyerStatusBadge = document.getElementById('buyer-status-badge');
    const buyerStatusContent = document.getElementById('buyer-status-content');
    
    if (!buyerStatusBadge || !buyerStatusContent) {
        console.warn('Buyer status elements not found in DOM');
        return;
    }
    
    if (!status) {
        // Error state or not authenticated
        buyerStatusBadge.textContent = 'Error';
        buyerStatusBadge.className = 'badge bg-danger';
        buyerStatusContent.innerHTML = `
            <div class="text-center py-3">
                <div class="text-muted">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <p>Unable to load buyer status. Please refresh the page.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Update badge
    if (status.isPremium) {
        buyerStatusBadge.textContent = 'Premium Buyer';
        buyerStatusBadge.className = 'badge bg-warning text-dark';
    } else {
        buyerStatusBadge.textContent = 'Free Buyer';
        buyerStatusBadge.className = 'badge bg-secondary';
    }
    
    // Update content based on status
    if (status.isPremium) {
        buyerStatusContent.innerHTML = createPremiumBuyerContent(status);
    } else {
        buyerStatusContent.innerHTML = createFreeBuyerContent(status);
    }
    
    // Setup event listeners for buyer actions
    setupBuyerEventListeners(status);
}

/**
 * Create premium buyer content HTML
 * @param {Object} status - Buyer status data
 */
function createPremiumBuyerContent(status) {
    const planEndDate = status.planEnd ? new Date(status.planEnd).toLocaleDateString() : 'N/A';
    
    return `
        <div class="buyer-plan-card premium">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">
                    <i class="fas fa-crown text-warning me-2"></i>
                    Premium Buyer Plan
                </h6>
                <span class="badge bg-success">Active</span>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <small class="text-muted">Plan expires:</small>
                    <div class="fw-medium">${planEndDate}</div>
                </div>
                <div class="col-md-6">
                    <small class="text-muted">Reports used:</small>
                    <div class="fw-medium">${status.usage?.dueDiligenceReportsUsed || 0}/10</div>
                </div>
            </div>
            
            <h6 class="mb-2">Premium Features:</h6>
            <ul class="feature-list mb-3">
                <li>
                    <i class="fas fa-check-circle"></i>
                    Access to exclusive off-market listings
                </li>
                <li>
                    <i class="fas fa-check-circle"></i>
                    24-72 hour early access to new listings
                </li>
                <li>
                    <i class="fas fa-check-circle"></i>
                    Unlimited AI deal advisor
                </li>
                <li>
                    <i class="fas fa-check-circle"></i>
                    Priority customer support
                </li>
                <li>
                    <i class="fas fa-check-circle"></i>
                    Advanced due diligence reports
                </li>
            </ul>
            
            <div class="d-flex gap-2">
                <button class="btn btn-outline-primary flex-fill" onclick="window.open('/buyer-dashboard', '_blank')">
                    <i class="fas fa-tachometer-alt me-2"></i>
                    Dashboard
                </button>
                <button class="btn btn-outline-secondary flex-fill" id="manage-subscription-btn">
                    <i class="fas fa-cog me-2"></i>
                    Manage Plan
                </button>
            </div>
        </div>
    `;
}

/**
 * Create free buyer content HTML
 * @param {Object} status - Buyer status data
 */
function createFreeBuyerContent(status) {
    return `
        <div class="buyer-plan-card basic">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">
                    <i class="fas fa-user text-primary me-2"></i>
                    Free Buyer Plan
                </h6>
                <span class="badge bg-primary">Current Plan</span>
            </div>
            
            <div class="mb-3">
                <h6 class="mb-2">Current Features:</h6>
                <ul class="feature-list mb-3">
                    <li>
                        <i class="fas fa-check-circle text-success"></i>
                        Browse public business listings
                    </li>
                    <li>
                        <i class="fas fa-check-circle text-success"></i>
                        Basic search and filters
                    </li>
                    <li>
                        <i class="fas fa-check-circle text-success"></i>
                        Contact sellers directly
                    </li>
                    <li>
                        <i class="fas fa-times-circle text-muted"></i>
                        <span class="text-muted">Access to exclusive listings</span>
                    </li>
                    <li>
                        <i class="fas fa-times-circle text-muted"></i>
                        <span class="text-muted">Early access to new listings</span>
                    </li>
                </ul>
            </div>
        </div>
        
        <div class="premium-upgrade-section">
            <div class="text-center mb-3">
                <h5 class="mb-2">
                    <i class="fas fa-star me-2"></i>
                    Upgrade to Premium
                </h5>
                <p class="mb-0 opacity-75">
                    Unlock exclusive listings and advanced features
                </p>
            </div>
            
            <div class="row text-center mb-3">
                <div class="col-4">
                    <div class="h4 mb-1">500+</div>
                    <small class="opacity-75">Exclusive Listings</small>
                </div>
                <div class="col-4">
                    <div class="h4 mb-1">72hr</div>
                    <small class="opacity-75">Early Access</small>
                </div>
                <div class="col-4">
                    <div class="h4 mb-1">24/7</div>
                    <small class="opacity-75">AI Advisor</small>
                </div>
            </div>
            
            <div class="text-center mb-3">
                <div class="h3 mb-1">£35<small>/month</small></div>
                <small class="opacity-75">Cancel anytime</small>
            </div>
            
            <button class="btn btn-premium w-100" id="upgrade-to-premium-btn">
                <i class="fas fa-crown me-2"></i>
                Upgrade to Premium
            </button>
        </div>
    `;
}

/**
 * Setup event listeners for buyer actions
 * @param {Object} status - Buyer status data
 */
function setupBuyerEventListeners(status) {
    // Upgrade to premium button
    const upgradeBtn = document.getElementById('upgrade-to-premium-btn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', handlePremiumUpgrade);
    }
    
    // Manage subscription button
    const manageBtn = document.getElementById('manage-subscription-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', handleManageSubscription);
    }
}

/**
 * Handle premium upgrade process
 */
function handlePremiumUpgrade() {
    const token = getAuthToken();
    
    if (!token) {
        showToast('Please log in to upgrade your plan', 'error');
        return;
    }
    
    // Show loading state
    const upgradeBtn = document.getElementById('upgrade-to-premium-btn');
    if (upgradeBtn) {
        upgradeBtn.disabled = true;
        upgradeBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }
    
    fetch('/api/buyer/upgrade', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            plan: 'premium'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.checkoutUrl) {
                // Redirect to Stripe checkout
                window.location.href = data.checkoutUrl;
            } else {
                showToast('Upgrade initiated successfully!', 'success');
                // Reload buyer status
                setTimeout(() => {
                    loadBuyerStatus();
                }, 2000);
            }
        } else {
            throw new Error(data.error || 'Upgrade failed');
        }
    })
    .catch(error => {
        console.error('Upgrade error:', error);
        showToast('Failed to initiate upgrade: ' + error.message, 'error');
    })
    .finally(() => {
        // Reset button state
        if (upgradeBtn) {
            upgradeBtn.disabled = false;
            upgradeBtn.innerHTML = '<i class="fas fa-crown me-2"></i>Upgrade to Premium';
        }
    });
}

/**
 * Handle subscription management
 */
function handleManageSubscription() {
    // Open subscription management portal
    const token = getAuthToken();
    
    if (!token) {
        showToast('Please log in to manage your subscription', 'error');
        return;
    }
    
    fetch('/api/buyer/billing-portal', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.portalUrl) {
            window.open(data.portalUrl, '_blank');
        } else {
            throw new Error(data.error || 'Failed to open billing portal');
        }
    })
    .catch(error => {
        console.error('Billing portal error:', error);
        showToast('Unable to open billing portal at this time', 'error');
    });
}

/**
 * Update UI with profile data
 * @param {Object} profile - User profile data
 */
function updateProfileUI(profile) {
    // Update profile picture
    const profilePictures = document.querySelectorAll('.profile-avatar');
    profilePictures.forEach(img => {
        if (profile.profile_picture) {
            img.src = profile.profile_picture;
        }
    });
    
    // Update user name
    const usernames = document.querySelectorAll('h5, .username');
    usernames.forEach(element => {
        if (element.classList.contains('username') || element.tagName === 'H5') {
            element.textContent = profile.username;
        }
    });
    
    // Update form fields
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const bioInput = document.getElementById('bio');
    const locationInput = document.getElementById('location');
    const websiteInput = document.getElementById('website');
    
    if (usernameInput) usernameInput.value = profile.username || '';
    if (emailInput) emailInput.value = profile.email || '';
    if (bioInput) bioInput.value = profile.bio || '';
    if (locationInput) locationInput.value = profile.location || '';
    if (websiteInput) websiteInput.value = profile.website || '';
}

/**
 * Handle profile update form submission
 * @param {Event} event - Form submit event
 */
function handleProfileUpdate(event) {
    event.preventDefault();
    
    const token = getAuthToken();
    if (!token) {
        showToast('Authentication required. Please sign in again.', 'error');
        return;
    }
    
    const form = event.target;
    const formData = new FormData(form);
    
    const profileData = {
        username: formData.get('username'),
        email: formData.get('email'),
        bio: formData.get('bio'),
        location: formData.get('location'),
        website: formData.get('website')
    };
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    
    // Send update request
    fetch('/api/profile', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Update failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showToast('Profile updated successfully', 'success');
            updateProfileUI(data.profile);
        } else {
            showToast(data.error || 'Failed to update profile', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    })
    .finally(() => {
        // Restore button state
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    });
}

/**
 * Handle profile picture selection
 */
function handleProfilePictureSelection(event) {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        
        // Validate file type
        if (!file.type.match('image.*')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size must be less than 5MB', 'error');
            return;
        }
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById('preview-container');
            const preview = document.getElementById('image-preview');
            
            if (preview && previewContainer) {
                preview.src = e.target.result;
                previewContainer.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
        
        // Show modal
        const profilePictureModal = document.getElementById('profilePictureModal');
        if (profilePictureModal) {
            profilePictureModal.classList.remove('hidden');
        }
    }
}

/**
 * Upload profile picture with real-time updates
 */
function uploadProfilePicture() {
    const token = getAuthToken();
    if (!token) {
        showToast('Authentication required. Please sign in again.', 'error');
        return;
    }
    
    const fileInput = document.getElementById('profile_picture');
    if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    // Show loading state
    const saveButton = document.getElementById('saveProfilePictureBtn');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    // Add progress indicator
    const progressContainer = createProgressIndicator();
    const modal = document.getElementById('profilePictureModal');
    if (modal) {
        modal.querySelector('.p-6').appendChild(progressContainer);
    }
    
    // Send upload request with XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            updateProgressIndicator(progressContainer, percentComplete);
        }
    });
    
    xhr.addEventListener('load', function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    // Update profile picture in UI immediately
                    updateProfilePictureInUI(data.profilePicture);
                    
                    // Hide modal
                    hideProfilePictureModal();
                    
                    showToast('Profile picture updated successfully!', 'success');
                    
                    // Reset file input
                    fileInput.value = '';
                } else {
                    showToast(data.error || 'Failed to update profile picture', 'error');
                }
            } catch (error) {
                console.error('Error parsing response:', error);
                showToast('Error processing upload response', 'error');
            }
        } else {
            showToast(`Upload failed: ${xhr.status}`, 'error');
        }
        
        // Clean up
        if (progressContainer && progressContainer.parentNode) {
            progressContainer.parentNode.removeChild(progressContainer);
        }
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    });
    
    xhr.addEventListener('error', function() {
        console.error('Upload error');
        showToast('Error uploading profile picture', 'error');
        
        // Clean up
        if (progressContainer && progressContainer.parentNode) {
            progressContainer.parentNode.removeChild(progressContainer);
        }
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    });
    
    // Start upload
    xhr.open('POST', '/profile/update-picture');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
}

/**
 * Handle password update
 */
function handlePasswordUpdate() {
    const token = getAuthToken();
    if (!token) {
        showToast('Authentication required. Please sign in again.', 'error');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('All fields are required', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters long', 'error');
        return;
    }
    
    // Show loading state
    const saveButton = document.getElementById('savePasswordBtn');
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    
    // Send password update request
    fetch('/profile/change-password', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentPassword,
            newPassword
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Update failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Hide modal
            const passwordModal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
            passwordModal.hide();
            
            // Reset form
            document.getElementById('password-form').reset();
            
            showToast('Password updated successfully', 'success');
        } else {
            showToast(data.error || 'Failed to update password', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating password:', error);
        showToast('Error updating password', 'error');
    })
    .finally(() => {
        // Restore button state
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    });
}

/**
 * Handle sign out
 */
async function handleSignOut() {
    // Load modern modal if not already loaded
    if (!window.ModernSignOutModal) {
        await loadModernModal();
    }
    
    // Show modern confirmation modal
    const confirmed = await ModernSignOutModal.confirm({
        title: 'Sign out of your account?',
        message: "You'll be safely signed out and redirected to our homepage. Your data will remain secure."
    });
    
    if (confirmed) {
        // Make POST request to logout API endpoint
        fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // Include cookies
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear any client-side storage
                try {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('user');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('refreshToken');
                } catch (error) {
                    console.log('Could not clear localStorage:', error);
                }
                
                // Redirect to sign-out confirmation page
                window.location.href = data.redirectTo || '/auth/logout';
            } else {
                console.error('Logout failed:', data.message);
                // Still redirect to logout page even if API fails
                window.location.href = '/auth/logout';
            }
        })
        .catch(error => {
            console.error('Logout request failed:', error);
            // Still redirect to logout page even if request fails
            window.location.href = '/auth/logout';
        });
    }
}

/**
 * Load modern modal script dynamically
 */
async function loadModernModal() {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = '/js/modern-signout-modal.js';
        script.onload = resolve;
        script.onerror = resolve; // Continue even if fails to load
        document.head.appendChild(script);
    });
}

/**
 * Create progress indicator for file upload
 * @returns {HTMLElement} Progress container element
 */
function createProgressIndicator() {
    const container = document.createElement('div');
    container.className = 'mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg';
    container.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading...</span>
            <span class="text-sm text-gray-500 dark:text-gray-400" id="upload-percent">0%</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div class="bg-primary h-2 rounded-full transition-all duration-300" id="upload-progress" style="width: 0%"></div>
        </div>
    `;
    return container;
}

/**
 * Update progress indicator
 * @param {HTMLElement} container - Progress container
 * @param {number} percent - Progress percentage
 */
function updateProgressIndicator(container, percent) {
    const progressBar = container.querySelector('#upload-progress');
    const percentText = container.querySelector('#upload-percent');
    
    if (progressBar && percentText) {
        progressBar.style.width = `${percent}%`;
        percentText.textContent = `${Math.round(percent)}%`;
        
        if (percent >= 100) {
            const uploadText = container.querySelector('span');
            if (uploadText) {
                uploadText.textContent = 'Processing...';
            }
        }
    }
}

/**
 * Update profile picture in all UI locations
 * @param {string} newImageUrl - New profile picture URL
 */
function updateProfilePictureInUI(newImageUrl) {
    // Update all profile pictures on the page
    const profileImages = document.querySelectorAll('img[src*="profile"], img[alt*="Profile"], .profile-avatar, img[alt*="profile"]');
    
    profileImages.forEach(img => {
        // Add loading animation
        img.style.opacity = '0.5';
        img.style.transition = 'opacity 0.3s ease';
        
        // Update src with cache busting
        const cacheBuster = '?t=' + Date.now();
        img.src = newImageUrl + cacheBuster;
        
        // Remove loading animation when loaded
        img.onload = function() {
            this.style.opacity = '1';
        };
    });
    
    // Update sidebar profile picture specifically
    const sidebarProfileImg = document.querySelector('#sidebar img[alt="Profile Picture"]');
    if (sidebarProfileImg) {
        sidebarProfileImg.style.opacity = '0.5';
        sidebarProfileImg.src = newImageUrl + '?t=' + Date.now();
        sidebarProfileImg.onload = function() {
            this.style.opacity = '1';
        };
    }
    
    // Update main profile overview image
    const mainProfileImg = document.querySelector('.profile-overview img, .w-32.h-32');
    if (mainProfileImg) {
        mainProfileImg.style.opacity = '0.5';
        mainProfileImg.src = newImageUrl + '?t=' + Date.now();
        mainProfileImg.onload = function() {
            this.style.opacity = '1';
        };
    }
}

/**
 * Hide profile picture modal
 */
function hideProfilePictureModal() {
    const modal = document.getElementById('profilePictureModal');
    if (modal) {
        modal.classList.add('hidden');
        
        // Reset preview
        const previewContainer = document.getElementById('preview-container');
        const preview = document.getElementById('image-preview');
        
        if (previewContainer) {
            previewContainer.classList.add('hidden');
        }
        if (preview) {
            preview.src = '';
        }
    }
}

/**
 * Enhanced toast notification with better styling
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, info, warning)
 */
function showEnhancedToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `custom-toast fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    // Set colors based on type
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        warning: 'bg-yellow-500 text-black',
        info: 'bg-blue-500 text-white'
    };
    
    toast.className += ' ' + (colors[type] || colors.info);
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="${icons[type] || icons.info} mr-3"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-xl leading-none hover:opacity-75">&times;</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 5000);
}

/**
 * Get authentication token
 * @returns {string|null} Auth token
 */
function getAuthToken() {
    // Try meta tag first
    const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
    if (metaToken) return metaToken;
    
    // Try localStorage
    return localStorage.getItem('token');
}
