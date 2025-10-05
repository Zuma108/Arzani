class LoadingManager {
    constructor() {
        this.loadingContainer = document.querySelector('.loading-container');
        this.isLoading = false;
        this.minDisplayTime = 500; // Minimum time to show loading screen
        this.setupListeners();
        
        // Show loading immediately if elements are still loading
        this.showLoadingOnInit();
    }
    
    showLoadingOnInit() {
        // Show loading screen immediately on script load
        if (this.loadingContainer) {
            // Prevent body scrolling immediately
            document.documentElement.classList.add('loading-active');
            document.body.classList.add('loading-active');
            
            this.loadingContainer.classList.add('active');
            this.isLoading = true;
        }
    }

    setupListeners() {
        // Hide loading when page is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Add a small delay to ensure smooth transition
                setTimeout(() => {
                    this.hideLoading();
                }, 300);
            });
        } else {
            // Document already loaded
            setTimeout(() => {
                this.hideLoading();
            }, 300);
        }

        // Show loading before page unload
        window.addEventListener('beforeunload', () => {
            this.showLoading('Redirecting...');
        });

        // Handle AJAX requests
        this.setupAjaxListeners();

        // Handle form submissions
        this.setupFormListeners();
        
        // Handle navigation
        this.setupNavigationListeners();
    }
    
    setupNavigationListeners() {
        // Handle internal link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && !link.hasAttribute('download') && 
                !link.href.startsWith('mailto:') && 
                !link.href.startsWith('tel:') &&
                !link.target === '_blank' &&
                link.hostname === window.location.hostname) {
                
                this.showLoading('Loading page...');
            }
        });
    }

    setupAjaxListeners() {
        const oldXHR = window.XMLHttpRequest;
        const loading = this;

        function newXHR() {
            const xhr = new oldXHR();
            xhr.addEventListener('loadstart', () => loading.showLoading());
            xhr.addEventListener('loadend', () => loading.hideLoading());
            return xhr;
        }

        window.XMLHttpRequest = newXHR;
    }

    setupFormListeners() {
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.showLoading('Processing...');
            }
        });
    }

    showLoading(message = 'Loading...') {
        if (this.loadingContainer) {
            const loadingText = this.loadingContainer.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
            
            // Prevent body scrolling
            document.documentElement.classList.add('loading-active');
            document.body.classList.add('loading-active');
            
            this.loadingContainer.classList.add('active');
            this.isLoading = true;
            this.startTime = Date.now();
        }
    }

    hideLoading() {
        if (this.loadingContainer && this.isLoading) {
            const elapsed = Date.now() - (this.startTime || 0);
            const remainingTime = Math.max(0, this.minDisplayTime - elapsed);
            
            setTimeout(() => {
                this.loadingContainer.classList.remove('active');
                
                // Re-enable body scrolling
                document.documentElement.classList.remove('loading-active');
                document.body.classList.remove('loading-active');
                
                this.isLoading = false;
            }, remainingTime);
        }
    }

    static getInstance() {
        if (!LoadingManager.instance) {
            LoadingManager.instance = new LoadingManager();
        }
        return LoadingManager.instance;
    }
}

// Initialize loading manager
const loadingManager = LoadingManager.getInstance();

// Export for module usage
export default loadingManager;
