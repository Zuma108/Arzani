/**
 * Token Balance Management System
 * Handles token balance display, purchase modals, and consumption tracking
 */

class TokenBalance {
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
            // Check if user is authenticated
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                console.log('User not authenticated, skipping token balance initialization');
                return;
            }
            
            await this.fetchBalance();
            this.setupEventListeners();
            this.renderBalanceWidget();
            this.startPeriodicRefresh();
            this.isInitialized = true;
            
            console.log('Token balance system initialized successfully');
        } catch (error) {
            console.error('Token balance initialization failed:', error);
        }
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                credentials: 'include'
            });
            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }
    
    async fetchBalance() {
        try {
            const response = await fetch('/api/tokens/balance', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch balance: ${response.status}`);
            }
            
            const data = await response.json();
            this.balance = data.balance || 0;
            this.notifyBalanceChange();
            
            return this.balance;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    }
    
    renderBalanceWidget() {
        // Remove existing widget if present
        const existingWidget = document.getElementById('token-balance-widget');
        if (existingWidget) {
            existingWidget.remove();
        }
        
        // Create widget HTML
        const widget = document.createElement('div');
        widget.id = 'token-balance-widget';
        widget.className = 'token-balance-widget';
        widget.innerHTML = `
            <div class="token-balance-container">
                <div class="token-balance-display" onclick="TokenBalance.instance?.showBalanceDetails()">
                    <i class="fas fa-coins text-yellow-500"></i>
                    <span class="token-count">${this.balance}</span>
                    <span class="token-label">Tokens</span>
                </div>
                <button 
                    class="token-purchase-btn" 
                    onclick="TokenPurchase.showModal()"
                    title="Buy More Tokens"
                >
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        
        // Add CSS styles
        this.addWidgetStyles();
        
        // Find appropriate container (navbar, header, etc.)
        const targetContainer = this.findWidgetContainer();
        if (targetContainer) {
            targetContainer.appendChild(widget);
        }
    }
    
    findWidgetContainer() {
        // Try to find the best location for the token widget
        const possibleContainers = [
            '.navbar-nav',
            '.header-actions',
            '.user-menu',
            '.navigation-bar',
            'nav',
            'header'
        ];
        
        for (const selector of possibleContainers) {
            const container = document.querySelector(selector);
            if (container) {
                return container;
            }
        }
        
        // Fallback to body
        return document.body;
    }
    
    addWidgetStyles() {
        if (document.getElementById('token-balance-styles')) {
            return; // Styles already added
        }
        
        const styles = document.createElement('style');
        styles.id = 'token-balance-styles';
        styles.textContent = `
            .token-balance-widget {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                margin: 0 10px;
                position: relative;
                z-index: 1000;
            }
            
            .token-balance-container {
                display: flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                border: 1px solid #f59e0b;
                border-radius: 20px;
                padding: 6px 12px;
                box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
                transition: all 0.3s ease;
            }
            
            .token-balance-container:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
            }
            
            .token-balance-display {
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
                color: #92400e;
                font-weight: 600;
                font-size: 14px;
            }
            
            .token-count {
                font-size: 16px;
                font-weight: 700;
                color: #78350f;
            }
            
            .token-label {
                font-size: 12px;
                color: #92400e;
            }
            
            .token-purchase-btn {
                background: #f59e0b;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 12px;
            }
            
            .token-purchase-btn:hover {
                background: #d97706;
                transform: scale(1.1);
            }
            
            .token-balance-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }
            
            .token-balance-notification.show {
                transform: translateX(0);
            }
            
            .token-balance-notification.error {
                background: #ef4444;
            }
            
            @media (max-width: 768px) {
                .token-balance-widget {
                    margin: 0 5px;
                }
                
                .token-balance-container {
                    padding: 4px 8px;
                }
                
                .token-count {
                    font-size: 14px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
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
            });
        });
    }
    
    handleTokenConsumption(details) {
        const { amount, action, success } = details;
        
        if (success) {
            this.balance = Math.max(0, this.balance - amount);
            this.updateBalanceDisplay();
            this.showNotification(`Used ${amount} token${amount !== 1 ? 's' : ''} for ${action}`, 'success');
        } else {
            this.showNotification('Token consumption failed', 'error');
        }
    }
    
    handleTokenPurchase(details) {
        const { amount, success } = details;
        
        if (success) {
            this.balance += amount;
            this.updateBalanceDisplay();
            this.showNotification(`Added ${amount} token${amount !== 1 ? 's' : ''} to your account!`, 'success');
        } else {
            this.showNotification('Token purchase failed', 'error');
        }
        
        // Refresh balance from server to ensure accuracy
        setTimeout(() => {
            this.fetchBalance().then(() => {
                this.updateBalanceDisplay();
            });
        }, 1000);
    }
    
    updateBalanceDisplay() {
        const tokenCountElement = document.querySelector('.token-count');
        if (tokenCountElement) {
            tokenCountElement.textContent = this.balance;
            
            // Add animation effect
            tokenCountElement.style.transform = 'scale(1.2)';
            setTimeout(() => {
                tokenCountElement.style.transform = 'scale(1)';
            }, 200);
        }
        
        this.notifyBalanceChange();
    }
    
    // Method to update balance display in a specific element
    updateDisplay(elementId) {
        console.log('TokenBalance.updateDisplay called with elementId:', elementId);
        const element = document.getElementById(elementId);
        if (element) {
            console.log('Found element, setting loading state');
            element.innerHTML = `
                <i class="fas fa-spinner fa-spin text-gray-400"></i>
            `;
            
            // Fetch current balance and update display
            this.fetchBalance().then(() => {
                console.log('Balance fetched:', this.balance);
                element.innerHTML = `
                    <span class="text-3xl font-bold text-blue-600">${this.balance}</span>
                `;
            }).catch(error => {
                console.error('Error updating balance display:', error);
                element.innerHTML = `
                    <span class="text-3xl font-bold text-red-600">--</span>
                `;
            });
        } else {
            console.error('Element not found:', elementId);
        }
    }
    
    showNotification(message, type = 'success') {
        // Clear existing notification
        const existingNotification = document.querySelector('.token-balance-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `token-balance-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    showBalanceDetails() {
        // Create and show balance details modal
        const modal = document.createElement('div');
        modal.className = 'token-balance-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Token Balance Details</h3>
                        <button onclick="this.closest('.token-balance-modal').remove()" class="close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="balance-info">
                            <div class="balance-amount">
                                <i class="fas fa-coins text-yellow-500 text-2xl"></i>
                                <span class="balance-number">${this.balance}</span>
                                <span class="balance-label">Available Tokens</span>
                            </div>
                            <div class="balance-actions">
                                <button onclick="TokenPurchase.showModal(); this.closest('.token-balance-modal').remove();" class="purchase-btn">
                                    <i class="fas fa-plus"></i>
                                    Buy More Tokens
                                </button>
                                <button onclick="this.showTransactionHistory()" class="history-btn">
                                    <i class="fas fa-history"></i>
                                    View History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        this.addModalStyles();
        
        document.body.appendChild(modal);
    }
    
    addModalStyles() {
        if (document.getElementById('token-modal-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'token-modal-styles';
        styles.textContent = `
            .token-balance-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            
            .modal-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            }
            
            .modal-header {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #111827;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 18px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
            }
            
            .modal-body {
                padding: 20px;
            }
            
            .balance-info {
                text-align: center;
            }
            
            .balance-amount {
                margin-bottom: 24px;
            }
            
            .balance-number {
                display: block;
                font-size: 48px;
                font-weight: 700;
                color: #78350f;
                margin: 8px 0;
            }
            
            .balance-label {
                color: #6b7280;
                font-size: 14px;
            }
            
            .balance-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }
            
            .purchase-btn, .history-btn {
                padding: 10px 16px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s ease;
            }
            
            .purchase-btn {
                background: #f59e0b;
                color: white;
            }
            
            .purchase-btn:hover {
                background: #d97706;
            }
            
            .history-btn {
                background: #e5e7eb;
                color: #374151;
            }
            
            .history-btn:hover {
                background: #d1d5db;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    startPeriodicRefresh() {
        // Refresh balance every 2 minutes
        this.refreshInterval = setInterval(() => {
            this.fetchBalance().then(() => {
                this.updateBalanceDisplay();
            });
        }, 120000);
    }
    
    addBalanceListener(callback) {
        this.balanceListeners.push(callback);
    }
    
    removeBalanceListener(callback) {
        this.balanceListeners = this.balanceListeners.filter(listener => listener !== callback);
    }
    
    notifyBalanceChange() {
        this.balanceListeners.forEach(callback => {
            try {
                callback(this.balance);
            } catch (error) {
                console.error('Error in balance change listener:', error);
            }
        });
    }
    
    async consumeTokens(amount, actionType, metadata = {}) {
        try {
            const response = await fetch('/api/tokens/consume', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    actionType,
                    metadata
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.handleTokenConsumption({
                    amount,
                    action: actionType,
                    success: true
                });
                return { success: true, remainingBalance: data.remainingBalance };
            } else {
                this.handleTokenConsumption({
                    amount,
                    action: actionType,
                    success: false
                });
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Error consuming tokens:', error);
            return { success: false, error: 'Network error' };
        }
    }
    
    getBalance() {
        return this.balance;
    }
    
    hasBalance(amount) {
        return this.balance >= amount;
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        const widget = document.getElementById('token-balance-widget');
        if (widget) {
            widget.remove();
        }
        
        this.balanceListeners = [];
    }
}

// Initialize token balance system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if user is likely authenticated
    if (document.cookie.includes('token') || localStorage.getItem('authToken')) {
        TokenBalance.instance = new TokenBalance();
    }
});

// Global access for other scripts
window.TokenBalance = TokenBalance;
