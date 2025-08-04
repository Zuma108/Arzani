/**
 * Enhanced Contact Seller System with Token Integration
 * Handles contact requirements, token validation, and freemium limits
 */

class ContactSellerManager {
    constructor() {
        this.isInitialized = false;
        this.contactRequirements = new Map();
        this.init();
    }
    
    async init() {
        try {
            this.setupEventListeners();
            this.enhanceContactButtons();
            this.isInitialized = true;
            console.log('Contact seller manager initialized with token integration');
        } catch (error) {
            console.error('Contact seller manager initialization failed:', error);
        }
    }
    
    setupEventListeners() {
        // Override existing contact button handlers
        document.addEventListener('click', this.handleContactClick.bind(this));
        
        // Listen for token balance changes
        document.addEventListener('tokenBalanceChanged', (event) => {
            this.updateContactButtonStates();
        });
    }
    
    async handleContactClick(event) {
        // Check if clicked element is a contact button
        if (!event.target.matches('.contact-btn, .contact-seller-btn, [data-action="contact-seller"]')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const button = event.target;
        const businessId = button.getAttribute('data-business-id') || 
                          button.closest('[data-business-id]')?.getAttribute('data-business-id');
        
        if (!businessId) {
            console.error('No business ID found for contact button');
            return;
        }
        
        await this.initiateContact(businessId, button);
    }
    
    async initiateContact(businessId, button) {
        try {
            // Check authentication first
            const isAuthenticated = await this.checkAuthStatus();
            if (!isAuthenticated) {
                this.redirectToLogin();
                return;
            }
            
            // Disable button during processing
            this.setButtonLoading(button, true);
            
            // Check contact requirements for this business
            const requirements = await this.getContactRequirements(businessId);
            
            if (requirements.canContact) {
                // User can contact directly (free contact or has tokens)
                await this.showContactForm(businessId, requirements);
            } else {
                // Show token purchase requirement
                await this.showTokenRequirement(businessId, requirements);
            }
            
        } catch (error) {
            console.error('Error initiating contact:', error);
            this.showError('Failed to initiate contact. Please try again.');
        } finally {
            this.setButtonLoading(button, false);
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
            return false;
        }
    }
    
    redirectToLogin() {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `/login2?returnTo=${returnUrl}`;
    }
    
    async getContactRequirements(businessId) {
        // Check cache first
        if (this.contactRequirements.has(businessId)) {
            return this.contactRequirements.get(businessId);
        }
        
        try {
            const response = await fetch(`/api/tokens/contact-requirements/${businessId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get contact requirements: ${response.status}`);
            }
            
            const requirements = await response.json();
            this.contactRequirements.set(businessId, requirements);
            
            return requirements;
        } catch (error) {
            console.error('Error getting contact requirements:', error);
            // Fallback to requiring tokens
            return {
                canContact: false,
                requiresTokens: true,
                tokensRequired: 2,
                contactType: 'token',
                reason: 'Unable to verify contact requirements'
            };
        }
    }
    
    async showContactForm(businessId, requirements) {
        const { contactType, tokensRequired = 0 } = requirements;
        
        // Create enhanced contact modal
        const modal = this.createContactModal(businessId, contactType, tokensRequired);
        document.body.appendChild(modal);
        
        // Show modal
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
    
    async showTokenRequirement(businessId, requirements) {
        const { tokensRequired, reason, userBalance = 0 } = requirements;
        
        const modal = document.createElement('div');
        modal.className = 'token-requirement-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3><i class="fas fa-coins text-yellow-500"></i> Tokens Required</h3>
                        <button onclick="this.closest('.token-requirement-modal').remove()" class="close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="requirement-info">
                            <div class="requirement-details">
                                <p class="requirement-message">${reason || 'This contact requires tokens to proceed.'}</p>
                                <div class="token-breakdown">
                                    <div class="token-cost">
                                        <span class="cost-label">Cost:</span>
                                        <span class="cost-amount">${tokensRequired} token${tokensRequired !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div class="user-balance">
                                        <span class="balance-label">Your balance:</span>
                                        <span class="balance-amount">${userBalance} token${userBalance !== 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${userBalance >= tokensRequired ? `
                                <div class="sufficient-balance">
                                    <button onclick="ContactSellerManager.instance?.proceedWithTokens('${businessId}', ${tokensRequired})" class="proceed-btn">
                                        <i class="fas fa-paper-plane"></i>
                                        Contact Seller (${tokensRequired} token${tokensRequired !== 1 ? 's' : ''})
                                    </button>
                                </div>
                            ` : `
                                <div class="insufficient-balance">
                                    <p class="balance-warning">You need ${tokensRequired - userBalance} more token${(tokensRequired - userBalance) !== 1 ? 's' : ''} to contact this seller.</p>
                                    <div class="purchase-options">
                                        <button onclick="TokenPurchase.showModal(); this.closest('.token-requirement-modal').remove();" class="purchase-btn quick-purchase">
                                            <i class="fas fa-shopping-cart"></i>
                                            Quick Buy
                                        </button>
                                        <button onclick="window.location.href='/purchase-tokens';" class="purchase-btn full-purchase">
                                            <i class="fas fa-coins"></i>
                                            View All Packages
                                        </button>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.addTokenRequirementStyles();
        document.body.appendChild(modal);
        
        // Show modal
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }
    
    async proceedWithTokens(businessId, tokensRequired) {
        try {
            // Close token requirement modal
            const tokenModal = document.querySelector('.token-requirement-modal');
            if (tokenModal) tokenModal.remove();
            
            // Show contact form but indicate token consumption
            const modal = this.createContactModal(businessId, 'token', tokensRequired);
            document.body.appendChild(modal);
            
            // Show modal
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
            
        } catch (error) {
            console.error('Error proceeding with tokens:', error);
            this.showError('Failed to proceed with contact. Please try again.');
        }
    }
    
    createContactModal(businessId, contactType, tokensRequired = 0) {
        const modal = document.createElement('div');
        modal.className = 'enhanced-contact-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>
                            <i class="fas fa-envelope"></i>
                            Contact Seller
                            ${contactType === 'token' ? `<span class="token-cost-badge">${tokensRequired} token${tokensRequired !== 1 ? 's' : ''}</span>` : ''}
                        </h3>
                        <button onclick="this.closest('.enhanced-contact-modal').remove()" class="close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="enhancedContactForm" data-business-id="${businessId}" data-contact-type="${contactType}" data-tokens-required="${tokensRequired}">
                            <div class="form-group">
                                <label for="contactFirstName">First Name *</label>
                                <input type="text" id="contactFirstName" name="firstName" required class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label for="contactLastName">Last Name *</label>
                                <input type="text" id="contactLastName" name="lastName" required class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label for="contactEmail">Email *</label>
                                <input type="email" id="contactEmail" name="email" required class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label for="contactPhone">Phone Number</label>
                                <input type="tel" id="contactPhone" name="phone" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label for="contactTimeframe">Investment Timeframe *</label>
                                <select id="contactTimeframe" name="timeframe" required class="form-control">
                                    <option value="">Select timeframe</option>
                                    <option value="immediate">Immediate (0-30 days)</option>
                                    <option value="short">Short term (1-3 months)</option>
                                    <option value="medium">Medium term (3-6 months)</option>
                                    <option value="long">Long term (6+ months)</option>
                                    <option value="exploring">Just exploring</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="contactMessage">Message *</label>
                                <textarea id="contactMessage" name="message" required class="form-control" rows="4" 
                                    placeholder="Tell the seller about your interest, experience, and any specific questions..."></textarea>
                            </div>
                            
                            <div class="form-group">
                                <div class="checkbox-group">
                                    <input type="checkbox" id="contactConsent" name="consent" required>
                                    <label for="contactConsent">I consent to my details being shared with the seller *</label>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="button" onclick="this.closest('.enhanced-contact-modal').remove()" class="cancel-btn">
                                    Cancel
                                </button>
                                <button type="submit" class="submit-btn">
                                    <i class="fas fa-paper-plane"></i>
                                    ${contactType === 'token' ? `Send Message (${tokensRequired} token${tokensRequired !== 1 ? 's' : ''})` : 'Send Message'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Add form submission handler
        const form = modal.querySelector('#enhancedContactForm');
        form.addEventListener('submit', this.handleFormSubmission.bind(this));
        
        this.addContactModalStyles();
        
        return modal;
    }
    
    async handleFormSubmission(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const businessId = form.getAttribute('data-business-id');
        const contactType = form.getAttribute('data-contact-type');
        const tokensRequired = parseInt(form.getAttribute('data-tokens-required')) || 0;
        
        const submitBtn = form.querySelector('.submit-btn');
        this.setButtonLoading(submitBtn, true);
        
        try {
            // Prepare contact data
            const contactData = {
                businessId,
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                timeframe: formData.get('timeframe'),
                message: formData.get('message'),
                consent: formData.get('consent') === 'on',
                contactType,
                tokensRequired
            };
            
            // Submit contact request
            const response = await fetch(`/api/businesses/${businessId}/contact`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Success - close modal and show confirmation
                form.closest('.enhanced-contact-modal').remove();
                this.showSuccessNotification(contactType, tokensRequired);
                
                // Trigger token balance refresh if tokens were consumed
                if (tokensRequired > 0) {
                    document.dispatchEvent(new CustomEvent('refreshTokenBalance'));
                }
                
                // Update contact button states
                this.updateContactButtonStates();
                
            } else {
                throw new Error(result.error || 'Contact submission failed');
            }
            
        } catch (error) {
            console.error('Contact submission error:', error);
            this.showError(error.message || 'Failed to send message. Please try again.');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }
    
    showSuccessNotification(contactType, tokensUsed) {
        const notification = document.createElement('div');
        notification.className = 'contact-success-notification';
        notification.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle text-green-500"></i>
                <div class="success-message">
                    <h4>Message Sent Successfully!</h4>
                    <p>Your inquiry has been sent to the seller.${tokensUsed > 0 ? ` ${tokensUsed} token${tokensUsed !== 1 ? 's' : ''} used.` : ''}</p>
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
    
    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'contact-error-notification';
        notification.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle text-red-500"></i>
                <div class="error-message">
                    <h4>Error</h4>
                    <p>${message}</p>
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
    
    setButtonLoading(button, isLoading) {
        if (!button) return;
        
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }
    
    enhanceContactButtons() {
        // Add token requirements to contact buttons
        document.querySelectorAll('.contact-btn, .contact-seller-btn').forEach(async (button) => {
            const businessId = button.getAttribute('data-business-id');
            if (businessId) {
                try {
                    const requirements = await this.getContactRequirements(businessId);
                    this.updateButtonDisplay(button, requirements);
                } catch (error) {
                    console.error('Error enhancing contact button:', error);
                }
            }
        });
    }
    
    updateButtonDisplay(button, requirements) {
        if (!requirements.canContact && requirements.tokensRequired > 0) {
            // Add token cost indicator
            const tokenBadge = document.createElement('span');
            tokenBadge.className = 'token-cost-indicator';
            tokenBadge.innerHTML = `<i class="fas fa-coins"></i> ${requirements.tokensRequired}`;
            
            if (!button.querySelector('.token-cost-indicator')) {
                button.appendChild(tokenBadge);
            }
        }
    }
    
    updateContactButtonStates() {
        // Refresh contact requirements for all visible buttons
        document.querySelectorAll('.contact-btn, .contact-seller-btn').forEach(async (button) => {
            const businessId = button.getAttribute('data-business-id');
            if (businessId) {
                // Clear cache and refetch
                this.contactRequirements.delete(businessId);
                try {
                    const requirements = await this.getContactRequirements(businessId);
                    this.updateButtonDisplay(button, requirements);
                } catch (error) {
                    console.error('Error updating contact button state:', error);
                }
            }
        });
    }
    
    addContactModalStyles() {
        if (document.getElementById('enhanced-contact-modal-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'enhanced-contact-modal-styles';
        styles.textContent = `
            .enhanced-contact-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .enhanced-contact-modal.show {
                opacity: 1;
            }
            
            .enhanced-contact-modal .modal-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .enhanced-contact-modal .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }
            
            .enhanced-contact-modal.show .modal-content {
                transform: translateY(0);
            }
            
            .enhanced-contact-modal .modal-header {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .enhanced-contact-modal .modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #111827;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .token-cost-badge {
                background: #f59e0b;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .enhanced-contact-modal .form-group {
                margin-bottom: 16px;
            }
            
            .enhanced-contact-modal label {
                display: block;
                margin-bottom: 4px;
                font-weight: 600;
                color: #374151;
            }
            
            .enhanced-contact-modal .form-control {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .enhanced-contact-modal .form-control:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .enhanced-contact-modal .checkbox-group {
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }
            
            .enhanced-contact-modal .checkbox-group input[type="checkbox"] {
                margin-top: 2px;
            }
            
            .enhanced-contact-modal .form-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
            }
            
            .enhanced-contact-modal .cancel-btn {
                padding: 8px 16px;
                background: #f3f4f6;
                color: #374151;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
            }
            
            .enhanced-contact-modal .submit-btn {
                padding: 8px 16px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .enhanced-contact-modal .submit-btn:hover:not(:disabled) {
                background: #2563eb;
            }
            
            .enhanced-contact-modal .submit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .token-cost-indicator {
                background: #f59e0b;
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
                margin-left: 6px;
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    addTokenRequirementStyles() {
        if (document.getElementById('token-requirement-modal-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'token-requirement-modal-styles';
        styles.textContent = `
            .token-requirement-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .token-requirement-modal.show {
                opacity: 1;
            }
            
            .token-requirement-modal .modal-overlay {
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .token-requirement-modal .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                transform: translateY(20px);
                transition: transform 0.3s ease;
            }
            
            .token-requirement-modal.show .modal-content {
                transform: translateY(0);
            }
            
            .token-requirement-modal .modal-header {
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .token-requirement-modal .modal-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .requirement-info {
                padding: 20px;
            }
            
            .requirement-message {
                margin-bottom: 16px;
                color: #6b7280;
            }
            
            .token-breakdown {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 20px;
            }
            
            .token-cost, .user-balance {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .user-balance {
                margin-bottom: 0;
            }
            
            .cost-amount, .balance-amount {
                font-weight: 600;
                color: #111827;
            }
            
            .proceed-btn, .purchase-btn {
                width: 100%;
                padding: 12px 16px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            
            .proceed-btn {
                background: #10b981;
                color: white;
            }
            
            .proceed-btn:hover {
                background: #059669;
            }
            
            .purchase-btn {
                background: #f59e0b;
                color: white;
            }
            
            .purchase-btn:hover {
                background: #d97706;
            }
            
            .purchase-options {
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .quick-purchase {
                background: #f59e0b;
                flex: 1;
                min-width: 120px;
            }
            
            .full-purchase {
                background: #3b82f6;
                flex: 1;
                min-width: 120px;
            }
            
            .full-purchase:hover {
                background: #2563eb;
            }
            
            .balance-warning {
                color: #dc2626;
                margin-bottom: 16px;
                font-weight: 500;
                text-align: center;
            }
            
            .contact-success-notification, .contact-error-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 10001;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 300px;
            }
            
            .contact-success-notification {
                border-left: 4px solid #10b981;
            }
            
            .contact-error-notification {
                border-left: 4px solid #ef4444;
            }
            
            .contact-success-notification.show,
            .contact-error-notification.show {
                transform: translateX(0);
            }
            
            .success-content, .error-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .success-message h4, .error-message h4 {
                margin: 0 0 4px 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .success-message h4 {
                color: #059669;
            }
            
            .error-message h4 {
                color: #dc2626;
            }
            
            .success-message p, .error-message p {
                margin: 0;
                color: #6b7280;
                font-size: 14px;
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize contact seller manager
document.addEventListener('DOMContentLoaded', () => {
    ContactSellerManager.instance = new ContactSellerManager();
});

// Global access
window.ContactSellerManager = ContactSellerManager;
