/**
 * Verified Professional Dashboard JavaScript
 * Handles profile management, portfolio, and analytics
 */

let currentProfile = null;
let isEditing = false;
let portfolioItems = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Load professional profile data
        await loadProfessionalProfile();
        
        // Load dashboard statistics
        await loadDashboardStats();
        
        // Load recent activity
        await loadRecentActivity();
        
        // Load recent reviews
        await loadRecentReviews();
        
        // Initialize event listeners
        initializeEventListeners();
        
        console.log('Professional dashboard initialized successfully');
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

async function loadProfessionalProfile() {
    try {
        const token = getAuthToken();
        if (!token) {
            window.location.href = '/professional-verification';
            return;
        }

        const response = await fetch('/api/professional-profile', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // No professional profile found - redirect to verification
                window.location.href = '/professional-verification';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            currentProfile = data.profile;
            populateProfileForm(currentProfile);
            updateProfileCompletion(currentProfile);
            loadPortfolioItems(currentProfile.portfolio_items);
        } else {
            throw new Error(data.error || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading professional profile:', error);
        showNotification('Failed to load professional profile', 'error');
    }
}

function populateProfileForm(profile) {
    // Populate form fields
    document.getElementById('professional-tagline').value = profile.professional_tagline || '';
    document.getElementById('years-experience').value = profile.years_experience || '';
    document.getElementById('professional-bio').value = profile.professional_bio || '';
    document.getElementById('professional-website').value = profile.professional_website || '';
    document.getElementById('specializations').value = profile.specializations ? profile.specializations.join(', ') : '';
    document.getElementById('allow-direct-contact').checked = profile.allow_direct_contact || false;
    document.getElementById('profile-visibility').checked = profile.profile_visibility === 'public';

    // Populate services
    populateServices(profile.services_offered || []);

    // Disable form initially
    setFormEditMode(false);
}

function populateServices(services) {
    const container = document.getElementById('services-container');
    container.innerHTML = '';

    services.forEach((service, index) => {
        addServiceField(service, index);
    });

    if (services.length === 0) {
        addServiceField('', 0);
    }
}

function addServiceField(value = '', index = 0) {
    const container = document.getElementById('services-container');
    const serviceDiv = document.createElement('div');
    serviceDiv.className = 'flex items-center space-x-2';
    serviceDiv.innerHTML = `
        <input type="text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent service-input" 
               value="${escapeHtml(value)}" placeholder="e.g., Business Brokerage, M&A Advisory" ${!isEditing ? 'disabled' : ''}>
        <button type="button" class="px-2 py-2 text-red-500 hover:text-red-700 remove-service-btn" ${!isEditing ? 'disabled' : ''}>
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(serviceDiv);

    // Add event listener for remove button
    serviceDiv.querySelector('.remove-service-btn').addEventListener('click', function() {
        if (container.children.length > 1) {
            serviceDiv.remove();
        }
    });
}

function updateProfileCompletion(profile) {
    const fields = [
        profile.professional_tagline,
        profile.professional_bio,
        profile.years_experience,
        profile.services_offered?.length > 0,
        profile.specializations?.length > 0,
        profile.professional_website,
        profile.portfolio_items?.length > 0
    ];

    const completedFields = fields.filter(field => field && field !== '').length;
    const completionPercentage = Math.round((completedFields / fields.length) * 100);

    // Update completion bar
    document.getElementById('completion-bar').style.width = `${completionPercentage}%`;
    document.getElementById('completion-text').textContent = `${completionPercentage}%`;
    document.getElementById('completion-percentage').textContent = completionPercentage;

    // Show/hide completion alert
    const alert = document.getElementById('completion-alert');
    if (completionPercentage < 80) {
        alert.classList.remove('hidden');
    } else {
        alert.classList.add('hidden');
    }
}

function loadPortfolioItems(items) {
    portfolioItems = items || [];
    renderPortfolioItems();
}

function renderPortfolioItems() {
    const container = document.getElementById('portfolio-container');
    const noPortfolio = document.getElementById('no-portfolio');

    if (portfolioItems.length === 0) {
        container.classList.add('hidden');
        noPortfolio.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    noPortfolio.classList.add('hidden');
    container.innerHTML = '';

    portfolioItems.forEach((item, index) => {
        const portfolioCard = document.createElement('div');
        portfolioCard.className = 'portfolio-item bg-white border rounded-lg p-4 hover:shadow-md transition-shadow';
        portfolioCard.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium text-gray-900">${escapeHtml(item.title || 'Untitled')}</h4>
                <button class="text-red-500 hover:text-red-700 remove-portfolio-btn" data-index="${index}">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
            <p class="text-sm text-gray-600 mb-2">${escapeHtml(item.description || '')}</p>
            <div class="flex items-center justify-between">
                <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${escapeHtml(item.type || 'project')}</span>
                ${item.url ? `<a href="${item.url}" target="_blank" class="text-blue-500 hover:text-blue-700 text-sm"><i class="fas fa-external-link-alt"></i></a>` : ''}
            </div>
        `;
        container.appendChild(portfolioCard);
    });

    // Add event listeners for remove buttons
    container.querySelectorAll('.remove-portfolio-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removePortfolioItem(index);
        });
    });
}

async function loadDashboardStats() {
    try {
        // For now, show placeholder data
        // In a real implementation, these would come from analytics APIs
        document.getElementById('profile-views').textContent = '0';
        document.getElementById('contact-requests').textContent = '0';
        document.getElementById('average-rating').textContent = currentProfile?.average_rating?.toFixed(1) || '0.0';
        document.getElementById('total-reviews').textContent = currentProfile?.review_count || '0';
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recent-activity');
    container.innerHTML = `
        <div class="flex items-center space-x-3 text-sm text-gray-600">
            <i class="fas fa-user-check text-green-500"></i>
            <span>Profile verification completed</span>
        </div>
        <div class="flex items-center space-x-3 text-sm text-gray-600">
            <i class="fas fa-edit text-blue-500"></i>
            <span>Profile last updated ${formatDate(currentProfile?.updated_at)}</span>
        </div>
    `;
}

async function loadRecentReviews() {
    // Placeholder for recent reviews
    const container = document.getElementById('recent-reviews');
    if (currentProfile?.review_count > 0) {
        // In a real implementation, fetch recent reviews from API
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <p class="text-sm">Reviews will be displayed here</p>
            </div>
        `;
    }
}

function initializeEventListeners() {
    // Edit profile button
    document.getElementById('edit-profile-btn').addEventListener('click', function() {
        setFormEditMode(true);
    });

    // Cancel edit button
    document.getElementById('cancel-edit-btn').addEventListener('click', function() {
        setFormEditMode(false);
        populateProfileForm(currentProfile); // Reset form
    });

    // Save profile button
    document.getElementById('save-profile-btn').addEventListener('click', function(e) {
        e.preventDefault();
        saveProfile();
    });

    // Add service button
    document.getElementById('add-service-btn').addEventListener('click', function() {
        const container = document.getElementById('services-container');
        addServiceField('', container.children.length);
    });

    // Portfolio buttons
    document.getElementById('add-portfolio-btn').addEventListener('click', function() {
        showPortfolioModal();
    });

    document.getElementById('close-portfolio-modal').addEventListener('click', function() {
        hidePortfolioModal();
    });

    document.getElementById('cancel-portfolio').addEventListener('click', function() {
        hidePortfolioModal();
    });

    document.getElementById('portfolio-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addPortfolioItem();
    });

    // Modal backdrop click
    document.getElementById('portfolio-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            hidePortfolioModal();
        }
    });
}

function setFormEditMode(editing) {
    isEditing = editing;
    const form = document.getElementById('profile-form');
    const inputs = form.querySelectorAll('input, textarea, select');
    const editBtn = document.getElementById('edit-profile-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const addServiceBtn = document.getElementById('add-service-btn');
    const removeServiceBtns = form.querySelectorAll('.remove-service-btn');

    inputs.forEach(input => {
        input.disabled = !editing;
    });

    removeServiceBtns.forEach(btn => {
        btn.disabled = !editing;
    });

    addServiceBtn.disabled = !editing;

    if (editing) {
        editBtn.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
        saveBtn.classList.remove('hidden');
        form.classList.add('border-2', 'border-blue-200', 'rounded-lg');
    } else {
        editBtn.classList.remove('hidden');
        cancelBtn.classList.add('hidden');
        saveBtn.classList.add('hidden');
        form.classList.remove('border-2', 'border-blue-200', 'rounded-lg');
    }
}

async function saveProfile() {
    try {
        const token = getAuthToken();
        if (!token) {
            showNotification('Authentication required', 'error');
            return;
        }

        // Collect form data
        const formData = {
            professional_tagline: document.getElementById('professional-tagline').value,
            years_experience: parseInt(document.getElementById('years-experience').value) || null,
            professional_bio: document.getElementById('professional-bio').value,
            professional_website: document.getElementById('professional-website').value,
            allow_direct_contact: document.getElementById('allow-direct-contact').checked,
            profile_visibility: document.getElementById('profile-visibility').checked ? 'public' : 'private'
        };

        // Collect services
        const serviceInputs = document.querySelectorAll('.service-input');
        const services = Array.from(serviceInputs)
            .map(input => input.value.trim())
            .filter(service => service !== '');
        formData.services_offered = services;

        // Collect specializations
        const specializationsText = document.getElementById('specializations').value;
        const specializations = specializationsText
            .split(',')
            .map(spec => spec.trim())
            .filter(spec => spec !== '');
        formData.specializations = specializations;

        // Save portfolio items
        formData.portfolio_items = portfolioItems;

        const response = await fetch('/api/professional-profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            currentProfile = data.profile;
            setFormEditMode(false);
            updateProfileCompletion(currentProfile);
            showNotification('Profile updated successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to save profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Failed to save profile. Please try again.', 'error');
    }
}

function showPortfolioModal() {
    document.getElementById('portfolio-modal').classList.remove('hidden');
    document.getElementById('portfolio-modal').classList.add('flex');
}

function hidePortfolioModal() {
    document.getElementById('portfolio-modal').classList.add('hidden');
    document.getElementById('portfolio-modal').classList.remove('flex');
    document.getElementById('portfolio-form').reset();
}

function addPortfolioItem() {
    const title = document.getElementById('portfolio-title').value;
    const description = document.getElementById('portfolio-description').value;
    const type = document.getElementById('portfolio-type').value;
    const file = document.getElementById('portfolio-file').files[0];

    if (!title.trim()) {
        showNotification('Portfolio title is required', 'error');
        return;
    }

    const portfolioItem = {
        title: title.trim(),
        description: description.trim(),
        type: type,
        created_at: new Date().toISOString()
    };

    // In a real implementation, you would upload the file to S3/GCS
    if (file) {
        portfolioItem.file_name = file.name;
        portfolioItem.file_size = file.size;
        portfolioItem.file_type = file.type;
        // portfolioItem.url = 'uploaded_file_url';
    }

    portfolioItems.push(portfolioItem);
    renderPortfolioItems();
    hidePortfolioModal();
    showNotification('Portfolio item added successfully', 'success');
}

function removePortfolioItem(index) {
    if (confirm('Are you sure you want to remove this portfolio item?')) {
        portfolioItems.splice(index, 1);
        renderPortfolioItems();
        showNotification('Portfolio item removed', 'success');
    }
}

// Utility functions
function getAuthToken() {
    return localStorage.getItem('token') || 
           document.querySelector('meta[name="auth-token"]')?.content;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check' :
                type === 'error' ? 'fa-exclamation-triangle' :
                'fa-info'
            } mr-2"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Add click to dismiss
    notification.addEventListener('click', () => {
        notification.remove();
    });
}