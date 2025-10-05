/**
 * Token Purchase System
 * Handles token package display, Stripe checkout, and purchase completion
 */

class TokenPurchase {
    constructor() {
        this.packages = [];
        this.isLoading = false;
        this.currentModal = null;
        this.lastPurchaseAttempt = 0; // For debouncing rapid clicks
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadPackages();
            this.setupEventListeners();
            console.log('Token purchase system initialized');
        } catch (error) {
            console.error('Token purchase initialization failed:', error);
        }
    }
    
    static showModal() {
        try {
            console.log('TokenPurchase.showModal() called');
            
            if (!window.tokenPurchaseInstance) {
                console.log('Creating new TokenPurchase instance');
                window.tokenPurchaseInstance = new TokenPurchase();
            }
            
            console.log('Displaying modal');
            window.tokenPurchaseInstance.displayModal();
        } catch (error) {
            console.error('Error in TokenPurchase.showModal():', error);
            alert('Error opening token purchase modal. Please try again.');
        }
    }
    
    async loadPackages() {
        try {
            const response = await fetch('/api/tokens/packages', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load packages: ${response.status}`);
            }
            
            const data = await response.json();
            this.packages = data.packages || [];
            
            console.log('Token packages loaded:', this.packages);
        } catch (error) {
            console.error('Error loading token packages:', error);
            this.packages = [];
        }
    }
    
    displayModal() {
        try {
            console.log('displayModal() called');
            
            // Remove existing modal
            TokenPurchase.closeModal();
            
            const modal = document.createElement('div');
            modal.className = 'token-purchase-modal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2><i class="fas fa-coins text-yellow-500"></i> Buy Tokens</h2>
                            <button class="close-btn" data-action="close">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="purchase-intro">
                                <p>Tokens give you access to premium features like contacting sellers, boost listings, and advanced analytics.</p>
                            </div>
                            <div class="packages-grid" id="token-packages-grid">
                                ${this.isLoading ? this.renderLoadingState() : this.renderPackages()}
                            </div>
                            <div class="purchase-footer">
                                <div class="security-notice">
                                    <i class="fas fa-shield-alt text-green-500"></i>
                                    <span>Secure payment powered by Stripe</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.addModalStyles();
            document.body.appendChild(modal);
            this.currentModal = modal;
            
            console.log('Modal created and added to DOM');
            
            // Set up event listeners for the modal
            this.setupModalEventListeners(modal);
            
            // Animate modal in
            requestAnimationFrame(() => {
                modal.classList.add('show');
                console.log('Modal animation started');
            });
            
            // Load packages if not already loaded
            if (this.packages.length === 0 && !this.isLoading) {
                console.log('Loading packages...');
                this.refreshPackages();
            }
        } catch (error) {
            console.error('Error in displayModal():', error);
        }
    }
    
    // Method for loading packages into a specific container (for dedicated page)
    async loadPackagesIntoContainer(containerId) {
        console.log('loadPackagesIntoContainer called with:', containerId);
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }
        
        try {
            console.log('Setting loading state for container');
            // Show loading state
            container.innerHTML = this.renderLoadingState();
            
            // Load packages if not already loaded
            if (this.packages.length === 0) {
                console.log('Loading packages from API');
                await this.loadPackages();
            }
            
            console.log('Packages loaded:', this.packages.length);
            // Render packages for dedicated page
            container.innerHTML = this.renderPackagesForPage();
            
            // Setup click handlers for purchase buttons
            container.addEventListener('click', (e) => {
                const purchaseBtn = e.target.closest('.purchase-package-btn');
                if (purchaseBtn) {
                    e.preventDefault(); // Prevent any default behavior
                    e.stopPropagation(); // Stop event bubbling
                    
                    const packageId = parseInt(purchaseBtn.dataset.packageId);
                    if (packageId) {
                        console.log('Purchase button clicked for package:', packageId);
                        this.purchasePackage(packageId);
                    }
                }
            });
            
        } catch (error) {
            console.error('Error loading packages:', error);
            container.innerHTML = `
                <div class="error-state text-center py-12">
                    <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">Unable to Load Packages</h3>
                    <p class="text-gray-600 mb-4">Please try again later or contact support if the problem persists.</p>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-refresh mr-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }
    
    renderPackagesForPage() {
        if (this.packages.length === 0) {
            return `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-yellow-500 text-3xl mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-800 mb-2">No Packages Available</h3>
                    <p class="text-gray-600 mb-4">No token packages are currently available.</p>
                    <button onclick="location.reload()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-refresh mr-2"></i>Refresh Page
                    </button>
                </div>
            `;
        }
        
        return this.packages.map(pkg => this.renderPackageCardForPage(pkg)).join('');
    }
    
    renderPackageCardForPage(pkg) {
        const isRecommended = pkg.recommended;
        const totalTokens = pkg.token_amount + (pkg.bonus_tokens || 0);
        const savings = pkg.bonus_tokens > 0 ? Math.round((pkg.bonus_tokens / pkg.token_amount) * 100) : 0;
        
        // Convert price from pence to pounds
        const priceInPounds = (pkg.price_gbp || pkg.price || 0) / 100;
        const pricePerToken = (priceInPounds / totalTokens).toFixed(2);
        
        return `
            <div class="token-card bg-white rounded-lg shadow-md p-6 ${isRecommended ? 'ring-2 ring-blue-500 relative' : ''}">
                ${isRecommended ? '<div class="popular-badge absolute -top-3 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold px-4 py-1 rounded-full">Most Popular</div>' : ''}
                <div class="text-center">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">${pkg.name}</h3>
                    <div class="text-3xl font-bold text-blue-600 mb-1">£${priceInPounds.toFixed(2)}</div>
                    <div class="text-gray-500 text-sm mb-4">£${pricePerToken} per token</div>
                    
                    <div class="bg-gray-50 rounded-lg p-4 mb-4">
                        <div class="text-2xl font-bold text-gray-800 mb-1">${totalTokens}</div>
                        <div class="text-gray-600 text-sm">Total Tokens</div>
                        ${pkg.bonus_tokens > 0 ? `
                            <div class="text-green-600 text-sm font-semibold mt-1">
                                +${pkg.bonus_tokens} bonus tokens (${savings}% extra)
                            </div>
                        ` : ''}
                    </div>
                    
                    ${pkg.description ? `<p class="text-gray-600 text-sm mb-4">${pkg.description}</p>` : ''}
                    
                    <button class="purchase-package-btn w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors" data-package-id="${pkg.id}">
                        <i class="fas fa-shopping-cart mr-2"></i>
                        Purchase Now
                    </button>
                </div>
            </div>
        `;
    }
    
    static closeModal() {
        if (window.tokenPurchaseInstance?.currentModal) {
            const modal = window.tokenPurchaseInstance.currentModal;
            
            // Clean up event listeners
            if (modal._clickHandler) {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.removeEventListener('click', modal._clickHandler);
                }
            }
            if (modal._overlayHandler) {
                const modalOverlay = modal.querySelector('.modal-overlay');
                if (modalOverlay) {
                    modalOverlay.removeEventListener('click', modal._overlayHandler);
                }
            }
            
            modal.classList.remove('show');
            setTimeout(() => {
                modal.remove();
                window.tokenPurchaseInstance.currentModal = null;
            }, 300);
        }
    }
    
    renderLoadingState() {
        return `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading token packages...</p>
            </div>
        `;
    }
    
    renderPackages() {
        if (this.packages.length === 0) {
            return `
                <div class="no-packages">
                    <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                    <p>No token packages available at the moment.</p>
                    <button class="refresh-btn" type="button">
                        <i class="fas fa-refresh"></i> Try Again
                    </button>
                </div>
            `;
        }
        
        return this.packages.map(pkg => this.renderPackageCard(pkg)).join('');
    }
    
    renderPackageCard(pkg) {
        const isRecommended = pkg.recommended;
        const totalTokens = pkg.token_amount + (pkg.bonus_tokens || 0);
        const savings = pkg.bonus_tokens > 0 ? Math.round((pkg.bonus_tokens / pkg.token_amount) * 100) : 0;
        
        // Calculate price properly
        const priceInPounds = (pkg.price_gbp || pkg.price || 0) / 100;
        const pricePerToken = (priceInPounds / totalTokens).toFixed(3);
        
        return `
            <div class="package-card ${isRecommended ? 'recommended' : ''}" data-package-id="${pkg.id}">
                ${isRecommended ? '<div class="recommended-badge">Most Popular</div>' : ''}
                <div class="package-header">
                    <h3>${pkg.name}</h3>
                    <div class="package-description">${pkg.description || ''}</div>
                </div>
                <div class="package-content">
                    <div class="token-amount">
                        <span class="base-tokens">${pkg.token_amount}</span>
                        ${pkg.bonus_tokens > 0 ? `<span class="bonus-tokens">+${pkg.bonus_tokens} bonus</span>` : ''}
                        <span class="total-tokens">${totalTokens} total tokens</span>
                    </div>
                    <div class="package-price">
                        <span class="price">£${priceInPounds.toFixed(2)}</span>
                        <span class="price-per-token">£${pricePerToken} per token</span>
                    </div>
                    ${savings > 0 ? `<div class="savings-badge">${savings}% bonus tokens</div>` : ''}
                </div>
                <div class="package-actions">
                    <button 
                        class="purchase-btn purchase-package-btn ${isRecommended ? 'recommended' : ''}"
                        data-package-id="${pkg.id}"
                        type="button"
                        ${this.isLoading ? 'disabled' : ''}
                    >
                        ${this.isLoading ? '<i class="fas fa-spinner fa-spin"></i> Processing...' : '<i class="fas fa-shopping-cart"></i> Buy Now'}
                    </button>
                </div>
            </div>
        `;
    }
    
    async refreshPackages() {
        this.isLoading = true;
        this.updatePackagesGrid();
        
        try {
            await this.loadPackages();
        } finally {
            this.isLoading = false;
            this.updatePackagesGrid();
        }
    }
    
    updatePackagesGrid() {
        const grid = document.getElementById('token-packages-grid');
        if (grid) {
            grid.innerHTML = this.isLoading ? this.renderLoadingState() : this.renderPackages();
            // Re-setup event listeners after updating the grid
            if (this.currentModal) {
                this.setupModalEventListeners(this.currentModal);
            }
        }
    }
    
    setupModalEventListeners(modal) {
        console.log('Setting up modal event listeners');
        
        // Remove any existing listeners to prevent duplicates
        if (modal._clickHandler) {
            modal.removeEventListener('click', modal._clickHandler);
        }
        if (modal._overlayHandler) {
            modal.removeEventListener('click', modal._overlayHandler);
        }
        
        const modalContent = modal.querySelector('.modal-content');
        const modalOverlay = modal.querySelector('.modal-overlay');
        
        // Handle clicks inside modal content (buttons, etc.)
        const contentClickHandler = (e) => {
            // Handle purchase buttons
            const purchaseBtn = e.target.closest('.purchase-package-btn, .purchase-btn');
            if (purchaseBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const packageId = parseInt(purchaseBtn.dataset.packageId);
                if (packageId && !this.isLoading) {
                    console.log('Purchase button clicked for package:', packageId);
                    this.purchasePackage(packageId);
                } else if (this.isLoading) {
                    console.log('Purchase already in progress, ignoring click');
                } else {
                    console.error('No package ID found on button:', purchaseBtn);
                }
                return;
            }
            
            // Handle refresh button clicks
            const refreshBtn = e.target.closest('.refresh-btn');
            if (refreshBtn) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Refresh button clicked');
                this.refreshPackages();
                return;
            }
            
            // Handle close button clicks
            const closeBtn = e.target.closest('[data-action="close"]');
            if (closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Close button clicked');
                TokenPurchase.closeModal();
                return;
            }
        };
        
        // Handle clicks on modal overlay (to close modal)
        const overlayClickHandler = (e) => {
            if (e.target === modalOverlay) {
                console.log('Modal overlay clicked, closing modal');
                TokenPurchase.closeModal();
            }
        };
        
        // Add event listeners
        if (modalContent) {
            modalContent.addEventListener('click', contentClickHandler);
            modal._clickHandler = contentClickHandler;
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', overlayClickHandler);
            modal._overlayHandler = overlayClickHandler;
        }
        
        // Handle escape key to close modal
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                TokenPurchase.closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        console.log('Modal event listeners set up successfully');
    }
    
    async purchasePackage(packageId) {
        // Prevent multiple simultaneous purchases
        if (this.isLoading) {
            console.log('Purchase already in progress, ignoring...');
            return;
        }
        
        // Add debouncing - prevent rapid clicks
        if (this.lastPurchaseAttempt && (Date.now() - this.lastPurchaseAttempt) < 2000) {
            console.log('Purchase attempt too soon, ignoring...');
            return;
        }
        
        this.lastPurchaseAttempt = Date.now();
        this.isLoading = true;
        this.updatePurchaseButtons();
        
        console.log(`Starting purchase for package ${packageId}`);
        
        try {
            // Get JWT token for authentication
            const headers = { 'Content-Type': 'application/json' };
            
            // Try to get JWT token from meta tag first
            const metaToken = document.querySelector('meta[name="auth-token"]')?.content;
            if (metaToken && metaToken !== '' && metaToken !== 'null') {
                headers['Authorization'] = `Bearer ${metaToken}`;
                console.log('Using JWT token from meta tag for authentication');
            } else {
                console.log('No JWT token found, using session-only authentication');
            }
            
            console.log('Sending purchase request for package:', packageId);
            
            const response = await fetch('/api/tokens/purchase', {
                method: 'POST',
                credentials: 'include', // This ensures session cookies are sent
                headers: headers,
                body: JSON.stringify({ packageId })
            });
            
            console.log('Purchase response status:', response.status, response.statusText);
            
            // Check if response is HTML (login redirect) instead of JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                // User needs to login - redirect to login page
                console.log('Authentication required, redirecting to login');
                window.location.href = '/login2?returnTo=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            // Handle authentication errors
            if (response.status === 401) {
                console.log('Authentication failed, redirecting to login');
                window.location.href = '/login2?returnTo=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            const data = await response.json();
            console.log('Purchase response:', data);
            
            if (data.success && data.url) {
                // Redirect to Stripe checkout
                console.log('Redirecting to Stripe checkout:', data.url);
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Purchase failed');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            this.showError(error.message || 'Purchase failed. Please try again.');
        } finally {
            this.isLoading = false;
            this.updatePurchaseButtons();
        }
    }
    
    updatePurchaseButtons() {
        // Update buttons in modal
        const modalButtons = document.querySelectorAll('.token-purchase-modal .purchase-btn, .token-purchase-modal .purchase-package-btn');
        modalButtons.forEach(btn => {
            if (this.isLoading) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Buy Now';
            }
        });
        
        // Update buttons in dedicated pages
        const pageButtons = document.querySelectorAll('.purchase-package-btn');
        pageButtons.forEach(btn => {
            if (this.isLoading) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Purchase Now';
            }
        });
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'purchase-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            ${message}
        `;
        
        const modalBody = document.querySelector('.token-purchase-modal .modal-body');
        if (modalBody) {
            const existingError = modalBody.querySelector('.purchase-error');
            if (existingError) {
                existingError.remove();
            }
            modalBody.insertBefore(errorDiv, modalBody.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }
    
    setupEventListeners() {
        // Listen for successful purchases (from success page or webhook)
        document.addEventListener('tokenPurchaseSuccess', (event) => {
            const { amount, packageName } = event.detail;
            this.handleSuccessfulPurchase(amount, packageName);
        });
        
        // Listen for purchase failures
        document.addEventListener('tokenPurchaseFailure', (event) => {
            const { error } = event.detail;
            this.handleFailedPurchase(error);
        });
    }
    
    handleSuccessfulPurchase(amount, packageName) {
        TokenPurchase.closeModal();
        
        // Notify token balance system
        document.dispatchEvent(new CustomEvent('tokenPurchased', {
            detail: { amount, success: true, packageName }
        }));
        
        // Show success notification
        this.showSuccessNotification(amount, packageName);
    }
    
    handleFailedPurchase(error) {
        this.showError(error || 'Purchase failed. Please try again.');
    }
    
    showSuccessNotification(amount, packageName) {
        const notification = document.createElement('div');
        notification.className = 'purchase-success-notification';
        notification.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle text-green-500"></i>
                <div class="success-message">
                    <h4>Purchase Successful!</h4>
                    <p>Added ${amount} tokens from ${packageName}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
    
    addModalStyles() {
        if (document.getElementById('token-purchase-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'token-purchase-styles';
        styles.textContent = `
            .token-purchase-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
                backdrop-filter: blur(8px);
                background: rgba(0, 0, 0, 0.6);
            }
            
            .token-purchase-modal.show {
                opacity: 1;
            }
            
            .modal-overlay {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .modal-content {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border-radius: 16px;
                max-width: 900px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                transform: translateY(20px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .token-purchase-modal.show .modal-content {
                transform: translateY(0);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }
            
            .modal-header {
                padding: 24px;
                border-bottom: 1px solid rgba(229, 231, 235, 0.5);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #041b76 0%, #064fa3 100%);
                border-radius: 16px 16px 0 0;
            }
            
            .modal-header h2 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                color: white;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .modal-header h2 i {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5));
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                font-size: 20px;
                color: white;
                cursor: pointer;
                padding: 12px;
                border-radius: 50%;
                transition: all 0.2s ease;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }
            
            .modal-body {
                padding: 32px;
                background: linear-gradient(135deg, #f7f5f2 0%, #ffffff 100%);
            }
            
            .purchase-intro {
                text-align: center;
                margin-bottom: 32px;
            }
            
            .purchase-intro p {
                color: #363309;
                font-size: 16px;
                margin: 0;
                font-weight: 500;
            }
            
            .packages-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 24px;
                margin-bottom: 32px;
            }
            
            .package-card {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(4, 27, 118, 0.1);
                border-radius: 12px;
                padding: 24px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            
            .package-card:hover {
                border-color: #041b76;
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(4, 27, 118, 0.15);
            }
            
            .package-card.recommended {
                border-color: #041b76;
                background: linear-gradient(135deg, rgba(255, 247, 237, 0.9) 0%, rgba(254, 243, 199, 0.9) 100%);
                position: relative;
            }
            
            .package-card.recommended::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            }
            
            .recommended-badge {
                position: absolute;
                top: -1px;
                right: 24px;
                background: linear-gradient(135deg, #041b76 0%, #064fa3 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 0 0 12px 12px;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 8px rgba(4, 27, 118, 0.3);
            }
            
            .package-header h3 {
                margin: 0 0 8px 0;
                font-size: 20px;
                font-weight: 700;
                background: linear-gradient(135deg, #041b76 0%, #064fa3 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .package-description {
                color: #6b7280;
                font-size: 14px;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            
            .token-amount {
                text-align: center;
                margin-bottom: 16px;
                padding: 16px;
                background: linear-gradient(135deg, #f7f5f2 0%, #ffffff 100%);
                border-radius: 12px;
                border: 1px solid rgba(4, 27, 118, 0.1);
            }
            
            .base-tokens {
                display: block;
                font-size: 42px;
                font-weight: 800;
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                text-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
            }
            
            .bonus-tokens {
                display: block;
                color: #10b981;
                font-weight: 600;
                font-size: 14px;
                margin-top: 4px;
            }
            
            .total-tokens {
                display: block;
                color: #363309;
                font-size: 12px;
                margin-top: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
            }
            
            .package-price {
                text-align: center;
                margin-bottom: 20px;
            }
            
            .price {
                display: block;
                font-size: 32px;
                font-weight: 700;
                background: linear-gradient(135deg, #041b76 0%, #064fa3 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 4px;
            }
            
            .price-per-token {
                display: block;
                color: #6b7280;
                font-size: 12px;
                font-weight: 500;
            }
            
            .savings-badge {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
                margin-bottom: 16px;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
            }
            
            .purchase-btn {
                width: 100%;
                padding: 16px 24px;
                background: linear-gradient(135deg, #041b76 0%, #064fa3 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(4, 27, 118, 0.4);
                position: relative;
                overflow: hidden;
            }
            
            .purchase-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
            }
            
            .purchase-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(4, 27, 118, 0.6);
            }
            
            .purchase-btn:hover:not(:disabled)::before {
                left: 100%;
            }
            
            .purchase-btn.recommended {
                background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                color: #041b76;
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
            }
            
            .purchase-btn.recommended:hover:not(:disabled) {
                box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
            }
            
            .purchase-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .purchase-footer {
                text-align: center;
                padding-top: 24px;
                border-top: 1px solid rgba(4, 27, 118, 0.1);
            }
            
            .security-notice {
                color: #363309;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-weight: 500;
            }
            
            .security-notice i {
                color: #10b981;
            }
            
            .loading-state, .no-packages {
                text-align: center;
                padding: 48px 24px;
                color: #363309;
            }
            
            .loading-spinner {
                border: 3px solid rgba(4, 27, 118, 0.1);
                border-top: 3px solid #041b76;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .refresh-btn {
                margin-top: 16px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #041b76 0%, #064fa3 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(4, 27, 118, 0.4);
            }
            
            .refresh-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(4, 27, 118, 0.6);
            }
            
            .purchase-error {
                background: rgba(254, 242, 242, 0.9);
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 16px 20px;
                border-radius: 12px;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                gap: 12px;
                backdrop-filter: blur(10px);
                font-weight: 500;
            }
            
            .purchase-success-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid #d1fae5;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 10001;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }
            
            .purchase-success-notification.show {
                transform: translateX(0);
            }
            
            .success-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .success-message h4 {
                margin: 0 0 4px 0;
                color: #059669;
                font-size: 16px;
                font-weight: 600;
            }
            
            .success-message p {
                margin: 0;
                color: #6b7280;
                font-size: 14px;
            }
            
            /* Dark mode support */
            .dark .modal-content {
                background: rgba(31, 41, 55, 0.95);
                border: 1px solid rgba(75, 85, 99, 0.3);
            }
            
            .dark .modal-body {
                background: linear-gradient(135deg, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 0.9) 100%);
            }
            
            .dark .purchase-intro p {
                color: #d1d5db;
            }
            
            .dark .package-card {
                background: rgba(31, 41, 55, 0.95);
                border-color: rgba(75, 85, 99, 0.3);
            }
            
            .dark .package-description {
                color: #9ca3af;
            }
            
            .dark .token-amount {
                background: rgba(17, 24, 39, 0.5);
                border-color: rgba(75, 85, 99, 0.3);
            }
            
            .dark .total-tokens {
                color: #d1d5db;
            }
            
            .dark .security-notice {
                color: #d1d5db;
            }
            
            .dark .loading-state, .dark .no-packages {
                color: #d1d5db;
            }
            
            @media (max-width: 768px) {
                .packages-grid {
                    grid-template-columns: 1fr;
                }
                
                .modal-content {
                    margin: 10px;
                    max-height: calc(100vh - 20px);
                }
                
                .modal-header, .modal-body {
                    padding: 20px;
                }
                
                .base-tokens {
                    font-size: 36px;
                }
                
                .price {
                    font-size: 28px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Global access
window.TokenPurchase = TokenPurchase;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.tokenPurchaseInstance = new TokenPurchase();
});
