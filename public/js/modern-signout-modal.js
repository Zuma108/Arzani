/**
 * Modern Sign-Out Confirmation Modal
 * Replaces browser confirm() with a sleek, customizable modal
 */

class ModernSignOutModal {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.isOpen = false;
        this.confirmCallback = null;
        this.cancelCallback = null;
        
        // Create modal elements
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'signout-modal-overlay';
        this.overlay.innerHTML = `
            <div class="signout-modal-container">
                <div class="signout-modal">
                    <!-- Icon -->
                    <div class="signout-modal-icon">
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                    </div>
                    
                    <!-- Content -->
                    <div class="signout-modal-content">
                        <h3 class="signout-modal-title">Sign out of your account?</h3>
                        <p class="signout-modal-message">
                            You'll be safely signed out and redirected to our homepage. 
                            Your data will remain secure.
                        </p>
                    </div>
                    
                    <!-- Actions -->
                    <div class="signout-modal-actions">
                        <button class="signout-modal-btn signout-modal-btn-cancel" id="signout-cancel-btn">
                            <span>Stay signed in</span>
                        </button>
                        <button class="signout-modal-btn signout-modal-btn-confirm" id="signout-confirm-btn">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                            <span>Sign out</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        this.addStyles();
        
        // Append to body
        document.body.appendChild(this.overlay);
    }

    addStyles() {
        const styleId = 'signout-modal-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .signout-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                padding: 20px;
            }

            .signout-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .signout-modal-container {
                position: relative;
                width: 100%;
                max-width: 420px;
                transform: scale(0.9) translateY(30px);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .signout-modal-overlay.active .signout-modal-container {
                transform: scale(1) translateY(0);
            }

            .signout-modal {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 0.5px solid rgba(255, 255, 255, 0.4);
                border-radius: 24px;
                padding: 32px;
                text-align: center;
                box-shadow: 
                    0px 32px 64px rgba(0, 0, 0, 0.1),
                    0px 8px 32px rgba(0, 0, 0, 0.05);
                position: relative;
                overflow: hidden;
            }

            .signout-modal::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                pointer-events: none;
            }

            .signout-modal-icon {
                width: 72px;
                height: 72px;
                margin: 0 auto 24px;
                background: linear-gradient(135deg, #dc3545, #c82333);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                position: relative;
                z-index: 2;
                animation: iconPulse 2s ease-in-out infinite;
            }

            @keyframes iconPulse {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4);
                }
                50% {
                    transform: scale(1.05);
                    box-shadow: 0 0 0 20px rgba(220, 53, 69, 0);
                }
            }

            .signout-modal-content {
                margin-bottom: 32px;
                position: relative;
                z-index: 2;
            }

            .signout-modal-title {
                font-size: 24px;
                font-weight: 600;
                color: #2c3e50;
                margin: 0 0 12px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            .signout-modal-message {
                font-size: 16px;
                color: #6c757d;
                margin: 0;
                line-height: 1.5;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            .signout-modal-actions {
                display: flex;
                gap: 16px;
                position: relative;
                z-index: 2;
            }

            .signout-modal-btn {
                flex: 1;
                padding: 14px 20px;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                position: relative;
                overflow: hidden;
            }

            .signout-modal-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                pointer-events: none;
            }

            .signout-modal-btn-cancel {
                background: rgba(108, 117, 125, 0.1);
                color: #495057;
                border: 1px solid rgba(108, 117, 125, 0.2);
            }

            .signout-modal-btn-cancel:hover:not(:disabled) {
                background: rgba(108, 117, 125, 0.15);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(108, 117, 125, 0.2);
            }

            .signout-modal-btn-confirm {
                background: linear-gradient(135deg, #dc3545, #c82333);
                color: white;
                box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
            }

            .signout-modal-btn-confirm:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(220, 53, 69, 0.4);
            }

            .signout-modal-btn.loading::after {
                content: '';
                width: 16px;
                height: 16px;
                border: 2px solid transparent;
                border-top: 2px solid currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-left: 8px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Mobile responsive */
            @media (max-width: 640px) {
                .signout-modal {
                    padding: 24px;
                    margin: 16px;
                }

                .signout-modal-title {
                    font-size: 20px;
                }

                .signout-modal-message {
                    font-size: 14px;
                }

                .signout-modal-actions {
                    flex-direction: column;
                }

                .signout-modal-btn {
                    width: 100%;
                }
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .signout-modal {
                    background: rgba(30, 30, 30, 0.95);
                    border: 0.5px solid rgba(255, 255, 255, 0.1);
                }

                .signout-modal-title {
                    color: #f8f9fa;
                }

                .signout-modal-message {
                    color: #adb5bd;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    bindEvents() {
        // Overlay click to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Button events will be bound when modal opens
    }

    show(options = {}) {
        return new Promise((resolve) => {
            if (this.isOpen) return;

            this.isOpen = true;
            
            // Update content if provided
            if (options.title) {
                const titleEl = this.overlay.querySelector('.signout-modal-title');
                titleEl.textContent = options.title;
            }
            
            if (options.message) {
                const messageEl = this.overlay.querySelector('.signout-modal-message');
                messageEl.textContent = options.message;
            }

            // Bind button events
            const cancelBtn = this.overlay.querySelector('#signout-cancel-btn');
            const confirmBtn = this.overlay.querySelector('#signout-confirm-btn');

            const handleCancel = () => {
                this.close();
                resolve(false);
            };

            const handleConfirm = () => {
                // Add loading state
                confirmBtn.classList.add('loading');
                confirmBtn.disabled = true;
                cancelBtn.disabled = true;
                
                // Update text
                const span = confirmBtn.querySelector('span');
                span.textContent = 'Signing out...';
                
                // Resolve with true after a short delay for UX
                setTimeout(() => {
                    resolve(true);
                }, 500);
            };

            // Remove existing listeners
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));

            // Add new listeners
            this.overlay.querySelector('#signout-cancel-btn').addEventListener('click', handleCancel);
            this.overlay.querySelector('#signout-confirm-btn').addEventListener('click', handleConfirm);

            // Show modal
            this.overlay.classList.add('active');
            
            // Focus management
            setTimeout(() => {
                this.overlay.querySelector('#signout-cancel-btn').focus();
            }, 300);
        });
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.overlay.classList.remove('active');

        // Reset buttons
        setTimeout(() => {
            const cancelBtn = this.overlay.querySelector('#signout-cancel-btn');
            const confirmBtn = this.overlay.querySelector('#signout-confirm-btn');
            
            if (cancelBtn) {
                cancelBtn.disabled = false;
            }
            
            if (confirmBtn) {
                confirmBtn.classList.remove('loading');
                confirmBtn.disabled = false;
                const span = confirmBtn.querySelector('span');
                if (span) span.textContent = 'Sign out';
            }
        }, 300);
    }

    static confirm(options = {}) {
        if (!window.modernSignOutModal) {
            window.modernSignOutModal = new ModernSignOutModal();
        }
        
        return window.modernSignOutModal.show(options);
    }
}

// Create global instance
window.ModernSignOutModal = ModernSignOutModal;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.modernSignOutModal) {
            window.modernSignOutModal = new ModernSignOutModal();
        }
    });
} else {
    if (!window.modernSignOutModal) {
        window.modernSignOutModal = new ModernSignOutModal();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernSignOutModal;
}