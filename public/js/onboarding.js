/**
 * Onboarding Modal JavaScript - 2025 Edition
 * Enhanced with modern features: checklist, personalization, feedback, and accessibility
 */

class OnboardingModal {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 5;
    this.discoverySource = null;
    this.userInterests = [];
    this.feedbackRating = null;
    this.feedbackComment = '';
    this.checklistItems = [];
    this.onboardingData = {};
    
    this.initializeElements();
    this.bindEvents();
    this.initAccessibility();
    this.initDarkModeDetection();
  }

  initializeElements() {
    this.modal = document.getElementById('onboardingModal');
    this.progressBar = document.getElementById('onboardingProgress');
    this.currentStepSpan = document.getElementById('currentStep');
    this.progressPercentageSpan = document.getElementById('progressPercentage');
    this.prevButton = document.getElementById('onboardingPrev');
    this.nextButton = document.getElementById('onboardingNext');
    this.completeButton = document.getElementById('onboardingComplete');
    this.skipButton = document.getElementById('skipOnboarding');
    this.slides = document.querySelectorAll('.onboarding-slide');
    this.stepDots = document.querySelectorAll('.step-dot');
    this.feedbackOptions = document.querySelectorAll('.feedback-option');
    this.feedbackCommentSection = document.getElementById('feedbackComment');
    this.feedbackTextarea = this.feedbackCommentSection?.querySelector('textarea');
    this.checklistElements = document.querySelectorAll('.checklist-item');
  }

  bindEvents() {
    // Navigation buttons
    this.nextButton?.addEventListener('click', () => this.nextSlide());
    this.prevButton?.addEventListener('click', () => this.prevSlide());
    this.completeButton?.addEventListener('click', () => this.completeOnboarding());
    this.skipButton?.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleSkipOnboarding();
    });
    
    // Step dots for navigation
    this.stepDots?.forEach(dot => {
      dot.addEventListener('click', () => {
        const stepNumber = parseInt(dot.getAttribute('data-step'));
        if (stepNumber <= this.getMaxAccessibleSlide()) {
          this.transitionToSlide(stepNumber);
        }
      });
    });
    
    // Discovery source selection
    const discoveryInputs = document.querySelectorAll('input[name="discoverySource"]');
    discoveryInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.discoverySource = e.target.value;
        this.updateNavigationButtons();
        
        // Track selection event
        if (typeof trackEvent === 'function') {
          trackEvent('onboarding_discovery_source_selected', {
            source: this.discoverySource
          });
        }
      });
    });
    
    // User interests selection
    const interestInputs = document.querySelectorAll('input[name="userInterest"]');
    interestInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.userInterests.push(e.target.value);
        } else {
          this.userInterests = this.userInterests.filter(interest => interest !== e.target.value);
        }
        
        // Track interest selection
        if (typeof trackEvent === 'function') {
          trackEvent('onboarding_interest_toggled', {
            interest: e.target.value,
            selected: e.target.checked
          });
        }
      });
    });
    
    // Feedback options
    this.feedbackOptions?.forEach(option => {
      option.addEventListener('click', () => {
        // Remove active class from all options
        this.feedbackOptions.forEach(opt => opt.classList.remove('active'));
        
        // Add active class to selected option
        option.classList.add('active');
        
        // Store feedback rating
        this.feedbackRating = option.getAttribute('data-rating');
        
        // Show comment textarea
        if (this.feedbackCommentSection) {
          this.feedbackCommentSection.style.display = 'block';
        }
        
        // Track feedback selection
        if (typeof trackEvent === 'function') {
          trackEvent('onboarding_feedback_selected', {
            rating: this.feedbackRating
          });
        }
      });
    });
    
    // Feedback comment
    this.feedbackTextarea?.addEventListener('input', (e) => {
      this.feedbackComment = e.target.value;
    });
    
    // Checklist interaction
    this.checklistElements?.forEach(item => {
      item.addEventListener('click', () => {
        const checkbox = item.querySelector('.checkbox');
        const checkIcon = checkbox.querySelector('i');
        const itemId = item.getAttribute('data-item');
        
        // Toggle checked state
        const isChecked = checkbox.classList.contains('checked');
        
        if (!isChecked) {
          checkbox.classList.add('checked');
          checkIcon.style.display = 'inline';
          
          if (!this.checklistItems.includes(itemId)) {
            this.checklistItems.push(itemId);
          }
        } else {
          checkbox.classList.remove('checked');
          checkIcon.style.display = 'none';
          
          this.checklistItems = this.checklistItems.filter(id => id !== itemId);
        }
        
        // Track checklist interaction
        if (typeof trackEvent === 'function') {
          trackEvent('onboarding_checklist_interaction', {
            item: itemId,
            checked: !isChecked
          });
        }
      });
    });

    // Modal events
    if (this.modal) {
      this.modal.addEventListener('hidden.bs.modal', () => {
        this.resetModal();
      });
    }
  }

  initAccessibility() {
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Only handle keyboard events when modal is visible
      const modalInstance = bootstrap.Modal.getInstance(this.modal);
      if (!modalInstance) return;
      
      // Navigation with arrow keys
      if (e.key === 'ArrowRight' && this.canProceed()) {
        this.nextSlide();
      } else if (e.key === 'ArrowLeft' && this.currentSlide > 1) {
        this.prevSlide();
      }
    });
    
    // Ensure all interactive elements are keyboard focusable
    const focusableElements = this.modal?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusableElements?.forEach(el => {
      if (!el.getAttribute('aria-label') && !el.innerText.trim()) {
        el.setAttribute('aria-label', el.getAttribute('title') || 'Interactive element');
      }
    });
  }
  
  initDarkModeDetection() {
    // Detect system dark mode preference
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial check
    this.handleDarkModeChange(darkModeMediaQuery);
    
    // Add listener for changes
    darkModeMediaQuery.addEventListener('change', (e) => this.handleDarkModeChange(e));
  }
  
  handleDarkModeChange(mediaQuery) {
    if (mediaQuery.matches) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  handleSkipOnboarding() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to skip the onboarding? You can access it later from your profile settings.')) {
      // Track skip event
      if (typeof trackEvent === 'function') {
        trackEvent('onboarding_skipped', {
          current_slide: this.currentSlide,
          discovery_source: this.discoverySource || 'not_selected'
        });
      }
      
      // Mark as skipped in user preferences
      localStorage.setItem('onboarding_skipped', 'true');
      
      // Hide modal
      this.hideModal();
      
      // Show skipped toast message
      this.showSkippedToast();
    }
  }

  showModal() {
    if (this.modal) {
      const modalInstance = new bootstrap.Modal(this.modal);
      modalInstance.show();
      this.updateProgress();
      this.updateNavigationButtons();
      this.updateStepDots();
      
      // Track modal shown
      if (typeof trackEvent === 'function') {
        trackEvent('onboarding_modal_shown', {
          timestamp: new Date().toISOString()
        });
      }
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
    if (targetSlide < 1 || targetSlide > this.totalSlides) return;
    
    const currentSlideElement = document.getElementById(`slide-${this.currentSlide}`);
    const targetSlideElement = document.getElementById(`slide-${targetSlide}`);

    if (!currentSlideElement || !targetSlideElement) return;

    // Track direction for animation
    const isForward = targetSlide > this.currentSlide;

    // Animate out current slide
    currentSlideElement.classList.add(isForward ? 'slide-out' : 'slide-out-reverse');
    
    setTimeout(() => {
      currentSlideElement.classList.remove('active', 'slide-out', 'slide-out-reverse');
      targetSlideElement.classList.add('active', isForward ? 'slide-in' : 'slide-in-reverse');
      
      this.currentSlide = targetSlide;
      this.updateProgress();
      this.updateNavigationButtons();
      this.updateStepDots();
      this.trackSlideView();
      
      // Apply entrance animations to elements in the new slide
      this.animateSlideElements(targetSlideElement);
      
      setTimeout(() => {
        targetSlideElement.classList.remove('slide-in', 'slide-in-reverse');
      }, 400);
    }, 300);
  }

  animateSlideElements(slideElement) {
    // Animate elements with a staggered delay
    const animatableElements = slideElement.querySelectorAll('.feature-card, .capability-item, .feature-item, .filter-demo, .action-item, .checklist-item');
    
    animatableElements.forEach((element, index) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 100 + (index * 100)); // Staggered delay
    });
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

  updateStepDots() {
    this.stepDots?.forEach(dot => {
      const stepNumber = parseInt(dot.getAttribute('data-step'));
      
      // Remove active class from all dots
      dot.classList.remove('active');
      
      // Add active class to current step dot
      if (stepNumber === this.currentSlide) {
        dot.classList.add('active');
      }
      
      // Add completed class to previous steps
      if (stepNumber < this.currentSlide) {
        dot.classList.add('completed');
      } else {
        dot.classList.remove('completed');
      }
    });
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
  
  getMaxAccessibleSlide() {
    // Allow users to navigate to any slide they've already seen
    // plus one slide ahead (but not further)
    return Math.min(this.currentSlide + 1, this.totalSlides);
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
        discoverySource: this.discoverySource,
        userInterests: this.userInterests,
        checklistItems: this.checklistItems,
        feedbackRating: this.feedbackRating,
        feedbackComment: this.feedbackComment,
        completedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
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
          userInterests: this.userInterests,
          feedbackRating: this.feedbackRating,
          feedbackComment: this.feedbackComment,
          onboardingData: this.onboardingData
        })
      });

      if (!response.ok) {
        // If API call fails, use a fallback mechanism
        console.warn('Onboarding API failed, using localStorage fallback');
        
        // Store in localStorage as backup
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_completed_at', new Date().toISOString());
        localStorage.setItem('onboarding_data', JSON.stringify(this.onboardingData));
        
        // Show a warning but proceed
        if (typeof showToast === 'function') {
          showToast('Onboarding saved locally. Some features may need synchronization later.', 'warning');
        }
        
        // Continue with success flow
        this.trackOnboardingCompletion();
        this.showSuccessMessage();
        
        setTimeout(() => {
          this.hideModal();
          this.showWelcomeToast();
          this.highlightRelevantFeatures();
        }, 2500);
        
        return; // Exit early
      }

      const result = await response.json();
      
      if (result.success) {
        // Track completion
        this.trackOnboardingCompletion();
        
        // Store completion status in localStorage for future quick checks
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem('onboarding_completed_at', new Date().toISOString());
        
        // Show success message
        this.showSuccessMessage();
        
        // Hide modal after a delay
        setTimeout(() => {
          this.hideModal();
          // Show welcome toast
          this.showWelcomeToast();
          
          // Highlight key features based on user interests
          this.highlightRelevantFeatures();
        }, 2500);
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
      // Create a more engaging success message with confetti animation
      modalBody.innerHTML = `
        <div class="text-center py-5">
          <div class="success-animation mb-4">
            <i class="fas fa-check-circle fa-5x text-success"></i>
          </div>
          <h3 class="text-white mb-3 onboarding-success-title">Welcome to Arzani!</h3>
          <p class="mb-4">You're all set to start exploring our marketplace.</p>
          <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      `;
      
      // Add confetti animation CSS
      const style = document.createElement('style');
      style.textContent = `
        .success-animation {
          animation: successPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes successPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  showErrorMessage(errorMsg = 'Error completing onboarding. Please try again.') {
    // Show a toast or alert for error
    if (typeof showToast === 'function') {
      showToast(errorMsg, 'error');
    } else {
      alert(errorMsg);
    }
  }

  showWelcomeToast() {
    if (typeof showToast === 'function') {
      // Personalize toast based on interests
      let message = 'Welcome to Arzani! Start exploring businesses now.';
      
      if (this.userInterests.includes('buying')) {
        message = 'Welcome to Arzani! Start exploring businesses for sale now.';
      } else if (this.userInterests.includes('selling')) {
        message = 'Welcome to Arzani! Ready to list your business?';
      } else if (this.userInterests.includes('investing')) {
        message = 'Welcome to Arzani! Discover investment opportunities now.';
      }
      
      showToast(message, 'success');
    }
  }
  
  showSkippedToast() {
    if (typeof showToast === 'function') {
      showToast('Onboarding skipped. You can access it anytime from your profile settings.', 'info');
    }
  }

  highlightRelevantFeatures() {
    // Highlight features based on user interests
    setTimeout(() => {
      if (this.userInterests.includes('buying')) {
        this.pulseElement('.marketplace-link', 'Ready to browse businesses? Click here!');
      } else if (this.userInterests.includes('selling')) {
        this.pulseElement('.sell-business-link', 'Ready to list your business? Click here!');
      } else if (this.userInterests.includes('investing')) {
        this.pulseElement('.investment-link', 'Looking for investment opportunities? Click here!');
      }
    }, 1000);
  }
  
  pulseElement(selector, tooltipText) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    // Add pulse animation
    element.classList.add('pulse-animation');
    
    // Create and add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'highlight-tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
      position: absolute;
      background: var(--primary-color, #1A237E);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      z-index: 1000;
      font-size: 14px;
      max-width: 250px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(tooltip);
    
    // Position tooltip relative to element
    const positionTooltip = () => {
      const rect = element.getBoundingClientRect();
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10 + window.scrollY}px`;
      tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + window.scrollX}px`;
    };
    
    // Show tooltip
    positionTooltip();
    tooltip.style.opacity = '1';
    
    // Add arrow to tooltip
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid var(--primary-color, #1A237E);
    `;
    tooltip.appendChild(arrow);
    
    // Remove after a delay
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => {
        tooltip.remove();
        element.classList.remove('pulse-animation');
      }, 300);
    }, 5000);
    
    // Handle window resize
    window.addEventListener('resize', positionTooltip);
  }

  trackSlideView() {
    // Track which slides users view for analytics
    if (typeof trackEvent === 'function') {
      trackEvent('onboarding_slide_view', {
        slide_number: this.currentSlide,
        slide_name: this.getSlideNameByNumber(this.currentSlide),
        time_spent: this.calculateTimeSpentOnPreviousSlide()
      });
    }
    
    // Store timestamp for time tracking
    this.lastSlideChangeTime = Date.now();
  }

  calculateTimeSpentOnPreviousSlide() {
    if (!this.lastSlideChangeTime) return 0;
    
    const timeSpent = Date.now() - this.lastSlideChangeTime;
    return Math.round(timeSpent / 1000); // Convert to seconds
  }

  trackOnboardingCompletion() {
    // Track completion for analytics
    if (typeof trackEvent === 'function') {
      trackEvent('onboarding_completed', {
        discovery_source: this.discoverySource,
        user_interests: this.userInterests,
        checklist_items: this.checklistItems,
        feedback_rating: this.feedbackRating,
        slides_viewed: this.currentSlide,
        total_time: this.calculateTotalTime(),
        completion_time: Date.now()
      });
    }
  }

  calculateTotalTime() {
    // Calculate total time spent in onboarding
    if (!this.initialLoadTime) return 0;
    
    const totalTime = Date.now() - this.initialLoadTime;
    return Math.round(totalTime / 1000); // Convert to seconds
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
    this.userInterests = [];
    this.feedbackRating = null;
    this.feedbackComment = '';
    this.checklistItems = [];
    this.onboardingData = {};
    this.initialLoadTime = Date.now();
    this.lastSlideChangeTime = null;
    
    // Reset all slides
    this.slides.forEach((slide, index) => {
      slide.classList.remove('active', 'slide-in', 'slide-out', 'slide-in-reverse', 'slide-out-reverse');
      if (index === 0) {
        slide.classList.add('active');
      }
    });
    
    // Reset form inputs
    const discoveryInputs = document.querySelectorAll('input[name="discoverySource"]');
    discoveryInputs.forEach(input => {
      input.checked = false;
    });
    
    const interestInputs = document.querySelectorAll('input[name="userInterest"]');
    interestInputs.forEach(input => {
      input.checked = false;
    });
    
    // Reset feedback options
    this.feedbackOptions?.forEach(option => option.classList.remove('active'));
    if (this.feedbackCommentSection) {
      this.feedbackCommentSection.style.display = 'none';
    }
    if (this.feedbackTextarea) {
      this.feedbackTextarea.value = '';
    }
    
    // Reset checklist items
    this.checklistElements?.forEach(item => {
      const checkbox = item.querySelector('.checkbox');
      const checkIcon = checkbox?.querySelector('i');
      
      if (checkbox) checkbox.classList.remove('checked');
      if (checkIcon) checkIcon.style.display = 'none';
    });
    
    // Update UI
    this.updateProgress();
    this.updateNavigationButtons();
    this.updateStepDots();
  }
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
  // Create onboarding instance
  window.onboardingModal = new OnboardingModal();
  
  // Check if user needs to see onboarding
  const shouldShowOnboarding = () => {
    // Check if already completed or skipped in localStorage
    const completed = localStorage.getItem('onboarding_completed') === 'true';
    const skipped = localStorage.getItem('onboarding_skipped') === 'true';
    
    // For demo purposes, add a way to force show the modal
    const forceShow = new URLSearchParams(window.location.search).get('showOnboarding') === 'true';
    
    if (forceShow) return true;
    if (completed || skipped) return false;
    
    // Additional checks can be added here
    // For example, check if user is logged in, or if it's their first visit
    
    return true;
  };
  
  // Auto-show onboarding if needed
  if (shouldShowOnboarding()) {
    // Small delay to ensure page is fully loaded
    setTimeout(() => {
      window.onboardingModal.showModal();
    }, 1000);
  }
});

// Add CSS for new animations
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRightReverse {
      from {
        transform: translateX(-80px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRightReverse {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(80px);
        opacity: 0;
      }
    }

    .onboarding-slide.slide-in-reverse {
      animation: slideInRightReverse 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .onboarding-slide.slide-out-reverse {
      animation: slideOutRightReverse 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(style);
});
