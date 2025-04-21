/**
 * Standardized navigation for seller questionnaire
 * This script handles consistent page transitions and progress bar animations
 */

// Global request lock to prevent multiple simultaneous API calls
window.requestLocks = {
  saveQuestionnaire: {
    inProgress: false,
    lastRequestTime: 0,
    minInterval: 5000, // 5 seconds between identical requests
    navigationPending: false,
    pendingDestination: null
  }
};

// Add this debug function to help troubleshoot navigation issues
function debugNavigation() {
    // Get all navigation buttons
    const nextButtons = document.querySelectorAll('#nextBtn');
    const backButtons = document.querySelectorAll('#backBtn');
    
    console.log('Navigation debugging initialized');
    console.log(`Found ${nextButtons.length} next buttons and ${backButtons.length} back buttons`);
    
    // Check if the buttons have event listeners
    if (nextButtons.length > 0) {
        console.log('Next button found, adding debug click listener');
        nextButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                console.log('Next button clicked (debug listener)');
                // Don't prevent default here, just log the click
            });
        });
    }
    
    // Check progress bar structure
    const progressActive = document.querySelector('.progress-active');
    if (progressActive) {
        console.log('Progress bar found:', {
            width: progressActive.style.width,
            classNames: progressActive.className
        });
    } else {
        console.error('Progress bar active element not found!');
    }
    
    // Check step indicators
    const stepDots = document.querySelectorAll('.step-dot');
    if (stepDots.length > 0) {
        console.log(`Found ${stepDots.length} step indicators`);
        let activeCount = 0;
        let completedCount = 0;
        
        stepDots.forEach(dot => {
            if (dot.classList.contains('active')) activeCount++;
            if (dot.classList.contains('completed')) completedCount++;
        });
        
        console.log(`Active dots: ${activeCount}, Completed dots: ${completedCount}`);
    }
}

// Network request protection helper
function preventDuplicateRequests(requestType, action) {
  // Get the lock for this request type
  const lock = window.requestLocks[requestType];
  if (!lock) {
    console.error(`No request lock defined for ${requestType}`);
    return false;
  }
  
  // Check if a request is in progress
  if (lock.inProgress) {
    console.log(`${requestType} request already in progress, preventing duplicate`);
    return false;
  }
  
  // Check if enough time has passed since last request
  const now = Date.now();
  if (now - lock.lastRequestTime < lock.minInterval) {
    console.log(`${requestType} request too soon (${now - lock.lastRequestTime}ms), throttling`);
    return false;
  }
  
  // Update lock status
  lock.inProgress = true;
  lock.lastRequestTime = now;
  
  try {
    // Execute the action
    const result = action();
    
    // If action returns Promise, handle it properly
    if (result instanceof Promise) {
      return result.finally(() => {
        lock.inProgress = false;
      });
    }
    
    // Action completed synchronously
    lock.inProgress = false;
    return result;
  } catch (error) {
    // Ensure lock is released even if action throws
    lock.inProgress = false;
    throw error;
  }
}

// Delay navigation until in-progress requests complete
function safeNavigate(url) {
  const saveQuestionnaireLock = window.requestLocks.saveQuestionnaire;
  
  // If no request in progress, navigate immediately
  if (!saveQuestionnaireLock.inProgress) {
    window.location.href = url;
    return;
  }
  
  // Otherwise, store pending navigation and let request completion handle it
  console.log(`Request in progress, delaying navigation to ${url}`);
  saveQuestionnaireLock.navigationPending = true;
  saveQuestionnaireLock.pendingDestination = url;
  
  // Safety timeout to prevent stuck navigation
  setTimeout(() => {
    if (saveQuestionnaireLock.navigationPending && 
        saveQuestionnaireLock.pendingDestination === url) {
      console.warn(`Navigation safety timeout reached, forcing navigation to ${url}`);
      saveQuestionnaireLock.navigationPending = false;
      window.location.href = url;
    }
  }, 2000); // 2 second safety timeout
}

// Call the debug function after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    debugNavigation();
});

class QuestionnaireNavigation {
    constructor() {
        // Initialize page list in order
        this.pageOrder = [
            'basics',
            'email',
            'form',
            'location',
            'revenue',
            'ebitda',
            'cash-on-cash',
            'ffe',
            'growth',
            'debts',
            'valuation'
        ];
        
        // Find current page index
        this.currentPage = this.getCurrentPageSlug();
        this.currentIndex = this.pageOrder.indexOf(this.currentPage);
        
        // Set up navigation buttons
        this.setupNavigation();
        
        // Update progress indicators
        this.updateProgress();
        
        // Monitor and fix any in-progress request locks
        this.setupRequestLockMonitoring();
        
        console.log(`Questionnaire navigation initialized: current page is ${this.currentPage} (index ${this.currentIndex})`);
    }
    
    // Monitor request locks and handle stuck locks
    setupRequestLockMonitoring() {
        // Check every 5 seconds for stuck locks
        setInterval(() => {
            const now = Date.now();
            const lock = window.requestLocks.saveQuestionnaire;
            
            // If lock has been active for more than 10 seconds, it's likely stuck
            if (lock.inProgress && (now - lock.lastRequestTime > 10000)) {
                console.warn('Found stuck request lock, resetting');
                lock.inProgress = false;
                
                // If navigation was pending, perform it now
                if (lock.navigationPending && lock.pendingDestination) {
                    console.log(`Performing delayed navigation to ${lock.pendingDestination}`);
                    const destination = lock.pendingDestination;
                    lock.navigationPending = false;
                    lock.pendingDestination = null;
                    window.location.href = destination;
                }
            }
        }, 5000);
    }
    
    // Get current page slug from URL
    getCurrentPageSlug() {
        const path = window.location.pathname;
        const match = path.match(/\/seller-questionnaire\/([^\/]+)/);
        return match ? match[1] : 'basics';
    }
    
    // Set up navigation buttons
    setupNavigation() {
        const nextBtn = document.getElementById('nextBtn');
        const backBtn = document.getElementById('backBtn');
        
        if (nextBtn) {
            // Use more robust click handler with debounce
            let nextClickProcessing = false;
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Prevent multiple rapid clicks
                if (nextClickProcessing) {
                    console.log('Next click already processing, ignoring');
                    return;
                }
                
                nextClickProcessing = true;
                this.nextPage().finally(() => {
                    // Allow another click after a delay
                    setTimeout(() => {
                        nextClickProcessing = false;
                    }, 1000);
                });
            });
        }
        
        if (backBtn) {
            // Similar debounce for back button
            let backClickProcessing = false;
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (backClickProcessing) {
                    console.log('Back click already processing, ignoring');
                    return;
                }
                
                backClickProcessing = true;
                this.prevPage().finally(() => {
                    setTimeout(() => {
                        backClickProcessing = false;
                    }, 1000);
                });
            });
        }
    }
    
    // Add standardized page exit animation
    addExitAnimation() {
        return new Promise(resolve => {
            const mainContent = document.querySelector('main');
            mainContent.style.transition = 'opacity 0.3s ease-out';
            mainContent.style.opacity = '0';
            setTimeout(resolve, 300);
        });
    }
    
    // Navigate to the next page
    async nextPage() {
        console.log('nextPage called');
        
        try {
            // Run page validation if available, but with duplicate prevention
            if (typeof window.validateBeforeNext === 'function') {
                console.log('Calling validateBeforeNext...');
                
                let isValid = false;
                
                // Use the safe request wrapper
                if (typeof window.saveQuestionnaireDataToServerNonBlocking === 'function') {
                    isValid = preventDuplicateRequests('saveQuestionnaire', () => {
                        return window.validateBeforeNext();
                    });
                } else {
                    isValid = window.validateBeforeNext();
                }
                
                console.log(`validateBeforeNext returned: ${isValid}`);
                if (!isValid) {
                    console.log('Validation failed, staying on current page');
                    return; // Stop navigation if validation fails
                }
                // If validation passes, the non-blocking save has been initiated. Proceed with navigation.
            } else {
                console.log('No validateBeforeNext function found.');
            }
            
            this.currentIndex = this.pageOrder.indexOf(this.getCurrentPageSlug());
            console.log(`Current index: ${this.currentIndex}, Total pages: ${this.pageOrder.length}`);
            
            // Check if we're on the last page
            if (this.currentIndex >= this.pageOrder.length - 1) {
                console.log('On last page or beyond, redirecting to thank-you');
                await this.addExitAnimation();
                
                // Force navigation to thank you page directly using safe navigation
                console.log('Final navigation: redirecting to thank-you page');
                safeNavigate('/seller-questionnaire/thank-you');
                return;
            }
            
            // Update progress bar with animation
            this.animateProgressForward();
            
            // Get the next page in order
            const nextPageSlug = this.pageOrder[this.currentIndex + 1];
            console.log(`Navigating to next page: ${nextPageSlug}`);
            
            // Add exit animation then navigate
            await this.addExitAnimation();
            
            // Force navigation with safe navigation
            console.log('Final navigation: redirecting to next page');
            safeNavigate(`/seller-questionnaire/${nextPageSlug}`);
        } catch (error) {
            console.error('Error during navigation:', error);
            
            // Emergency fallback - if we're on the final page, force redirect
            if (this.currentIndex >= this.pageOrder.length - 2) { // Within 2 of final page
                console.warn('Error in navigation near final page, forcing thank-you redirect');
                safeNavigate('/seller-questionnaire/thank-you');
            } else {
                // Otherwise attempt to go to next page
                const nextPageIndex = this.currentIndex + 1;
                if (nextPageIndex < this.pageOrder.length) {
                    const recoveryPage = this.pageOrder[nextPageIndex];
                    console.warn(`Navigation recovery: redirecting to ${recoveryPage}`);
                    safeNavigate(`/seller-questionnaire/${recoveryPage}`);
                }
            }
        }
    }
    
    // Navigate to the previous page
    async prevPage() {
        console.log('prevPage called');
        // Optionally trigger non-blocking save on back navigation too?
        if (typeof window.saveQuestionnaireDataToServerNonBlocking === 'function') {
             console.log('Calling non-blocking save on prevPage');
             // Use preventDuplicateRequests to avoid repeated API calls
             preventDuplicateRequests('saveQuestionnaire', () => {
                return window.saveQuestionnaireDataToServerNonBlocking();
             });
        }

        this.currentIndex = this.pageOrder.indexOf(this.getCurrentPageSlug());
        
        // If we're on the first page, confirm exit
        if (this.currentIndex === 0) {
            if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
                safeNavigate('/');
            }
            return;
        }
        
        // Update progress bar with animation
        this.animateProgressBackward();
        
        // Get the previous page in order
        const prevPage = this.pageOrder[this.currentIndex - 1];
        
        // Add exit animation then navigate
        await this.addExitAnimation();
        
        // Navigate to the previous page with safe navigation
        safeNavigate(`/seller-questionnaire/${prevPage}`);
    }
    
    // Animate progress bar forward
    animateProgressForward() {
        const progressActive = document.querySelector('.progress-active');
        const currentDot = document.querySelector(`.step-dot[data-step="${this.currentIndex + 1}"]`);
        const nextDot = document.querySelector(`.step-dot[data-step="${this.currentIndex + 2}"]`);
        
        if (progressActive) {
            const nextStepPercentage = ((this.currentIndex + 2) / this.pageOrder.length) * 100;
            progressActive.style.width = `${nextStepPercentage}%`;
        }
        
        if (currentDot && nextDot) {
            currentDot.classList.remove('active');
            currentDot.classList.add('completed');
            nextDot.classList.add('active');
        }
    }
    
    // Animate progress bar backward
    animateProgressBackward() {
        const progressActive = document.querySelector('.progress-active');
        const currentDot = document.querySelector(`.step-dot[data-step="${this.currentIndex + 1}"]`);
        const prevDot = document.querySelector(`.step-dot[data-step="${this.currentIndex}"]`);
        
        if (progressActive) {
            const prevStepPercentage = (this.currentIndex / this.pageOrder.length) * 100;
            progressActive.style.width = `${prevStepPercentage}%`;
        }
        
        if (currentDot && prevDot) {
            currentDot.classList.remove('active');
            prevDot.classList.remove('completed');
            prevDot.classList.add('active');
        }
    }
    
    // Update progress bar and indicators
    updateProgress() {
        this.currentIndex = this.pageOrder.indexOf(this.getCurrentPageSlug());
        
        const totalPages = this.pageOrder.length;
        const progressPercentage = ((this.currentIndex + 1) / totalPages) * 100;
        
        // Update progress bar width
        const progressActive = document.querySelector('.progress-active');
        if (progressActive) {
            progressActive.style.width = `${progressPercentage}%`;
            
            // Add the appropriate CSS class for the current step
            progressActive.className = progressActive.className.replace(/step-\d+-of-\d+/g, '');
            progressActive.classList.add(`step-${this.currentIndex + 1}-of-${totalPages}`);
        }
        
        // Update step indicators
        const stepIndicators = document.querySelectorAll('.step-dot');
        if (stepIndicators && stepIndicators.length) {
            stepIndicators.forEach((dot, index) => {
                dot.classList.remove('active', 'completed');
                
                if (index < this.currentIndex) {
                    dot.classList.add('completed');
                } else if (index === this.currentIndex) {
                    dot.classList.add('active');
                }
            });
        }
        
        // Update current page text and count
        const currentPageText = document.querySelector('.current-page');
        const pagesCountText = document.querySelector('.pages-count');
        
        if (currentPageText) {
            let pageName = this.pageOrder[this.currentIndex];
            pageName = pageName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            currentPageText.textContent = pageName;
        }
        
        if (pagesCountText) {
            pagesCountText.textContent = `Step ${this.currentIndex + 1} of ${totalPages}`;
        }
    }
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create navigation instance
        window.questionnaireNav = new QuestionnaireNavigation();
        
        // Add entry animation to main content
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.classList.add('page-transition');
            setTimeout(() => {
                mainContent.style.opacity = '1';
            }, 50);
        }
    } catch (error) {
        console.error('Error initializing questionnaire navigation:', error);
    }
});
