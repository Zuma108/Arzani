async function loadSavedBusinesses() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login2';
            return;
        }

        const response = await fetch('/api/business/saved', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login2';
            return;
        }

        if (!response.ok) throw new Error('Failed to fetch saved businesses');
        
        const businesses = await response.json();
        const container = document.getElementById('saved-listings');
        const noSavedMsg = document.getElementById('no-saved');

        if (businesses.length === 0) {
            container.innerHTML = '';
            noSavedMsg.classList.remove('d-none');
            return;
        }

        noSavedMsg.classList.add('d-none');
        container.innerHTML = businesses.map(business => `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <div class="card-image-carousel">
                        <button class="remove-saved-btn" data-business-id="${business.id}" title="Remove from saved">
                            <i class="bi bi-x"></i>
                        </button>
                        ${business.images && business.images.length > 0 ? `
                            <div class="carousel-inner">
                                ${business.images.map((image, index) => `
                                    <div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                                        <img src="/uploads/${image}" class="card-img-top" alt="${business.business_name}" loading="lazy">
                                    </div>
                                `).join('')}
                            </div>
                            ${business.images.length > 1 ? `
                                <div class="carousel-controls">
                                    <button class="carousel-control prev" data-direction="prev">‹</button>
                                    <div class="carousel-indicators">
                                        ${business.images.map((_, index) => `
                                            <button class="carousel-indicator ${index === 0 ? 'active' : ''}" 
                                                    data-index="${index}"></button>
                                        `).join('')}
                                    </div>
                                    <button class="carousel-control next" data-direction="next">›</button>
                                </div>
                            ` : ''}
                        ` : `
                            <img src="/images/default-business.jpg" class="card-img-top" alt="Default business image">
                        `}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <div class="listing-header mb-1">
                            <span class="badge">${business.industry}</span>
                            <h2 class="business-name mb-0">${business.business_name}</h2>
                        </div>

                        <div class="price-metrics-container pt-0">
                            <div class="price-section">
                                <span class="metric-label">Asking Price</span>
                                <span class="price">£${parseFloat(business.price).toLocaleString()}</span>
                            </div>
                            
                            <div class="metrics-pair">
                                <div class="metric-item" title="Cash Flow">
                                    <span class="metric-label">CF</span>
                                    <div class="metric-value">£${parseFloat(business.cash_flow || 0).toLocaleString()}</div>
                                </div>
                                <div class="metric-separator"></div>
                                <div class="metric-item" title="Gross Revenue">
                                    <span class="metric-label">GR</span>
                                    <div class="metric-value">£${parseFloat(business.gross_revenue || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-auto d-flex justify-content-between gap-2">
                            <button class="btn btn-primary flex-grow-1 view-details-btn" 
                                    data-business-id="${business.id}"
                                    onclick="window.location.href='/businesses/${business.id}'">
                                View Details
                            </button>
                            <button class="btn btn-outline-secondary flex-grow-1 contact-btn" 
                                    data-business-id="${business.id}"
                                    data-bs-toggle="modal" 
                                    data-bs-target="#contactModal">
                                Contact Seller
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Initialize carousels
        document.querySelectorAll('.card-image-carousel').forEach(initializeCarousel);
        
        // Initialize tooltips
        const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-saved-btn').forEach(btn => {
            btn.addEventListener('click', removeSavedBusiness);
        });

    } catch (error) {
        console.error('Error loading saved businesses:', error);
        document.getElementById('saved-listings').innerHTML = `
            <div class="alert alert-danger">
                Error loading saved businesses. Please try <a href="/login2">logging in</a> again.
            </div>
        `;
    }
}

// Add carousel functionality
function initializeCarousel(carouselElement) {
    if (!carouselElement) return;

    const items = carouselElement.querySelectorAll('.carousel-item');
    const indicators = carouselElement.querySelectorAll('.carousel-indicator');
    const totalItems = items.length;
    let currentIndex = 0;

    // Handle control buttons
    carouselElement.querySelectorAll('.carousel-control').forEach(control => {
        control.addEventListener('click', (e) => {
            e.stopPropagation();
            const direction = control.dataset.direction;
            if (direction === 'prev') {
                currentIndex = (currentIndex - 1 + totalItems) % totalItems;
            } else {
                currentIndex = (currentIndex + 1) % totalItems;
            }
            updateCarousel();
        });
    });

    // Handle indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', (e) => {
            e.stopPropagation();
            currentIndex = index;
            updateCarousel();
        });
    });

    function updateCarousel() {
        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentIndex);
        });
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentIndex);
        });
    }
}

async function removeSavedBusiness(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.target.closest('.remove-saved-btn');
    if (!button) return;
    
    const businessId = button.dataset.businessId;
    const card = button.closest('.col-md-4');
    
    try {
        button.disabled = true;
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/business/unsave/${businessId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove business');
        }

        // Add fade out animation
        card.style.transition = 'opacity 0.3s ease-out';
        card.style.opacity = '0';
        
        // Remove the card after animation
        setTimeout(() => {
            card.remove();
            
            // Check if there are any remaining saved businesses
            const container = document.getElementById('saved-listings');
            const noSavedMsg = document.getElementById('no-saved');
            
            if (container.children.length === 0) {
                noSavedMsg.classList.remove('d-none');
            }
        }, 300);

    } catch (error) {
        console.error('Error removing saved business:', error);
        button.disabled = false;
        alert('Failed to remove business. Please try again.');
    }
}

async function exportToGoogleDrive() {
    const exportModal = new bootstrap.Modal(document.getElementById('exportModal'));
    const progressBar = document.querySelector('#exportModal .progress-bar');
    const statusText = document.getElementById('exportStatus');
    
    try {
        exportModal.show();
        progressBar.style.width = '30%';
        statusText.textContent = 'Preparing export...';

        const token = localStorage.getItem('token');
        // Update the endpoint to match our routes
        const response = await fetch('/api/drive/export-saved-businesses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const result = await response.json();
            if (response.status === 401 && result.redirectUrl) {
                window.location.href = result.redirectUrl;
                return;
            }
            throw new Error(result.error || 'Export failed');
        }

        const result = await response.json();
        progressBar.style.width = '100%';
        statusText.innerHTML = `Export successful! <a href="${result.webViewLink}" target="_blank">View in Google Drive</a>`;

    } catch (error) {
        console.error('Export error:', error);
        statusText.textContent = `Export failed: ${error.message}`;
        progressBar.classList.add('bg-danger');
    }
}

// Load saved businesses when page loads
document.addEventListener('DOMContentLoaded', loadSavedBusinesses);
