/**
 * Questionnaire Progress Handler
 * Ensures consistent progress bar animations across all questionnaire pages
 */

class QuestionnaireProgress {
    constructor() {
        // Define the page order
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
        
        // Get the current page
        this.currentPage = this.getCurrentPage();
        this.currentPageIndex = this.pageOrder.indexOf(this.currentPage);
        
        // Initialize the progress elements
        this.progressBar = document.querySelector('.progress-active');
        this.stepDots = document.querySelectorAll('.step-dot');
        
        // Initialize the page with the correct progress
        this.initializeProgress();
        
        console.log(`Progress initialized for page: ${this.currentPage} (index: ${this.currentPageIndex})`);
    }
    
    // Get the current page from the URL
    getCurrentPage() {
        const path = window.location.pathname;
        const match = path.match(/\/seller-questionnaire\/([^\/]+)/);
        return match ? match[1] : null;
    }
    
    // Initialize the progress bar and dots
    initializeProgress() {
        if (this.currentPageIndex === -1) return;
        
        // Calculate the progress percentage
        const progressPercentage = ((this.currentPageIndex + 1) / this.pageOrder.length) * 100;
        
        // Set the progress bar width
        if (this.progressBar) {
            // First set initial width without transition
            this.progressBar.style.transition = 'none';
            this.progressBar.style.width = `${progressPercentage}%`;
            
            // Force a reflow to ensure the transition works
            void this.progressBar.offsetWidth;
            
            // Restore the transition
            this.progressBar.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Add the appropriate step class
            this.progressBar.classList.add(`step-${this.currentPageIndex + 1}-of-${this.pageOrder.length}`);
        }
        
        // Update the step dots
        if (this.stepDots && this.stepDots.length) {
            this.stepDots.forEach((dot, index) => {
                if (index < this.currentPageIndex) {
                    dot.classList.add('completed');
                } else if (index === this.currentPageIndex) {
                    dot.classList.add('active');
                }
            });
        }
        
        // Add a class to the body for specific page styles
        document.body.classList.add(`${this.currentPage}-page`);
    }
    
    // Animate to the next page
    animateToNextPage() {
        if (this.currentPageIndex >= this.pageOrder.length - 1) return;
        
        const nextIndex = this.currentPageIndex + 1;
        const nextPercentage = ((nextIndex + 1) / this.pageOrder.length) * 100;
        
        // Animate the progress bar
        if (this.progressBar) {
            this.progressBar.style.width = `${nextPercentage}%`;
        }
        
        // Update the dots
        if (this.stepDots && this.stepDots.length) {
            if (this.stepDots[this.currentPageIndex]) {
                this.stepDots[this.currentPageIndex].classList.remove('active');
                this.stepDots[this.currentPageIndex].classList.add('completed');
            }
            
            if (this.stepDots[nextIndex]) {
                this.stepDots[nextIndex].classList.add('active');
            }
        }
    }
    
    // Animate to the previous page
    animateToPrevPage() {
        if (this.currentPageIndex <= 0) return;
        
        const prevIndex = this.currentPageIndex - 1;
        const prevPercentage = ((prevIndex + 1) / this.pageOrder.length) * 100;
        
        // Animate the progress bar
        if (this.progressBar) {
            this.progressBar.style.width = `${prevPercentage}%`;
        }
        
        // Update the dots
        if (this.stepDots && this.stepDots.length) {
            if (this.stepDots[this.currentPageIndex]) {
                this.stepDots[this.currentPageIndex].classList.remove('active');
            }
            
            if (this.stepDots[prevIndex]) {
                this.stepDots[prevIndex].classList.remove('completed');
                this.stepDots[prevIndex].classList.add('active');
            }
        }
    }
    
    // Helper to get the next page URL
    getNextPageUrl() {
        if (this.currentPageIndex >= this.pageOrder.length - 1) return null;
        return `/seller-questionnaire/${this.pageOrder[this.currentPageIndex + 1]}`;
    }
    
    // Helper to get the previous page URL
    getPrevPageUrl() {
        if (this.currentPageIndex <= 0) return '/';
        return `/seller-questionnaire/${this.pageOrder[this.currentPageIndex - 1]}`;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Create a global instance
    window.questionnaireProgress = new QuestionnaireProgress();
    
    // Set up navigation buttons specifically for FFE page
    if (window.location.pathname.includes('/seller-questionnaire/ffe')) {
        console.log('Setting up FFE page navigation buttons');
        
        const nextBtn = document.getElementById('nextBtn');
        const backBtn = document.getElementById('backBtn');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function(e) {
                // Existing code will handle this, just add extra debugging
                console.log('FFE page next button clicked');
            }, true);
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                // Existing code will handle this, just add extra debugging
                console.log('FFE page back button clicked');
            }, true);
        }
    }
});
