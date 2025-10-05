/**
 * Modern Glassmorphism Sidebar Management
 * Handles sidebar collapse/expand, mobile toggle, navigation, and modern interactions
 */

class UnifiedSidebar {
    constructor() {
        this.sidebar = document.getElementById('unified-sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.mobileToggle = document.getElementById('mobile-sidebar-toggle');
        this.desktopToggle = document.getElementById('desktop-sidebar-toggle');
        this.signOutBtn = document.getElementById('sign-out-btn');
        this.navItems = document.querySelectorAll('.nav-item');
        this.chatBadge = document.getElementById('chat-badge');
        this.dashboardSubmenu = document.querySelector('.dashboard-submenu');
        
        this.isCollapsed = this.getCollapsedState();
        this.isMobile = window.innerWidth < 1024;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setActiveNavItem();
        this.applySidebarState();
        this.setupUnreadMessagesBadge();
        this.handleResize();
        this.setupDashboardSubmenu();
    }

    setupEventListeners() {
        // Mobile toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }

        // Desktop collapse toggle
        if (this.desktopToggle) {
            this.desktopToggle.addEventListener('click', () => this.toggleDesktopSidebar());
        }

        // Overlay click to close on mobile
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        // Sign out
        if (this.signOutBtn) {
            this.signOutBtn.addEventListener('click', () => this.handleSignOut());
        }

        // Navigation items with loading states
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e, item));
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Escape key to close mobile sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileOpen()) {
                this.closeMobileSidebar();
            }
        });

        // Message items click handlers
        this.setupMessageHandlers();

        // Dashboard submenu toggle
        this.setupDashboardToggle();
    }

    toggleMobileSidebar() {
        if (this.isMobileOpen()) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    openMobileSidebar() {
        if (this.sidebar && this.overlay) {
            this.sidebar.classList.remove('-translate-x-full');
            this.overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Focus trap
            this.trapFocus();
        }
    }

    closeMobileSidebar() {
        if (this.sidebar && this.overlay) {
            this.sidebar.classList.add('-translate-x-full');
            this.overlay.classList.add('hidden');
            document.body.style.overflow = '';
            
            // Return focus to toggle button
            if (this.mobileToggle) {
                this.mobileToggle.focus();
            }
        }
    }

    isMobileOpen() {
        return this.sidebar && !this.sidebar.classList.contains('-translate-x-full') && this.isMobile;
    }

    toggleDesktopSidebar() {
        this.isCollapsed = !this.isCollapsed;
        this.applySidebarState();
        this.saveCollapsedState();
        
        // Add a small delay to ensure smooth icon positioning
        setTimeout(() => {
            this.adjustIconPositions();
        }, 150);
    }
    
    adjustIconPositions() {
        // Force browser to recalculate layouts for smooth icon transitions
        const navItems = this.sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const iconContainer = item.querySelector('.w-6.h-6');
            if (iconContainer) {
                // Trigger reflow for smooth transitions
                iconContainer.offsetWidth;
            }
        });
    }

    applySidebarState() {
        if (!this.sidebar) return;

        const mainContent = document.getElementById('content');
        
        if (this.isCollapsed && !this.isMobile) {
            this.sidebar.classList.add('collapsed');
            if (mainContent) {
                mainContent.classList.add('sidebar-collapsed');
            }
            // Hide submenu when collapsed
            if (this.dashboardSubmenu) {
                this.dashboardSubmenu.style.display = 'none';
            }
        } else {
            this.sidebar.classList.remove('collapsed');
            if (mainContent) {
                mainContent.classList.remove('sidebar-collapsed');
            }
            // Show submenu if dashboard is active
            this.setupDashboardSubmenu();
        }
        
        // Force layout recalculation to ensure smooth transitions
        this.sidebar.offsetHeight;
    }

    adjustMainContent() {
        // This method is now handled by CSS classes
        // Keeping for backward compatibility but functionality moved to CSS
        const mainContent = document.getElementById('content');
        if (!mainContent) return;

        // Ensure proper classes are applied
        if (this.isMobile) {
            mainContent.classList.remove('sidebar-collapsed');
        } else if (this.isCollapsed) {
            mainContent.classList.add('sidebar-collapsed');
        } else {
            mainContent.classList.remove('sidebar-collapsed');
        }
    }

    setActiveNavItem() {
        const currentPath = window.location.pathname;
        
        this.navItems.forEach(item => {
            item.classList.remove('active');
            item.style.background = '';
            item.style.color = 'rgba(36, 34, 32, 0.56)';
            
            const href = item.getAttribute('href');
            const page = item.getAttribute('data-page');
            
            // Enhanced path matching for better navigation highlighting
            let isActive = false;
            if (href === currentPath) {
                isActive = true;
            } else if (page) {
                // Handle specific route patterns
                if (page === 'market-trends' && currentPath === '/market-trends') {
                    isActive = true;
                } else if (page === 'chat' && (currentPath === '/chat' || currentPath.includes('/messages'))) {
                    isActive = true;
                } else if (page === 'professional-verification' && currentPath === '/professional-verification') {
                    isActive = true;
                } else if (page === 'profile' && currentPath === '/profile') {
                    isActive = true;
                } else if (page === 'marketplace' && (currentPath === '/marketplace2' || currentPath === '/marketplace' || currentPath === '/')) {
                    isActive = true;
                } else if (page === 'admin-verification-review' && currentPath === '/admin/verification-review') {
                    isActive = true;
                }
            }
            
            if (isActive) {
                item.classList.add('active');
                item.style.background = 'rgba(36, 34, 32, 0.04)';
                item.style.color = '#242220';
                
                // If it's the marketplace/dashboard, show the submenu
                if (page === 'marketplace') {
                    this.showDashboardSubmenu();
                }
            }
        });
    }

    showDashboardSubmenu() {
        if (this.dashboardSubmenu && !this.isCollapsed) {
            this.dashboardSubmenu.style.display = 'block';
            this.dashboardSubmenu.style.opacity = '1';
        }
    }

    // Enhanced navigation with modern loading states
    handleNavigation(event, item) {
        const href = item.getAttribute('href');
        
        if (!href || href === '#') {
            event.preventDefault();
            return;
        }

        // Add modern loading state with glassmorphism effect
        item.classList.add('loading');
        item.style.background = 'rgba(204, 139, 139, 0.1)';
        
        // Create loading shimmer effect
        const shimmer = document.createElement('div');
        shimmer.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 1.5s infinite;
            pointer-events: none;
            z-index: 10;
        `;
        item.appendChild(shimmer);
        
        // Remove loading state after navigation (or timeout)
        setTimeout(() => {
            item.classList.remove('loading');
            item.style.background = '';
            shimmer.remove();
        }, 1000);

        // Close mobile sidebar on navigation
        if (this.isMobile) {
            this.closeMobileSidebar();
        }
    }

    setupDashboardSubmenu() {
        // Handle dashboard submenu visibility
        if (this.dashboardSubmenu) {
            // Show submenu when dashboard is active
            const dashboardLink = document.querySelector('[data-page="marketplace"]');
            if (dashboardLink && dashboardLink.classList.contains('active')) {
                this.dashboardSubmenu.style.display = 'block';
                this.dashboardSubmenu.style.opacity = '1';
            }
        }
    }

    setupDashboardToggle() {
        const dashboardLink = document.querySelector('[data-page="marketplace"]');
        const chevron = dashboardLink?.querySelector('.fa-chevron-down');
        
        if (dashboardLink && chevron) {
            dashboardLink.addEventListener('click', (e) => {
                // If clicking the chevron, toggle submenu instead of navigating
                if (e.target.closest('.fa-chevron-down')) {
                    e.preventDefault();
                    this.toggleDashboardSubmenu();
                }
            });
        }
    }

    toggleDashboardSubmenu() {
        if (!this.dashboardSubmenu) return;
        
        const isVisible = this.dashboardSubmenu.style.opacity === '1';
        const chevron = document.querySelector('[data-page="marketplace"] .fa-chevron-down');
        
        if (isVisible) {
            this.dashboardSubmenu.style.opacity = '0';
            setTimeout(() => {
                this.dashboardSubmenu.style.display = 'none';
            }, 200);
            chevron?.classList.replace('fa-chevron-down', 'fa-chevron-right');
        } else {
            this.dashboardSubmenu.style.display = 'block';
            setTimeout(() => {
                this.dashboardSubmenu.style.opacity = '1';
            }, 10);
            chevron?.classList.replace('fa-chevron-right', 'fa-chevron-down');
        }
    }

    setupMessageHandlers() {
        const messageItems = document.querySelectorAll('.message-item');
        messageItems.forEach(item => {
            item.addEventListener('click', () => {
                // Handle message item click - could open chat or navigate to conversation
                const userName = item.querySelector('span').textContent;
                console.log(`Opening conversation with ${userName}`);
                // Add your chat opening logic here
            });
        });
    }

    async handleSignOut() {
        // Load modern modal if not already loaded
        if (!window.ModernSignOutModal) {
            await this.loadModernModal();
        }
        
        // Show modern confirmation modal
        const confirmed = await ModernSignOutModal.confirm({
            title: 'Sign out of your account?',
            message: "You'll be safely signed out and redirected to our homepage. Your data will remain secure."
        });
        
        if (confirmed) {
            // Add loading state to sign out button
            this.signOutBtn.classList.add('loading');
            this.signOutBtn.disabled = true;
            
            // Make POST request to logout API endpoint
            fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include' // Include cookies
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Clear any client-side storage
                    try {
                        localStorage.removeItem('token');
                        localStorage.removeItem('userId');
                        localStorage.removeItem('user');
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('refreshToken');
                    } catch (error) {
                        console.log('Could not clear localStorage:', error);
                    }
                    
                    // Redirect to sign-out confirmation page
                    window.location.href = data.redirectTo || '/auth/logout';
                } else {
                    console.error('Logout failed:', data.message);
                    // Still redirect to logout page even if API fails
                    window.location.href = '/auth/logout';
                }
            })
            .catch(error => {
                console.error('Logout request failed:', error);
                // Still redirect to logout page even if request fails
                window.location.href = '/auth/logout';
            });
        }
    }
    
    async loadModernModal() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = '/js/modern-signout-modal.js';
            script.onload = resolve;
            script.onerror = resolve; // Continue even if fails to load
            document.head.appendChild(script);
        });
    }

    setupUnreadMessagesBadge() {
        // This would integrate with your chat system
        // For now, this is a placeholder for the functionality
        this.updateUnreadCount(0);
    }

    updateUnreadCount(count) {
        if (!this.chatBadge) return;
        
        if (count > 0) {
            this.chatBadge.textContent = count > 99 ? '99+' : count.toString();
            this.chatBadge.classList.remove('hidden');
        } else {
            this.chatBadge.classList.add('hidden');
        }
    }

    handleKeyboard(event) {
        // Alt + S to toggle sidebar
        if (event.altKey && event.key === 's') {
            event.preventDefault();
            if (this.isMobile) {
                this.toggleMobileSidebar();
            } else {
                this.toggleDesktopSidebar();
            }
        }
        
        // Alt + M to focus on messages
        if (event.altKey && event.key === 'm') {
            event.preventDefault();
            const firstMessage = document.querySelector('.message-item');
            firstMessage?.focus();
        }
        
        // Alt + D to toggle dashboard submenu
        if (event.altKey && event.key === 'd') {
            event.preventDefault();
            this.toggleDashboardSubmenu();
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 1024;
        
        if (wasMobile !== this.isMobile) {
            // Mobile/desktop state changed
            if (this.isMobile) {
                // Switched to mobile
                this.closeMobileSidebar();
                this.sidebar?.classList.remove('collapsed');
            } else {
                // Switched to desktop
                this.sidebar?.classList.remove('-translate-x-full');
                this.overlay?.classList.add('hidden');
                document.body.style.overflow = '';
                this.applySidebarState();
            }
        }
        
        this.adjustMainContent();
    }

    trapFocus() {
        if (!this.isMobile || !this.sidebar) return;
        
        const focusableElements = this.sidebar.querySelectorAll(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        firstElement?.focus();
        
        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement?.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement?.focus();
                    e.preventDefault();
                }
            }
        };
        
        document.addEventListener('keydown', handleTabKey);
        
        // Remove listener when sidebar closes
        const observer = new MutationObserver(() => {
            if (this.sidebar?.classList.contains('-translate-x-full')) {
                document.removeEventListener('keydown', handleTabKey);
                observer.disconnect();
            }
        });
        
        observer.observe(this.sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    getCollapsedState() {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    }

    saveCollapsedState() {
        localStorage.setItem('sidebar-collapsed', this.isCollapsed.toString());
    }

    // Public methods for external use
    collapse() {
        if (!this.isMobile) {
            this.isCollapsed = true;
            this.applySidebarState();
            this.saveCollapsedState();
        }
    }

    expand() {
        if (!this.isMobile) {
            this.isCollapsed = false;
            this.applySidebarState();
            this.saveCollapsedState();
        }
    }

    setUnreadMessages(count) {
        this.updateUnreadCount(count);
    }

    highlightNavItem(page) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
            item.style.background = '';
            item.style.color = 'rgba(36, 34, 32, 0.56)';
            
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
                item.style.background = 'rgba(36, 34, 32, 0.04)';
                item.style.color = '#242220';
                
                // If it's the marketplace/dashboard, show the submenu
                if (page === 'marketplace') {
                    this.showDashboardSubmenu();
                }
            }
        });
    }
}

// Initialize the sidebar when DOM is ready
let sidebarInstance;

function initializeUnifiedSidebar() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            sidebarInstance = new UnifiedSidebar();
        });
    } else {
        sidebarInstance = new UnifiedSidebar();
    }
}

// Auto-initialize
initializeUnifiedSidebar();

// Export for global access
window.UnifiedSidebar = UnifiedSidebar;
window.sidebarInstance = sidebarInstance;

// Utility functions for external use
window.toggleSidebar = () => sidebarInstance?.toggleDesktopSidebar();
window.setSidebarUnreadCount = (count) => sidebarInstance?.setUnreadMessages(count);
window.highlightSidebarNav = (page) => sidebarInstance?.highlightNavItem(page);