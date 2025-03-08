class LoadingManager {
    constructor() {
        this.loadingContainer = document.querySelector('.loading-container');
        this.setupListeners();
    }

    setupListeners() {
        // Show loading on page load
        document.addEventListener('DOMContentLoaded', () => {
            this.hideLoading();
        });

        // Show loading before unload
        window.addEventListener('beforeunload', () => {
            this.showLoading();
        });

        // Handle AJAX requests
        this.setupAjaxListeners();

        // Handle form submissions
        this.setupFormListeners();
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
                this.showLoading();
            }
        });
    }

    showLoading() {
        if (this.loadingContainer) {
            this.loadingContainer.classList.add('active');
        }
    }

    hideLoading() {
        if (this.loadingContainer) {
            this.loadingContainer.classList.remove('active');
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
