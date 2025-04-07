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
function handleProfilePictureSelection() {
    const profilePictureModal = new bootstrap.Modal(document.getElementById('profilePictureModal'));
    profilePictureModal.show();
}

/**
 * Upload profile picture
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
    saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
    
    // Send upload request
    fetch('/profile/update-picture', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update profile picture in UI
            const profilePictures = document.querySelectorAll('.profile-avatar');
            profilePictures.forEach(img => {
                img.src = data.profilePicture;
            });
            
            // Hide modal
            const profilePictureModal = bootstrap.Modal.getInstance(document.getElementById('profilePictureModal'));
            profilePictureModal.hide();
            
            showToast('Profile picture updated successfully', 'success');
        } else {
            showToast(data.error || 'Failed to update profile picture', 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading profile picture:', error);
        showToast('Error uploading profile picture', 'error');
    })
    .finally(() => {
        // Restore button state
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    });
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
function handleSignOut() {
    // Clear token from localStorage
    localStorage.removeItem('token');
    
    // Redirect to login page
    window.location.href = '/login2';
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

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, info, warning)
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Set toast color based on type
    let bgColor = 'bg-primary';
    if (type === 'success') bgColor = 'bg-success';
    if (type === 'error') bgColor = 'bg-danger';
    if (type === 'warning') bgColor = 'bg-warning';
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header ${bgColor} text-white">
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}
