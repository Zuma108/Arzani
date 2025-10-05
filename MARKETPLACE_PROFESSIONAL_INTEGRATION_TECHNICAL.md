# Marketplace.js Professional Integration - Technical Implementation Guide

## Overview

This document provides detailed technical specifications for integrating professional listings into the existing marketplace.js system, extending the current business marketplace functionality.

## Current System Analysis

### Existing Functions (marketplace.js)
- `loadPage(pageNumber, filters)` - Loads business listings from API
- `renderBusinesses(businesses)` - Renders business cards into DOM
- `generateBusinessCard(business, isVisible)` - Creates individual business card HTML
- `generateImageCarousel(business, images, isVisible)` - Creates image carousel for businesses
- `initLazyLoading()` - Handles lazy loading for business images
- `renderPaginationControls(currentPage, totalPages)` - Pagination UI

### Existing Infrastructure to Leverage
- S3 image handling with fallback regions
- Lazy loading system with IntersectionObserver
- Filter system (location, industries, price range)
- Save/bookmark functionality
- Contact integration with chat system
- Pagination and search
- Event handling and initialization

## Professional Integration Implementation

### 1. Core Professional Functions

#### A. Professional Loading Function
```javascript
export async function loadProfessionals(pageNumber = 1, filters = {}) {
  // Set loading state
  isLoading = true;
  const listingsContainer = document.getElementById('listings-container');
  if (listingsContainer) {
    listingsContainer.classList.add('loading');
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
    rating: filters.rating || ''
  }).toString();

  try {
    const response = await fetch(`/api/professionals?${query}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Process professional images similar to business images
    const processedProfessionals = data.professionals.map(professional => ({
      ...professional,
      processedImages: processProfessionalImages(professional)
    }));
    
    renderProfessionals(processedProfessionals);
    renderPaginationControls(pageNumber, data.totalPages);
    
    return data;
  } catch (error) {
    console.error('Failed to load professionals:', error);
    showErrorMessage('Failed to load professionals. Please try again.');
  } finally {
    isLoading = false;
    if (listingsContainer) {
      listingsContainer.classList.remove('loading');
    }
  }
}
```

#### B. Professional Rendering Function
```javascript
function renderProfessionals(professionals) {
  const listingsContainer = document.getElementById('listings-container');
  if (!listingsContainer) return;
  
  listingsContainer.innerHTML = '';

  if (professionals.length === 0) {
    listingsContainer.innerHTML = `
      <div class="no-results">
        <h3>No professionals found</h3>
        <p>Try adjusting your filters or search criteria.</p>
      </div>
    `;
    return;
  }

  // Create document fragment for batch DOM updates
  const fragment = document.createDocumentFragment();
  
  professionals.forEach((professional, index) => {
    // Determine if professional should be visible initially (for lazy loading)
    const isVisible = index < 6; // Load first 6 professionals immediately
    
    const professionalElement = document.createElement('div');
    professionalElement.className = 'col-md-6 col-lg-4 mb-4';
    professionalElement.innerHTML = generateProfessionalCard(professional, isVisible);
    fragment.appendChild(professionalElement);
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
```

#### C. Professional Card Generation
```javascript
function generateProfessionalCard(professional, isVisible) {
  // Process professional images for display
  const imagesHtml = professional.processedImages && professional.processedImages.length > 0
    ? generateProfessionalImageDisplay(professional, professional.processedImages, isVisible)
    : `<div class="professional-image-container">
        <button class="save-professional-btn" data-professional-id="${professional.id}">
          <i class="bi bi-bookmark"></i>
        </button>
        <img src="/images/default-professional.jpg" class="professional-img" alt="Professional profile" width="300" height="200">
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
            <i class="bi bi-calendar-check"></i>
            <span>${experienceText}</span>
          </div>
          <div class="location-info">
            <i class="bi bi-geo-alt"></i>
            <span>${escapeHtml(professional.service_locations?.primary || 'Location flexible')}</span>
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
              <button class="btn btn-outline-primary btn-sm w-100" onclick="showProfessionalProfile(${professional.id})">
                <i class="bi bi-person-circle"></i> Profile
              </button>
            </div>
            <div class="col-6">
              <button class="btn btn-primary btn-sm w-100 contact-professional-btn" 
                      data-professional-id="${professional.id}"
                      data-professional-name="${escapeHtml(professional.full_name)}">
                <i class="bi bi-chat-dots"></i> Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

### 2. Professional-Specific Helper Functions

#### A. Image Processing for Professionals
```javascript
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
  
  // Process URLs for S3 compatibility
  return images.map(image => {
    if (typeof image === 'string' && image.includes('amazonaws.com')) {
      // Ensure proper S3 URL format
      return image.replace(/\.amazonaws\.com\/([^\/]+)/, '.amazonaws.com');
    }
    return image;
  });
}
```

#### B. Services Badges Generation
```javascript
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
```

#### C. Professional Rating Display
```javascript
function generateProfessionalRating(professional) {
  const rating = professional.average_rating || 0;
  const reviewCount = professional.review_count || 0;
  
  if (reviewCount === 0) {
    return '<div class="rating-display"><span class="text-muted">New Professional</span></div>';
  }
  
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let starsHtml = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="bi bi-star-fill text-warning"></i>';
  }
  
  // Half star
  if (hasHalfStar) {
    starsHtml += '<i class="bi bi-star-half text-warning"></i>';
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="bi bi-star text-muted"></i>';
  }
  
  return `
    <div class="rating-display">
      <div class="stars">${starsHtml}</div>
      <small class="text-muted ms-1">(${reviewCount} review${reviewCount !== 1 ? 's' : ''})</small>
    </div>
  `;
}
```

#### D. Pricing Display
```javascript
function generatePricingDisplay(pricingInfo) {
  if (!pricingInfo || typeof pricingInfo !== 'object') {
    return '<div class="pricing-display"><span class="text-muted">Contact for pricing</span></div>';
  }
  
  if (pricingInfo.type === 'hourly' && pricingInfo.rate) {
    return `<div class="pricing-display"><strong>$${pricingInfo.rate}/hr</strong></div>`;
  }
  
  if (pricingInfo.type === 'project' && pricingInfo.range) {
    return `<div class="pricing-display"><strong>$${pricingInfo.range.min} - $${pricingInfo.range.max}</strong> per project</div>`;
  }
  
  if (pricingInfo.type === 'consultation' && pricingInfo.rate) {
    return `<div class="pricing-display"><strong>$${pricingInfo.rate}</strong> consultation</div>`;
  }
  
  return '<div class="pricing-display"><span class="text-primary">Flexible pricing</span></div>';
}
```

### 3. View Toggle Implementation

#### A. Marketplace View Toggle
```javascript
let currentMarketplaceView = 'businesses'; // Default view

function initMarketplaceViewToggle() {
  const toggleContainer = document.getElementById('marketplace-view-toggle');
  if (!toggleContainer) {
    console.warn('Marketplace view toggle container not found');
    return;
  }
  
  toggleContainer.innerHTML = `
    <div class="btn-group" role="group" aria-label="Marketplace view toggle">
      <button type="button" class="btn btn-outline-primary active" data-view="businesses">
        <i class="bi bi-building"></i> Businesses
      </button>
      <button type="button" class="btn btn-outline-primary" data-view="professionals">
        <i class="bi bi-person-badge"></i> Professionals
      </button>
    </div>
  `;
  
  // Add click handlers
  toggleContainer.addEventListener('click', handleViewToggle);
  
  // Update filter placeholders
  updateFilterPlaceholders(currentMarketplaceView);
}

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
```

#### B. Filter System Updates
```javascript
function updateFilterSystem(viewType) {
  const filterContainer = document.querySelector('.filter-container');
  if (!filterContainer) return;
  
  if (viewType === 'professionals') {
    updateProfessionalFilters();
  } else {
    updateBusinessFilters();
  }
}

function updateProfessionalFilters() {
  // Update industry filter to services filter
  const industrySelect = document.getElementById('industryFilter');
  if (industrySelect) {
    const servicesSelect = industrySelect.cloneNode(false);
    servicesSelect.id = 'servicesFilter';
    servicesSelect.innerHTML = '<option value="">All Services</option>';
    
    // Populate with professional services
    populateServicesFilter(servicesSelect);
    
    industrySelect.parentNode.replaceChild(servicesSelect, industrySelect);
  }
  
  // Update price range label
  const priceLabel = document.querySelector('label[for="priceRange"]');
  if (priceLabel) {
    priceLabel.textContent = 'Hourly Rate';
  }
  
  // Add experience filter if not exists
  addExperienceFilter();
  
  // Add specialization filter
  addSpecializationFilter();
}

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
      <option value="16+">16+ Years</option>
    </select>
  `;
  
  filtersRow.appendChild(experienceCol);
}
```

### 4. Professional-Specific Event Handlers

#### A. Contact Professional Integration
```javascript
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

async function initiateProfessionalContact(professionalId, professionalName) {
  try {
    // Get auth token
    const token = localStorage.getItem('token') || 
                  document.querySelector('meta[name="auth-token"]')?.content;
    
    if (!token) {
      window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
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
      // Redirect to chat with professional context
      const redirectUrl = `/chat/start-conversation?otherUserId=${data.otherUserId}&professionalId=${professionalId}&initialMessage=${encodeURIComponent(data.message)}&formId=${data.formId}`;
      window.location.href = redirectUrl;
    } else {
      showErrorMessage(data.message || 'Failed to initiate contact');
    }
    
  } catch (error) {
    console.error('Professional contact failed:', error);
    showErrorMessage('Failed to contact professional. Please try again.');
  }
}
```

### 5. Professional Profile Popup

#### A. Profile Popup Implementation
```javascript
function showProfessionalProfile(professionalId) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('professionalProfileModal');
  if (!modal) {
    modal = createProfessionalProfileModal();
    document.body.appendChild(modal);
  }
  
  // Load professional data
  loadProfessionalProfile(professionalId, modal);
  
  // Show modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

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
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
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

async function loadProfessionalProfile(professionalId, modal) {
  const contentContainer = modal.querySelector('#professionalProfileContent');
  
  try {
    const response = await fetch(`/api/professionals/${professionalId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const professional = await response.json();
    
    contentContainer.innerHTML = generateProfessionalProfileContent(professional);
    
    // Initialize profile-specific interactions
    initProfileInteractions(professional);
    
  } catch (error) {
    console.error('Failed to load professional profile:', error);
    contentContainer.innerHTML = `
      <div class="alert alert-danger">
        <h6>Error Loading Profile</h6>
        <p>Unable to load professional profile. Please try again later.</p>
      </div>
    `;
  }
}
```

### 6. Integration with Existing Systems

#### A. Saved Professionals Feature
```javascript
async function toggleProfessionalSavedStatus(saveBtn, professionalId) {
  const token = localStorage.getItem('token') || 
                 document.querySelector('meta[name="auth-token"]')?.content;
  
  if (!token) {
    window.location.href = `/login2?returnTo=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

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
    
    // Update button state
    const icon = saveBtn.querySelector('i');
    if (data.saved) {
      icon.className = 'bi bi-bookmark-fill';
      saveBtn.classList.add('saved');
    } else {
      icon.className = 'bi bi-bookmark';
      saveBtn.classList.remove('saved');
    }
    
  } catch (error) {
    console.error('Failed to toggle saved professional:', error);
  }
}
```

## Integration Points Summary

### Frontend Integration Checklist

#### marketplace.js Extensions:
- ✅ Add professional loading functions (`loadProfessionals`, `renderProfessionals`)
- ✅ Add professional card generation (`generateProfessionalCard`)
- ✅ Add view toggle functionality (`initMarketplaceViewToggle`)
- ✅ Add professional-specific filters and interactions
- ✅ Integrate professional contact system
- ✅ Add professional profile popup system
- ✅ Extend saved items functionality for professionals

#### Template Updates Needed:
- marketplace2.ejs: Add view toggle container and professional-specific filter elements
- unified-sidebar.ejs: Add "Verified" section for verified professionals

#### API Integration Points:
- GET /api/professionals - Professional listings
- GET /api/professionals/:id - Individual professional profiles  
- POST /api/contact-professional - Professional contact initiation
- POST /api/saved-professionals/toggle - Save/unsave professionals

#### Database Integration:
- Add professional_id column to conversations table
- Ensure proper indexing for professional queries
- Update chat system to handle professional conversations

This implementation maintains the existing business marketplace functionality while seamlessly adding professional services through a consistent, extensible architecture.