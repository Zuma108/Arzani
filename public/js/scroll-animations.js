// Scroll Animations - Handles animations triggered by scrolling

// Function to initialize scroll animations that can be called from other files
function initializeScrollAnimations() {
    // Improved scroll animation handler with IntersectionObserver
    const handleScrollAnimations = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -10% 0px'
        });

        document.querySelectorAll('[data-scroll-animation]').forEach(element => {
            observer.observe(element);
        });
    };
    
    // Enhanced mobile section reordering
    const handleMobileLayout = () => {
        const arzaniSection = document.querySelector('.talk-to-arzani-ai-section');
        const businessSection = document.querySelector('section:has(.business-intelligence)');
        
        if (arzaniSection && businessSection && window.innerWidth < 768) {
            const parent = businessSection.parentNode;
            parent.insertBefore(arzaniSection, businessSection.nextSibling);
        }
    };

    // Smooth parallax effect with performance optimization
    const applyParallaxEffect = () => {
        let ticking = false;
        const parallaxElements = document.querySelectorAll('.parallax-effect');
        
        window.addEventListener('mousemove', (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const mouseX = e.clientX / window.innerWidth - 0.5;
                    const mouseY = e.clientY / window.innerHeight - 0.5;
                    
                    parallaxElements.forEach(el => {
                        const speed = parseFloat(el.dataset.speed || 0.1);
                        const x = mouseX * speed * 100;
                        const y = mouseY * speed * 100;
                        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                    });
                    
                    ticking = false;
                });
                
                ticking = true;
            }
        });
    };

    // Enhanced testimonial animations
    const animateTestimonials = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animated');
                    }, index * 150); // Staggered animation delay
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -10% 0px'
        });

        document.querySelectorAll('.testimonial-card').forEach(card => {
            observer.observe(card);
        });
    };

    // Journey steps animation with progress tracking
    const animateJourneySteps = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    // Animate connecting lines between steps
                    const nextConnection = entry.target.nextElementSibling;
                    if (nextConnection?.classList.contains('journey-connection')) {
                        setTimeout(() => {
                            nextConnection.classList.add('animated');
                        }, 500);
                    }
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '-10% 0px'
        });

        document.querySelectorAll('.journey-step').forEach(step => {
            observer.observe(step);
        });
    };

    // Enhanced smooth scroll with dynamic offset calculation
    const setupSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const headerOffset = document.querySelector('header')?.offsetHeight || 0;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - headerOffset - 20;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // AI chat typing animation
    const animateChatTyping = () => {
        const messages = document.querySelectorAll('.chat-message:not(.animated)');
        
        messages.forEach((message, index) => {
            setTimeout(() => {
                message.classList.add('animated');
                message.style.opacity = '1';
                message.style.transform = 'translateY(0)';
            }, index * 1000);
        });
    };

    // Initialize all animations
    handleScrollAnimations();
    handleMobileLayout();
    applyParallaxEffect();
    animateTestimonials();
    animateJourneySteps();
    setupSmoothScroll();
    animateChatTyping();

    // Handle resize events efficiently with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            handleMobileLayout();
        }, 250);
    });
}

// Run animations on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeScrollAnimations();
});

// Make the function available globally
window.initializeScrollAnimations = initializeScrollAnimations;
