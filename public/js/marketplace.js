import { initializeTracking } from './marketplace-tracking.js';

// Use a single loading state
let isLoading = false;
let imageObserver; // Global IntersectionObserver for lazy loading

// Add S3 config - check if it exists globally first
if (typeof window.S3_CONFIG === 'undefined') {
  window.S3_CONFIG = {
    primaryRegion: 'eu-west-2',
    fallbackRegion: 'eu-north-1',
    bucket: 'arzani-images1',
    retryAttempts: 2
  };
} else {
  // Add retryAttempts if it doesn't exist
  window.S3_CONFIG.retryAttempts = window.S3_CONFIG.retryAttempts || 2;
}

export async function loadPage(pageNumber = 1, filters = {}) {
  // Set loading state
  isLoading = true;
  const listingsContainer = document.getElementById('listings-container');
  if (listingsContainer) {
    listingsContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';
  }
  
  // Parse numeric values properly
  const query = new URLSearchParams({
    page: pageNumber.toString(),
    location: filters.location || '',
    industries: filters.industries || '',
    priceMin: filters.priceRange?.split('-')[0] || '',
    priceMax: filters.priceRange?.split('-')[1] || '',
    revenueRange: filters.revenueRange || '',
    cashflowRange: filters.cashflowRange || ''
  }).toString();

  try {
    const response = await fetch(`/api/business/listings?${query}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    renderBusinesses(data.businesses);
    renderPaginationControls(pageNumber, data.totalPages);
  } catch (error) {
    if (listingsContainer) {
      listingsContainer.innerHTML = '<div class="alert alert-danger">Error loading businesses. Please try again.</div>';
    }
  } finally {
    isLoading = false;
  }
}

function renderBusinesses(businesses) {
  const listingsContainer = document.getElementById('listings-container');
  if (!listingsContainer) return;
  
  listingsContainer.innerHTML = '';

  if (businesses.length === 0) {
    listingsContainer.innerHTML = '<p>No businesses found.</p>';
    return;
  }

  // Create document fragment for batch DOM updates
  const fragment = document.createDocumentFragment();
  
  businesses.forEach((business, index) => {
    const businessCard = document.createElement('div');
    // Remove Bootstrap grid classes for horizontal layout
    businessCard.className = 'horizontal-card';

    // Only load first image initially for visible businesses
    const isVisible = index < 12; // Load more for horizontal scroll
    
    // Process image URLs with multi-region awareness
    business.processedImages = processBusinessImages(business);
    
    // Create card with optimized image loading
    businessCard.innerHTML = generateBusinessCard(business, isVisible);
    fragment.appendChild(businessCard);
  });
  
  // Batch DOM update
  listingsContainer.appendChild(fragment);
  
  // Initialize lazy loading for images
  initLazyLoading();
  
  // Initialize tooltips
  initTooltips();
  
  // Initialize event handlers
  initEventHandlers();
}

/**
 * Process business images to ensure URLs use the correct S3 region format
 * @param {Object} business - Business object with images array
 * @returns {Array} - Array of processed image URLs
 */
function processBusinessImages(business) {
  if (!business.images || !Array.isArray(business.images) || business.images.length === 0) {
    return ['/images/default-business.jpg'];
  }
  
  // Parse PostgreSQL array if needed
  let images = business.images;
  if (typeof images === 'string' && images.startsWith('{') && images.endsWith('}')) {
    // Parse PostgreSQL array format {url1,url2,url3}
    images = images.substring(1, images.length - 1).split(',');
  }
  
  return images.map(image => {
    if (!image) return '/images/default-business.jpg';
    
    // If already a full URL, use it as is
    if (image.startsWith('http')) {
      return image;
    }
    
    // If it's a relative upload path, convert to S3 URL with primary region
    if (image.startsWith('/uploads/')) {
      const filename = image.substring('/uploads/'.length);
      return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.primaryRegion}.amazonaws.com/businesses/${business.id}/${filename}`;
    }
    
    // Otherwise it's just a filename, construct the URL
    return `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.primaryRegion}.amazonaws.com/businesses/${business.id}/${image}`;
  });
}

/**
 * Format numbers with K/M abbreviations for compact display
 * @param {number} value - The number to format
 * @returns {string} - Formatted number with abbreviations
 */
function formatCompactNumber(value) {
  const num = parseFloat(value || 0);
  
  if (num === 0) return '£0';
  
  if (num >= 1000000) {
    // Millions: 1,400,000 -> £1.4M
    return `£${(num / 1000000).toFixed(1).replace('.0', '')}M`;
  } else if (num >= 100000) {
    // Hundreds of thousands: 450,000 -> £450K
    return `£${Math.round(num / 1000)}K`;
  } else if (num >= 10000) {
    // Tens of thousands: 45,000 -> £45K
    return `£${Math.round(num / 1000)}K`;
  } else if (num >= 1000) {
    // Thousands: 4,500 -> £4.5K
    return `£${(num / 1000).toFixed(1).replace('.0', '')}K`;
  } else {
    // Less than 1000: show full number
    return `£${Math.round(num).toLocaleString()}`;
  }
}

function generateBusinessCard(business, isVisible) {
  // Basic card shell with key business info
  const imagesHtml = business.processedImages && business.processedImages.length > 0
    ? generateImageCarousel(business, business.processedImages, isVisible)
    : `<div class="card-image-carousel">
        <button class="save-business-btn" data-business-id="${business.id}">
          <i class="bi bi-bookmark"></i>
        </button>
        <img src="/images/default-business.jpg" class="card-img-top" alt="Default business image" width="300" height="200">
      </div>`;
  
  return `
    <div class="card h-100" data-business-id="${business.id}" data-user-id="${business.user_id}">
      ${imagesHtml}
      <div class="card-body d-flex flex-column">
        <div class="listing-header mb-1">
          <span class="badge">${business.industry}</span>
          <h2 class="business-name mb-0">${business.business_name}</h2>
        </div>

        <div class="price-metrics-container pt-0">
          <div class="price-section">
            <span class="metric-label">Asking Price</span>
            <span class="price">${formatCompactNumber(business.price)}</span>
          </div>
          
          <div class="metrics-pair">
            <div class="metric-item" data-bs-toggle="tooltip" data-bs-placement="top" 
                title="Cash Flow: The net amount of cash generated by the business">
              <span class="metric-label">CF</span>
              <div class="metric-value">${formatCompactNumber(business.cash_flow || 0)}</div>
            </div>
            <div class="metric-separator"></div>
            <div class="metric-item" data-bs-toggle="tooltip" data-bs-placement="top" 
                title="Gross Revenue: Total income before deducting expenses">
              <span class="metric-label">GR</span>
              <div class="metric-value">${formatCompactNumber(business.gross_revenue || 0)}</div>
            </div>
          </div>
        </div>

        <div class="mt-auto d-flex justify-content-between gap-2">
          <button class="btn btn-primary flex-grow-1 view-details-btn" 
                data-business-id="${business.id}"
                onclick="viewBusinessDetails(${business.id})">
            View Details
          </button>
          <button class="btn btn-outline-secondary flex-grow-1 contact-btn"
             data-business-id="${business.id}"
             data-user-id="${business.user_id}">
             Contact
          </button>
        </div>
      </div>
    </div>
  `;
}

function generateImageCarousel(business, images, isVisible) {
  if (!images || images.length === 0) {
    return `<div class="card-image-carousel">
      <button class="save-business-btn" data-business-id="${business.id}">
        <i class="bi bi-bookmark"></i>
      </button>
      <img src="/images/default-business.jpg" class="card-img-top" alt="Default business image" width="300" height="200">
    </div>`;
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
        
        // Set up image sources for optimal loading
        const imgSrc = shouldLoad ? imageUrl : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        const dataSrc = shouldLoad ? "" : `data-src="${imageUrl}"`;
        const lazyClass = shouldLoad ? "" : "lazy-load";
        
        // Add multi-region fallback attributes
        let fallbackSrc = "";
        if (imageUrl.includes('eu-west-2')) {
          fallbackSrc = `data-fallback="${imageUrl.replace('eu-west-2', 'eu-north-1')}"`;
        } else if (imageUrl.includes('eu-north-1')) {
          fallbackSrc = `data-fallback="${imageUrl.replace('eu-north-1', 'eu-west-2')}"`;
        }
        
        return `<div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
          <img src="${imgSrc}" ${dataSrc} ${fallbackSrc} class="card-img-top ${lazyClass}" 
               alt="${business.business_name}" ${loadingAttr} width="300" height="200"
               data-business-id="${business.id}" data-region="${imageUrl.includes('eu-north-1') ? 'eu-north-1' : 'eu-west-2'}"
               onerror="handleImageError(this)">
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

/**
 * Add global function for handling image errors - fallback to alternate region
 */
window.handleImageError = function(img) {
  // Only log in debug mode or reduce verbosity
  if (window.DEBUG_MODE) {
    console.log('Image failed to load, trying fallback:', img.src);
  }
  
  // Check if we've already tried the fallback
  if (img.dataset.usedFallback === 'true') {
    // If we already tried fallback, use default image
    if (window.DEBUG_MODE) {
      console.log('Fallback also failed, using default image');
    }
    img.src = '/images/default-business.jpg';
    img.onerror = null; // Remove error handler to prevent loops
    return;
  }
  
  // Try the fallback URL
  if (img.dataset.fallback) {
    if (window.DEBUG_MODE) {
      console.log('Using fallback URL:', img.dataset.fallback);
    }
    img.dataset.usedFallback = 'true';
    img.src = img.dataset.fallback;
  } 
  // Or try the alternate region if fallback attribute not present
  else if (img.src.includes('s3.eu-west-2.amazonaws.com')) {
    if (window.DEBUG_MODE) {
      console.log('Switching to eu-north-1 region');
    }
    img.dataset.usedFallback = 'true';
    img.src = img.src.replace('s3.eu-west-2.amazonaws.com', 's3.eu-north-1.amazonaws.com');
  } else if (img.src.includes('s3.eu-north-1.amazonaws.com')) {
    if (window.DEBUG_MODE) {
      console.log('Switching to eu-west-2 region');
    }
    img.dataset.usedFallback = 'true';
    img.src = img.src.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
  } else {
    // If no S3 URL pattern found, use default
    img.src = '/images/default-business.jpg';
    img.onerror = null;
  }
};

// Function to handle proper navigation to business details without redirects
window.viewBusinessDetails = function(businessId) {
  if (!businessId) return;
  
  // Prevent the default link navigation
  event.preventDefault();
  
  // Log that we're navigating to a specific business
  console.log(`Navigating to business ${businessId}`);
  
  // Use the direct business route to avoid redirects
  window.location.href = `/business/${businessId}`;
};

// Initialize lazy loading with improved region fallback
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
    
    // Observe all lazy load images
    document.querySelectorAll('img.lazy-load').forEach(img => {
      imageObserver.observe(img);
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    document.querySelectorAll('img.lazy-load').forEach(img => {
      if (img.dataset.src) {
        // Create the fallback URL
        if (img.dataset.src.includes('eu-west-2')) {
          img.dataset.fallback = img.dataset.src.replace('eu-west-2', 'eu-north-1');
        } else if (img.dataset.src.includes('eu-north-1')) {
          img.dataset.fallback = img.dataset.src.replace('eu-north-1', 'eu-west-2');
        }
        
        img.src = img.dataset.src;
        
        // Make sure error handler is in place
        img.onerror = function() {
          handleImageError(this);
        };
        
        img.classList.remove('lazy-load');
      }
    });
  }

  // Initialize carousels for visible cards
  document.querySelectorAll('.card-image-carousel').forEach(carousel => {
    if (isElementInViewport(carousel)) {
      initializeCarousel(carousel);
    }
  });
}

function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Initialize tooltips
function initTooltips() {
  const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltips.forEach(tooltip => {
    try {
      new bootstrap.Tooltip(tooltip);
    } catch (e) {
      // Silently fail if bootstrap isn't loaded yet
    }
  });
}

// Initialize all event handlers
function initEventHandlers() {
  // Contact buttons
  document.querySelectorAll('.contact-btn').forEach(button => {
    button.addEventListener('click', function() {
      const businessId = this.getAttribute('data-business-id');
      document.getElementById('businessId').value = businessId;
      try {
        const contactModal = new bootstrap.Modal(document.getElementById('contactModal'));
        contactModal.show();
      } catch (e) {
        // Fallback if bootstrap modal isn't available
        document.getElementById('contactModal').style.display = 'block';
      }
    });
  });
  
  // Check saved status for items in viewport
  document.querySelectorAll('.save-business-btn').forEach(btn => {
    if (isElementInViewport(btn)) {
      const businessId = btn.dataset.businessId;
      if (businessId) {
        checkSavedStatus(businessId);
      }
    }
  });
}

function initializeCarousel(carouselElement) {
  if (!carouselElement) return;

  const items = carouselElement.querySelectorAll('.carousel-item');
  const indicators = carouselElement.querySelectorAll('.carousel-indicator');
  if (!items.length) return;
  
  const totalItems = items.length;
  let currentIndex = 0;

  // Handle control buttons
  carouselElement.querySelectorAll('.carousel-control').forEach(control => {
    control.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
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
      e.stopPropagation(); // Prevent card click
      currentIndex = index;
      updateCarousel();
    });
  });

  function updateCarousel() {
    items.forEach((item, index) => {
      item.classList.toggle('active', index === currentIndex);
      
      // Load the image if it's being shown and hasn't been loaded yet
      if (index === currentIndex) {
        const img = item.querySelector('img.lazy-load');
        if (img && img.dataset.src) {
          // Handle S3 URLs correctly
          if (img.dataset.src.includes('s3.eu-north-1.amazonaws.com')) {
            // Replace north-1 with west-2 if needed
            img.src = img.dataset.src.replace('s3.eu-north-1.amazonaws.com', 's3.eu-west-2.amazonaws.com');
          } else {
            img.src = img.dataset.src;
          }
          img.removeAttribute('data-src');
          img.classList.remove('lazy-load');
        }
      }
    });
    
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === currentIndex);
    });
  }

  // Add touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  carouselElement.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  carouselElement.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next
        currentIndex = (currentIndex + 1) % totalItems;
      } else {
        // Swipe right - previous
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
      }
      updateCarousel();
    }
  }
}

function renderPaginationControls(currentPage, totalPages) {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  paginationContainer.innerHTML = '';
  
  // Create pagination wrapper
  const paginationNav = document.createElement('nav');
  const paginationList = document.createElement('ul');
  paginationList.className = 'pagination justify-content-center';
  
  // Previous button
  const prevItem = createPaginationItem(currentPage - 1, '«', currentPage > 1);
  paginationList.appendChild(prevItem);
  
  // Page numbers - show only a limited range of pages for better performance
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  if (startPage > 1) {
    paginationList.appendChild(createPaginationItem(1, '1', true));
    if (startPage > 2) {
      const ellipsis = document.createElement('li');
      ellipsis.className = 'page-item disabled';
      ellipsis.innerHTML = '<span class="page-link">...</span>';
      paginationList.appendChild(ellipsis);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageItem = createPaginationItem(i, i.toString(), true, i === currentPage);
    paginationList.appendChild(pageItem);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('li');
      ellipsis.className = 'page-item disabled';
      ellipsis.innerHTML = '<span class="page-link">...</span>';
      paginationList.appendChild(ellipsis);
    }
    paginationList.appendChild(createPaginationItem(totalPages, totalPages.toString(), true));
  }
  
  // Next button
  const nextItem = createPaginationItem(currentPage + 1, '»', currentPage < totalPages);
  paginationList.appendChild(nextItem);
  
  paginationNav.appendChild(paginationList);
  paginationContainer.appendChild(paginationNav);
}

function createPaginationItem(pageNumber, text, enabled, isActive = false) {
  const li = document.createElement('li');
  li.className = `page-item ${!enabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
  
  const a = document.createElement('a');
  a.className = 'page-link';
  a.href = '#';
  a.textContent = text;
  
  if (enabled) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isLoading) {
        loadPage(pageNumber);
      }
    });
  }
  
  li.appendChild(a);
  return li;
}

// Single DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
  // Clear any existing content
  const listingsContainer = document.getElementById('listings-container');
  if (listingsContainer) {
    listingsContainer.innerHTML = '';
  }
  
  // Load first page of businesses
  loadPage(1);
  initializeTracking();
  
  // Add save button click handler
  document.addEventListener('click', handleSaveButtonClick);
  
  // Initialize contact form
  initContactForm();
  
  // Initialize off market link
  initOffMarketLink();

  // Initialize contact seller buttons
  initContactSellerButtons();
  
  // Export loadPage function to global scope for filter.js to access
  window.loadPage = loadPage;
});

function handleSaveButtonClick(e) {
  const saveBtn = e.target.closest('.save-business-btn');
  if (!saveBtn) return;
  
  e.preventDefault(); // Prevent event bubbling
  const businessId = saveBtn.dataset.businessId;
  
  if (!businessId) return;
  
  toggleSavedStatus(saveBtn, businessId);
}

async function toggleSavedStatus(saveBtn, businessId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to save businesses');
      return;
    }
    
    if (saveBtn.classList.contains('saved')) {
      // Unsave
      const response = await fetch(`/api/business/unsave/${businessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        saveBtn.classList.remove('saved');
        saveBtn.querySelector('i').classList.replace('bi-bookmark-fill', 'bi-bookmark');
      }
    } else {
      // Save
      const response = await fetch('/api/business/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessId })
      });

      if (response.ok) {
        saveBtn.classList.add('saved');
        saveBtn.querySelector('i').classList.replace('bi-bookmark', 'bi-bookmark-fill');
      }
    }
  } catch (error) {
    // Handle error silently
  }
}

// Add function to check saved status
async function checkSavedStatus(businessId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) return; // Skip if no token

    const response = await fetch(`/api/business/is-saved/${businessId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token'); // Clear invalid token
        return;
      }
      return;
    }
    
    const data = await response.json();
    
    const saveBtn = document.querySelector(`.save-business-btn[data-business-id="${businessId}"]`);
    if (saveBtn && data.isSaved) {
      saveBtn.classList.add('saved');
      saveBtn.querySelector('i').classList.replace('bi-bookmark', 'bi-bookmark-fill');
    }
  } catch (error) {
    // Handle error silently without logging
    // Only log in debug mode
    if (window.DEBUG_MODE) {
      console.error('Error checking saved status:', error);
    }
  }
}

function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;
  
  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = {
      businessId: document.getElementById('businessId').value,
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      phone: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      timeframe: document.getElementById('timeframe').value,
      message: document.getElementById('message').value,
      newsletter: document.getElementById('newsletter').checked,
    };

    fetch('/contact-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    .then(function(response) {
      if (response.ok) {
        alert('Your message has been sent!');
        contactForm.reset();
        const contactModal = bootstrap.Modal.getInstance(document.getElementById('contactModal'));
        if (contactModal) contactModal.hide();
      } else {
        alert('There was a problem sending your message.');
      }
    })
    .catch(function() {
      alert('There was a problem sending your message.');
    });
  });
}

function initOffMarketLink() {
  const offMarketLink = document.getElementById('leads-link');
  if (!offMarketLink) return;
  
  offMarketLink.addEventListener('click', async function(e) {
    e.preventDefault();
    window.location.href = '/off-market-leads';
  });
}

// Add scroll-based check for lazy loading images and saved status
window.addEventListener('scroll', debounce(function() {
  // Check for and load newly visible images
  document.querySelectorAll('img.lazy-load').forEach(img => {
    if (isElementInViewport(img) && imageObserver) {
      img.src = img.dataset.src;
      img.classList.remove('lazy-load');
      imageObserver.unobserve(img);
    }
  });
  
  // Check for newly visible save buttons to update their state
  document.querySelectorAll('.save-business-btn').forEach(btn => {
    if (isElementInViewport(btn) && !btn.dataset.checkedStatus) {
      const businessId = btn.dataset.businessId;
      if (businessId) {
        btn.dataset.checkedStatus = 'true';
        checkSavedStatus(businessId);
      }
    }
  });
}, 200)); // Throttle scroll event for better performance

// Helper function to debounce events
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Handle Contact Seller button clicks with improved UX
 */
function initContactSellerButtons() {
  document.querySelectorAll('.contact-btn, .contact-seller-btn').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default behavior
      e.stopPropagation(); // Stop event propagation
      
      console.log('Contact button clicked'); // Debug output
      
      // Check if user is logged in before proceeding
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login with return URL to current page
        window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      
      // Get the business ID from the clicked button
      const businessId = this.getAttribute('data-business-id');
      
      // Updated to navigate to business page first, which will handle the contact flow
      window.location.href = `/business/${businessId}#contact`;
    });
  });
  
  // Handle form submission
  const submitContactForm = document.getElementById('submitContactForm');
  if (submitContactForm) {
    submitContactForm.addEventListener('click', function() {
      console.log('Form submit button clicked'); // Debug output
      
      const form = document.getElementById('preContactForm');
      if (!form) {
        console.error('Contact form not found');
        return;
      }
      
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      // Get form data
      const businessId = document.getElementById('contactBusinessId').value;
      const otherUserId = document.getElementById('contactOtherUserId').value;
      const interest = document.getElementById('buyerInterest')?.value || 'Interested';
      const timeline = document.getElementById('buyerTimeline')?.value || 'As soon as possible';
      const message = document.getElementById('initialMessage')?.value || '';
      const questions = document.getElementById('buyerQuestions')?.value || '';
      const contactConsent = document.getElementById('contactConsent')?.checked || false;
      
      // Save contact form data to database first
      fetch('/api/chat/save-contact-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          businessId,
          otherUserId,
          interest,
          timeline,
          message,
          questions,
          contactConsent
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save contact form data');
        }
        return response.json();
      })
      .then(data => {
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
        
        // Create the URL with all parameters and include form ID
        const redirectUrl = `/chat/start-conversation?otherUserId=${otherUserId}&businessId=${businessId}&initialMessage=${encodedMessage}&formId=${data.formId}`;
        console.log('Redirecting to:', redirectUrl);
        
        // Redirect to chat with initial message
        window.location.href = redirectUrl;
        
        // Hide the modal
        try {
          const contactModal = bootstrap.Modal.getInstance(document.getElementById('contactFormModal'));
          if (contactModal) contactModal.hide();
        } catch (e) {
          console.error('Error hiding modal:', e);
        }
      })
      .catch(error => {
        console.error('Error saving contact form:', error);
        alert('There was a problem submitting your form. Please try again.');
      });
    });
  } else {
    console.error('Submit contact form button not found');
  }
}

/**
 * Apply selected filters
 */
function applyFilters() {
    // Get filter values
    const location = document.getElementById('locationInput')?.value || '';
    const industriesChecked = Array.from(document.querySelectorAll('.industry-checkbox:checked')).map(cb => cb.value);
    const priceRange = document.querySelector('input[name="priceRange"]:checked')?.value || '';
    const revenueRange = document.querySelector('input[name="revenueRange"]:checked')?.value || '';
    const cashflowRange = document.querySelector('input[name="cashflowRange"]:checked')?.value || '';
    
    // Build filters object
    const filters = {
        location: location,
        industries: industriesChecked.join(','),
        priceRange: priceRange,
        revenueRange: revenueRange,
        cashflowRange: cashflowRange
    };
    
    console.log('Applying filters:', filters);
    loadPage(1, filters);
}

// ===============================================
// HORIZONTAL SCROLL FUNCTIONALITY
// ===============================================

/**
 * Initialize horizontal scroll navigation
 */
function initHorizontalScroll() {
    const scrollContainer = document.getElementById('listings-container');
    const leftBtn = document.getElementById('scrollLeft');
    const rightBtn = document.getElementById('scrollRight');
    
    if (!scrollContainer || !leftBtn || !rightBtn) return;
    
    // Calculate scroll amount based on card width + gap
    const getScrollAmount = () => {
        const cardWidth = window.innerWidth <= 480 ? 172 : // 160px + 12px gap
                         window.innerWidth <= 768 ? 192 : // 180px + 12px gap  
                         window.innerWidth <= 1200 ? 235 : // 220px + 15px gap
                         window.innerWidth <= 1400 ? 255 : // 240px + 15px gap
                         275; // 260px + 15px gap
        return cardWidth * 2; // Scroll 2 cards at a time
    };
    
    // Update button states based on scroll position
    const updateButtonStates = () => {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
        
        leftBtn.disabled = scrollLeft <= 0;
        rightBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
        
        leftBtn.classList.toggle('hidden', scrollLeft <= 0);
        rightBtn.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - 1);
    };
    
    // Smooth scroll function
    const smoothScroll = (amount) => {
        scrollContainer.scrollBy({
            left: amount,
            behavior: 'smooth'
        });
    };
    
    // Event listeners
    leftBtn.addEventListener('click', () => {
        smoothScroll(-getScrollAmount());
    });
    
    rightBtn.addEventListener('click', () => {
        smoothScroll(getScrollAmount());
    });
    
    // Update button states on scroll
    scrollContainer.addEventListener('scroll', updateButtonStates);
    
    // Update button states on resize
    window.addEventListener('resize', updateButtonStates);
    
    // Initial button state update
    setTimeout(updateButtonStates, 100);
    
    // Add keyboard navigation
    scrollContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            smoothScroll(-getScrollAmount());
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            smoothScroll(getScrollAmount());
        }
    });
    
    // Add touch/swipe support for mobile
    let startX = 0;
    let startScrollLeft = 0;
    let isDragging = false;
    
    scrollContainer.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startScrollLeft = scrollContainer.scrollLeft;
        isDragging = true;
    });
    
    scrollContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        scrollContainer.scrollLeft = startScrollLeft + diff;
    });
    
    scrollContainer.addEventListener('touchend', () => {
        isDragging = false;
        updateButtonStates();
    });
}

/**
 * Initialize horizontal scroll after DOM content loads
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize horizontal scroll when listings are loaded
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.target.id === 'listings-container') {
                // Delay initialization to ensure DOM is fully updated
                setTimeout(initHorizontalScroll, 100);
            }
        });
    });
    
    const listingsContainer = document.getElementById('listings-container');
    if (listingsContainer) {
        observer.observe(listingsContainer, { childList: true });
    }
});