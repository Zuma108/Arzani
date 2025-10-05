/**
 * Tailwind Glassmorphism Enhancer for Featured Experts
 * Specialized glassmorphism effects using Tailwind CSS utilities
 * Designed specifically for Featured Expert cards in the marketplace
 */

class TailwindGlassmorphismEnhancer {
    constructor(options = {}) {
        this.options = {
            autoInit: true,
            enableAnimations: true,
            enableHoverEffects: true,
            enableFocusEffects: true,
            animationDuration: 300,
            ...options
        };

        this.selectors = {
            expertCard: '.expert-card',
            expertAvatar: '.expert-avatar',
            expertBtn: '.expert-btn',
            expertPromoCard: '.expert-promo-card',
            expertsCarousel: '.experts-carousel-container',
            featuredExpertsSection: '.featured-experts-section',
            specializationTag: '.specialization-tag',
            carouselNavBtn: '.carousel-nav-btn'
        };

        this.glassTailwindClasses = {
            // Base glass effects using Tailwind arbitrary values
            glassLight: [
                'bg-white/10',
                'backdrop-blur-[12px]',
                'border',
                'border-white/20',
                'shadow-lg',
                'shadow-blue-500/10'
            ],
            glassMedium: [
                'bg-white/15',
                'backdrop-blur-[20px]',
                'border',
                'border-white/25',
                'shadow-xl',
                'shadow-blue-500/20'
            ],
            glassHeavy: [
                'bg-white/20',
                'backdrop-blur-[40px]',
                'border',
                'border-white/30',
                'shadow-2xl',
                'shadow-blue-500/30'
            ],
            // Interactive states
            glassHover: [
                'hover:bg-white/25',
                'hover:border-white/40',
                'hover:shadow-2xl',
                'hover:shadow-blue-500/25',
                'hover:-translate-y-1',
                'hover:scale-[1.02]'
            ],
            glassFocus: [
                'focus:bg-white/25',
                'focus:border-blue-400/60',
                'focus:shadow-2xl',
                'focus:shadow-blue-500/40',
                'focus:outline-none',
                'focus:ring-2',
                'focus:ring-blue-400/30'
            ],
            // Animations and transitions
            glassAnimation: [
                'transition-all',
                'duration-300',
                'ease-out',
                'transform-gpu'
            ]
        };

        if (this.options.autoInit) {
            this.init();
        }
    }

    /**
     * Initialize the glassmorphism enhancer
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.enhance());
        } else {
            this.enhance();
        }

        this.setupObservers();
        this.setupEventListeners();
    }

    /**
     * Main enhancement method
     */
    enhance() {
        this.enhanceExpertCards();
        this.enhanceCarouselContainer();
        this.enhanceNavigationButtons();
        this.enhancePromoCard();
        this.enhanceSpecializationTags();
        this.enhanceSection();
    }

    /**
     * Enhance individual expert cards with glassmorphism effects
     */
    enhanceExpertCards() {
        const expertCards = document.querySelectorAll(this.selectors.expertCard);
        
        expertCards.forEach((card, index) => {
            // Add staggered animation delay
            const delay = index * 100;
            
            // Base glass effect
            this.addClasses(card, [
                ...this.glassTailwindClasses.glassMedium,
                ...this.glassTailwindClasses.glassAnimation,
                ...this.glassTailwindClasses.glassHover,
                'rounded-2xl',
                'relative',
                'overflow-hidden',
                'group',
                `animation-delay-[${delay}ms]`
            ]);

            // Add enhanced glass background overlay
            this.addGlassOverlay(card, 'expert-glass-overlay');

            // Enhance avatar with glass frame
            this.enhanceExpertAvatar(card);

            // Enhance buttons within the card
            this.enhanceExpertButtons(card);

            // Add subtle glow effect on hover
            this.addHoverGlowEffect(card);

            // Add micro-interaction ripple effect
            this.addRippleEffect(card);
        });
    }

    /**
     * Enhance expert avatar with glass frame effect
     */
    enhanceExpertAvatar(card) {
        const avatar = card.querySelector(this.selectors.expertAvatar);
        if (!avatar) return;

        this.addClasses(avatar, [
            'relative',
            'rounded-full',
            'ring-2',
            'ring-white/30',
            'shadow-lg',
            'shadow-blue-500/20',
            'transition-all',
            'duration-300',
            'group-hover:ring-white/50',
            'group-hover:shadow-blue-500/40',
            'group-hover:scale-105'
        ]);

        // Add subtle glass rim effect
        const glassRim = document.createElement('div');
        glassRim.className = this.buildClassString([
            'absolute',
            'inset-0',
            'rounded-full',
            'bg-gradient-to-br',
            'from-white/20',
            'via-transparent',
            'to-blue-500/10',
            'pointer-events-none',
            'opacity-60',
            'group-hover:opacity-100',
            'transition-opacity',
            'duration-300'
        ]);
        
        avatar.style.position = 'relative';
        avatar.appendChild(glassRim);
    }

    /**
     * Enhance expert buttons with glass effects
     */
    enhanceExpertButtons(card) {
        const buttons = card.querySelectorAll(this.selectors.expertBtn);
        
        buttons.forEach(button => {
            // Determine button style based on existing classes
            const isOutline = button.classList.contains('expert-btn-outline');
            const buttonClasses = isOutline ? 
                [...this.glassTailwindClasses.glassLight] :
                [...this.glassTailwindClasses.glassMedium];

            this.addClasses(button, [
                ...buttonClasses,
                ...this.glassTailwindClasses.glassAnimation,
                ...this.glassTailwindClasses.glassFocus,
                'rounded-lg',
                'hover:bg-white/30',
                'hover:-translate-y-0.5',
                'hover:shadow-lg',
                'hover:shadow-blue-500/25',
                'active:translate-y-0',
                'active:scale-95',
                'relative',
                'overflow-hidden'
            ]);

            // Add button shine effect
            this.addButtonShineEffect(button);
        });
    }

    /**
     * Enhance specialization tags with subtle glass effect
     */
    enhanceSpecializationTags() {
        const tags = document.querySelectorAll(this.selectors.specializationTag);
        
        tags.forEach(tag => {
            this.addClasses(tag, [
                ...this.glassTailwindClasses.glassLight,
                'rounded-full',
                'px-3',
                'py-1',
                'text-xs',
                'font-medium',
                'text-white/90',
                'transition-all',
                'duration-200',
                'hover:bg-white/20',
                'hover:text-white',
                'hover:scale-105',
                'cursor-default'
            ]);
        });
    }

    /**
     * Enhance the carousel container
     */
    enhanceCarouselContainer() {
        const carousel = document.querySelector(this.selectors.expertsCarousel);
        if (!carousel) return;

        this.addClasses(carousel, [
            'relative',
            'overflow-x-auto',
            'overflow-y-hidden',
            'scrollbar-none',
            '-webkit-scrollbar-none',
            'scroll-smooth',
            'flex',
            'gap-6',
            'p-4'
        ]);

        // Add subtle glass background
        this.addClasses(carousel, [
            'bg-gradient-to-r',
            'from-transparent',
            'via-white/5',
            'to-transparent',
            'backdrop-blur-[8px]',
            'rounded-xl',
            'border',
            'border-white/10'
        ]);
    }

    /**
     * Enhance navigation buttons
     */
    enhanceNavigationButtons() {
        const navButtons = document.querySelectorAll(this.selectors.carouselNavBtn);
        
        navButtons.forEach(button => {
            this.addClasses(button, [
                ...this.glassTailwindClasses.glassMedium,
                ...this.glassTailwindClasses.glassAnimation,
                ...this.glassTailwindClasses.glassFocus,
                'rounded-full',
                'w-12',
                'h-12',
                'flex',
                'items-center',
                'justify-center',
                'text-white/80',
                'hover:text-white',
                'hover:bg-white/25',
                'hover:scale-110',
                'active:scale-95',
                'disabled:opacity-50',
                'disabled:cursor-not-allowed',
                'disabled:hover:scale-100'
            ]);
        });
    }

    /**
     * Enhance promo card with special glass effect
     */
    enhancePromoCard() {
        const promoCard = document.querySelector(this.selectors.expertPromoCard);
        if (!promoCard) return;

        this.addClasses(promoCard, [
            ...this.glassTailwindClasses.glassHeavy,
            ...this.glassTailwindClasses.glassAnimation,
            'rounded-2xl',
            'relative',
            'overflow-hidden',
            'border-2',
            'border-blue-400/30',
            'bg-gradient-to-br',
            'from-blue-500/20',
            'via-white/15',
            'to-purple-500/20',
            'hover:border-blue-400/50',
            'hover:-translate-y-2',
            'hover:shadow-2xl',
            'hover:shadow-blue-500/30',
            'group'
        ]);

        // Add animated gradient background
        this.addAnimatedGradient(promoCard);

        // Enhance CTA button within promo card
        const ctaButton = promoCard.querySelector('.promo-cta-btn');
        if (ctaButton) {
            this.addClasses(ctaButton, [
                'bg-gradient-to-r',
                'from-blue-600',
                'to-blue-700',
                'hover:from-blue-700',
                'hover:to-blue-800',
                'text-white',
                'font-semibold',
                'py-3',
                'px-6',
                'rounded-lg',
                'shadow-lg',
                'shadow-blue-500/25',
                'transition-all',
                'duration-300',
                'hover:scale-105',
                'hover:shadow-xl',
                'hover:shadow-blue-500/40',
                'active:scale-95'
            ]);
        }
    }

    /**
     * Enhance the main section container
     */
    enhanceSection() {
        const section = document.querySelector(this.selectors.featuredExpertsSection);
        if (!section) return;

        this.addClasses(section, [
            'relative',
            'py-8',
            'px-6',
            'rounded-3xl',
            'bg-gradient-to-br',
            'from-slate-900/40',
            'via-slate-800/30',
            'to-slate-900/40',
            'backdrop-blur-[60px]',
            'border',
            'border-white/10',
            'shadow-2xl',
            'shadow-slate-900/20'
        ]);

        // Add section header enhancement
        const header = section.querySelector('.featured-experts-header');
        if (header) {
            this.addClasses(header, [
                'text-3xl',
                'font-bold',
                'text-transparent',
                'bg-clip-text',
                'bg-gradient-to-r',
                'from-white',
                'via-blue-200',
                'to-white',
                'mb-8',
                'text-center'
            ]);
        }
    }

    /**
     * Add glass overlay effect to elements
     */
    addGlassOverlay(element, className = 'glass-overlay') {
        const overlay = document.createElement('div');
        overlay.className = this.buildClassString([
            'absolute',
            'inset-0',
            'bg-gradient-to-br',
            'from-white/5',
            'via-transparent',
            'to-blue-500/5',
            'pointer-events-none',
            'opacity-0',
            'group-hover:opacity-100',
            'transition-opacity',
            'duration-300',
            className
        ]);
        
        element.appendChild(overlay);
    }

    /**
     * Add hover glow effect
     */
    addHoverGlowEffect(element) {
        const glowElement = document.createElement('div');
        glowElement.className = this.buildClassString([
            'absolute',
            '-inset-1',
            'bg-gradient-to-r',
            'from-blue-500/20',
            'via-purple-500/20',
            'to-blue-500/20',
            'rounded-2xl',
            'blur-lg',
            'opacity-0',
            'group-hover:opacity-100',
            'transition-opacity',
            'duration-500',
            '-z-10'
        ]);
        
        element.appendChild(glowElement);
    }

    /**
     * Add ripple effect on click
     */
    addRippleEffect(element) {
        element.addEventListener('click', (e) => {
            if (!this.options.enableAnimations) return;

            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('div');
            ripple.className = this.buildClassString([
                'absolute',
                'w-4',
                'h-4',
                'bg-white/30',
                'rounded-full',
                'pointer-events-none',
                'animate-ping'
            ]);
            
            ripple.style.left = x - 8 + 'px';
            ripple.style.top = y - 8 + 'px';
            
            element.appendChild(ripple);
            
            setTimeout(() => {
                if (ripple.parentNode) {
                    ripple.parentNode.removeChild(ripple);
                }
            }, 600);
        });
    }

    /**
     * Add button shine effect
     */
    addButtonShineEffect(button) {
        const shine = document.createElement('div');
        shine.className = this.buildClassString([
            'absolute',
            'inset-0',
            'bg-gradient-to-r',
            'from-transparent',
            'via-white/20',
            'to-transparent',
            'transform',
            'translate-x-[-100%]',
            'hover:translate-x-[100%]',
            'transition-transform',
            'duration-1000',
            'pointer-events-none'
        ]);
        
        button.appendChild(shine);
    }

    /**
     * Add animated gradient background
     */
    addAnimatedGradient(element) {
        const gradient = document.createElement('div');
        gradient.className = this.buildClassString([
            'absolute',
            'inset-0',
            'bg-gradient-to-br',
            'from-blue-500/10',
            'via-purple-500/10',
            'to-pink-500/10',
            'animate-pulse',
            'opacity-50',
            'group-hover:opacity-75',
            'transition-opacity',
            'duration-500',
            '-z-10'
        ]);
        
        element.appendChild(gradient);
    }

    /**
     * Setup intersection observer for performance
     */
    setupObservers() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('glass-visible');
                        this.animateInView(entry.target);
                    } else {
                        entry.target.classList.remove('glass-visible');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });

            // Observe all enhanced elements
            setTimeout(() => {
                document.querySelectorAll(this.selectors.expertCard).forEach(el => {
                    observer.observe(el);
                });
            }, 100);
        }
    }

    /**
     * Animate elements when they come into view
     */
    animateInView(element) {
        if (!this.options.enableAnimations) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 50);
    }

    /**
     * Setup event listeners for dynamic enhancements
     */
    setupEventListeners() {
        // Listen for new expert cards being added dynamically
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && node.matches(this.selectors.expertCard)) {
                                this.enhanceExpertCards();
                            } else if (node.querySelector && node.querySelector(this.selectors.expertCard)) {
                                this.enhanceExpertCards();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Handle reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.options.enableAnimations = false;
            document.body.classList.add('glass-reduced-motion');
        }

        // Handle high contrast preference
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('glass-high-contrast');
        }
    }

    /**
     * Utility method to add classes to an element
     */
    addClasses(element, classes) {
        if (!element || !classes) return;
        
        const classString = this.buildClassString(classes);
        element.className = element.className ? 
            `${element.className} ${classString}` : 
            classString;
    }

    /**
     * Build class string from array
     */
    buildClassString(classes) {
        return Array.isArray(classes) ? 
            classes.filter(Boolean).join(' ') : 
            classes;
    }

    /**
     * Public method to refresh enhancements
     */
    refresh() {
        this.enhance();
    }

    /**
     * Public method to destroy enhancements
     */
    destroy() {
        // Remove added classes and elements
        // This would be implemented based on specific needs
        console.log('TailwindGlassmorphismEnhancer destroyed');
    }
}

// Add required CSS for Tailwind utilities that might not be included
const tailwindGlassStyles = `
<style>
/* Ensure backdrop-filter support and scrollbar hiding */
.scrollbar-none::-webkit-scrollbar {
    display: none;
}

.scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
}

/* Enhanced glass effects */
.glass-visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
}

/* Reduced motion support */
.glass-reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
}

/* High contrast support */
.glass-high-contrast .expert-card,
.glass-high-contrast .expert-btn {
    background: rgba(255, 255, 255, 0.95) !important;
    border: 2px solid currentColor !important;
    backdrop-filter: none !important;
}

/* Transform GPU optimization */
.transform-gpu {
    transform: translate3d(0, 0, 0);
}

/* Animation delays */
.animation-delay-0 { animation-delay: 0ms; }
.animation-delay-100 { animation-delay: 100ms; }
.animation-delay-200 { animation-delay: 200ms; }
.animation-delay-300 { animation-delay: 300ms; }
.animation-delay-400 { animation-delay: 400ms; }
.animation-delay-500 { animation-delay: 500ms; }
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', tailwindGlassStyles);

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TailwindGlassmorphismEnhancer;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize with a small delay to ensure Featured Experts are loaded
        setTimeout(() => {
            window.tailwindGlassEnhancer = new TailwindGlassmorphismEnhancer({
                autoInit: true,
                enableAnimations: true,
                enableHoverEffects: true,
                enableFocusEffects: true
            });
        }, 800); // Delay to ensure Featured Experts cards are created
    });
} else {
    // Initialize immediately if DOM is already ready
    setTimeout(() => {
        window.tailwindGlassEnhancer = new TailwindGlassmorphismEnhancer({
            autoInit: true,
            enableAnimations: true,
            enableHoverEffects: true,
            enableFocusEffects: true
        });
    }, 800);
}