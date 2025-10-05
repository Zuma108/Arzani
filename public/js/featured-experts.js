/**
 * Featured Experts Section JavaScript
 * Implements the carousel functionality and interactions
 */

class FeaturedExperts {
  constructor() {
    this.container = null;
    this.currentIndex = 0;
    this.autoScrollInterval = null;
    this.sectionHTML = null;
    this.init();
  }

  async init() {
    this.sectionHTML = await this.createSection();
    // Don't initialize carousel here since section isn't added to DOM yet
  }

  async createSection() {
    console.log('FeaturedExperts: Creating section...');
    let experts = [];
    
    try {
      // Load real professionals from API
      console.log('FeaturedExperts: Fetching professionals from API...');
      const response = await fetch('/api/professionals?limit=6&featured=true');
      console.log('FeaturedExperts: API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('FeaturedExperts: API data received:', data);
        if (data.success && data.professionals && data.professionals.length > 0) {
          experts = data.professionals.map(prof => ({
            id: prof.id,
            name: prof.username || prof.full_name,
            role: prof.professional_tagline || 'Professional',
            avatar: prof.professional_picture_url || '/images/default-avatar.png',
            rating: parseFloat(prof.average_rating) || 4.5,
            reviewCount: parseInt(prof.review_count) || 0,
            specializations: Array.isArray(prof.services_offered) ? prof.services_offered.slice(0, 3) : 
                           (Array.isArray(prof.specializations) ? prof.specializations.slice(0, 3) : []),
            yearsExperience: prof.years_experience || 0,
            website: prof.professional_website || null,
            bio: prof.professional_bio || '',
            industries: Array.isArray(prof.industries_serviced) ? prof.industries_serviced : []
          }));
          console.log('FeaturedExperts: Mapped experts:', experts);
          console.log('FeaturedExperts: Sample expert data:', experts[0]);
          experts.forEach(expert => {
            console.log(`Expert ${expert.name}: ${expert.specializations.length} specializations, ${expert.yearsExperience} years exp`);
          });
        }
      }
    } catch (error) {
      console.error('FeaturedExperts: Failed to load real professionals:', error);
    }
    
    // Fallback to sample data if no real professionals found
    if (experts.length === 0) {
      console.log('FeaturedExperts: Using sample data fallback');
      experts = this.getSampleExperts();
    }
    
    const sectionHTML = `
      <div class="featured-experts-section" id="featured-experts">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="marketplace-heading mb-0">Featured Experts</h2>
        </div>
        <div class="horizontal-marketplace-wrapper featured-experts-horizontal-wrapper">
          <button class="marketplace-nav-btn marketplace-nav-left" id="expertsScrollLeft" aria-label="Scroll featured experts left">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="horizontal-listings-container">
            <div class="experts-carousel-container horizontal-listings-scroll" id="experts-carousel">
              ${this.generatePromoCard()}
              ${experts.map(expert => this.generateExpertCard(expert)).join('')}
            </div>
          </div>
          <button class="marketplace-nav-btn marketplace-nav-right" id="expertsScrollRight" aria-label="Scroll featured experts right">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    `;

    console.log('FeaturedExperts: Section HTML generated, length:', sectionHTML.length);
    return sectionHTML;
  }

  generatePromoCard() {
    return `
      <div class="expert-promo-card">
        <div class="promo-content">
          <h3 class="promo-title">Share Your Expertise</h3>
          <p class="promo-subtitle">Join our network of trusted professionals and help businesses succeed</p>
          <button class="promo-cta-btn" onclick="window.location.href='/professional-verification'">
            Create Your Profile
          </button>
        </div>
      </div>
    `;
  }

  generateExpertCard(expert) {
    const starsHTML = this.generateStars(expert.rating);
    const specializationsHTML = expert.specializations.map(spec => 
      `<span class="specialization-tag">${spec}</span>`
    ).join('');
    
    // Add years of experience display
    const experienceText = expert.yearsExperience > 0 ? `${expert.yearsExperience} years exp.` : '';

    return `
      <div class="expert-card" data-expert-id="${expert.id}">
        <img src="${expert.avatar}" alt="${expert.name}" class="expert-avatar" 
             onerror="this.src='/images/default-avatar.png'">
        <div class="expert-role">${expert.role}</div>
        <h3 class="expert-name">${expert.name}</h3>
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
          ${this.isUserAuthenticated() ? 
            `<button class="expert-btn expert-btn-solid contact-professional-btn" 
                    data-professional-id="${expert.id}"
                    data-professional-name="${expert.name}">
              <i class="bi bi-chat-dots btn-icon"></i>
              Chat
            </button>` :
            `<button class="expert-btn expert-btn-outline" 
                    onclick="redirectToLogin('Please log in to chat with experts')">
              <i class="bi bi-box-arrow-in-right btn-icon"></i>
              Login to Chat
            </button>`
          }
        </div>
      </div>
    `;
  }

  generateStars(rating) {
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

  getSampleExperts() {
    const baseExperts = [
      {
        id: 1,
        name: "Sarah Mitchell",
        role: "M&A Advisor",
        avatar: "/public/figma design exports/images/WOMAN1.png",
        specializations: ["Tech Acquisitions", "Due Diligence", "Valuations"]
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
      reviewCount: this.getRandomReviewCount(20, 40)
    }));
  }

  getRandomReviewCount(min, max) {
    const range = max - min + 1;
    return Math.floor(Math.random() * range) + min;
  }

  /**
   * Get authentication token from multiple sources
   */
  getAuthToken() {
    const sources = [
      () => localStorage.getItem('token'),
      () => localStorage.getItem('authToken'),
      () => document.querySelector('meta[name="auth-token"]')?.content,
      () => this.getCookieValue('token'),
      () => this.getCookieValue('authToken')
    ];
    
    for (const getToken of sources) {
      const token = getToken();
      if (token && token.trim()) {
        return token.trim();
      }
    }
    
    return null;
  }

  /**
   * Get cookie value by name
   */
  getCookieValue(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isUserAuthenticated() {
    const token = this.getAuthToken();
    return !!token;
  }

  initializeCarousel() {
    this.container = document.getElementById('experts-carousel');
    if (!this.container) return;

    this.updateNavigationButtons();
  }

  bindEvents() {
    this.prevBtn = document.getElementById('expertsScrollLeft');
    this.nextBtn = document.getElementById('expertsScrollRight');

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.scrollPrevious());
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.scrollNext());
    }

    // Add touch/swipe support
    if (this.container) {
      this.addSwipeSupport();
    }

    // Auto-scroll disabled per user request - no automatic movement
    // this.startAutoScroll();

    // Update button states on scroll
    this.updateNavigationButtons();
    
    // Listen for scroll events to update button states
    if (this.container) {
      this.container.addEventListener('scroll', () => this.updateNavigationButtons());
    }

    if (!this._resizeHandler) {
      this._resizeHandler = () => this.updateNavigationButtons();
      window.addEventListener('resize', this._resizeHandler);
    }

    // Initialize professional contact buttons
    this.initContactProfessionalButtons();
  }

  /**
   * Initialize contact professional buttons for featured experts
   */
  initContactProfessionalButtons() {
    // Use event delegation to handle dynamically created buttons
    document.addEventListener('click', (event) => {
      const contactBtn = event.target.closest('.contact-professional-btn');
      if (!contactBtn) return;
      
      event.preventDefault();
      event.stopPropagation();
      
      const professionalId = contactBtn.dataset.professionalId;
      const professionalName = contactBtn.dataset.professionalName;
      
      if (!professionalId || !professionalName) {
        console.error('Missing professional data on contact button');
        return;
      }
      
      this.initiateProfessionalContact(professionalId, professionalName);
    });
  }

  /**
   * Initiate contact with a professional (integrated with main system)
   */
  async initiateProfessionalContact(professionalId, professionalName) {
    console.log(`Featured Experts: Attempting to contact professional: ${professionalName} (ID: ${professionalId})`);
    
    try {
      // Check authentication first
      if (!this.isUserAuthenticated()) {
        this.redirectToLogin('Please log in to chat with professionals');
        return;
      }
      
      const token = this.getAuthToken();
      console.log('Featured Experts: Using auth token for professional contact:', token ? 'Token present' : 'No token');
      
      // Show loading state on the specific button
      const contactBtns = document.querySelectorAll(`[data-professional-id="${professionalId}"]`);
      console.log(`Featured Experts: Found ${contactBtns.length} contact buttons for professional ${professionalId}`);
      
      contactBtns.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split btn-icon"></i> Connecting...';
        btn.style.opacity = '0.7';
      });
      
      // Create contact request using the same API as marketplace
      const requestBody = {
        professionalId: professionalId,
        message: `I'm interested in your professional services and found you through the featured experts section. I'd like to discuss my requirements.`
      };
      
      console.log('Featured Experts: Making API request to /api/contact-professional');
      console.log('Featured Experts: Request body:', requestBody);
      console.log('Featured Experts: Token length:', token ? token.length : 'No token');
      
      const response = await fetch('/api/contact-professional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Featured Experts: API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Handle authentication error specifically
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          this.redirectToLogin('Your session has expired. Please log in again.');
          return;
        } 
        
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.warn('Featured Experts: Could not parse error response:', e);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Featured Experts: API Response data:', data);
      console.log('Featured Experts: Conversation creation details:', {
        conversationId: data.conversationId,
        otherUserId: data.otherUserId,
        professionalName: data.professionalName,
        success: data.success
      });
      
      if (data.success) {
        // Show brief success message before redirect
        contactBtns.forEach(btn => {
          btn.innerHTML = '<i class="bi bi-check-circle btn-icon"></i> Connected!';
          btn.style.backgroundColor = '#10b981';
        });
        
        console.log('Featured Experts: Professional contact successful, conversation created!');
        
        // Small delay to show success state
        setTimeout(() => {
          // Redirect to the chat conversation that was created
          if (data.conversationId) {
            const redirectUrl = `/chat?conversation=${data.conversationId}`;
            console.log('✅ Featured Experts: CONVERSATION CREATED SUCCESSFULLY!');
            console.log('📞 Conversation ID:', data.conversationId);
            console.log('👤 Professional:', professionalName);
            console.log('🔗 Redirecting to:', redirectUrl);
            window.location.href = redirectUrl;
          } else {
            // Fallback redirect to general chat page
            console.log('⚠️ Featured Experts: No conversation ID returned, redirecting to general chat');
            console.log('🔗 Fallback redirect to: /chat');
            window.location.href = '/chat';
          }
        }, 1000);
        
      } else {
        throw new Error(data.error || 'Failed to initiate contact');
      }
      
    } catch (error) {
      console.error('Featured Experts: Error initiating professional contact:', error);
      
      // Reset button states
      const contactBtns = document.querySelectorAll(`[data-professional-id="${professionalId}"]`);
      contactBtns.forEach(btn => {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-chat-dots btn-icon"></i> Chat';
        btn.style.opacity = '1';
        btn.style.backgroundColor = '';
      });
      
      // Log error for debugging but don't show popup
      console.error('Featured Experts: Chat initiation failed:', {
        error: error.message,
        professionalId,
        professionalName,
        timestamp: new Date().toISOString()
      });
      
      // Show subtle error feedback without blocking UI
      if (error.message.includes('not found')) {
        console.warn('Professional not found. They may have removed their profile.');
      } else if (error.message.includes('not accepting')) {
        console.warn('This professional is not accepting new conversations at the moment.');
      } else if (error.message.includes('contact yourself')) {
        console.warn('User cannot start a chat with themselves.');
      } else {
        console.warn('Unable to start chat. Error:', error.message);
      } 
    }
  }

  /**
   * Redirect to login with return URL
   */
  redirectToLogin(message = 'Please log in to continue') {
    if (message) {
      console.log('Featured Experts: Redirecting to login:', message);
    }
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login2?returnTo=${returnTo}&message=${encodeURIComponent(message)}`;
  }

  scrollPrevious() {
    if (this.container) {
      // Calculate scroll amount based on card width + gap
      const card = this.container.querySelector('.expert-card');
      const scrollAmount = card ? card.offsetWidth + 20 : 320; // card width + gap
      
      this.container.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
      
      // Update button states after scroll animation
      setTimeout(() => this.updateNavigationButtons(), 300);
    }
  }

  scrollNext() {
    if (this.container) {
      // Calculate scroll amount based on card width + gap
      const card = this.container.querySelector('.expert-card');
      const scrollAmount = card ? card.offsetWidth + 20 : 320; // card width + gap
      
      this.container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
      
      // Update button states after scroll animation
      setTimeout(() => this.updateNavigationButtons(), 300);
    }
  }

  updateNavigationButtons() {
    if (!this.container) return;

    const prevBtn = this.prevBtn || document.getElementById('expertsScrollLeft');
    const nextBtn = this.nextBtn || document.getElementById('expertsScrollRight');

    if (prevBtn && nextBtn) {
      const isAtStart = this.container.scrollLeft <= 0;
      const isAtEnd = this.container.scrollLeft >= 
        this.container.scrollWidth - this.container.clientWidth;

      prevBtn.disabled = isAtStart;
      nextBtn.disabled = isAtEnd;

      prevBtn.classList.toggle('hidden', isAtStart);
      nextBtn.classList.toggle('hidden', isAtEnd);
    }
  }

  addSwipeSupport() {
    let startX = 0;
    let startScrollLeft = 0;

    this.container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].pageX;
      startScrollLeft = this.container.scrollLeft;
    });

    this.container.addEventListener('touchmove', (e) => {
      if (!startX) return;
      
      const x = e.touches[0].pageX;
      const walk = (startX - x) * 2; // Scroll speed multiplier
      this.container.scrollLeft = startScrollLeft + walk;
    });

    this.container.addEventListener('touchend', () => {
      startX = 0;
      this.updateNavigationButtons();
    });
  }

  startAutoScroll() {
    this.stopAutoScroll(); // Clear any existing interval
    this.autoScrollInterval = setInterval(() => {
      if (this.container) {
        const isAtEnd = this.container.scrollLeft >= 
          this.container.scrollWidth - this.container.clientWidth;
        
        if (isAtEnd) {
          // Reset to beginning
          this.container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          this.scrollNext();
        }
      }
    }, 5000); // Auto-scroll every 5 seconds
  }

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }

  viewExpertProfile(expertId) {
    console.log('Viewing expert profile:', expertId);
    // Implement profile view logic
    window.location.href = `/expert/${expertId}`;
  }

  initiateExpertChat(expertId) {
    console.log('Initiating chat with expert:', expertId);
    // Implement chat initiation logic
    // Could integrate with your existing chat system
    this.showChatModal(expertId);
  }

  showChatModal(expertId) {
    // Create and show chat modal
    const modalHTML = `
      <div class="modal fade" id="expertChatModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Connect with Expert</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>Start a conversation with this expert to get personalized advice for your business needs.</p>
              <textarea class="form-control" placeholder="Describe your business situation or question..." rows="4"></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary">Send Message</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to page and show it
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('expertChatModal'));
    modal.show();
    
    // Clean up modal after hiding
    document.getElementById('expertChatModal').addEventListener('hidden.bs.modal', function() {
      this.remove();
    });
  }

  // Method to add the section to a specific container
  async addToContainer(containerId) {
    const container = document.getElementById(containerId);
    if (container && this.sectionHTML) {
      container.insertAdjacentHTML('beforeend', this.sectionHTML);
      this.initializeCarousel();
      this.bindEvents();
    }
  }

  // Method to add after professionals section
  async addAfterProfessionals() {
    const professionalsSection = document.getElementById('verified-professionals-section');
    if (professionalsSection && this.sectionHTML) {
      professionalsSection.insertAdjacentHTML('afterend', this.sectionHTML);
      this.initializeCarousel();
      this.bindEvents();
    }
  }
}

// Global methods for button clicks (since onclick attributes need global access)
window.viewExpertProfile = function(expertId) {
  console.log('Viewing expert profile:', expertId);
  if (window.showProfessionalProfile) {
    window.showProfessionalProfile(expertId);
  } else {
    console.error('Professional profile modal not available');
  }
};

// Global redirectToLogin function for unauthenticated users
window.redirectToLogin = function(message = 'Please log in to continue') {
  if (message) {
    console.log('Redirecting to login:', message);
  }
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login2?returnTo=${returnTo}&message=${encodeURIComponent(message)}`;
};

window.initiateExpertChat = function(expertId) {
  console.log('Initiating chat with expert:', expertId);
  // This function is deprecated - contact buttons now use the professional contact system directly
  // Find the expert name from the DOM if possible
  const expertCard = document.querySelector(`[data-expert-id="${expertId}"]`);
  const expertName = expertCard ? expertCard.querySelector('.expert-name')?.textContent || 'Professional' : 'Professional';
  
  // Create instance to access the method
  const experts = new FeaturedExperts();
  experts.initiateProfessionalContact(expertId, expertName);
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeaturedExperts;
}

// Auto-initialization FULLY DISABLED - marketplace.js now handles all featured experts functionality
// This file is kept for compatibility but should not be used for initialization
console.log('Featured-experts.js loaded but auto-initialization is disabled. Marketplace.js handles featured experts.');