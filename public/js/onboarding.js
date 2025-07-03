/**
 * Onboarding Modal JavaScript
 * Handles the 5-slide onboarding flow for new users
 */

class OnboardingModal {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 5;
    this.discoverySource = null;
    this.onboardingData = {};
    
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.modal = document.getElementById('onboardingModal');
    this.progressBar = document.getElementById('onboardingProgress');
    this.currentStepSpan = document.getElementById('currentStep');
    this.progressPercentageSpan = document.getElementById('progressPercentage');
    this.prevButton = document.getElementById('onboardingPrev');
    this.nextButton = document.getElementById('onboardingNext');
    this.completeButton = document.getElementById('onboardingComplete');
    this.slides = document.querySelectorAll('.onboarding-slide');
  }

  bindEvents() {
    // Navigation buttons
    this.nextButton?.addEventListener('click', () => this.nextSlide());
    this.prevButton?.addEventListener('click', () => this.prevSlide());
    this.completeButton?.addEventListener('click', () => this.completeOnboarding());
    
    // Discovery source selection
    const discoveryInputs = document.querySelectorAll('input[name="discoverySource"]');
    discoveryInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.discoverySource = e.target.value;
        this.updateNavigationButtons();
      });
    });

    // Modal events
    if (this.modal) {
      this.modal.addEventListener('hidden.bs.modal', () => {
        this.resetModal();
      });
    }
  }

  showModal() {
    if (this.modal) {
      const modalInstance = new bootstrap.Modal(this.modal);
      modalInstance.show();
      this.updateProgress();
      this.updateNavigationButtons();
    }
  }

  hideModal() {
    if (this.modal) {
      const modalInstance = bootstrap.Modal.getInstance(this.modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides && this.canProceed()) {
      this.transitionToSlide(this.currentSlide + 1);
    }
  }

  prevSlide() {
    if (this.currentSlide > 1) {
      this.transitionToSlide(this.currentSlide - 1);
    }
  }

  transitionToSlide(targetSlide) {
    const currentSlideElement = document.getElementById(`slide-${this.currentSlide}`);
    const targetSlideElement = document.getElementById(`slide-${targetSlide}`);

    if (!currentSlideElement || !targetSlideElement) return;

    // Animate out current slide
    currentSlideElement.classList.add('slide-out');
    
    setTimeout(() => {
      currentSlideElement.classList.remove('active', 'slide-out');
      targetSlideElement.classList.add('active', 'slide-in');
      
      this.currentSlide = targetSlide;
      this.updateProgress();
      this.updateNavigationButtons();
      this.trackSlideView();
      
      setTimeout(() => {
        targetSlideElement.classList.remove('slide-in');
      }, 300);
    }, 150);
  }

  updateProgress() {
    const progressPercentage = (this.currentSlide / this.totalSlides) * 100;
    
    if (this.progressBar) {
      this.progressBar.style.width = `${progressPercentage}%`;
    }
    
    if (this.currentStepSpan) {
      this.currentStepSpan.textContent = this.currentSlide;
    }
    
    if (this.progressPercentageSpan) {
      this.progressPercentageSpan.textContent = Math.round(progressPercentage);
    }
  }

  updateNavigationButtons() {
    // Show/hide previous button
    if (this.prevButton) {
      this.prevButton.style.display = this.currentSlide > 1 ? 'inline-block' : 'none';
    }

    // Show/hide next vs complete button
    if (this.currentSlide === this.totalSlides) {
      if (this.nextButton) this.nextButton.style.display = 'none';
      if (this.completeButton) this.completeButton.style.display = 'inline-block';
    } else {
      if (this.nextButton) {
        this.nextButton.style.display = 'inline-block';
        this.nextButton.disabled = !this.canProceed();
      }
      if (this.completeButton) this.completeButton.style.display = 'none';
    }
  }

  canProceed() {
    switch (this.currentSlide) {
      case 1:
        return this.discoverySource !== null;
      default:
        return true;
    }
  }

  async completeOnboarding() {
    try {
      // Show loading state
      if (this.completeButton) {
        this.completeButton.disabled = true;
        this.completeButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Completing...';
      }

      // Collect onboarding data
      this.onboardingData = {
        slidesViewed: this.currentSlide,
        completedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      };

      // Send completion data to backend
      const response = await fetch('/users/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          discoverySource: this.discoverySource,
          onboardingData: this.onboardingData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      const result = await response.json();
      
      if (result.success) {
        // Track completion
        this.trackOnboardingCompletion();
        
        // Store completion status in localStorage for future quick checks
        localStorage.setItem('onboarding_completed', 'true');
        
        // Show success message
        this.showSuccessMessage();
        
        // Hide modal after a delay
        setTimeout(() => {
          this.hideModal();
          // Optionally trigger a page refresh or redirect
          if (window.location.pathname === '/marketplace2') {
            // Maybe show a welcome toast or highlight key features
            this.showWelcomeToast();
          }
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to complete onboarding');
      }
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      this.showErrorMessage();
      
      // Reset button state
      if (this.completeButton) {
        this.completeButton.disabled = false;
        this.completeButton.innerHTML = 'Get Started<i class="fas fa-check ms-2"></i>';
      }
    }
  }

  showSuccessMessage() {
    const modalBody = this.modal?.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="text-center py-5">
          <i class="fas fa-check-circle fa-5x text-success mb-4"></i>
          <h3 class="text-success mb-3">Welcome to Arzani!</h3>
          <p class="text-muted mb-4">You're all set to start exploring our marketplace.</p>
          <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  showErrorMessage() {
    // Show a toast or alert for error
    if (typeof showToast === 'function') {
      showToast('Error completing onboarding. Please try again.', 'error');
    } else {
      alert('Error completing onboarding. Please try again.');
    }
  }

  showWelcomeToast() {
    if (typeof showToast === 'function') {
      showToast('Welcome to Arzani! Start exploring businesses now.', 'success');
    }
  }

  trackSlideView() {
    // Track which slides users view for analytics
    if (typeof trackEvent === 'function') {
      trackEvent('onboarding_slide_view', {
        slide_number: this.currentSlide,
        slide_name: this.getSlideNameByNumber(this.currentSlide)
      });
    }
  }

  trackOnboardingCompletion() {
    // Track completion for analytics
    if (typeof trackEvent === 'function') {
      trackEvent('onboarding_completed', {
        discovery_source: this.discoverySource,
        slides_viewed: this.currentSlide,
        completion_time: Date.now()
      });
    }
  }

  getSlideNameByNumber(slideNumber) {
    const slideNames = {
      1: 'discovery_source',
      2: 'welcome_overview',
      3: 'navigation_features',
      4: 'ai_assistant',
      5: 'start_exploring'
    };
    return slideNames[slideNumber] || 'unknown';
  }

  resetModal() {
    this.currentSlide = 1;
    this.discoverySource = null;
    this.onboardingData = {};
    
    // Reset all slides
    this.slides.forEach((slide, index) => {
      slide.classList.remove('active', 'slide-in', 'slide-out');
      if (index === 0) {
        slide.classList.add('active');
      }
    });
    
    // Reset form inputs
    const discoveryInputs = document.querySelectorAll('input[name="discoverySource"]');
    discoveryInputs.forEach(input => {
      input.checked = false;
    });
    
    // Reset button states
    if (this.completeButton) {
      this.completeButton.disabled = false;
      this.completeButton.innerHTML = 'Get Started<i class="fas fa-check ms-2"></i>';
    }
    
    this.updateProgress();
    this.updateNavigationButtons();
  }
}

// Initialize onboarding when DOM is loaded
let onboardingModal = null;
let onboardingCheckCompleted = false; // Flag to prevent multiple checks

document.addEventListener('DOMContentLoaded', function() {
  // Check if user needs onboarding
  if (!onboardingCheckCompleted) {
    checkOnboardingStatus();
  }
});

async function checkOnboardingStatus() {
  // Prevent multiple simultaneous checks
  if (onboardingCheckCompleted) {
    console.log('Onboarding check already completed in this session');
    return;
  }
  
  try {
    // First check localStorage for a quick bypass
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (onboardingCompleted === 'true') {
      console.log('Onboarding already completed (localStorage check)');
      onboardingCheckCompleted = true;
      return;
    }
    
    // Check if user is logged in and needs onboarding
    const response = await fetch('/users/onboarding-status', {
      credentials: 'include' // Include cookies for authentication
    });
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
        if (result.onboarding.onboarding_completed) {
          // User has completed onboarding - store in localStorage for future quick checks
          localStorage.setItem('onboarding_completed', 'true');
          console.log('Onboarding already completed (server check)');
          onboardingCheckCompleted = true;
          return;
        } else {
          // User needs onboarding
          console.log('User needs onboarding - showing modal (from onboarding.js)');
          onboardingCheckCompleted = true;
          initializeOnboarding();
        }
      }
    } else if (response.status === 401) {
      console.log('User not authenticated (onboarding.js check)');
      onboardingCheckCompleted = true;
    } else {
      console.warn('Onboarding status check failed:', response.status);
      onboardingCheckCompleted = true;
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    onboardingCheckCompleted = true;
    // Silently fail - onboarding is not critical for basic functionality
  }
}

function initializeOnboarding() {
  // Prevent multiple modal instances
  if (onboardingModal) {
    console.log('Onboarding modal already initialized');
    return;
  }
  
  // Create onboarding instance
  onboardingModal = new OnboardingModal();
  
  // Show modal after a short delay to let page load
  setTimeout(() => {
    if (onboardingModal) {
      onboardingModal.showModal();
    }
  }, 1000);
}

// Export for potential manual triggering
window.showOnboarding = function(force = false) {
  // Check if onboarding is already completed (unless forced)
  if (!force) {
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    if (onboardingCompleted === 'true') {
      console.log('Onboarding already completed. Use showOnboarding(true) to force show.');
      return;
    }
  }
  
  if (!onboardingModal) {
    onboardingModal = new OnboardingModal();
  }
  onboardingModal.showModal();
};

// Utility function to reset onboarding status (for testing purposes)
window.resetOnboarding = function() {
  localStorage.removeItem('onboarding_completed');
  onboardingCheckCompleted = false; // Reset the session flag
  console.log('Onboarding status reset. Reload the page to see the onboarding modal again.');
};

// Utility function to check current onboarding status
window.checkOnboardingStatus = function() {
  const localStatus = localStorage.getItem('onboarding_completed');
  console.log('LocalStorage onboarding status:', localStatus);
  
  // Also check server status
  fetch('/users/onboarding-status', { credentials: 'include' })
    .then(response => response.json())
    .then(data => {
      console.log('Server onboarding status:', data);
    })
    .catch(error => {
      console.error('Error checking server status:', error);
    });
};

// Function to mark that user just logged in (call this from login page)
window.markJustLoggedIn = function() {
  sessionStorage.setItem('justLoggedIn', 'true');
  console.log('Marked user as just logged in');
};

// Function to trigger onboarding check (useful for post-login)
window.triggerOnboardingCheck = function() {
  console.log('Manually triggering onboarding check...');
  onboardingCheckCompleted = false; // Reset the flag
  checkOnboardingStatus();
};

// Utility function for showing toasts (if not already available)
if (typeof showToast === 'undefined') {
  window.showToast = function(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'error' ? 'danger' : type} position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  };
}
