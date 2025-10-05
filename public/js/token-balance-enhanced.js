/**
 * Enhanced Token Balance Management System
 * Handles token balance display, purchase modals, and consumption tracking
 * Fixed authentication and API integration issues
 */

class TokenBalanceEnhanced {
    constructor() {
        this.balance = 0;
        this.isInitialized = false;
        this.refreshInterval = null;
        this.notificationTimeout = null;
        
        // Event listeners for balance updates
        this.balanceListeners = [];
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Initializing enhanced token balance system...');
            
            // Check authentication and initialize user record
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                console.log('User not authenticated, skipping token balance initialization');
                return;
            }
            
            // Initialize user token record if needed
            await this.initializeUserTokenRecord();
            
            // Fetch current balance
            await this.fetchBalance();
            
            // Set up UI and event listeners
            this.setupEventListeners();
            this.renderBalanceWidget();
            this.startPeriodicRefresh();
            
            this.isInitialized = true;
            console.log('Enhanced token balance system initialized successfully');
            
        } catch (error) {
            console.error('Enhanced token balance initialization failed:', error);
        }
    }
    
    // Enhanced authentication check with multiple methods
    async checkAuthStatus() {
        try {
            // Try multiple authentication methods
            const authMethods = [
                // Method 1: Session-based authentication
                {
                    url: '/api/auth/verify',
                    options: {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' }
                    }
                },
                // Method 2: Token-based authentication
                {
                    url: '/api/tokens/balance',
                    options: {
                        method: 'GET',
                        credentials: 'include',
                        headers: this.getAuthHeaders()
                    }
                }
            ];
            
            for (const method of authMethods) {
                try {
                    const response = await fetch(method.url, method.options);
                    if (response.ok) {
                        console.log('Authentication successful');
                        return true;
                    }
                } catch (error) {
                    console.log('Auth method failed:', error.message);
                }
            }
            
            console.log('All authentication methods failed');
            return false;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
    
    // Get authentication headers from multiple sources
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Try to get token from multiple sources
        const token = this.getAuthToken();
        if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
    
    // Enhanced token retrieval from multiple sources
    getAuthToken() {
        const sources = [
            // 1. Meta tag
            () => document.querySelector('meta[name="auth-token"]')?.content,
            // 2. LocalStorage variations
            () => localStorage.getItem('authToken'),
            () => localStorage.getItem('token'),
            () => localStorage.getItem('jwt'),
            // 3. SessionStorage variations
            () => sessionStorage.getItem('authToken'),
            () => sessionStorage.getItem('token'),
            // 4. Cookies
            () => {
                const match = document.cookie.match(/(?:^|;)\s*token\s*=\s*([^;]+)/);
                return match ? match[1] : null;
            },
            () => {
                const match = document.cookie.match(/(?:^|;)\s*authToken\s*=\s*([^;]+)/);
                return match ? match[1] : null;
            }
        ];
        
        for (const getToken of sources) {
            try {
                const token = getToken();
                if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
                    return token.trim();
                }
            } catch (error) {
                // Continue to next source
            }
        }
        
        return null;
    }
    
    // Initialize user token record if it doesn't exist
    async initializeUserTokenRecord() {
        try {
            const response = await fetch('/api/tokens/initialize', {
                method: 'POST',
                credentials: 'include',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('User token record status:', data.message);
            } else if (response.status === 409) {
                console.log('User token record already exists');
            } else {
                console.log('Token record initialization failed:', response.status);
            }
        } catch (error) {
            console.log('Token record initialization error (non-critical):', error);
        }
    }
    
    // Enhanced balance fetching with better error handling
    async fetchBalance() {
        try {
            const response = await fetch('/api/tokens/balance', {
                method: 'GET',
                credentials: 'include',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.balance = data.balance || 0;
                console.log('Token balance updated:', this.balance);
                this.notifyBalanceChange();
                return this.balance;
            } else if (response.status === 401) {
                console.error('Authentication failed for token balance');
                this.showNotification('Please sign in to view token balance', 'error');
                return 0;
            } else if (response.status === 404) {
                console.log('User token record not found, initializing...');
                await this.initializeUserTokenRecord();
                // Retry once after initialization
                return this.fetchBalance();
            } else {
                console.error('Failed to fetch token balance:', response.status);
                return 0;
            }
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    }
    
    // Enhanced token consumption with better error handling
    async consumeTokens(amount, actionType, metadata = {}) {
        try {
            const response = await fetch('/api/tokens/consume', {
                method: 'POST',
                credentials: 'include',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    amount,
                    actionType,
                    metadata
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.balance = data.result.remainingBalance;
                this.updateBalanceDisplay();
                this.showNotification(`Used ${amount} tokens for ${actionType}`, 'success');
                
                // Dispatch event for other components
                document.dispatchEvent(new CustomEvent('tokenConsumed', {
                    detail: { amount, actionType, success: true, remainingBalance: this.balance }
                }));
                
                return data.result;
            } else if (response.status === 401) {
                this.showNotification('Please sign in to use tokens', 'error');
                throw new Error('Authentication required');
            } else if (data.code === 'INSUFFICIENT_BALANCE') {
                this.showNotification('Insufficient token balance. Please purchase more tokens.', 'error');
                throw new Error('Insufficient token balance');
            } else {
                throw new Error(data.error || 'Token consumption failed');
            }
            
        } catch (error) {
            console.error('Error consuming tokens:', error);
            
            // Dispatch error event
            document.dispatchEvent(new CustomEvent('tokenConsumed', {
                detail: { amount, actionType, success: false, error: error.message }
            }));
            
            throw error;
        }
    }
    
    // Render balance widget with modern styling
    renderBalanceWidget() {
        // Skip rendering if sidebar is present (as requested by user)
        const sidebar = document.querySelector('#unified-sidebar');
        if (sidebar) {
            console.log('Skipping token balance widget rendering - sidebar present');
            return;
        }
        
        // Remove existing widget if present
        const existingWidget = document.getElementById('token-balance-widget-enhanced');
        if (existingWidget) {
            existingWidget.remove();
        }
        
        // Create widget HTML with enhanced styling
        const widget = document.createElement('div');
        widget.id = 'token-balance-widget-enhanced';
        widget.className = 'token-balance-widget-enhanced';
        widget.innerHTML = `
            <div class="token-balance-container-enhanced">
                <div class="token-balance-display-enhanced" onclick="this.showBalanceDetails()">
                    <svg width="20" height="20" viewBox="0 0 24 24" class="token-icon-enhanced">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L12 4L3 7V9C3 14.55 6.84 19.74 12 21C17.16 19.74 21 14.55 21 9Z" fill="#ffd700"/>
                    </svg>
                    <span class="token-count-enhanced">${this.balance}</span>
                    <span class="token-label-enhanced">Tokens</span>
                </div>
                <button 
                    class="token-purchase-btn-enhanced" 
                    onclick="this.openPurchaseModal()"
                    title="Buy More Tokens"
                >
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        
        // Add enhanced CSS styles
        this.addEnhancedWidgetStyles();
        
        // Find appropriate container
        const targetContainer = this.findWidgetContainer();
        if (targetContainer) {
            targetContainer.appendChild(widget);
        } else {
            // Clean up if no suitable container found
            widget.remove();
        }
    }
    
    // Find the best container for the widget
    findWidgetContainer() {
        const possibleContainers = [
            '#token-balance-navbar-widget', // Specific navbar location
            '.navbar-nav',
            '.header-actions', 
            '.navigation-bar',
            'nav',
            'header'
        ];
        
        for (const selector of possibleContainers) {
            const container = document.querySelector(selector);
            // Skip if container is inside the sidebar
            if (container && !this.isInsideSidebar(container)) {
                return container;
            }
        }
        
        // Don't add to body if we're on a page with a sidebar - return null instead
        const sidebar = document.querySelector('#unified-sidebar');
        if (sidebar) {
            return null; // Don't show token widget when sidebar is present
        }
        
        return document.body;
    }
    
    // Check if an element is inside the sidebar
    isInsideSidebar(element) {
        const sidebar = document.querySelector('#unified-sidebar');
        if (!sidebar || !element) return false;
        
        return sidebar.contains(element);
    }
    
    // Add enhanced widget styles
    addEnhancedWidgetStyles() {
        if (document.getElementById('token-balance-enhanced-styles')) {
            return; // Already added
        }
        
        const styles = document.createElement('style');
        styles.id = 'token-balance-enhanced-styles';
        styles.textContent = `
            .token-balance-widget-enhanced {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 0 10px;
                position: relative;
                z-index: 1000;
            }
            
            .token-balance-container-enhanced {
                display: flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 2px solid #f59e0b;
                border-radius: 20px;
                padding: 8px 12px;
                box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .token-balance-container-enhanced:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(245, 158, 11, 0.3);
                border-color: #d97706;
            }
            
            .token-balance-display-enhanced {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #92400e;
                font-weight: 600;
                font-size: 14px;
            }
            
            .token-icon-enhanced {
                filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5));
                animation: tokenGlowEnhanced 2s ease-in-out infinite alternate;
            }
            
            @keyframes tokenGlowEnhanced {
                from { filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.5)); }
                to { filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.8)); }
            }
            
            .token-count-enhanced {
                font-size: 18px;
                font-weight: 800;
                color: #78350f;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            
            .token-label-enhanced {
                font-size: 12px;
                color: #92400e;
                font-weight: 500;
            }
            
            .token-purchase-btn-enhanced {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                border: none;
                border-radius: 50%;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(217, 119, 6, 0.3);
            }
            
            .token-purchase-btn-enhanced:hover {
                background: linear-gradient(135deg, #d97706 0%, #92400e 100%);
                transform: scale(1.1);
                box-shadow: 0 4px 8px rgba(217, 119, 6, 0.5);
            }
            
            @media (max-width: 768px) {
                .token-balance-widget-enhanced {
                    margin: 0 5px;
                }
                
                .token-balance-container-enhanced {
                    padding: 6px 10px;
                }
                
                .token-count-enhanced {
                    font-size: 16px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // Update balance display
    updateBalanceDisplay() {
        const tokenCountElement = document.querySelector('.token-count-enhanced');
        if (tokenCountElement) {
            // Animate the change
            tokenCountElement.style.transform = 'scale(1.2)';
            tokenCountElement.textContent = this.balance;
            
            setTimeout(() => {
                tokenCountElement.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Also update any other displays
        const displays = document.querySelectorAll('.token-balance-display, #token-balance-display');
        displays.forEach(display => {
            if (display.tagName === 'INPUT') {
                display.value = this.balance;
            } else {
                display.textContent = this.balance;
            }
        });
    }
    
    // Enhanced notification system
    showNotification(message, type = 'success') {
        // Clear existing notification
        const existingNotification = document.querySelector('.token-notification-enhanced');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `token-notification-enhanced token-notification-${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                     type === 'error' ? 'exclamation-circle' : 
                     'info-circle';
        
        notification.innerHTML = `
            <div class="token-notification-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="token-notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add notification styles if not present
        this.addNotificationStyles();
        
        document.body.appendChild(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
    
    // Add notification styles
    addNotificationStyles() {
        if (document.getElementById('token-notification-enhanced-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'token-notification-enhanced-styles';
        styles.textContent = `
            .token-notification-enhanced {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 400px;
            }
            
            .token-notification-enhanced.show {
                transform: translateX(0);
            }
            
            .token-notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-weight: 500;
                color: white;
            }
            
            .token-notification-success .token-notification-content {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            
            .token-notification-error .token-notification-content {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            }
            
            .token-notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.8);
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s ease;
            }
            
            .token-notification-close:hover {
                background: rgba(255, 255, 255, 0.2);
                color: white;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    // Enhanced method to update display in specific element
    updateDisplay(elementId) {
        console.log('TokenBalanceEnhanced.updateDisplay called with elementId:', elementId);
        const element = document.getElementById(elementId);
        if (element) {
            // Show loading state
            element.innerHTML = '<i class="fas fa-spinner fa-spin text-primary"></i>';
            
            // Fetch fresh data and update
            this.fetchBalance().then(() => {
                element.innerHTML = `<span class="text-4xl font-black text-gradient">${this.balance}</span>`;
            }).catch(error => {
                console.error('Failed to update display:', error);
                element.innerHTML = '<span class="text-4xl font-black text-red-500">--</span>';
                setTimeout(() => {
                    element.innerHTML = '<span class="text-4xl font-black text-gradient">0</span>';
                }, 2000);
            });
        } else {
            console.error('Element not found for token balance display:', elementId);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for token consumption events
        document.addEventListener('tokenConsumed', (event) => {
            this.handleTokenConsumption(event.detail);
        });
        
        // Listen for token purchase events
        document.addEventListener('tokenPurchased', (event) => {
            this.handleTokenPurchase(event.detail);
        });
        
        // Listen for manual refresh requests
        document.addEventListener('refreshTokenBalance', () => {
            this.fetchBalance().then(() => {
                this.updateBalanceDisplay();
                this.showNotification('Token balance refreshed', 'success');
            });
        });
    }
    
    // Handle token consumption events
    handleTokenConsumption(details) {
        const { amount, action, success } = details;
        
        if (success) {
            this.fetchBalance();
            this.showNotification(`${amount} tokens used for ${action}`, 'success');
        } else {
            this.showNotification(`Failed to use tokens for ${action}`, 'error');
        }
    }
    
    // Handle token purchase events
    handleTokenPurchase(details) {
        const { amount, success } = details;
        
        if (success) {
            this.fetchBalance();
            this.showNotification(`${amount} tokens added to your account!`, 'success');
        } else {
            this.showNotification('Token purchase failed', 'error');
        }
        
        // Refresh balance from server to ensure accuracy
        setTimeout(() => {
            this.fetchBalance();
        }, 1000);
    }
    
    // Start periodic refresh
    startPeriodicRefresh() {
        // Refresh balance every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.fetchBalance();
        }, 30000);
    }
    
    // Open purchase modal
    openPurchaseModal() {
        if (typeof TokenPurchase !== 'undefined' && TokenPurchase.showModal) {
            TokenPurchase.showModal();
        } else {
            // Fallback: redirect to purchase page
            window.location.href = '/tokens/purchase';
        }
    }
    
    // Show balance details modal
    showBalanceDetails() {
        // Implementation for balance details modal
        console.log('Show balance details modal - current balance:', this.balance);
        this.showNotification(`Current balance: ${this.balance} tokens`, 'success');
    }
    
    // Add balance change listener
    addBalanceListener(callback) {
        this.balanceListeners.push(callback);
    }
    
    // Remove balance change listener
    removeBalanceListener(callback) {
        const index = this.balanceListeners.indexOf(callback);
        if (index > -1) {
            this.balanceListeners.splice(index, 1);
        }
    }
    
    // Notify balance change
    notifyBalanceChange() {
        this.balanceListeners.forEach(callback => {
            try {
                callback(this.balance);
            } catch (error) {
                console.error('Error in balance listener:', error);
            }
        });
    }
    
    // Get current balance
    getBalance() {
        return this.balance;
    }
    
    // Check if user has sufficient balance
    hasBalance(amount) {
        return this.balance >= amount;
    }
    
    // Refresh balance manually
    async refreshBalance() {
        console.log('Manually refreshing token balance...');
        try {
            const newBalance = await this.fetchBalance();
            this.updateBalanceDisplay();
            this.showNotification('Token balance updated', 'success');
            return newBalance;
        } catch (error) {
            console.error('Failed to refresh balance:', error);
            this.showNotification('Failed to refresh balance', 'error');
            throw error;
        }
    }
    
    // Cleanup
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        const widget = document.getElementById('token-balance-widget-enhanced');
        if (widget) {
            widget.remove();
        }
    }
}

// Initialize enhanced token balance system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing enhanced token balance system...');
    
    // Create global instance
    window.TokenBalanceEnhanced = TokenBalanceEnhanced;
    window.tokenBalanceEnhanced = new TokenBalanceEnhanced();
    
    // Also make it available as TokenBalance for backward compatibility
    if (!window.TokenBalance) {
        window.TokenBalance = TokenBalanceEnhanced;
        window.TokenBalance.instance = window.tokenBalanceEnhanced;
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenBalanceEnhanced;
}