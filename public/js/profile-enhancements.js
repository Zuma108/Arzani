// Enhanced Profile Picture Upload Functions

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

// Override the showToast function to use enhanced version
function showToast(message, type = 'info') {
    showEnhancedToast(message, type);
}