import { initializeTracking } from './marketplace-tracking.js';

// Use a single loading state
let isLoading = false;
let imageObserver; // Global IntersectionObserver for lazy loading

/**
 * Standardized function to get authentication token from multiple sources
 * @returns {string|null} - Auth token or null if not found
 */
function getAuthToken() {
  // Try multiple token sources in order of preference
  const sources = [
    () => localStorage.getItem('token'),
    () => localStorage.getItem('authToken'),
    () => document.querySelector('meta[name="auth-token"]')?.content,
    () => getCookieValue('token'),
    () => getCookieValue('authToken')
  ];
  
  for (const getToken of sources) {
    const token = getToken();
    if (token && token.trim()) {
      console.log('Auth token found from source:', getToken.name || 'unknown');
      return token.trim();
    }
  }
  
  console.warn('No auth token found in any source');
  return null;
}

/**
 * Helper function to get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null
 */
function getCookieValue(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user has valid auth token
 */
function isUserAuthenticated() {
  const token = getAuthToken();
  return !!token;
}

/**
 * Redirect to login with return URL
 * @param {string} message - Optional message to show
 */
function redirectToLogin(message = 'Please log in to continue') {
  if (message) {
    console.log('Redirecting to login:', message);
  }
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login2?returnTo=${returnTo}&message=${encodeURIComponent(message)}`;
}

// Add GCS config - check if it exists globally first
if (typeof window.GCS_CONFIG === 'undefined') {
  window.GCS_CONFIG = {
    bucket: 'arzani-marketplace-files',
    retryAttempts: 2
  };
} else {
  // Add retryAttempts if it doesn't exist
  window.GCS_CONFIG.retryAttempts = window.GCS_CONFIG.retryAttempts || 2;
}

/**
 * Initialize Featured Experts section below the marketplace listings
 */
async function initializeFeaturedExperts() {
  // Find the main marketplace container
  const marketplaceContainer = document.querySelector('.container.mt-5');
  if (!marketplaceContainer) {
    console.warn('Marketplace container not found');
    return;
  }
  
  // Check if featured experts section already exists to avoid duplicates
  const existingSection = document.getElementById('featured-experts-section');
  if (existingSection) {
    existingSection.remove();
  }
  
  // Generate featured experts HTML directly using the integrated function
  const expertsHTML = await generateFeaturedExpertsSection();
  
  // Create the featured experts section and add it within the same container
  const featuredExpertsSection = document.createElement('div');
  featuredExpertsSection.innerHTML = expertsHTML;
  
  // Add the section within the marketplace container (not as a sibling)
  // This ensures perfect alignment with marketplace listings
  marketplaceContainer.appendChild(featuredExpertsSection.firstElementChild);
  
  // Initialize navigation functionality
  setTimeout(() => {
    initializeFeaturedExpertsNavigation();
  }, 100);
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
    // Pagination removed as requested
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
    console.log(`Business ${business.id} (${business.business_name}):`, {
      originalImages: business.images,
      processedImages: business.processedImages,
      isVisible: isVisible,
      index: index
    });
    
    // Create card with optimized image loading
    businessCard.innerHTML = generateBusinessCard(business, isVisible);
    
    // Initialize carousel immediately for this card
    const carousel = businessCard.querySelector('.card-image-carousel');
    if (carousel) {
      setTimeout(() => initializeCarousel(carousel), 0);
    }
    
    fragment.appendChild(businessCard);
  });
  
  // Initialize lazy loading BEFORE DOM insertion to avoid timing issues
  // Clean up existing observer first
  if (imageObserver) {
    imageObserver.disconnect();
  }
  
  // Batch DOM update
  listingsContainer.appendChild(fragment);
  
  // Initialize lazy loading immediately after DOM insertion
  initLazyLoading();
  
  // Add featured experts section in place of professionals
  initializeFeaturedExperts();
  
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
  // Enhanced validation and error handling
  if (!business || !business.images) {
    // Business or business.images is missing
    return ['/images/default-business.jpg'];
  }
  
  // Check if GCS_CONFIG is available
  if (typeof window.GCS_CONFIG === 'undefined' || !window.GCS_CONFIG.bucket) {
    console.error('GCS_CONFIG is not properly initialized');
    return ['/images/default-business.jpg'];
  }
  
  let images = business.images;
  
  // Handle different data types from database
  if (typeof images === 'string') {
    if (images.startsWith('{') && images.endsWith('}')) {
      // Parse PostgreSQL array format {url1,url2,url3}
      images = images.substring(1, images.length - 1)
        .split(',')
        .map(url => url.trim().replace(/^"|"$/g, '')); // Remove quotes if present
    } else if (images.includes(',')) {
      // Handle comma-separated string
      images = images.split(',').map(url => url.trim());
    } else {
      // Single image string
      images = [images.trim()];
    }
  }
  
  if (!Array.isArray(images) || images.length === 0) {
    // Processed images is not a valid array
    return ['/images/default-business.jpg'];
  }
  
  return images.map(image => {
    if (!image || image.trim() === '') return '/images/default-business.jpg';
    
    const cleanImage = image.trim();
    
    // If already a full URL, use it as is
    if (cleanImage.startsWith('http')) {
      return cleanImage;
    }
    
    // If it's a relative upload path, convert to GCS URL
    if (cleanImage.startsWith('/uploads/')) {
      const filename = cleanImage.substring('/uploads/'.length);
      return `https://storage.googleapis.com/${window.GCS_CONFIG.bucket}/businesses/${business.id}/${filename}`;
    }
    
    // Otherwise it's just a filename, construct the GCS URL
    return `https://storage.googleapis.com/${window.GCS_CONFIG.bucket}/businesses/${business.id}/${cleanImage}`;
  }).filter(url => url !== null); // Remove any null URLs
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
    // No images available for business, using default
    return `<div class="card-image-carousel">
      <button class="save-business-btn" data-business-id="${business.id}">
        <i class="bi bi-bookmark"></i>
      </button>
      <img src="/images/default-business.jpg" class="card-img-top" alt="Default business image" width="300" height="200">
    </div>`;
  }
  
  // Generating carousel for business

  return `<div class="card-image-carousel">
    <button class="save-business-btn" data-business-id="${business.id}">
      <i class="bi bi-bookmark"></i>
    </button>
    <div class="carousel-inner">
      ${images.map((imageUrl, index) => {
        // CORRECTED APPROACH: Load first image immediately ONLY if the card is visible
        const isFirstImage = index === 0;
        const shouldLoadImmediately = isFirstImage && isVisible;
        
        // For first image of visible cards: load immediately
        // For all other images: use lazy loading
        const imgSrc = shouldLoadImmediately ? imageUrl : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        const dataSrc = shouldLoadImmediately ? "" : `data-src="${imageUrl}"`;
        const lazyClass = shouldLoadImmediately ? "" : "lazy-load";
        
        // Image processing for first image completed
        
        // Add multi-region fallback attributes for all images
        let fallbackSrc = "";
        if (imageUrl.includes('eu-west-2')) {
          fallbackSrc = `data-fallback="${imageUrl.replace('eu-west-2', 'eu-north-1')}"`;
        } else if (imageUrl.includes('eu-north-1')) {
          fallbackSrc = `data-fallback="${imageUrl.replace('eu-north-1', 'eu-west-2')}"`;
        }
        
        console.log(`Image ${index + 1} for business ${business.id}:`, {
          imageUrl,
          isFirstImage,
          imgSrc: imgSrc.substring(0, 50) + '...',
          hasDataSrc: !!dataSrc,
          hasLazyClass: !!lazyClass
        });
        
        return `<div class="carousel-item ${isFirstImage ? 'active' : ''}" data-index="${index}">
          <img src="${imgSrc}" ${dataSrc} ${fallbackSrc} class="card-img-top ${lazyClass}" 
               alt="${business.business_name}" width="300" height="200"
               data-business-id="${business.id}" data-image-index="${index}" data-original-url="${imageUrl}"
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
 * Load image with timeout and proper error handling
 * @param {HTMLImageElement} img - Image element to load
 * @param {string} src - Source URL to load
 * @param {number} timeout - Timeout in milliseconds (default 5000)
 */
function loadImageWithTimeout(img, src, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      img.onerror = null;
      img.onload = null;
      reject(new Error('Image loading timeout'));
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
      resolve(img);
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      img.onload = null;
      img.onerror = null;
      reject(new Error('Image loading failed'));
    };
    
    img.src = src;
  });
}

/**
 * Add global function for handling image errors - fallback to alternate region
 */
window.handleImageError = function(img) {
  // Image failed to load, applying fallback logic
  
  // Check if we've already tried the fallback
  if (img.dataset.usedFallback === 'true') {
    // If we already tried fallback, use default image
    // Fallback also failed, using default image
    img.src = '/images/default-business.jpg';
    img.onerror = null; // Remove error handler to prevent loops
    return;
  }
  
  // Try the fallback URL
  if (img.dataset.fallback) {
    img.dataset.usedFallback = 'true';
    img.src = img.dataset.fallback;
  } 
  // For GCS URLs, just use default image on error since there's no region fallback
  else if (img.src.includes('storage.googleapis.com')) {
    if (window.DEBUG_MODE) {
      // GCS image failed, using default image
    }
    img.dataset.usedFallback = 'true';
    img.src = '/images/default-business.jpg';
    img.onerror = null;
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
  
  // Navigate to business details
  
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
            // Load image with timeout for GCS URLs
            loadImageWithTimeout(img, img.dataset.src, 8000) // Increased timeout for GCS
              .then(() => {
                img.classList.add('loaded');
              })
              .catch((error) => {
                // Image loading failed, using default
                // Use default image on timeout or error
                img.src = '/images/default-business.jpg';
                img.onerror = null;
              })
              .finally(() => {
                img.removeAttribute('data-src');
                img.classList.remove('lazy-load');
                imageObserver.unobserve(img);
              });
          }
        }
      });
    }, {
      rootMargin: '300px', // Increased margin for better preloading
      threshold: 0.1
    });
    
    // Find and observe all lazy load images
    const lazyImages = document.querySelectorAll('img.lazy-load');
    // Found lazy images to observe
    
    if (lazyImages.length === 0) {
      // No lazy-load images found
    }
    
    lazyImages.forEach((img, index) => {
      // Observing lazy image
      imageObserver.observe(img);
    });
    
    // Also check for any images that should have loaded immediately but didn't
    const immediateImages = document.querySelectorAll('.carousel-item.active img:not(.lazy-load)');
    // Found immediate-load images
    
    immediateImages.forEach((img, index) => {
      console.log(`Immediate image ${index + 1}:`, {
        src: img.src,
        originalUrl: img.getAttribute('data-original-url'),
        businessId: img.getAttribute('data-business-id'),
        hasPlaceholder: img.src.includes('data:image/gif'),
        isVisible: img.offsetWidth > 0 && img.offsetHeight > 0
      });
      
      if (img.src.includes('data:image/gif')) {
        // Critical: Immediate image still has placeholder src
        
        // Try to fix it by setting the correct URL
        const correctUrl = img.getAttribute('data-original-url');
        if (correctUrl) {
          console.log('Attempting to fix by setting correct URL...');
          img.src = correctUrl;
        }
      }
    });
  } else {
    // Fallback for browsers that don't support IntersectionObserver
    document.querySelectorAll('img.lazy-load').forEach(img => {
      if (img.dataset.src) {
        // Load image with timeout for GCS URLs
        loadImageWithTimeout(img, img.dataset.src, 5000)
          .then(() => {
            if (window.DEBUG_MODE) {
              // Fallback image loaded successfully
            }
          })
          .catch((error) => {
            if (window.DEBUG_MODE) {
              // Fallback image loading failed, using default
            }
            // Use default image on timeout or error
            img.src = '/images/default-business.jpg';
            img.onerror = null;
          });
        
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
          // Load image with timeout for carousel
          loadImageWithTimeout(img, img.dataset.src, 5000)
            .then(() => {
              if (window.DEBUG_MODE) {
                // Carousel image loaded successfully
              }
            })
            .catch((error) => {
              if (window.DEBUG_MODE) {
                // Carousel image loading failed, using default
              }
              // Use default image on timeout or error
              img.src = '/images/default-business.jpg';
              img.onerror = null;
            });
          
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
    if (isElementInViewport(img) && img.dataset.src) {
      // Load image with timeout
      loadImageWithTimeout(img, img.dataset.src, 5000)
        .then(() => {
          if (window.DEBUG_MODE) {
            // Scroll-triggered image loaded successfully
          }
        })
        .catch((error) => {
          if (window.DEBUG_MODE) {
            // Scroll-triggered image loading failed, using default
          }
          // Use default image on timeout or error
          img.src = '/images/default-business.jpg';
          img.onerror = null;
        });
      
      img.classList.remove('lazy-load');
      if (imageObserver) {
        imageObserver.unobserve(img);
      }
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
 * Handle Contact Seller button clicks with token system integration
 */
function initContactSellerButtons() {
  // Initialize the enhanced contact seller manager
  if (typeof ContactSellerManager !== 'undefined') {
    const contactManager = new ContactSellerManager();
    contactManager.init();
  } else {
    console.warn('ContactSellerManager not loaded, falling back to basic contact handling');
    
    // Fallback to basic contact handling if enhanced system is not available
    document.querySelectorAll('.contact-btn, .contact-seller-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default behavior
        e.stopPropagation(); // Stop event propagation
        
        // Contact button clicked
        
        // Check if user is logged in before proceeding
        const token = getAuthToken();
        
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
  }
  
  // Handle form submission
  const submitContactForm = document.getElementById('submitContactForm');
  if (submitContactForm) {
    submitContactForm.addEventListener('click', function() {
      // Form submit button clicked
      
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

// ===============================================
// PROFESSIONAL MARKETPLACE FUNCTIONALITY
// ===============================================

// Current marketplace view state
let currentMarketplaceView = 'businesses'; // 'businesses' or 'professionals'

/**
 * Add professionals section below business listings within the same container
 */
function addProfessionalsSection(listingsContainer) {
  if (!listingsContainer) return;
  
  // Check if professionals section already exists to avoid duplicates
  const existingSection = document.getElementById('verified-professionals-section');
  if (existingSection) {
    return; // Don't recreate if it already exists
  }
  
  // Find the parent container (should be the main marketplace container)
  const parentContainer = listingsContainer.parentElement;
  if (!parentContainer) return;
  
  // Create the professionals section
  const professionalsSection = document.createElement('div');
  professionalsSection.id = 'verified-professionals-section';
  professionalsSection.className = 'professionals-section mt-5';
  professionalsSection.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="marketplace-heading mb-0">Verified Professionals</h1>
    </div>
    <div class="professionals-wrapper">
      <div class="professionals-scroll-container">
        <div id="professionals-container" class="d-flex gap-3 overflow-auto pb-3" style="scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none;">
          <div class="loading-spinner text-center p-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading professionals...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Append within the same parent container as business listings
  parentContainer.appendChild(professionalsSection);
  
  // Load and render professionals
  loadAndRenderProfessionals();
}

/**
 * Load and render professionals in the dedicated professionals container
 */
async function loadAndRenderProfessionals() {
  const professionalsContainer = document.getElementById('professionals-container');
  if (!professionalsContainer) return;
  
  try {
    // Load verified professionals with featured flag from API
    const response = await fetch('/api/professionals?limit=8&featured=true');
    let professionals = [];
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.professionals && data.professionals.length > 0) {
        // Filter professionals who have at least 3 services
        professionals = data.professionals.filter(prof => {
          const services = prof.services_offered;
          return services && Array.isArray(services) && services.length >= 3;
        });
      }
    }
    
    // If no qualified professionals from API, use sample data
    if (professionals.length === 0) {
      professionals = getSampleProfessionals();
    }
    
    // Limit to 6 professionals for the section to show more variety
    professionals = professionals.slice(0, 6);
    
    // Process professional images
    const processedProfessionals = professionals.map(professional => ({
      ...professional,
      processedImages: processProfessionalImages(professional)
    }));
    
    // Render professionals
    renderProfessionalsInSection(processedProfessionals, professionalsContainer);
    
  } catch (error) {
    console.error('Failed to load professionals:', error);
    // Fall back to sample data
    const sampleProfessionals = getSampleProfessionals();
    renderProfessionalsInSection(sampleProfessionals, professionalsContainer);
  }
}

/**
 * Get sample professional data for testing
 */
function getSampleProfessionals() {
  return [
    {
      id: 1,
      user_id: 4,
      full_name: 'Michael Chen',
      professional_tagline: 'Expert Business Broker & M&A Advisor',
      professional_bio: 'Specialized in helping small and medium businesses navigate successful acquisitions and sales. Over 10 years of experience in business valuations, due diligence, and transaction management.',
      years_experience: 10,
      services_offered: ['Business Brokerage', 'M&A Advisory', 'Business Valuation', 'Due Diligence'],
      specializations: ['Technology Companies', 'Manufacturing', 'Service Businesses'],
      pricing_info: { hourly_rate: 150, consultation_fee: 0 },
      service_locations: ['London', 'Manchester', 'Birmingham'],
      professional_picture_url: '/images/default-profile.png',
      allow_direct_contact: true,
      featured_professional: true,
      profile_completion_score: 95,
      average_rating: 4.8,
      review_count: 24
    },
    {
      id: 2,
      user_id: 5,
      full_name: 'Sarah Williams',
      professional_tagline: 'Strategic Business Consultant',
      professional_bio: 'Helping businesses optimize operations and accelerate growth through strategic planning and operational excellence.',
      years_experience: 8,
      services_offered: ['Business Strategy', 'Operations Consulting', 'Market Analysis'],
      specializations: ['Retail', 'E-commerce', 'Hospitality'],
      pricing_info: { hourly_rate: 120, consultation_fee: 50 },
      service_locations: ['Bristol', 'Cardiff', 'Exeter'],
      professional_picture_url: '/images/default-professional-2.jpg',
      allow_direct_contact: true,
      featured_professional: false,
      profile_completion_score: 88,
      average_rating: 4.6,
      review_count: 18
    },
    {
      id: 3,
      user_id: 6,
      full_name: 'David Thompson',
      professional_tagline: 'Financial Advisory Specialist',
      professional_bio: 'Providing comprehensive financial advisory services for business acquisitions, restructuring, and growth financing.',
      years_experience: 12,
      services_offered: ['Financial Planning', 'Investment Advisory', 'Risk Management'],
      specializations: ['Healthcare', 'Professional Services', 'Construction'],
      pricing_info: { hourly_rate: 180, consultation_fee: 100 },
      service_locations: ['Edinburgh', 'Glasgow', 'Aberdeen'],
      professional_picture_url: '/images/default-professional-3.jpg',
      allow_direct_contact: true,
      featured_professional: true,
      profile_completion_score: 92,
      average_rating: 4.9,
      review_count: 31
    },
    {
      id: 4,
      user_id: 7,
      full_name: 'Emma Rodriguez',
      professional_tagline: 'Legal & Compliance Advisor',
      professional_bio: 'Specialized in business law, mergers & acquisitions, and regulatory compliance for growing businesses.',
      years_experience: 9,
      services_offered: ['Legal Advisory', 'Contract Review', 'Compliance Consulting'],
      specializations: ['Technology', 'Finance', 'Real Estate'],
      pricing_info: { hourly_rate: 200, consultation_fee: 150 },
      service_locations: ['London', 'Reading', 'Cambridge'],
      professional_picture_url: '/images/default-professional-4.jpg',
      allow_direct_contact: true,
      featured_professional: false,
      profile_completion_score: 90,
      average_rating: 4.7,
      review_count: 22
    },
    {
      id: 5,
      user_id: 8,
      full_name: 'James Wilson',
      professional_tagline: 'Market Research & Analytics Expert',
      professional_bio: 'Providing data-driven insights and market intelligence to help businesses make informed strategic decisions.',
      years_experience: 7,
      services_offered: ['Market Research', 'Data Analytics', 'Competitive Analysis'],
      specializations: ['SaaS', 'Consumer Goods', 'B2B Services'],
      pricing_info: { hourly_rate: 100, consultation_fee: 75 },
      service_locations: ['Leeds', 'Sheffield', 'York'],
      professional_picture_url: '/images/default-professional-5.jpg',
      allow_direct_contact: true,
      featured_professional: false,
      profile_completion_score: 85,
      average_rating: 4.5,
      review_count: 16
    }
  ];
}

/**
 * Render professionals in the dedicated section container
 */
function renderProfessionalsInSection(professionals, container) {
  if (!container) return;
  
  if (professionals.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-muted">No verified professionals available at the moment.</p>
      </div>
    `;
    return;
  }
  
  // Create professional cards using existing horizontal card pattern
  const professionalsHtml = professionals.map((professional, index) => {
    const isVisible = index < 5; // Load all 5 immediately
    return `<div class="horizontal-card" style="flex: 0 0 280px; min-width: 280px;">${generateProfessionalCard(professional, isVisible)}</div>`;
  }).join('');
  
  // Add "Share Your Expertise" card at the end
  const shareExpertiseCard = generateShareExpertiseCard();
  
  container.innerHTML = professionalsHtml + shareExpertiseCard;
  
  // Initialize professional-specific event handlers
  initProfessionalEventHandlers();
  
  // Initialize share expertise card handler
  initShareExpertiseHandler();
}

/**
 * Load professionals from API with filtering and pagination (legacy function)
 */
export async function loadProfessionals(pageNumber = 1, filters = {}) {
  // Set loading state
  isLoading = true;
  const listingsContainer = document.getElementById('listings-container');
  if (listingsContainer) {
    listingsContainer.innerHTML = '<div class="loading-spinner text-center p-4"><div class="spinner-border" role="status"><span class="visually-hidden">Loading professionals...</span></div></div>';
  }
  
  // Parse professional-specific filters
  const query = new URLSearchParams({
    page: pageNumber.toString(),
    location: filters.location || '',
    services: filters.services || '', // Professional services instead of industries
    experienceMin: filters.experienceRange?.split('-')[0] || '',
    experienceMax: filters.experienceRange?.split('-')[1] || '',
    priceRange: filters.priceRange || '',
    specializations: filters.specializations || '',
    rating: filters.rating || '',
    search: filters.search || ''
  }).toString();

  try {
    const response = await fetch(`/api/professionals?${query}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load professionals');
    }
    
    // Process professional images similar to business images
    const processedProfessionals = data.professionals.map(professional => ({
      ...professional,
      processedImages: processProfessionalImages(professional)
    }));
    
    renderProfessionals(processedProfessionals);
    renderPaginationControls(pageNumber, data.pagination.totalPages);
    
    return data;
  } catch (error) {
    console.error('Failed to load professionals:', error);
    if (listingsContainer) {
      listingsContainer.innerHTML = `
        <div class="alert alert-danger text-center">
          <h5>Error Loading Professionals</h5>
          <p>Failed to load professionals. Please try again.</p>
          <button class="btn btn-outline-danger" onclick="loadProfessionals(${pageNumber}, ${JSON.stringify(filters).replace(/"/g, '&quot;')})">
            <i class="bi bi-arrow-clockwise"></i> Retry
          </button>
        </div>
      `;
    }
  } finally {
    isLoading = false;
  }
}

/**
 * Render professionals in the listings container
 */
function renderProfessionals(professionals) {
  const listingsContainer = document.getElementById('listings-container');
  if (!listingsContainer) return;
  
  listingsContainer.innerHTML = '';

  if (professionals.length === 0) {
    listingsContainer.innerHTML = `
      <div class="no-results text-center py-5">
        <i class="bi bi-person-x display-1 text-muted mb-3"></i>
        <h3>No professionals found</h3>
        <p class="text-muted">Try adjusting your filters or search criteria.</p>
      </div>
    `;
    return;
  }

  // Create document fragment for batch DOM updates
  const fragment = document.createDocumentFragment();
  
  professionals.forEach((professional, index) => {
    const professionalCard = document.createElement('div');
    professionalCard.className = 'horizontal-card';
    
    // Determine if professional should be visible initially (for lazy loading)
    const isVisible = index < 6; // Load first 6 professionals immediately
    
    professionalCard.innerHTML = generateProfessionalCard(professional, isVisible);
    fragment.appendChild(professionalCard);
  });
  
  // Batch DOM update
  listingsContainer.appendChild(fragment);
  
  // Initialize lazy loading for professional images
  initLazyLoading();
  
  // Initialize tooltips
  initTooltips();
  
  // Initialize professional-specific event handlers
  initProfessionalEventHandlers();
}

/**
 * Generate professional card HTML
 */
function generateProfessionalCard(professional, isVisible) {
  // Process professional images for display
  const imagesHtml = professional.processedImages && professional.processedImages.length > 0
    ? generateProfessionalImageDisplay(professional, professional.processedImages, isVisible)
    : `<div class="professional-image-container position-relative">
        <button class="save-professional-btn position-absolute top-0 end-0 m-2 btn btn-outline-light btn-sm" data-professional-id="${professional.id}">
          <i class="bi bi-bookmark"></i>
        </button>
        <img src="/images/default-professional.jpg" class="professional-img card-img-top" alt="Professional profile" style="height: 200px; object-fit: cover;">
      </div>`;

  // Generate service badges
  const servicesBadges = generateServicesBadges(professional.services_offered);
  
  // Generate rating display
  const ratingHtml = generateProfessionalRating(professional);
  
  // Calculate experience display
  const experienceText = professional.years_experience 
    ? `${professional.years_experience}+ Years`
    : 'Experience varies';

  return `
    <div class="card professional-card h-100 shadow-sm">
      ${imagesHtml}
      <div class="card-body d-flex flex-column">
        <div class="professional-header mb-3">
          <h5 class="card-title mb-1">${escapeHtml(professional.full_name || 'Professional')}</h5>
          <p class="professional-title text-muted mb-2">${escapeHtml(professional.professional_tagline || 'Professional Services')}</p>
          ${ratingHtml}
        </div>
        
        <div class="professional-details mb-3">
          <div class="experience-badge mb-2">
            <i class="bi bi-calendar-check text-primary"></i>
            <span class="ms-1">${experienceText}</span>
          </div>
          <div class="location-info">
            <i class="bi bi-geo-alt text-muted"></i>
            <span class="ms-1">${escapeHtml(getLocationText(professional))}</span>
          </div>
        </div>
        
        <div class="services-container mb-3">
          ${servicesBadges}
        </div>
        
        <div class="pricing-info mb-3">
          ${generatePricingDisplay(professional.pricing_info)}
        </div>
        
        <div class="card-actions mt-auto">
          <div class="row g-2">
            <div class="col-6">
              <button class="btn btn-outline-primary btn-sm w-100" data-professional-id="${professional.id}" onclick="showProfessionalProfile(${professional.id})">
                <i class="bi bi-person-circle"></i> Profile
              </button>
            </div>
            <div class="col-6">
              ${isUserAuthenticated() ? 
                `<button class="btn btn-primary btn-sm w-100 contact-professional-btn" 
                        data-professional-id="${professional.id}"
                        data-professional-name="${escapeHtml(professional.full_name)}">
                  <i class="bi bi-chat-dots"></i> Chat` :
                `<button class="btn btn-outline-primary btn-sm w-100" 
                        onclick="redirectToLogin('Please log in to chat with professionals')">
                  <i class="bi bi-box-arrow-in-right"></i> Login to Chat`
              }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate "Share Your Expertise" card to encourage user sign-ups
 */
function generateShareExpertiseCard() {
  return `
    <div class="horizontal-card" style="flex: 0 0 280px; min-width: 280px;">
      <div class="card share-expertise-card h-100 shadow-sm border-2 border-primary" style="background: linear-gradient(135deg, #f8f9ff 0%, #e6f2ff 100%);">
        <div class="card-body d-flex flex-column justify-content-center align-items-center text-center p-4">
          <!-- Share Your Expertise Icon -->
          <div class="share-expertise-icon mb-3">
            <div class="icon-circle d-flex align-items-center justify-content-center mx-auto" 
                 style="width: 80px; height: 80px; background: #007bff; border-radius: 50%; color: white;">
              <i class="bi bi-plus-circle-fill" style="font-size: 2.5rem;"></i>
            </div>
          </div>
          
          <!-- Title -->
          <h5 class="card-title mb-2 fw-bold text-primary">Share Your Expertise</h5>
          
          <!-- Description -->
          <p class="card-text text-muted mb-3 small">
            Join our network of verified professionals and grow your business
          </p>
          
          <!-- Features list -->
          <div class="features-list mb-4 text-start w-100">
            <div class="feature-item mb-2">
              <i class="bi bi-check-circle-fill text-success me-2"></i>
              <small class="text-dark">Get verified status</small>
            </div>
            <div class="feature-item mb-2">
              <i class="bi bi-check-circle-fill text-success me-2"></i>
              <small class="text-dark">Connect with buyers</small>
            </div>
            <div class="feature-item mb-2">
              <i class="bi bi-check-circle-fill text-success me-2"></i>
              <small class="text-dark">Grow your network</small>
            </div>
          </div>
          
          <!-- CTA Button -->
          <button class="btn btn-primary w-100 fw-bold create-profile-btn" 
                  style="background: linear-gradient(45deg, #007bff, #0056b3); border: none; border-radius: 8px;">
            <i class="bi bi-person-plus me-2"></i>Create Profile
          </button>
          
          <!-- Secondary CTA -->
          <small class="text-muted mt-2">
            <a href="#" class="text-decoration-none learn-more-link">Learn more →</a>
          </small>
        </div>
      </div>
    </div>
  `;
}

/**
 * Process professional images for display
 */
function processProfessionalImages(professional) {
  if (!professional.professional_picture_url && (!professional.portfolio_items || professional.portfolio_items.length === 0)) {
    return ['/images/default-professional.jpg'];
  }
  
  let images = [];
  
  // Add main professional picture first
  if (professional.professional_picture_url) {
    images.push(professional.professional_picture_url);
  }
  
  // Add portfolio images if available
  if (professional.portfolio_items && Array.isArray(professional.portfolio_items)) {
    const portfolioImages = professional.portfolio_items
      .filter(item => item.type === 'image' && item.url)
      .map(item => item.url)
      .slice(0, 3); // Limit to 3 portfolio images
    
    images = images.concat(portfolioImages);
  }
  
  // Process URLs for GCS compatibility
  return images.map(image => {
    if (typeof image === 'string' && image.includes('storage.googleapis.com')) {
      // Ensure proper GCS URL format
      return image;
    }
    return image;
  });
}

/**
 * Generate professional image display (similar to business carousel but simplified)
 */
function generateProfessionalImageDisplay(professional, images, isVisible) {
  const firstImage = images[0];
  
  return `
    <div class="professional-image-container position-relative">
      <button class="save-professional-btn position-absolute top-0 end-0 m-2 btn btn-outline-light btn-sm" data-professional-id="${professional.id}">
        <i class="bi bi-bookmark"></i>
      </button>
      ${isVisible 
        ? `<img src="${firstImage}" class="professional-img card-img-top" alt="${escapeHtml(professional.full_name)}" style="height: 200px; object-fit: cover;" onerror="handleImageError(this)">` 
        : `<img data-src="${firstImage}" src="/images/placeholder.jpg" class="professional-img card-img-top lazy-load" alt="${escapeHtml(professional.full_name)}" style="height: 200px; object-fit: cover;" onerror="handleImageError(this)">`
      }
      ${images.length > 1 ? `<div class="image-count-badge position-absolute bottom-0 end-0 m-2 badge bg-dark">+${images.length - 1}</div>` : ''}
    </div>
  `;
}

/**
 * Generate services badges for professionals
 */
function generateServicesBadges(services) {
  if (!services || !Array.isArray(services) || services.length === 0) {
    return '<div class="services-badges"><span class="badge bg-light text-dark">General Services</span></div>';
  }
  
  // Limit to top 3 services for display
  const displayServices = services.slice(0, 3);
  const additionalCount = services.length - 3;
  
  const badges = displayServices.map(service => 
    `<span class="badge bg-primary me-1 mb-1">${escapeHtml(service)}</span>`
  ).join('');
  
  const additionalBadge = additionalCount > 0 
    ? `<span class="badge bg-secondary">+${additionalCount} more</span>`
    : '';
  
  return `<div class="services-badges">${badges}${additionalBadge}</div>`;
}

/**
 * Generate professional rating display
 */
function generateProfessionalRating(professional) {
  const rating = parseFloat(professional.average_rating) || 0;
  const reviewCount = parseInt(professional.review_count) || 0;
  
  // If no reviews, show verified badge instead
  if (reviewCount === 0) {
    return `
      <div class="rating-display">
        <div class="verified-badge">
          <i class="bi bi-patch-check-fill"></i>
          <span class="rating-text">Verified Professional</span>
        </div>
      </div>
    `;
  }
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<div class="rating-star"></div>';
  }
  
  // Half star (treat as full for simplicity)
  if (hasHalfStar) {
    starsHtml += '<div class="rating-star"></div>';
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<div class="rating-star empty"></div>';
  }
  
  return `
    <div class="rating-display">
      <div class="rating-stars">${starsHtml}</div>
      <span class="rating-text">${rating.toFixed(1)} (${reviewCount} review${reviewCount !== 1 ? 's' : ''})</span>
    </div>
  `;
}

/**
 * Generate pricing display for professionals
 */
function generatePricingDisplay(pricingInfo) {
  if (!pricingInfo || typeof pricingInfo !== 'object') {
    return '<div class="pricing-display"><span class="text-muted">Contact for pricing</span></div>';
  }
  
  if (pricingInfo.type === 'hourly' && pricingInfo.rate) {
    return `<div class="pricing-display"><strong class="text-success">$${pricingInfo.rate}/hr</strong></div>`;
  }
  
  if (pricingInfo.type === 'project' && pricingInfo.range) {
    return `<div class="pricing-display"><strong class="text-success">$${pricingInfo.range.min} - $${pricingInfo.range.max}</strong> per project</div>`;
  }
  
  if (pricingInfo.type === 'consultation' && pricingInfo.rate) {
    return `<div class="pricing-display"><strong class="text-success">$${pricingInfo.rate}</strong> consultation</div>`;
  }
  
  return '<div class="pricing-display"><span class="text-primary">Flexible pricing</span></div>';
}

/**
 * Get location text for professional
 */
function getLocationText(professional) {
  if (professional.service_locations && professional.service_locations.primary) {
    return professional.service_locations.primary;
  }
  if (professional.user_location) {
    return professional.user_location;
  }
  return 'Location flexible';
}

/**
 * Initialize marketplace view toggle
 */
function initMarketplaceViewToggle() {
  const toggleContainer = document.getElementById('marketplace-view-toggle');
  if (!toggleContainer) {
    console.warn('Marketplace view toggle container not found');
    return;
  }
  
  toggleContainer.innerHTML = `
    <div class="btn-group mb-3" role="group" aria-label="Marketplace view toggle">
      <button type="button" class="btn btn-outline-primary ${currentMarketplaceView === 'businesses' ? 'active' : ''}" data-view="businesses">
        <i class="bi bi-building"></i> Businesses
      </button>
      <button type="button" class="btn btn-outline-primary ${currentMarketplaceView === 'professionals' ? 'active' : ''}" data-view="professionals">
        <i class="bi bi-person-badge"></i> Professionals
      </button>
    </div>
  `;
  
  // Add click handlers
  toggleContainer.addEventListener('click', handleViewToggle);
}

/**
 * Handle marketplace view toggle
 */
function handleViewToggle(event) {
  const button = event.target.closest('[data-view]');
  if (!button) return;
  
  const newView = button.dataset.view;
  if (newView === currentMarketplaceView) return;
  
  // Update button states
  const toggleContainer = document.getElementById('marketplace-view-toggle');
  toggleContainer.querySelectorAll('.btn').forEach(btn => {
    btn.classList.remove('active');
  });
  button.classList.add('active');
  
  // Switch view
  currentMarketplaceView = newView;
  
  // Update filter system
  updateFilterSystem(newView);
  
  // Load appropriate data
  if (newView === 'businesses') {
    loadPage(1, getCurrentFilters());
  } else {
    loadProfessionals(1, getCurrentFilters());
  }
  
  // Track view change
  if (typeof trackUserAction === 'function') {
    trackUserAction(null, `marketplace_view_${newView}`);
  }
}

/**
 * Update filter system based on view type
 */
function updateFilterSystem(viewType) {
  const filterContainer = document.querySelector('.filter-container');
  if (!filterContainer) return;
  
  if (viewType === 'professionals') {
    updateProfessionalFilters();
  } else {
    updateBusinessFilters();
  }
}

/**
 * Update filters for professional view
 */
function updateProfessionalFilters() {
  // Update industry filter to services filter
  const industrySelect = document.getElementById('industryFilter');
  if (industrySelect) {
    const servicesSelect = industrySelect.cloneNode(false);
    servicesSelect.id = 'servicesFilter';
    servicesSelect.innerHTML = '<option value="">All Services</option>';
    
    // Add common professional services
    const commonServices = [
      'Business Brokerage',
      'M&A Advisory',
      'Financial Planning',
      'Legal Services',
      'Accounting',
      'Marketing',
      'HR Consulting',
      'IT Consulting',
      'Management Consulting',
      'Due Diligence'
    ];
    
    commonServices.forEach(service => {
      const option = document.createElement('option');
      option.value = service;
      option.textContent = service;
      servicesSelect.appendChild(option);
    });
    
    industrySelect.parentNode.replaceChild(servicesSelect, industrySelect);
  }
  
  // Update price range label
  const priceLabel = document.querySelector('label[for="priceRange"]');
  if (priceLabel) {
    priceLabel.textContent = 'Hourly Rate';
  }
  
  // Add experience filter if not exists
  addExperienceFilter();
}

/**
 * Update filters for business view
 */
function updateBusinessFilters() {
  // Revert services filter to industry filter
  const servicesSelect = document.getElementById('servicesFilter');
  if (servicesSelect) {
    const industrySelect = servicesSelect.cloneNode(false);
    industrySelect.id = 'industryFilter';
    industrySelect.innerHTML = '<option value="">All Industries</option>';
    
    servicesSelect.parentNode.replaceChild(industrySelect, servicesSelect);
  }
  
  // Update price range label
  const priceLabel = document.querySelector('label[for="priceRange"]');
  if (priceLabel) {
    priceLabel.textContent = 'Price Range';
  }
  
  // Remove experience filter
  const experienceFilter = document.getElementById('experienceFilter');
  if (experienceFilter) {
    experienceFilter.parentNode.remove();
  }
}

/**
 * Add experience filter for professionals
 */
function addExperienceFilter() {
  const filtersRow = document.querySelector('.filters-row');
  if (!filtersRow || document.getElementById('experienceFilter')) return;
  
  const experienceCol = document.createElement('div');
  experienceCol.className = 'col-md-6 col-lg-3';
  experienceCol.innerHTML = `
    <label for="experienceFilter" class="form-label">Experience</label>
    <select class="form-select" id="experienceFilter">
      <option value="">Any Experience</option>
      <option value="0-2">0-2 Years</option>
      <option value="3-5">3-5 Years</option>
      <option value="6-10">6-10 Years</option>
      <option value="11-15">11-15 Years</option>
      <option value="16-100">16+ Years</option>
    </select>
  `;
  
  filtersRow.appendChild(experienceCol);
}

/**
 * Initialize professional-specific event handlers
 */
function initProfessionalEventHandlers() {
  // Contact professional buttons
  initContactProfessionalButtons();
  
  // Save professional buttons
  initSaveProfessionalButtons();
}

/**
 * Initialize share expertise card event handlers
 */
function initShareExpertiseHandler() {
  // Create Profile button handler
  document.addEventListener('click', function(event) {
    const createProfileBtn = event.target.closest('.create-profile-btn');
    if (!createProfileBtn) return;
    
    event.preventDefault();
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('authToken') || 
                      document.cookie.includes('token=') ||
                      document.querySelector('meta[name="user-authenticated"]')?.content === 'true';
    
    if (!isLoggedIn) {
      // Redirect to login/register with intent to create professional profile
      window.location.href = '/register?intent=professional&returnUrl=' + encodeURIComponent(window.location.pathname);
      return;
    }
    
    // If logged in, redirect to professional profile creation
    window.location.href = '/professional/create-profile';
  });
  
  // Learn More link handler
  document.addEventListener('click', function(event) {
    const learnMoreLink = event.target.closest('.learn-more-link');
    if (!learnMoreLink) return;
    
    event.preventDefault();
    
    // Redirect to professionals info page
    window.location.href = '/professionals/info';
  });
}

/**
 * Initialize contact professional buttons
 */
function initContactProfessionalButtons() {
  // Use event delegation for dynamic content
  document.addEventListener('click', function(event) {
    const contactBtn = event.target.closest('.contact-professional-btn');
    if (!contactBtn) return;
    
    event.preventDefault();
    
    const professionalId = contactBtn.dataset.professionalId;
    const professionalName = contactBtn.dataset.professionalName;
    
    if (!professionalId) {
      console.error('Professional ID not found on contact button');
      return;
    }
    
    // Similar to existing business contact flow
    initiateProfessionalContact(professionalId, professionalName);
  });
}

/**
 * Initiate contact with a professional
 */
async function initiateProfessionalContact(professionalId, professionalName) {
  try {
    // Get auth token
    const token = getAuthToken();
    
    if (!token) {
      window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    // Show loading state with better UX
    const contactBtns = document.querySelectorAll(`[data-professional-id="${professionalId}"]`);
    contactBtns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting Chat...';
      btn.style.opacity = '0.7';
    });
    
    // Create contact request
    const response = await fetch('/api/contact-professional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        professionalId: professionalId,
        message: `I'm interested in your professional services. I'd like to discuss my requirements.`
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Show brief success message before redirect
      const contactBtns = document.querySelectorAll(`[data-professional-id="${professionalId}"]`);
      contactBtns.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-check"></i> Connected!';
        btn.style.backgroundColor = '#10b981';
      });
      
      // Redirect to the chat conversation that was created
      setTimeout(() => {
        const redirectUrl = `/chat?conversation=${data.conversationId}`;
        window.location.href = redirectUrl;
      }, 800);
    } else {
      throw new Error(data.error || 'Failed to initiate contact');
    }
    
  } catch (error) {
    console.error('Professional contact failed:', error);
    
    // Reset button states with improved UX
    const contactBtns = document.querySelectorAll(`[data-professional-id="${professionalId}"]`);
    contactBtns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-comment-dots"></i> Chat';
      btn.style.opacity = '1';
    });
    
    // Show error message
    alert(error.message || 'Failed to contact professional. Please try again.');
  }
}

/**
 * Initialize save professional buttons
 */
function initSaveProfessionalButtons() {
  document.addEventListener('click', function(event) {
    const saveBtn = event.target.closest('.save-professional-btn');
    if (!saveBtn) return;
    
    event.preventDefault();
    
    const professionalId = saveBtn.dataset.professionalId;
    if (!professionalId) {
      console.error('Professional ID not found on save button');
      return;
    }
    
    toggleProfessionalSavedStatus(saveBtn, professionalId);
  });
}

/**
 * Toggle saved status for a professional
 */
async function toggleProfessionalSavedStatus(saveBtn, professionalId) {
  if (!isUserAuthenticated()) {
    redirectToLogin('Please log in to save professionals');
    return;
  }
  
  const token = getAuthToken();

  try {
    const response = await fetch('/api/saved-professionals/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ professionalId })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (data.success) {
      // Update button state
      const icon = saveBtn.querySelector('i');
      if (data.saved) {
        icon.className = 'bi bi-bookmark-fill';
        saveBtn.classList.add('saved');
        saveBtn.title = 'Remove from saved';
      } else {
        icon.className = 'bi bi-bookmark';
        saveBtn.classList.remove('saved');
        saveBtn.title = 'Save professional';
      }
    }
    
  } catch (error) {
    console.error('Failed to toggle saved professional:', error);
  }
}

/**
 * Show professional profile popup
 */
window.showProfessionalProfile = async function(professionalId) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('professionalProfileModal');
  if (!modal) {
    modal = createProfessionalProfileModal();
    document.body.appendChild(modal);
  }
  
  // Load professional data
  await loadProfessionalProfile(professionalId, modal);
  
  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
};

/**
 * Create professional profile modal
 */
function createProfessionalProfileModal() {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'professionalProfileModal';
  modal.setAttribute('tabindex', '-1');
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Professional Profile</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" id="professionalProfileContent">
          <div class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  return modal;
}

/**
 * Load professional profile data
 */
async function loadProfessionalProfile(professionalId, modal) {
  const contentContainer = modal.querySelector('#professionalProfileContent');
  
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/professionals/${professionalId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load professional profile');
    }
    
    const professional = data.professional;
    
    contentContainer.innerHTML = generateProfessionalProfileContent(professional);
    
    // Initialize profile-specific interactions
    initProfileInteractions(professional);
    
  } catch (error) {
    console.error('Failed to load professional profile:', error);
    contentContainer.innerHTML = `
      <div class="alert alert-danger">
        <h6>Error Loading Profile</h6>
        <p>Unable to load professional profile. Please try again later.</p>
        <button class="btn btn-outline-danger btn-sm" onclick="loadProfessionalProfile(${professionalId}, document.getElementById('professionalProfileModal'))">
          <i class="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    `;
  }
}

/**
 * Generate professional profile content for modal
 */
function generateProfessionalProfileContent(professional) {
  const profileImage = professional.professional_picture_url || professional.profile_picture || '/images/default-professional.jpg';
  const ratingHtml = generateProfessionalRating(professional);
  const services = Array.isArray(professional.services_offered)
    ? professional.services_offered
    : Array.isArray(professional.services)
      ? professional.services
      : [];
  const industries = Array.isArray(professional.industries_serviced)
    ? professional.industries_serviced
    : Array.isArray(professional.industries)
      ? professional.industries
      : [];
  const certifications = professional.education_certifications || professional.certifications || [];
  const userName = professional.username || professional.full_name || 'Professional';
  const website = professional.professional_website || professional.website;
  
  return `
    <div class="professional-profile-modal">
      <!-- Left Panel - Profile Overview -->
      <div class="profile-left-panel">
        <img src="${profileImage}" class="profile-image" alt="${escapeHtml(userName)}">
        <h2 class="profile-name">${escapeHtml(userName)}</h2>
        <p class="profile-tagline">${escapeHtml(professional.professional_tagline || 'Professional Services')}</p>
        
        <!-- Rating Display -->
        <div class="profile-rating">
          ${ratingHtml}
        </div>
        
        <!-- Contact Button -->
        <div class="profile-cta">
          ${isUserAuthenticated() ? 
            `<button class="contact-professional-btn" 
                    data-professional-id="${professional.id}"
                    data-professional-name="${escapeHtml(userName)}">
              <i class="bi bi-chat-dots"></i>
              Chat with ${escapeHtml(userName.split(' ')[0] || 'Professional')}
            </button>` :
            `<button class="btn btn-outline-primary btn-lg w-100" 
                    onclick="redirectToLogin('Please log in to chat with professionals')">
              <i class="bi bi-box-arrow-in-right"></i> Login to Chat
            </button>`
          }
        </div>
      </div>
      
      <!-- Right Panel - Detailed Information -->
      <div class="profile-right-panel">
        
        <!-- Professional Bio -->
        ${professional.professional_bio ? `
          <div class="profile-section">
            <h3 class="section-title">
              <i class="bi bi-person-lines-fill"></i>
              About
            </h3>
            <p class="bio-text">${escapeHtml(professional.professional_bio)}</p>
          </div>
        ` : ''}
        
        <!-- Services Offered Section -->
        <div class="profile-section">
          <h3 class="section-title">
            <i class="bi bi-gear-fill"></i>
            Services Offered
          </h3>
          <div class="services-grid">
            ${services && services.length > 0 ? 
              services.map(service => `
                <div class="service-tag">
                  <i class="bi bi-check-circle-fill"></i>
                  ${escapeHtml(service)}
                </div>
              `).join('') : 
              '<p class="text-muted">No specific services listed</p>'
            }
          </div>
        </div>
        
        <!-- Experience Section -->
        <div class="profile-section">
          <h3 class="section-title">
            <i class="bi bi-calendar-check-fill"></i>
            Experience
          </h3>
          <div class="experience-info">
            <span class="experience-years">${professional.years_experience ? professional.years_experience + '+ Years' : '10+ Years'}</span>
          </div>
        </div>
        
        <!-- Industries Serviced Section -->
        ${industries && industries.length > 0 ? `
          <div class="profile-section">
            <h3 class="section-title">
              <i class="bi bi-building-fill"></i>
              Industries Serviced
            </h3>
            <div class="industries-list">
              ${industries.map(industry => `
                <span class="industry-badge">${escapeHtml(industry)}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <!-- Education / Certifications Section -->
        ${certifications && (Array.isArray(certifications) ? certifications.length > 0 : true) ? `
          <div class="profile-section">
            <h3 class="section-title">
              <i class="bi bi-award-fill"></i>
              Education / Certifications
            </h3>
            <div class="certifications-list">
              ${Array.isArray(certifications) ? 
                certifications.map(cert => `
                  <div class="certification-item">
                    <i class="bi bi-award"></i>
                    ${escapeHtml(cert)}
                  </div>
                `).join('') : 
                `<div class="certification-item">
                  <i class="bi bi-award"></i>
                  ${escapeHtml(certifications)}
                </div>`
              }
            </div>
          </div>
        ` : ''}
        
        <!-- Website Section -->
        ${website ? `
          <div class="profile-section">
            <h3 class="section-title">
              <i class="bi bi-globe2"></i>
              Website
            </h3>
            <div class="website-link">
              <a href="${website}" target="_blank">
                <i class="bi bi-box-arrow-up-right"></i>
                ${website}
              </a>
            </div>
          </div>
        ` : ''}
        
      </div>
    </div>
  `;
}

/**
 * Initialize profile-specific interactions
 */
function initProfileInteractions(professional) {
  // Contact buttons in modal will use the existing event delegation
  // No additional setup needed
}

/**
 * Get current filters from the UI
 */
function getCurrentFilters() {
  return {
    location: document.getElementById('locationFilter')?.value || '',
    industries: document.getElementById('industryFilter')?.value || '',
    services: document.getElementById('servicesFilter')?.value || '',
    priceRange: document.getElementById('priceRange')?.value || '',
    revenueRange: document.getElementById('revenueRange')?.value || '',
    cashflowRange: document.getElementById('cashflowRange')?.value || '',
    experienceRange: document.getElementById('experienceFilter')?.value || '',
    search: document.getElementById('searchInput')?.value || ''
  };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // No longer need view toggle - professionals are always shown below businesses
  console.log('Marketplace initialized - professionals will be shown below business listings');
  
  // GCS image testing removed
});

// Test image loading function removed - debugging complete

// ===============================================
// FEATURED EXPERTS FUNCTIONALITY
// ===============================================

/**
 * Generate featured experts section HTML
 */
async function generateFeaturedExpertsSection() {
  let experts = [];
  
  try {
    // Load real professionals from API
    const response = await fetch('/api/professionals?limit=6&featured=true');
    if (response.ok) {
      const data = await response.json();
      if (data.professionals && data.professionals.length > 0) {
        experts = data.professionals.map(prof => ({
          id: prof.id,
          name: prof.full_name || 'Professional',
          role: prof.professional_tagline || 'Expert',
          avatar: prof.professional_picture_url || '/images/default-avatar.png',
          rating: 5,
          reviewCount: Math.floor(Math.random() * 21) + 20, // 20-40 reviews
          specializations: prof.services_offered || ['Professional Services'],
          yearsExperience: prof.years_experience || 0
        }));
      }
    }
  } catch (error) {
    console.error('Failed to load real professionals:', error);
  }
  
  // Fallback to sample data if no real professionals found
  if (experts.length === 0) {
    console.log('Using sample expert data');
    experts = getSampleExperts();
  }
  
  return `
    <div class="featured-experts-section mt-5" id="featured-experts-section">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="marketplace-heading mb-0">Featured Experts</h1>
        
        <!-- Featured Experts View Toggle (placeholder for future expansion) -->
        <div id="featured-experts-view-toggle">
          <!-- Toggle buttons could be inserted here by JavaScript if needed -->
        </div>
      </div>
      <div class="horizontal-marketplace-wrapper featured-experts-horizontal-wrapper">
        <button class="marketplace-nav-btn marketplace-nav-left" id="expertsScrollLeft" aria-label="Scroll featured experts left">
          <i class="bi bi-chevron-left"></i>
        </button>
        <div class="horizontal-listings-container">
          <div class="experts-carousel-container horizontal-listings-scroll" id="experts-carousel">
            ${generateExpertPromoCard()}
            ${experts.map(expert => generateExpertCard(expert)).join('')}
          </div>
        </div>
        <button class="marketplace-nav-btn marketplace-nav-right" id="expertsScrollRight" aria-label="Scroll featured experts right">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
    
    <div class="start-your-exit-section mt-5" id="start-your-exit-section">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="marketplace-heading mb-0">Start Your Exit</h1>
      </div>
      <div class="horizontal-marketplace-wrapper">
        <div class="horizontal-listings-container">
          <div class="horizontal-listings-scroll">
            ${generateStartYourExitCard()}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate sample experts data
 */
function getSampleExperts() {
  const baseExperts = [
    {
      id: 1,
      name: "Sarah Mitchell",
      role: "M&A Advisor",
      avatar: "/public/figma design exports/images/WOMAN1.png",
      specializations: ["Post-Merger Integration", "Startup Consulting", "Exit Strategy Planning", "Due Diligence", "Valuations"]
    },
    {
      id: 2,
      name: "David Chen",
      role: "Business Broker",
      avatar: "/public/figma design exports/images/MALE1.png",
      specializations: ["Restaurant Sales", "Retail Businesses", "Franchise"]
    },
    {
      id: 3,
      name: "Emma Rodriguez",
      role: "Financial Consultant",
      avatar: "/public/figma design exports/images/WOMAN2.png",
      specializations: ["Cash Flow Analysis", "Financial Planning", "SBA Loans"]
    },
    {
      id: 4,
      name: "James Wilson",
      role: "Legal Advisor",
      avatar: "/public/figma design exports/images/MALE2.png",
      specializations: ["Contract Law", "Business Formation", "Compliance"]
    },
    {
      id: 5,
      name: "Lisa Thompson",
      role: "Tax Specialist",
      avatar: "/public/figma design exports/images/WOMAN3.png",
      specializations: ["Tax Planning", "Asset Structure", "1031 Exchange"]
    },
    {
      id: 6,
      name: "Michael Foster",
      role: "Industry Expert",
      avatar: "/public/figma design exports/images/MALE3.png",
      specializations: ["Manufacturing", "Supply Chain", "Operations"]
    }
  ];

  return baseExperts.map(expert => ({
    ...expert,
    rating: 5,
    reviewCount: Math.floor(Math.random() * 21) + 20, // 20-40 reviews
    yearsExperience: Math.floor(Math.random() * 15) + 5 // 5-20 years
  }));
}

/**
 * Generate expert promo card
 */
function generateExpertPromoCard() {
  return `
    <div class="expert-promo-card">
      <div class="promo-content">
        <h3 class="promo-title" style="font-weight:900;color:#fff;font-family:'Inter',Arial Black,Arial,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,0.12),0 0 1px #041b76;">Share Your Expertise</h3>
        <p class="promo-subtitle" style="display:none;"></p>
        <button class="promo-cta-btn" onclick="window.location.href='/professional-verification'">
          Create Your Profile
        </button>
      </div>
    </div>
  `;
}

/**
 * Generate start your exit card
 */
function generateStartYourExitCard() {
  return `
    <div class="start-exit-card">
      <div class="exit-card-content">
        <div class="exit-icon">
          <i class="bi bi-graph-up-arrow"></i>
        </div>
        <h3 class="exit-card-title">Start Your Exit</h3>
        <p class="exit-card-subtitle">Ready to sell your business? Get expert guidance through every step of your exit strategy.</p>
        <div class="exit-features">
          <div class="exit-feature">
            <i class="bi bi-check-circle-fill"></i>
            <span>Business Valuation</span>
          </div>
          <div class="exit-feature">
            <i class="bi bi-check-circle-fill"></i>
            <span>Exit Planning</span>
          </div>
          <div class="exit-feature">
            <i class="bi bi-check-circle-fill"></i>
            <span>Expert Support</span>
          </div>
        </div>
        <button class="exit-cta-btn" onclick="initiateExitProcess()">
          Get Started
        </button>
      </div>
    </div>
  `;
}

/**
 * Generate expert card HTML
 */
function generateExpertCard(expert) {
  const starsHTML = generateExpertStars(expert.rating);
  const specializationsHTML = expert.specializations
    .slice(0, 3) // Limit to maximum 3 specializations per card
    .map(spec => {
      // Determine font size class based on text length
      let sizeClass = 'specialization-tag-short';
      if (spec.length > 18) {
        sizeClass = 'specialization-tag-long';
      } else if (spec.length > 12) {
        sizeClass = 'specialization-tag-medium';
      }
      return `<span class="specialization-tag ${sizeClass}">${escapeHtml(spec)}</span>`;
    })
    .join('');
  
  const experienceText = expert.yearsExperience > 0 ? `${expert.yearsExperience} years exp.` : '';

  return `
    <div class="expert-card" data-expert-id="${expert.id}">
      <img src="${expert.avatar}" alt="${escapeHtml(expert.name)}" class="expert-avatar" 
           onerror="this.src='/images/default-avatar.png'">
      <div class="expert-role">${escapeHtml(expert.role)}</div>
      <h3 class="expert-name">${escapeHtml(expert.name)}</h3>
      ${experienceText ? `<div class="expert-experience">${experienceText}</div>` : ''}
      <div class="expert-rating">
        <div class="rating-stars">${starsHTML}</div>
        <span class="rating-text">(${expert.reviewCount})</span>
      </div>
      <div class="expert-specializations">
        ${specializationsHTML}
      </div>
      <div class="expert-actions">
        <button class="expert-btn expert-btn-outline" onclick="viewExpertProfile('${expert.id}')">
          <i class="bi bi-person btn-icon"></i>
          Profile
        </button>
        ${isUserAuthenticated() ? 
          `<button class="expert-btn expert-btn-solid" onclick="initiateExpertChat('${expert.id}')">
            <i class="bi bi-chat-dots btn-icon"></i>
            Chat
           </button>` :
          `<button class="expert-btn expert-btn-solid" onclick="redirectToLogin('Please log in to chat with experts')">
            <i class="bi bi-box-arrow-in-right btn-icon"></i>
            Login to Chat
           </button>`
        }
      </div>
    </div>
  `;
}

/**
 * Generate expert rating stars
 */
function generateExpertStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHTML = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<div class="star"></div>';
  }
  
  // Half star (treated as full for simplicity)
  if (hasHalfStar) {
    starsHTML += '<div class="star"></div>';
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<div class="star empty"></div>';
  }
  
  return starsHTML;
}

/**
 * Initialize featured experts navigation
 */
function initializeFeaturedExpertsNavigation() {
  const container = document.getElementById('experts-carousel');
  const leftBtn = document.getElementById('expertsScrollLeft');
  const rightBtn = document.getElementById('expertsScrollRight');
  
  if (!container || !leftBtn || !rightBtn) return;
  
  // Calculate scroll amount based on card width + gap
  const getScrollAmount = () => {
    const card = container.querySelector('.expert-card');
    return card ? card.offsetWidth + 20 : 280; // card width + gap
  };
  
  // Update button states based on scroll position
  const updateButtonStates = () => {
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    leftBtn.disabled = scrollLeft <= 0;
    rightBtn.disabled = scrollLeft >= scrollWidth - clientWidth - 1;
    
    leftBtn.classList.toggle('hidden', scrollLeft <= 0);
    rightBtn.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - 1);
  };
  
  // Smooth scroll function
  const smoothScroll = (amount) => {
    container.scrollBy({
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
  container.addEventListener('scroll', updateButtonStates);
  
  // Update button states on resize
  window.addEventListener('resize', updateButtonStates);
  
  // Initial button state update
  setTimeout(updateButtonStates, 100);
  
  // Add touch/swipe support for mobile
  let startX = 0;
  let startScrollLeft = 0;
  let isDragging = false;
  
  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].pageX;
    startScrollLeft = container.scrollLeft;
    isDragging = false;
  });
  
  container.addEventListener('touchmove', (e) => {
    if (!startX) return;
    isDragging = true;
    const x = e.touches[0].pageX;
    const diff = startX - x;
    container.scrollLeft = startScrollLeft + diff;
  });
  
  container.addEventListener('touchend', () => {
    startX = 0;
    isDragging = false;
    updateButtonStates();
  });
}

// Global expert interaction functions
window.viewExpertProfile = function(expertId) {
  console.log('Viewing expert profile:', expertId);
  if (window.showProfessionalProfile) {
    window.showProfessionalProfile(expertId);
  } else {
    console.error('Professional profile modal not available');
  }
};

window.initiateExpertChat = function(expertId) {
  console.log('🚀 Starting chat with expert:', expertId);
  
  // Check authentication
  if (!isUserAuthenticated()) {
    console.log('❌ User not authenticated, redirecting to login');
    redirectToLogin('Please log in to chat with experts');
    return;
  }

  // Get expert data from the sample data
  const experts = getSampleExperts();
  const expert = experts.find(e => e.id === expertId);
  const expertName = expert ? expert.name : 'Expert';
  
  console.log('🎯 Found expert:', expertName);
  
  // Use the same professional contact system
  initiateProfessionalContact(expertId, expertName);
};

/**
 * Initiate exit process when user clicks "Get Started" on Start Your Exit card
 */
window.initiateExitProcess = function() {
  console.log('Initiating exit process');
  
  // Check if user is authenticated
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  if (!token) {
    // Redirect to login/signup with return URL
    window.location.href = '/auth/register?return_url=' + encodeURIComponent('/exit-planning');
    return;
  }
  
  // Redirect to exit planning page or show exit planning modal
  window.location.href = '/exit-planning';
};

// Export professional functions for external use
window.loadProfessionals = loadProfessionals;
window.currentMarketplaceView = () => currentMarketplaceView;
window.switchToView = (view) => {
  if (view === 'professionals' || view === 'businesses') {
    const button = document.querySelector(`[data-view="${view}"]`);
    if (button) {
      button.click();
    }
  }
};