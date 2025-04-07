/**
 * Standardized navigation for seller questionnaire
 * This script handles consistent page transitions and progress bar animations
 */

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
        
        console.log(`Questionnaire navigation initialized: current page is ${this.currentPage} (index ${this.currentIndex})`);
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
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextPage();
            });
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.prevPage();
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
        // Run page validation if available
        if (typeof window.validateBeforeNext === 'function') {
            const isValid = window.validateBeforeNext();
            if (!isValid) {
                console.log('Validation failed, staying on current page');
                return;
            }
        }
        
        this.currentIndex = this.pageOrder.indexOf(this.getCurrentPageSlug());
        
        // Check if we're on the last page
        if (this.currentIndex === this.pageOrder.length - 1) {
            console.log('On last page, redirecting to thank-you');
            await this.addExitAnimation();
            window.location.href = '/seller-questionnaire/thank-you';
            return;
        }
        
        // Update progress bar with animation
        this.animateProgressForward();
        
        // Get the next page in order
        const nextPage = this.pageOrder[this.currentIndex + 1];
        console.log(`Navigating to next page: ${nextPage}`);
        
        // Add exit animation then navigate
        await this.addExitAnimation();
        
        // Navigate to the next page
        window.location.href = `/seller-questionnaire/${nextPage}`;
    }
    
    // Navigate to the previous page
    async prevPage() {
        this.currentIndex = this.pageOrder.indexOf(this.getCurrentPageSlug());
        
        // If we're on the first page, confirm exit
        if (this.currentIndex === 0) {
            if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
                window.location.href = '/';
            }
            return;
        }
        
        // Update progress bar with animation
        this.animateProgressBackward();
        
        // Get the previous page in order
        const prevPage = this.pageOrder[this.currentIndex - 1];
        
        // Add exit animation then navigate
        await this.addExitAnimation();
        
        // Navigate to the previous page
        window.location.href = `/seller-questionnaire/${prevPage}`;
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
