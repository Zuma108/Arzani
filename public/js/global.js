/**
 * Global JavaScript functionality for the entire site
 * This file should NOT include any chat-specific code
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize common UI elements
    initializeNavigation();
    initializeDropdowns();
    setupProfileMenu();
    
    // Check authentication status for relevant pages
    if (window.Auth) {
        window.Auth.checkAuthStatus();
    }
});

/**
 * Initialize main navigation
 */
function initializeNavigation() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('mobileOverlay');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            this.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', function() {
            if (navLinks) navLinks.classList.remove('active');
            overlay.classList.remove('active');
            if (mobileMenuBtn) mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        });
    }
}

/**
 * Initialize dropdown menus
 */
function initializeDropdowns() {
    // Find all dropdown toggles
    const dropdownToggles = document.querySelectorAll('[data-dropdown-toggle]');
    
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const targetId = this.getAttribute('data-dropdown-toggle');
            const target = document.getElementById(targetId);
            
            if (target) {
                target.classList.toggle('hidden');
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu:not(.hidden)').forEach(menu => {
            menu.classList.add('hidden');
        });
    });
}

/**
 * Setup user profile menu
 */
function setupProfileMenu() {
    const userMenuButton = document.getElementById('userMenuButton');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        
        document.addEventListener('click', function(e) {
            if (!userMenuButton.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
}
