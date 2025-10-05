/**
 * Glassmorphism Interactive Effects
 * Professional interactive enhancements for the glass UI system
 */

class GlassmorphismEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.setupInteractiveEffects();
        this.setupDynamicLighting();
        this.setupPerformanceOptimizations();
        this.setupAccessibilityFeatures();
    }

    /**
     * Setup interactive hover and focus effects
     */
    setupInteractiveEffects() {
        // Enhanced glass navigation items
        const navItems = document.querySelectorAll('.glass-nav-item');
        navItems.forEach(item => {
            this.addGlassInteraction(item);
        });

        // Enhanced glass buttons
        const buttons = document.querySelectorAll('.glass-button');
        buttons.forEach(button => {
            this.addButtonInteraction(button);
        });

        // Enhanced glass surfaces
        const surfaces = document.querySelectorAll('.glass-surface');
        surfaces.forEach(surface => {
            this.addSurfaceInteraction(surface);
        });
    }

    /**
     * Add sophisticated interaction effects to glass navigation items
     */
    addGlassInteraction(element) {
        let timeout;

        element.addEventListener('mouseenter', (e) => {
            clearTimeout(timeout);
            this.createRippleEffect(e.target, e);
            this.enhanceGlassEffect(e.target);
        });

        element.addEventListener('mouseleave', (e) => {
            timeout = setTimeout(() => {
                this.resetGlassEffect(e.target);
            }, 150);
        });

        element.addEventListener('focus', (e) => {
            this.enhanceGlassEffect(e.target);
            this.addFocusGlow(e.target);
        });

        element.addEventListener('blur', (e) => {
            this.resetGlassEffect(e.target);
            this.removeFocusGlow(e.target);
        });
    }

    /**
     * Add button-specific glass interactions
     */
    addButtonInteraction(button) {
        button.addEventListener('mousedown', (e) => {
            this.createPressEffect(e.target);
        });

        button.addEventListener('mouseup', (e) => {
            setTimeout(() => this.removePressEffect(e.target), 150);
        });

        button.addEventListener('mouseleave', (e) => {
            this.removePressEffect(e.target);
        });
    }

    /**
     * Add surface-level glass interactions
     */
    addSurfaceInteraction(surface) {
        surface.addEventListener('mouseenter', (e) => {
            this.addSurfaceGlow(e.target);
        });

        surface.addEventListener('mouseleave', (e) => {
            this.removeSurfaceGlow(e.target);
        });
    }

    /**
     * Create a subtle ripple effect on interaction
     */
    createRippleEffect(element, event) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const ripple = document.createElement('div');
        ripple.className = 'glass-ripple';
        ripple.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: radial-gradient(circle, hsla(212, 75%, 95%, 0.6) 0%, transparent 70%);
            border-radius: 50%;
            transform: translate(-50%, -50%) scale(0);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: glassRipple 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1;
        `;

        element.style.position = 'relative';
        element.appendChild(ripple);

        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    /**
     * Enhance glass effect on hover
     */
    enhanceGlassEffect(element) {
        element.style.setProperty('--glass-hover-enhance', '1');
        element.classList.add('glass-enhanced');
    }

    /**
     * Reset glass effect
     */
    resetGlassEffect(element) {
        element.style.removeProperty('--glass-hover-enhance');
        element.classList.remove('glass-enhanced');
    }

    /**
     * Add focus glow for accessibility
     */
    addFocusGlow(element) {
        element.classList.add('glass-focus-glow');
    }

    /**
     * Remove focus glow
     */
    removeFocusGlow(element) {
        element.classList.remove('glass-focus-glow');
    }

    /**
     * Create press effect for buttons
     */
    createPressEffect(button) {
        button.classList.add('glass-pressed');
        button.style.transform = 'translate3d(0, 1px, 0) scale(0.98)';
    }

    /**
     * Remove press effect
     */
    removePressEffect(button) {
        button.classList.remove('glass-pressed');
        button.style.transform = '';
    }

    /**
     * Add surface glow effect
     */
    addSurfaceGlow(surface) {
        surface.classList.add('glass-surface-glow');
    }

    /**
     * Remove surface glow effect  
     */
    removeSurfaceGlow(surface) {
        surface.classList.remove('glass-surface-glow');
    }

    /**
     * Setup dynamic lighting effects based on cursor position
     */
    setupDynamicLighting() {
        const sidebar = document.querySelector('.glass-sidebar');
        if (!sidebar) return;

        let animationId;

        sidebar.addEventListener('mousemove', (e) => {
            if (animationId) cancelAnimationFrame(animationId);
            
            animationId = requestAnimationFrame(() => {
                this.updateDynamicLighting(sidebar, e);
            });
        });

        sidebar.addEventListener('mouseleave', () => {
            if (animationId) cancelAnimationFrame(animationId);
            this.resetDynamicLighting(sidebar);
        });
    }

    /**
     * Update dynamic lighting based on cursor position
     */
    updateDynamicLighting(element, event) {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        element.style.setProperty('--glass-light-x', `${x}%`);
        element.style.setProperty('--glass-light-y', `${y}%`);
        element.classList.add('glass-dynamic-lighting');
    }

    /**
     * Reset dynamic lighting
     */
    resetDynamicLighting(element) {
        element.classList.remove('glass-dynamic-lighting');
        element.style.removeProperty('--glass-light-x');
        element.style.removeProperty('--glass-light-y');
    }

    /**
     * Setup performance optimizations
     */
    setupPerformanceOptimizations() {
        // Use intersection observer for glass effects
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        }

        // Debounce resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    /**
     * Setup intersection observer for performance
     */
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('glass-visible');
                } else {
                    entry.target.classList.remove('glass-visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        document.querySelectorAll('.glass-surface, .glass-nav-item, .glass-button').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * Handle resize events
     */
    handleResize() {
        // Reset any cached calculations or effects
        document.querySelectorAll('.glass-dynamic-lighting').forEach(el => {
            this.resetDynamicLighting(el);
        });
    }

    /**
     * Setup accessibility features
     */
    setupAccessibilityFeatures() {
        // Respect reduced motion preferences
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('glass-reduced-motion');
        }

        // Handle high contrast mode
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('glass-high-contrast');
        }

        // Setup keyboard navigation enhancements
        this.setupKeyboardNavigation();
    }

    /**
     * Setup enhanced keyboard navigation
     */
    setupKeyboardNavigation() {
        const focusableElements = document.querySelectorAll(
            '.glass-nav-item, .glass-button, .glass-surface[tabindex]'
        );

        focusableElements.forEach((element, index) => {
            element.addEventListener('keydown', (e) => {
                this.handleKeyboardNavigation(e, focusableElements, index);
            });
        });
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(event, elements, currentIndex) {
        let targetIndex = currentIndex;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                targetIndex = (currentIndex + 1) % elements.length;
                break;
            case 'ArrowUp':
                event.preventDefault();
                targetIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1;
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.activateElement(event.target);
                break;
        }

        if (targetIndex !== currentIndex) {
            elements[targetIndex].focus();
        }
    }

    /**
     * Activate element (for keyboard interaction)
     */
    activateElement(element) {
        if (element.tagName === 'A') {
            element.click();
        } else if (element.tagName === 'BUTTON') {
            element.click();
        }
    }
}

// CSS animations for glass effects
const glassAnimations = `
    @keyframes glassRipple {
        to {
            transform: translate(-50%, -50%) scale(12);
            opacity: 0;
        }
    }

    .glass-enhanced {
        --glass-enhancement: 1.2;
        filter: brightness(1.05) saturate(1.1);
    }

    .glass-focus-glow {
        box-shadow: 
            var(--glass-depth-2),
            0 0 0 2px hsla(var(--glass-primary-hue), 85%, 60%, 0.4),
            0 0 20px hsla(var(--glass-primary-hue), 85%, 60%, 0.2);
    }

    .glass-pressed {
        --glass-press-depth: 0.5;
        filter: brightness(0.95);
    }

    .glass-surface-glow {
        box-shadow: 
            var(--glass-depth-2),
            0 0 30px hsla(var(--glass-primary-hue), 75%, 85%, 0.3);
    }

    .glass-dynamic-lighting::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(
            200px circle at var(--glass-light-x, 50%) var(--glass-light-y, 50%),
            hsla(var(--glass-primary-hue), 75%, 95%, 0.1) 0%,
            transparent 60%
        );
        pointer-events: none;
        border-radius: inherit;
        opacity: 0;
        animation: glassDynamicFade 0.3s ease-out forwards;
    }

    @keyframes glassDynamicFade {
        to { opacity: 1; }
    }

    .glass-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
    }

    /* Reduced motion styles */
    .glass-reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
sms .95) !important;
        border: 2px solid currentColor !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
    }
`;

// Add CSS animations to document
const styleSheet = document.createElement('style');
styleSheet.textContent = glassAnimations;
document.head.appendChild(styleSheet);

// Initialize glassmorphism enhancer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GlassmorphismEnhancer();
    });
} else {
    new GlassmorphismEnhancer();
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlassmorphismEnhancer;
}