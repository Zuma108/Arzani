/**
 * Marketplace2 JavaScript
 * Handles marketplace listing functionality with enhanced UI
 */

// SECURITY: Utility functions for safe HTML handling
const SecurityUtils = {
  /**
   * Escape HTML characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml: function(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Safely set innerHTML with basic sanitization
   * @param {HTMLElement} element - Target element
   * @param {string} html - HTML content to set
   */
  safeSetInnerHTML: function(element, html) {
    // For now, we'll use innerHTML but with validation
    // In production, consider using DOMPurify library
    if (!element || typeof html !== 'string') return;
    
    // Basic validation - reject scripts
    if (html.includes('<script') || html.includes('javascript:') || html.includes('on')) {
      console.warn('Potentially unsafe HTML detected, using text content instead');
      element.textContent = html.replace(/<[^>]*>/g, '');
      return;
    }
    
    element.innerHTML = html;
  },

  /**
   * Create a safe text node
   * @param {string} text - Text content
   * @returns {Text} Text node
   */
  createSafeTextNode: function(text) {
    return document.createTextNode(this.escapeHtml(text));
  }
};

// Create a helper for conditional logging
function debugLog(...args) {
  if (window.DEBUG_MODE) {
    console.log(...args);
  }
}

// DOM Ready handler
document.addEventListener('DOMContentLoaded', function() {
    debugLog('Marketplace2 script initialized');
    
    // Check if there's an s3Config element with data
    const s3ConfigEl = document.getElementById('s3-config');
    if (s3ConfigEl) {
        try {
            const config = JSON.parse(s3ConfigEl.textContent);
            window.AWS_REGION = config.region || 'eu-west-2'; // Default to London region
            window.AWS_BUCKET_NAME = config.bucketName || 'arzani-images1';
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
    }
    
    // Initialize all components
    initializeDropdowns();
    initializeFilters();
    initializeListingCards();
    initializeContactButtons();
    initializeSaveButtons();
});

/**
 * Initialize dropdown functionality for filters
 */
function initializeDropdowns() {
    // Handle dropdown toggles manually since we're using custom styling
    document.querySelectorAll('.filter-input.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Find the associated dropdown menu
            const parent = this.closest('.dropdown');
            const menu = parent.querySelector('.dropdown-menu');
            
            // Close all other open dropdowns first
            document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
                if (openMenu !== menu) {
                    openMenu.classList.remove('show');
                }
            });
            
            // Toggle this dropdown
            menu.classList.toggle('show');
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
    
    // Handle dropdown item selection
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            // Update toggle text if needed
            if (this.dataset.value) {
                toggle.dataset.value = this.dataset.value;
                if (this.textContent) {
                    toggle.textContent = this.textContent.trim();
                }
            }
            
            // Close the dropdown
            menu.classList.remove('show');
            
            // Trigger change event
            toggle.dispatchEvent(new Event('change'));
        });
    });
}

/**
 * Initialize filter functionality
 */
function initializeFilters() {
    const filterForm = document.getElementById('filter-form');
    if (!filterForm) return;
    
    filterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        applyFilters();
    });
    
    // Reset filters button
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            filterForm.reset();
            applyFilters();
        });
    }
}

/**
 * Apply selected filters
 */
function applyFilters() {
    // Get filter values
    const industry = document.getElementById('industry-filter')?.value;
    const location = document.getElementById('location-filter')?.value;
    const minPrice = document.getElementById('min-price')?.value;
    const maxPrice = document.getElementById('max-price')?.value;
    
    // Build query string
    const params = new URLSearchParams();
    if (industry) params.append('industry', industry);
    if (location) params.append('location', location);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    
    // Reload page with filters
    loadFilteredResults(params);
}

/**
 * Load filtered results via AJAX
 */
function loadFilteredResults(params) {
    const listingsContainer = document.getElementById('listings-container');
    if (!listingsContainer) return;
    
    // Show loading indicator
    SecurityUtils.safeSetInnerHTML(listingsContainer, '<div class="loading-spinner">Loading...</div>');
    
    // Fetch filtered results
    fetch(`/api/businesses?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.businesses) {
                renderBusinesses(data.businesses);
            } else {
                SecurityUtils.safeSetInnerHTML(listingsContainer, '<p>No businesses found matching your criteria.</p>');
            }
        })
        .catch(error => {
            console.error('Error fetching filtered results:', error);
            SecurityUtils.safeSetInnerHTML(listingsContainer, '<p>Error loading businesses. Please try again.</p>');
        });
}

/**
 * Initialize business listing cards
 */
function initializeListingCards() {
    // Add click handlers to cards
    document.querySelectorAll('.business-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Ignore clicks on specific elements like buttons
            if (e.target.closest('.contact-btn') || 
                e.target.closest('.save-business-btn')) {
                return;
            }
            
            // Navigate to business details page
            const businessId = this.dataset.businessId;
            if (businessId) {
                window.location.href = `/businesses/${businessId}`;
            }
        });
    });
}

/**
 * Initialize contact seller buttons
 */
function initializeContactButtons() {
  document.querySelectorAll('.contact-btn, .contact-seller-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default navigation
      
      // Check if user is logged in
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login with return URL to current page
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      
      // Extract business and other user IDs from data attributes
      const businessId = this.getAttribute('data-business-id');
      const otherUserId = this.getAttribute('data-user-id');
      
      if (!otherUserId) {
        console.error('Invalid user ID');
        
        // Try to fetch user ID from parent element if available
        const cardElement = this.closest('[data-user-id]');
        if (cardElement && cardElement.dataset.userId) {
          otherUserId = cardElement.dataset.userId;
        } else {
          alert('Cannot contact: Missing user information');
          return;
        }
      }
      
      // Get business name for the modal title
      let businessName = "this business";
      const card = this.closest('.card, .business-card');
      if (card) {
        const nameElement = card.querySelector('.business-name, h5.card-title');
        if (nameElement) {
          businessName = nameElement.textContent.trim();
        }
      }
      
      // Set values in the contact form modal
      const contactBusinessIdInput = document.getElementById('contactBusinessId');
      const contactOtherUserIdInput = document.getElementById('contactOtherUserId');
      
      if (contactBusinessIdInput) contactBusinessIdInput.value = businessId;
      if (contactOtherUserIdInput) contactOtherUserIdInput.value = otherUserId;
      
      // Update modal title with business name
      const modalTitle = document.getElementById('contactFormModalLabel');
      if (modalTitle) {
        modalTitle.textContent = `Contact about ${businessName}`;
      }
      
      // Ensure modal element exists
      const contactFormModal = document.getElementById('contactFormModal');
      if (!contactFormModal) {
        console.error('Contact form modal element not found');
        return;
      }
      
      // Show the modal
      try {
        const contactModal = new bootstrap.Modal(contactFormModal);
        contactModal.show();
      } catch (error) {
        console.error('Error showing modal:', error);
      }
    });
  });
  
  // Handle form submission - consolidate/update both implementations
  document.addEventListener('DOMContentLoaded', function() {
    // Find the submit button for the contact form
    const submitContactForm = document.getElementById('submitContactForm');
    if (submitContactForm) {
      submitContactForm.addEventListener('click', function() {
        const form = document.getElementById('preContactForm');
        if (!form || !form.checkValidity()) {
          if (form) form.reportValidity();
          return;
        }
        
        // Show loading state
        const button = this;
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Get form data
        const businessId = document.getElementById('contactBusinessId').value;
        const firstName = document.getElementById('contactFirstName')?.value || '';
        const lastName = document.getElementById('contactLastName')?.value || '';
        const email = document.getElementById('contactEmail')?.value || '';
        const phone = document.getElementById('contactPhone')?.value || '';
        const timeframe = document.getElementById('buyerTimeline').value;
        const message = document.getElementById('initialMessage').value;
        const newsletter = document.getElementById('contactConsent')?.checked || false;
        
        // Submit to contact-seller endpoint
        fetch('/contact-seller', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            businessId,
            firstName,
            lastName,
            email,
            phone,
            timeframe,
            message,
            newsletter
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to submit contact form');
          }
          return response.json();
        })
        .then(data => {
          debugLog('Contact form submitted successfully:', data);
          
          // Hide the modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('contactFormModal'));
          if (modal) modal.hide();
          
          // Success notification
          showToast('Success', 'Your inquiry has been sent! Redirecting to chat...', 'success');
          
          // IMPORTANT: Ensure we always have a valid chat URL
          // Use a consistent URL format with fallbacks
          const chatUrl = data.chatUrl || `/chat?conversation=${data.conversationId}`;
          
          // Debug log the URL we're redirecting to
          debugLog('Redirecting to chat URL:', chatUrl);
          
          // Redirect after a short delay to ensure toast is seen
          setTimeout(() => {
            window.location.href = chatUrl;
          }, 1500);
        })
        .catch(error => {
          console.error('Error submitting contact form:', error);
          
          // Reset button
          button.disabled = false;
          button.innerHTML = originalText;
          
          // Error notification
          showToast('Error', 'Failed to send inquiry. Please try again.', 'error');
        });
      });
    }
  });
}

/**
 * Show a toast notification
 */
function showToast(title, message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} show`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Initialize save business buttons
 */
function initializeSaveButtons() {
    document.querySelectorAll('.save-business-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent card click
            
            const businessId = this.dataset.businessId;
            if (!businessId) return;
            
            // Check if user is logged in
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to save businesses');
                return;
            }
            
            // Toggle saved status
            toggleSavedStatus(this, businessId);
        });
        
        // Check initial saved status
        const businessId = button.dataset.businessId;
        if (businessId) {
            checkSavedStatus(businessId, button);
        }
    });
}

/**
 * Toggle saved status for a business
 */
async function toggleSavedStatus(button, businessId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const isSaved = button.classList.contains('saved');
        const url = isSaved 
            ? `/api/business/unsave/${businessId}`
            : '/api/business/save';
        const method = isSaved ? 'DELETE' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: isSaved ? undefined : JSON.stringify({ businessId })
        });
        
        if (response.ok) {
            // Toggle saved class and icon
            button.classList.toggle('saved');
            const icon = button.querySelector('i');
            if (icon) {
                if (isSaved) {
                    icon.classList.replace('bi-bookmark-fill', 'bi-bookmark');
                } else {
                    icon.classList.replace('bi-bookmark', 'bi-bookmark-fill');
                }
            }
        }
    } catch (error) {
        console.error('Error toggling saved status:', error);
    }
}

/**
 * Check if a business is saved by the current user
 */
async function checkSavedStatus(businessId, button) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`/api/business/is-saved/${businessId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.isSaved) {
                button.classList.add('saved');
                const icon = button.querySelector('i');
                if (icon) {
                    icon.classList.replace('bi-bookmark', 'bi-bookmark-fill');
                }
            }
        }
    } catch (error) {
        console.error('Error checking saved status:', error);
    }
}

function renderBusinesses(businesses) {
    const listingsContainer = document.getElementById('listings-container');
    listingsContainer.innerHTML = '';

    businesses.forEach(business => {
        const businessCard = document.createElement('div');
        businessCard.className = 'col-md-4 mb-4';

        // Process images URLs to ensure they use the correct S3 region
        const images = formatBusinessImages(business);

        const imagesHtml = images.length > 0 
            ? `<div class="card-image-carousel">
                <button class="save-business-btn" data-business-id="${business.id}">
                    <i class="bi bi-bookmark"></i>
                </button>
                <div class="carousel-inner">
                    ${images.map((imageUrl, index) => `
                        <div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                            <div class="image-placeholder" style="background-image: url('/images/placeholder.jpg')"></div>
                            <img src="${index === 0 ? imageUrl : ''}" 
                                 data-src="${imageUrl}"
                                 class="card-img-top ${index > 0 ? 'lazy-load' : ''}" 
                                 alt="${business.business_name}" 
                                 loading="${index === 0 ? 'eager' : 'lazy'}"
                                 onload="this.classList.add('loaded')"
                                 onerror="this.onerror=null; this.src='/images/default-business.jpg'">
                        </div>
                    `).join('')}
                </div>
                ${images.length > 1 ? createCarouselControls(images.length) : ''}
            </div>`
            : createDefaultImage();
            
        // Build the business card HTML
        const businessCardHTML = `
            <div class="card h-100">
                ${imagesHtml}
                <div class="card-body">
                    <h5 class="card-title">${SecurityUtils.escapeHtml(business.business_name)}</h5>
                    <p class="card-location">${SecurityUtils.escapeHtml(business.location || 'Location not specified')}</p>
                    <p class="card-price">£${formatPrice(business.price)}</p>
                    <div class="d-flex justify-content-between gap-2 mt-3">
                        <button class="btn btn-primary flex-grow-1 view-details-btn" 
                                data-business-id="${SecurityUtils.escapeHtml(business.id)}"
                                onclick="window.location.href='/businesses/${SecurityUtils.escapeHtml(business.id)}'">
                            View Details
                        </button>
                        <button class="btn btn-outline-secondary flex-grow-1 contact-btn"
                           data-business-id="${SecurityUtils.escapeHtml(business.id)}"
                           data-user-id="${SecurityUtils.escapeHtml(business.user_id)}">
                            Contact
                        </button>
                    </div>
                </div>
            </div>
        `;
        SecurityUtils.safeSetInnerHTML(businessCard, businessCardHTML);
        
        listingsContainer.appendChild(businessCard);
    });
    
    // Initialize lazy loading after adding all cards to DOM
    initLazyLoading();
}

// Add a helper function to format business images correctly with multi-region support
function formatBusinessImages(business) {
  if (!business.images || !Array.isArray(business.images) || business.images.length === 0) {
    return ['/images/default-business.jpg'];
  }
  
  // Use processedImages if available from our enhanced API
  if (business.processedImages && Array.isArray(business.processedImages)) {
    return business.processedImages;
  }
  
  // Otherwise process the image URLs manually
  return business.images.map(image => {
    // If it's already a full URL
    if (image.startsWith('http')) {
      // Leave URL as is - we'll handle region fallbacks in the img.onerror handler
      return image;
    }
    
    // Get bucket name from window globals or use a default
    const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
    
    // Try to determine the best region based on the image path
    let region = window.AWS_REGION || 'eu-west-2';
    
    // Check if the image path contains region hints
    if (image.includes('eu-north-1')) {
      region = 'eu-north-1';
    } else if (image.includes('eu-west-2')) {
      region = 'eu-west-2';
    }
    
    // Return the full URL
    return `https://${bucket}.s3.${region}.amazonaws.com/businesses/${business.id}/${image}`;
  });
}

/**
 * Initialize lazy loading with multi-region support
 */
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        // Clean up existing observer
        if (imageObserver) {
            imageObserver.disconnect();
        }
        
        // Create new observer
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        // Create the fallback URL before setting src
                        if (img.dataset.src.includes('eu-west-2')) {
                            img.dataset.fallback = img.dataset.src.replace('eu-west-2', 'eu-north-1');
                        } else if (img.dataset.src.includes('eu-north-1')) {
                            img.dataset.fallback = img.dataset.src.replace('eu-north-1', 'eu-west-2');
                        }
                        
                        // Load the image
                        img.src = img.dataset.src;
                        
                        // Make sure the error handler is in place
                        img.onerror = function() {
                            // No need to log here - the global handler will handle it
                            handleImageError(this);
                        };
                        
                        img.removeAttribute('data-src');
                        img.classList.remove('lazy-load');
                        imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '200px',
            threshold: 0.1
        });

        const lazyImages = document.querySelectorAll('img.lazy-load');
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers that don't support Intersection Observer
        document.querySelectorAll('img.lazy-load').forEach(img => {
            img.src = img.dataset.src;
            
            // Add error handler for region fallback
            img.onerror = function() {
                debugLog('Image failed to load, trying alternate region:', this.src);
                const currentSrc = this.src;
                
                if (currentSrc.includes('s3.eu-west-2.amazonaws.com')) {
                    this.src = currentSrc.replace('s3.eu-west-2.amazonaws.com', 's3.eu-north-1.amazonaws.com');
                } else if (currentSrc.includes('s3.eu-north-1.amazonaws.com')) {
                    this.src = currentSrc.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
                } else {
                    this.src = '/images/default-business.jpg';
                }
            };
        });
    }
}

// Function to format price with commas
function formatPrice(price) {
    return new Intl.NumberFormat('en-GB').format(price || 0);
}

// Function to create image placeholders
function createDefaultImage() {
    return `<div class="card-image-placeholder">
        <img src="/images/default-business.jpg" class="card-img-top" alt="No image available">
    </div>`;
}

// Function to handle carousel navigation
function handleCarouselNav(cardElement, direction) {
    const carousel = cardElement.querySelector('.carousel-inner');
    if (!carousel) return;
    
    const items = carousel.querySelectorAll('.carousel-item');
    const activeItem = carousel.querySelector('.carousel-item.active');
    let currentIndex = parseInt(activeItem.dataset.index);
    
    // Calculate new index
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;
    
    // Hide current item
    activeItem.classList.remove('active');
    
    // Show new item
    const newItem = carousel.querySelector(`.carousel-item[data-index="${newIndex}"]`);
    newItem.classList.add('active');
    
    // Load image if it hasn't been loaded yet
    const lazyImg = newItem.querySelector('img.lazy-load');
    if (lazyImg) {
        lazyImg.src = lazyImg.dataset.src;
        lazyImg.classList.remove('lazy-load');
    }
}

// Function to create carousel controls
function createCarouselControls(imageCount) {
    return `
        <div class="carousel-controls">
            <button class="carousel-control-prev" onclick="handleCarouselNav(this.closest('.card-image-carousel'), -1)">
                <i class="bi bi-chevron-left"></i>
            </button>
            <button class="carousel-control-next" onclick="handleCarouselNav(this.closest('.card-image-carousel'), 1)">
                <i class="bi bi-chevron-right"></i>
            </button>
            <div class="carousel-indicators">
                ${Array(imageCount).fill().map((_, i) => 
                    `<button class="${i === 0 ? 'active' : ''}" 
                            onclick="showSlide(this.closest('.card-image-carousel'), ${i})"></button>`
                ).join('')}
            </div>
        </div>
    `;
}

// Function to switch to a specific slide
function showSlide(carousel, index) {
    const items = carousel.querySelectorAll('.carousel-item');
    const indicators = carousel.querySelectorAll('.carousel-indicators button');
    
    // Hide current active item and indicator
    carousel.querySelector('.carousel-item.active')?.classList.remove('active');
    carousel.querySelector('.carousel-indicators button.active')?.classList.remove('active');
    
    // Show new item and indicator
    items[index]?.classList.add('active');
    indicators[index]?.classList.add('active');
    
    // Load the image if it hasn't been loaded yet
    const lazyImg = items[index]?.querySelector('img.lazy-load');
    if (lazyImg) {
        lazyImg.src = lazyImg.dataset.src;
        lazyImg.classList.remove('lazy-load');
    }
}

// Add Google Drive export functionality
async function exportToGoogleDrive(businessId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/drive/export-listing/${businessId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            if (error.error === 'Google authorization required') {
                // Redirect to Google auth
                window.location.href = '/auth/google?redirect=/marketplace2';
                return;
            }
            throw new Error(error.error);
        }

        const result = await response.json();
        
        // Show sharing dialog
        showSharingDialog(result.fileId, result.webViewLink);

    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export to Google Drive. Please try again.');
    }
}

// Add sharing dialog functionality
function showSharingDialog(fileId, viewLink) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    const modalHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Share Document</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Document exported successfully!</p>
                    <p>View link: <a href="${SecurityUtils.escapeHtml(viewLink)}" target="_blank">${SecurityUtils.escapeHtml(viewLink)}</a></p>
                    <div class="mb-3">
                        <label class="form-label">Share with email:</label>
                        <input type="email" class="form-control" id="shareEmail">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Permission:</label>
                        <select class="form-control" id="shareRole">
                            <option value="reader">Can view</option>
                            <option value="commenter">Can comment</option>
                            <option value="writer">Can edit</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="shareDocument('${SecurityUtils.escapeHtml(fileId)}')">Share</button>
                </div>
            </div>
        </div>
    `;
    SecurityUtils.safeSetInnerHTML(modal, modalHTML);

    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();

    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}

// Add sharing functionality
async function shareDocument(fileId) {
    try {
        const email = document.getElementById('shareEmail').value;
        const role = document.getElementById('shareRole').value;

        if (!email) {
            showError('Please enter an email address');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/drive/share/${fileId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, role })
        });

        if (!response.ok) {
            throw new Error('Failed to share document');
        }

        showSuccess('Document shared successfully!');
        bootstrap.Modal.getInstance(document.querySelector('.modal')).hide();

    } catch (error) {
        console.error('Sharing error:', error);
        showError('Failed to share document. Please try again.');
    }
}

// Add export button to business cards
document.querySelectorAll('.business-card').forEach(card => {
    const businessId = card.dataset.businessId;
    const actionButtons = card.querySelector('.action-buttons');
    
    const exportButton = document.createElement('button');
    exportButton.className = 'btn btn-outline-secondary';
    exportButton.innerHTML = '<i class="bi bi-cloud-upload"></i> Export';
    exportButton.onclick = () => exportToGoogleDrive(businessId);
    
    actionButtons.appendChild(exportButton);
});

// AI Assistant activation code - make sure event handlers are working
document.addEventListener('DOMContentLoaded', function() {
  debugLog('Marketplace2.js: Checking AI Assistant setup');
  
  // Function to verify and fix AI Assistant buttons
  function ensureAIAssistantWorks() {
    const aiButton = document.getElementById('ai-assistant-button');
    
    if (aiButton) {
      debugLog('Reinforcing AI button click handler');
      aiButton.onclick = function(e) {
        debugLog('AI button clicked from marketplace2.js');
        e.preventDefault();
        e.stopPropagation();
        
        // Use the global showDialog function or fallback to manually toggling
        if (typeof window.showDialog === 'function') {
          window.showDialog();
        } else if (window.aiAssistant && typeof window.aiAssistant.toggleAssistant === 'function') {
          window.aiAssistant.toggleAssistant(true);
        } else {
          console.error('showDialog function not found!');
          // Manual fallback
          const assistantContainer = document.getElementById('ai-assistant-container');
          if (assistantContainer) {
            assistantContainer.classList.remove('ai-assistant-hidden');
          }
        }
        return false;
      };
    }
  }
  
  // Call immediately and after a short delay to ensure it works
  ensureAIAssistantWorks();
  setTimeout(ensureAIAssistantWorks, 1000);
});

// Add form submission handling - add near the end of the file, before the closing brackets
document.addEventListener('DOMContentLoaded', function() {
  // Previous initialization code...
  
  // Handle contact form submission
  document.getElementById('submitContactForm')?.addEventListener('click', function() {
    const form = document.getElementById('preContactForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Get form data
    const businessId = document.getElementById('contactBusinessId').value;
    const otherUserId = document.getElementById('contactOtherUserId').value;
    const interest = document.getElementById('buyerInterest').value;
    const timeline = document.getElementById('buyerTimeline').value;
    const message = document.getElementById('initialMessage').value;
    const questions = document.getElementById('buyerQuestions').value;
    
    // Construct initial message for chat
    let initialMessage = `**Interest Level:** ${interest}\n**Timeline:** ${timeline}\n\n`;
    
    if (message) {
      initialMessage += `**Message:**\n${message}\n\n`;
    }
    
    if (questions) {
      initialMessage += `**Questions:**\n${questions}`;
    }
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(initialMessage);
    
    // Redirect to chat with conversation (correct URL format for your system)
    window.location.href = `/chat?conversation=${businessId}_${otherUserId}&initialMessage=${encodedMessage}`;
    
    // Hide the modal
    bootstrap.Modal.getInstance(document.getElementById('contactFormModal')).hide();
  });
});

// Find the submitContactForm event listener and update it
const submitContactForm = document.getElementById('submitContactForm');
if (submitContactForm) {
  submitContactForm.addEventListener('click', function() {
    const form = document.getElementById('preContactForm');
    if (!form || !form.checkValidity()) {
      if (form) form.reportValidity();
      return;
    }
    
    // Show loading state
    const button = this;
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Get form data
    const businessId = document.getElementById('contactBusinessId').value;
    const otherUserId = document.getElementById('contactOtherUserId').value;
    const firstName = document.getElementById('contactFirstName')?.value || '';
    const lastName = document.getElementById('contactLastName')?.value || '';
    const email = document.getElementById('contactEmail')?.value || '';
    const phone = document.getElementById('contactPhone')?.value || '';
    const timeframe = document.getElementById('buyerTimeline').value;
    const message = document.getElementById('initialMessage').value;
    const questions = document.getElementById('buyerQuestions')?.value || '';
    const newsletter = document.getElementById('contactConsent')?.checked || false;
    
    // Construct full message with all form data
    let fullMessage = '';
    if (message) fullMessage += `${message}\n\n`;
    if (questions) fullMessage += `Questions: ${questions}\n\n`;
    if (timeframe) fullMessage += `Timeframe: ${timeframe}\n\n`;
    
    debugLog('Submitting contact form with data:', {
      businessId,
      otherUserId,
      fullMessage
    });
    
    // Submit to contact-seller endpoint
    fetch('/contact-seller', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        businessId,
        firstName,
        lastName,
        email,
        phone,
        timeframe,
        message: fullMessage,
        newsletter
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to submit contact form');
      }
      return response.json();
    })
    .then(data => {
      debugLog('Contact form submitted successfully:', data);
      
      // Hide the modal
      try {
        const modal = bootstrap.Modal.getInstance(document.getElementById('contactFormModal'));
        if (modal) modal.hide();
      } catch (e) {
        console.error('Error hiding modal:', e);
      }
      
      // Success notification
      showToast('Success', 'Your inquiry has been sent! Redirecting to chat...', 'success');
      
      // IMPORTANT: Ensure we use the correct chat URL format
      let chatUrl;
      
      if (data.conversationId) {
        // New URL format with conversation ID
        chatUrl = `/chat?conversation=${data.conversationId}`;
      } else if (data.chatUrl) {
        // Server provided a specific URL
        chatUrl = data.chatUrl;
      } else {
        // Fallback URL format
        chatUrl = `/chat?otherUserId=${otherUserId}&businessId=${businessId}`;
      }
      
      // Debug log the URL we're redirecting to
      debugLog('Redirecting to chat URL:', chatUrl);
      
      // Redirect after a short delay to ensure toast is seen
      setTimeout(() => {
        window.location.href = chatUrl;
      }, 1500);
    })
    .catch(error => {
      console.error('Error submitting contact form:', error);
      
      // Reset button
      button.disabled = false;
      button.innerHTML = originalText;
      
      // Error notification
      showToast('Error', 'Failed to send inquiry. Please try again.', 'error');
    });
  });
}

// Remove any duplicate implementation of the form handler

// Add this helper function to format S3 URLs correctly
function formatS3Url(url) {
  if (!url) return '/images/default-business.jpg';
  
  // If already a full URL, check for malformed domain
  if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      // Check if URL has incorrect region/bucket pattern
      if (urlObj.hostname.includes('.s3.')) {
        const parts = urlObj.hostname.split('.');
        if (parts.length >= 4) {
          const bucket = parts[0];
          const region = parts[2];
          // If region is the bucket name or contains "arzani", they're reversed
          if (region.includes('arzani') || region === bucket) {
            debugLog(`Fixing malformed S3 URL: ${url}`);
            return `https://${bucket}.s3.eu-west-2.amazonaws.com${urlObj.pathname}`;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing URL:', e);
    }
    return url;
  }
  
  // If it starts with /uploads/ (legacy path), extract the filename
  if (url.startsWith('/uploads/')) {
    const filename = url.substring('/uploads/'.length);
    return `https://${window.AWS_BUCKET_NAME || 'arzani-images1'}.s3.${window.AWS_REGION || 'eu-west-2'}.amazonaws.com/${filename}`;
  }
  
  // Otherwise treat as a simple filename
  return `https://${window.AWS_BUCKET_NAME || 'arzani-images1'}.s3.${window.AWS_REGION || 'eu-west-2'}.amazonaws.com/${url}`;
}

// Update the image handling in the renderBusinesses function
function renderBusinesses(businesses) {
  // ...existing code...

  businesses.forEach((business, index) => {
    // ...existing code...
    
    // Process images to ensure correct S3 URLs
    const processedImages = (business.images || []).map(img => formatS3Url(img));
    
    // Create card with processed image URLs
    const imagesHtml = processedImages.length > 0 
      ? generateImageCarousel(business, processedImages, isVisible)
      : createDefaultImage(business.id);
      
    // ...rest of function...
  });
  
  // ...existing code...
}

// Update the image carousel generation function
function generateImageCarousel(business, images, isVisible) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return createDefaultImage(business.id);
  }

  return `<div class="card-image-carousel">
    <button class="save-business-btn" data-business-id="${business.id}">
      <i class="bi bi-bookmark"></i>
    </button>
    <div class="carousel-inner">
      ${images.map((imageUrl, index) => {
        // Only load immediately if it's the first image AND the card is visible
        const shouldLoad = index === 0 && isVisible;
        const loadingAttr = shouldLoad ? "" : "loading=\"lazy\"";
        const imgSrc = shouldLoad ? imageUrl : "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAAIBRAA7";
        const dataSrc = shouldLoad ? "" : `data-src="${imageUrl}"`;
        const lazyClass = shouldLoad ? "" : "lazy-load";
        
        return `<div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
          <img src="${imgSrc}" ${dataSrc} class="card-img-top ${lazyClass}" alt="${business.business_name}" ${loadingAttr} 
               width="300" height="200" onerror="this.onerror=null; this.src='/images/default-business.jpg'">
        </div>`;
      }).join('')}
    </div>
    ${images.length > 1 ? `
      <div class="carousel-controls">
        <button class="carousel-control prev" data-direction="prev">‹</button>
        <div class="carousel-indicators">
          ${images.map((_, index) => `
            <button class="carousel-indicator ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
          `).join('')}
        </div>
        <button class="carousel-control next" data-direction="next">›</button>
      </div>
    ` : ''}
  </div>`;
}

// Update the lazyLoading function to handle retries for failed images
function initLazyLoading() {
  if ('IntersectionObserver' in window) {
    // ...existing observer code...
    
    imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            // Load the image
            img.src = img.dataset.src;
            
            // Add error handler to try fallback regions if loading fails
            img.onerror = function() {
              debugLog('Lazy-loaded image failed to load, trying alternate region:', this.src);
              if (this.src.includes('s3.eu-west-2.amazonaws.com')) {
                // Try northern region as fallback
                this.src = this.src.replace('s3.eu-west-2.amazonaws.com', 's3.eu-north-1.amazonaws.com');
              } else if (this.src.includes('s3.eu-north-1.amazonaws.com')) {
                // Try western region as fallback
                this.src = this.src.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
              } else {
                // Last resort - default image
                this.src = '/images/default-business.jpg';
              }
            };
            
            img.removeAttribute('data-src');
            img.classList.remove('lazy-load');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '200px',
      threshold: 0.1
    });
    
    // ...rest of function...
  }
  
  // ...fallback code...
}

// ...existing code...

/**
 * Utility to load an image with automatic region fallback
 * @param {HTMLImageElement} imgElement - The image element to load
 * @param {string} primaryUrl - Primary URL to try
 * @param {string} fallbackUrl - Fallback URL if primary fails
 */
function loadImageWithFallback(imgElement, primaryUrl, fallbackUrl = null) {
  // Set default fallback URL if not provided
  if (!fallbackUrl) {
    fallbackUrl = primaryUrl.includes('s3.eu-west-2.amazonaws.com') 
      ? primaryUrl.replace('s3.eu-west-2', 's3.eu-north-1')
      : primaryUrl.replace('s3.eu-north-1', 's3.eu-west-2');
  }
  
  // Set default image as final fallback
  const defaultImage = '/images/default-business.jpg';
  
  // Set the primary URL
  imgElement.src = primaryUrl;
  
  // Handle error by trying fallback URL
  imgElement.onerror = function() {
    debugLog('Image failed to load, trying fallback URL:', fallbackUrl);
    
    // Check if we're already using the fallback
    if (this.src === fallbackUrl) {
      // If fallback also failed, use default image
      debugLog('Fallback URL also failed, using default image');
      this.src = defaultImage;
      this.onerror = null; // Remove error handler to prevent loops
      return;
    }
    
    // Try the fallback URL
    this.src = fallbackUrl;
  };
}

/**
 * Apply region-aware image loading to all images on the page
 */
function initMultiRegionImageLoading() {
  // Process all lazy-load images to handle region fallbacks
  document.querySelectorAll('img.lazy-load').forEach(img => {
    if (img.dataset.src) {
      // For lazy-loaded images, set up the fallback to happen when they load
      img.addEventListener('load', function() {
        // Successfully loaded, remove error handler
        this.onerror = null;
      });
      
      img.addEventListener('error', function() {
        // Failed to load, try other region
        debugLog('Lazy-loaded image failed to load, trying alternate region:', this.src);
        
        if (this.src.includes('s3.eu-west-2.amazonaws.com')) {
          this.src = this.src.replace('s3.eu-west-2', 's3.eu-north-1');
        } else if (this.src.includes('s3.eu-north-1.amazonaws.com')) {
          this.src = this.src.replace('s3.eu-north-1', 's3.eu-west-2');
        } else {
          // Last resort - default image
          this.src = '/images/default-business.jpg';
          this.onerror = null; // Remove handler to prevent loops
        }
      });
    }
  });
  
  // Process all already-loaded images to add fallbacks
  document.querySelectorAll('img:not(.lazy-load)').forEach(img => {
    if (img.src && (img.src.includes('amazonaws.com') || img.src.includes('/uploads/'))) {
      let primaryUrl = img.src;
      
      // For /uploads/ paths, convert to S3 URL
      if (img.src.includes('/uploads/')) {
        const businessId = document.querySelector('[data-business-id]')?.dataset?.businessId;
        if (businessId) {
          const filename = img.src.substring(img.src.lastIndexOf('/') + 1);
          const bucket = window.AWS_BUCKET_NAME || 'arzani-images1';
          const region = window.AWS_REGION || 'eu-west-2';
          primaryUrl = `https://${bucket}.s3.${region}.amazonaws.com/businesses/${businessId}/${filename}`;
        }
      }
      
      // Add error handler to try other region
      img.onerror = function() {
        if (this.src.includes('s3.eu-west-2.amazonaws.com')) {
          this.src = this.src.replace('s3.eu-west-2', 's3.eu-north-1');
        } else if (this.src.includes('s3.eu-north-1.amazonaws.com')) {
          this.src = this.src.replace('s3.eu-north-1', 's3.eu-west-2');
        } else {
          this.src = '/images/default-business.jpg';
          this.onerror = null;
        }
      };
    }
  });
}

// Call this function at the end of your initialization
document.addEventListener('DOMContentLoaded', function() {
  // ...existing code...
  
  // Initialize multi-region image loading
  initMultiRegionImageLoading();
});

/**
 * Region fallback handler to extend to existing image handling
 */
function setupRegionFallbackHandlers() {
  // Add error handlers to existing images
  document.querySelectorAll('img').forEach(img => {
    if (img.src && img.src.includes('amazonaws.com')) {
      if (!img.hasAttribute('data-has-fallback')) {
        img.setAttribute('data-has-fallback', 'true');
        
        img.onerror = function() {
          if (this.src.includes('s3.eu-west-2.amazonaws.com')) {
            // Reduce logging
            debugLog('Image failed, trying eu-north-1');
            this.src = this.src.replace('s3.eu-west-2.amazonaws.com', 's3.eu-north-1.amazonaws.com');
          } else if (this.src.includes('s3.eu-north-1.amazonaws.com')) {
            // Reduce logging
            debugLog('Image failed, trying eu-west-2');
            this.src = this.src.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
          } else {
            this.src = '/images/default-business.jpg';
            this.onerror = null; // Remove handler to prevent loops
          }
        };
      }
    }
  });
  
  // Also watch for future image loads
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          // Only process Element nodes
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's an image
            if (node.tagName === 'IMG') {
              addFallbackHandler(node);
            } else {
              // Check for images inside the added node
              node.querySelectorAll('img').forEach(img => addFallbackHandler(img));
            }
          }
        });
      }
    });
  });
  
  // Start observing
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Helper function to add fallback handler to an image
  function addFallbackHandler(img) {
    if (img.src && img.src.includes('amazonaws.com') && !img.hasAttribute('data-has-fallback')) {
      img.setAttribute('data-has-fallback', 'true');
      
      img.onerror = function() {
        if (this.src.includes('s3.eu-west-2.amazonaws.com')) {
          this.src = this.src.replace('s3.eu-west-2', 's3.eu-north-1.amazonaws.com');
        } else if (this.src.includes('s3.eu-north-1.amazonaws.com')) {
          this.src = this.src.replace('s3.eu-north-1', 's3.eu-west-2.amazonaws.com');
        } else {
          this.src = '/images/default-business.jpg';
          this.onerror = null;
        }
      };
    }
  }
}

// After DOM is loaded, set up region fallback handlers
document.addEventListener('DOMContentLoaded', function() {
  // ...existing code...
  
  // Initialize region fallback handlers
  setupRegionFallbackHandlers();
});

// ...existing code...

/**
 * Load businesses with skeleton loading state
 * @param {Number} page - Page number to load
 * @param {Object} filters - Filter criteria
 */
function loadPage(page = 1, filters = {}) {
  const listingsContainer = document.getElementById('listings-container');
  if (!listingsContainer) return;
  
  // Show skeleton loading UI
  showSkeletonLoaders(listingsContainer);
  
  // Build query params
  const params = new URLSearchParams({
    page: page.toString(),
    location: filters.location || '',
    industries: filters.industries || '',
    minPrice: filters.priceRange?.split('-')[0] || '',
    maxPrice: filters.priceRange?.split('-')[1] || '',
    revenueRange: filters.revenueRange || '',
    cashflowRange: filters.cashflowRange || ''
  }).toString();
  
  // Fetch businesses with a slight delay to ensure loading state is visible
  setTimeout(() => {
    fetch(`/api/business/listings?${params}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to load businesses');
        return response.json();
      })
      .then(data => {
        renderBusinesses(data.businesses);
        renderPaginationControls(page, data.totalPages);
      })
      .catch(error => {
        console.error('Error loading businesses:', error);
                const errorContent = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> Error loading listings. Please try again.
          </div>
        `;
        SecurityUtils.safeSetInnerHTML(listingsContainer, errorContent);
      });
  }, 500); // Short delay to ensure loading animation is visible
}

/**
 * Show skeleton loaders while content is loading
 * @param {HTMLElement} container - Container element
 */
function showSkeletonLoaders(container) {
  // Clear existing content
  container.innerHTML = '';
  
  // Create ghost container for grid layout
  const ghostContainer = document.createElement('div');
  ghostContainer.className = 'ghost-container';
  
  // Determine number of skeletons based on viewport size
  const viewportWidth = window.innerWidth;
  let skeletonCount = 9; // Default for desktop
  
  if (viewportWidth < 768) {
    skeletonCount = 3; // Mobile
  } else if (viewportWidth < 1200) {
    skeletonCount = 6; // Tablet
  }
  
  // Create skeleton cards
  for (let i = 0; i < skeletonCount; i++) {
    const skeleton = createSkeletonCard();
    ghostContainer.appendChild(skeleton);
  }
  
  container.appendChild(ghostContainer);
}

/**
 * Create a skeleton card for loading state
 * @returns {HTMLElement} - Skeleton card element
 */
function createSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'card-skeleton';
  card.innerHTML = `
    <div class="image-skeleton skeleton-loader"></div>
    <div class="title-skeleton skeleton-loader"></div>
    <div class="price-skeleton skeleton-loader"></div>
    <div class="text-skeleton skeleton-loader"></div>
    <div class="text-skeleton skeleton-loader"></div>
    <div class="button-skeleton skeleton-loader"></div>
  `;
  return card;
}

/**
 * Render business listings with progressive image loading
 * @param {Array} businesses - Array of business objects
 */
function renderBusinesses(businesses) {
  const listingsContainer = document.getElementById('listings-container');
  if (!listingsContainer) return;
  
  // Clear existing content including skeletons
  listingsContainer.innerHTML = '';
  
  if (!businesses || businesses.length === 0) {
    listingsContainer.innerHTML = `
      <div class="alert alert-info text-center w-100">
        <i class="bi bi-info-circle me-2"></i>
        No businesses found matching your criteria.
      </div>`;
    return;
  }
  
  // Create row for grid layout
  const row = document.createElement('div');
  row.className = 'row row-cols-1 row-cols-md-3 g-4';
  
  // Add each business card
  businesses.forEach((business, index) => {
    const col = document.createElement('div');
    col.className = 'col';
    
    // Process images with multi-region support
    const processedImages = processBusinessImages(business);
    
    // Create card with loading support
    col.innerHTML = createBusinessCard(business, processedImages, index);
    row.appendChild(col);
  });
  
  listingsContainer.appendChild(row);
  
  // Initialize lazy loading for images
  initProgressiveImageLoading();
  
  // Initialize tooltips and other interactive elements
  initTooltips();
  initializeEventHandlers();
}

/**
 * Process business images for proper display
 * @param {Object} business - Business object
 * @returns {Array} - Array of processed image URLs
 */
function processBusinessImages(business) {
  if (!business.images || !Array.isArray(business.images) || business.images.length === 0) {
    return ['/images/default-business.jpg'];
  }
  
  // Parse PostgreSQL array format if needed
  let images = business.images;
  if (typeof images === 'string' && images.startsWith('{') && images.endsWith('}')) {
    images = images.substring(1, images.length - 1).split(',');
  }
  
  // Process each image URL
  return images.map(image => {
    if (!image) return '/images/default-business.jpg';
    
    // If it's already a full URL, use it
    if (image.startsWith('http')) {
      return image;
    }
    
    // If it starts with /uploads/, convert to S3 URL
    if (image.startsWith('/uploads/')) {
      const filename = image.substring('/uploads/'.length);
      return `https://${window.AWS_BUCKET_NAME || 'arzani-images1'}.s3.${window.AWS_REGION || 'eu-west-2'}.amazonaws.com/businesses/${business.id}/${filename}`;
    }
    
    // Otherwise, it's a direct filename
    return `https://${window.AWS_BUCKET_NAME || 'arzani-images1'}.s3.${window.AWS_REGION || 'eu-west-2'}.amazonaws.com/businesses/${business.id}/${image}`;
  });
}

/**
 * Create HTML for a business card with loading support
 * @param {Object} business - Business object
 * @param {Array} images - Processed image URLs
 * @param {Number} index - Card index (for determining load priority)
 * @returns {String} - HTML string for the business card
 */
function createBusinessCard(business, images, index) {
  // Determine if this card should load immediately (first 6 cards)
  const shouldLoadImmediately = index < 6;
  
  // Create the image carousel/container with loading support
  const imageHtml = createImageCarousel(business, images, shouldLoadImmediately);
  
  // Return the complete card HTML
  return `
    <div class="card h-100" data-business-id="${business.id}" data-user-id="${business.user_id || ''}">
      ${imageHtml}
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${business.business_name}</h5>
        
        <!-- Trust Badges -->
        <div class="trust-badges mb-2">
          ${createTrustBadges(business)}
        </div>
        
        <p class="card-location">${business.location || 'Location not specified'}</p>
        <p class="card-price">£${formatPrice(business.price || 0)}</p>
        <div class="d-flex justify-content-between gap-2 mt-auto">
          ${createViewDetailsButton(business)}
          <button class="btn btn-outline-secondary flex-grow-1 contact-btn"
                 data-business-id="${business.id}"
                 data-user-id="${business.user_id || ''}">
              Contact
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create view details button with premium access control
 * @param {Object} business - Business object
 * @returns {String} - HTML string for view details button
 */
function createViewDetailsButton(business) {
  const isPremiumRequired = business.price && business.price >= 50000; // High-value listings
  const isRecentListing = business.created_at && 
    new Date(business.created_at) > new Date(Date.now() - 72 * 60 * 60 * 1000); // Last 72 hours
  
  // Check if premium access is required
  if (isPremiumRequired || isRecentListing || business.is_premium_only) {
    return `
      <button class="btn btn-premium flex-grow-1 premium-locked-btn" 
              data-business-id="${business.id}"
              onclick="handlePremiumAccess(${business.id})">
          <i class="bi bi-lock"></i>
          Premium Only
      </button>
    `;
  }
  
  // Regular view details button
  return `
    <button class="btn btn-primary flex-grow-1 view-details-btn" 
            data-business-id="${business.id}"
            onclick="viewBusinessDetails(${business.id})">
        View Details
    </button>
  `;
}

/**
 * Handle premium access requirement
 * @param {Number} businessId - Business ID
 */
function handlePremiumAccess(businessId) {
  // Check if user has premium access
  const userPremium = getUserPremiumStatus();
  
  if (userPremium) {
    // User has premium access, proceed to business details
    viewBusinessDetails(businessId);
  } else {
    // Show premium upgrade modal
    showPremiumUpgradeModal(businessId);
  }
}

/**
 * Check user's premium status
 * @returns {Boolean} - Whether user has premium access
 */
function getUserPremiumStatus() {
  // This would typically check with the server
  // For now, check localStorage or session data
  const userPlan = localStorage.getItem('userPlan');
  return userPlan === 'premium' || userPlan === 'platinum';
}

/**
 * Show premium upgrade modal
 * @param {Number} businessId - Business ID
 */
function showPremiumUpgradeModal(businessId) {
  const modal = `
    <div class="modal fade" id="premiumModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Premium Buyer Access Required</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <div class="mb-4">
              <i class="bi bi-star-fill text-warning" style="font-size: 3rem;"></i>
            </div>
            <h6 class="mb-3">Unlock Exclusive Access</h6>
            <p class="text-muted mb-4">
              This listing is available exclusively to Premium Buyers. 
              Upgrade now to access high-value opportunities, early alerts, 
              and AI deal advisory.
            </p>
            <div class="premium-benefits mb-4">
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-check-circle-fill text-success me-2"></i>
                <span>Access to exclusive listings</span>
              </div>
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-check-circle-fill text-success me-2"></i>
                <span>24-72 hour early access</span>
              </div>
              <div class="d-flex align-items-center mb-2">
                <i class="bi bi-check-circle-fill text-success me-2"></i>
                <span>AI deal advisor</span>
              </div>
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill text-success me-2"></i>
                <span>Priority support</span>
              </div>
            </div>
            <div class="premium-pricing mb-4">
              <h4 class="text-primary">£35/month</h4>
              <small class="text-muted">Cancel anytime</small>
            </div>
          </div>
          <div class="modal-footer justify-content-center">
            <a href="/pricing" class="btn btn-primary btn-lg px-4">
              Upgrade to Premium
            </a>
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if present
  const existingModal = document.getElementById('premiumModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modal);
  
  // Show modal
  const bootstrapModal = new bootstrap.Modal(document.getElementById('premiumModal'));
  bootstrapModal.show();
  
  // Track premium wall interaction
  if (typeof gtag !== 'undefined') {
    gtag('event', 'premium_wall_shown', {
      'business_id': businessId,
      'page': 'marketplace'
    });
  }
}

//# sourceMappingURL=marketplace2.js.map
