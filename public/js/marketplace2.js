// ...existing code...

function renderBusinesses(businesses) {
    const listingsContainer = document.getElementById('listings-container');
    listingsContainer.innerHTML = '';

    businesses.forEach(business => {
        const businessCard = document.createElement('div');
        businessCard.className = 'col-md-4 mb-4';

        // Create low-res placeholder first
        const placeholderImage = business.images && business.images.length > 0 
            ? formatImageUrl(business.images[0], business.id) 
            : '/images/default-business.jpg';

        // Process image URLs to ensure they're complete S3 URLs
        const images = (business.images || []).slice(0, 5).map(img => {
            // If it's already a full URL (starts with http), use it as is
            if (img.startsWith('http')) {
                return img;
            }
            // Otherwise construct the S3 URL
            return `https://arzani-images.s3.eu-north-1.amazonaws.com/businesses/${business.id}/${img}`;
        });

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
                                 onerror="this.src='/images/default-business.jpg'">
                        </div>
                    `).join('')}
                </div>
                ${images.length > 1 ? createCarouselControls(images.length) : ''}
            </div>`
            : createDefaultImage();
            
        // ...rest of the card rendering code...

        // Load the business card with essential information first
        businessCard.innerHTML = `
            <div class="card h-100">
                ${imagesHtml}
                <div class="card-body">
                    <h5 class="card-title">${business.business_name}</h5>
                    <p class="card-location">${business.location || 'Location not specified'}</p>
                    <p class="card-price">£${formatPrice(business.price)}</p>
                </div>
            </div>
        `;
        
        listingsContainer.appendChild(businessCard);
    });
    
    // Initialize lazy loading after adding all cards to DOM
    initLazyLoading();
}

// Add a function to handle lazy loading
function initLazyLoading() {
    // Use Intersection Observer to load images when they become visible
    if ('IntersectionObserver' in window) {
        const lazyImageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove('lazy-load');
                    lazyObserver.unobserve(lazyImage);
                }
            });
        });

        const lazyImages = document.querySelectorAll('img.lazy-load');
        lazyImages.forEach(img => {
            lazyObserver.observe(img);
        });
    } else {
        // Fallback for browsers that don't support Intersection Observer
        document.querySelectorAll('img.lazy-load').forEach(img => {
            img.src = img.dataset.src;
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

// ...existing code...

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
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Share Document</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Document exported successfully!</p>
                    <p>View link: <a href="${viewLink}" target="_blank">${viewLink}</a></p>
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
                    <button type="button" class="btn btn-primary" onclick="shareDocument('${fileId}')">Share</button>
                </div>
            </div>
        </div>
    `;

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
  console.log('Marketplace2.js: Checking AI Assistant setup');
  
  // Function to verify and fix AI Assistant buttons
  function ensureAIAssistantWorks() {
    const aiButton = document.querySelector('.ai-button');
    const assistantIcon = document.getElementById('assistant-icon');
    const aiAssistantDialog = document.getElementById('ai-assistant-dialog');
    
    console.log('AI Assistant elements:', {
      aiButton: !!aiButton,
      assistantIcon: !!assistantIcon,
      dialog: !!aiAssistantDialog
    });
    
    // Force re-binding of click handlers
    if (aiButton) {
      console.log('Reinforcing AI button click handler');
      aiButton.onclick = function(e) {
        console.log('AI button clicked from marketplace2.js');
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.showDialog === 'function') {
          window.showDialog();
        } else {
          console.error('showDialog function not found!');
          // Fallback to manually showing the dialog
          if (aiAssistantDialog) {
            aiAssistantDialog.style.display = 'block';
            aiAssistantDialog.style.visibility = 'visible';
            aiAssistantDialog.classList.add('show');
          }
        }
        return false;
      };
    }
    
    if (assistantIcon) {
      console.log('Reinforcing assistant icon click handler');
      assistantIcon.onclick = function(e) {
        console.log('Assistant icon clicked from marketplace2.js');
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.showDialog === 'function') {
          window.showDialog();
        } else {
          console.error('showDialog function not found!');
          // Fallback to manually showing the dialog
          if (aiAssistantDialog) {
            aiAssistantDialog.style.display = 'block';
            aiAssistantDialog.style.visibility = 'visible';
            aiAssistantDialog.classList.add('show');
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

// ...existing code...
