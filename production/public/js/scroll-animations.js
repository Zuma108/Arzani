// Enhanced Scroll Animations - Comprehensive animations for every section
// Handles animations triggered by scrolling with enhanced effects and performance

// Function to initialize scroll animations that can be called from other files
function initializeScrollAnimations() {    // Enhanced scroll animation handler with multiple animation types
    const handleScrollAnimations = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const animationType = element.dataset.scrollAnimation || 'fadeInUp';
                    const delay = parseInt(element.dataset.animationDelay) || 0;
                    const stagger = element.dataset.stagger;
                    
                    // Apply main animation
                    setTimeout(() => {
                        element.classList.add('animated', `animate-${animationType}`);
                        
                        // Handle count-up animations
                        if (element.dataset.countUp) {
                            animateCountUp(element);
                        }
                        
                        // Handle progress bars
                        if (element.dataset.progress) {
                            animateProgressBar(element);
                        }
                        
                        // Handle staggered child animations
                        if (stagger) {
                            animateStaggeredChildren(element, parseInt(stagger));
                        }
                    }, delay);
                    
                    // Unobserve after animation to prevent re-triggering
                    observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -5% 0px'
        });

        // Observe all elements with scroll animation attributes
        document.querySelectorAll('[data-scroll-animation]').forEach(element => {
            observer.observe(element);
        });
    };

    // Enhanced count-up animation function
    const animateCountUp = (element) => {
        const target = parseInt(element.dataset.countUp || element.textContent);
        const duration = parseInt(element.dataset.duration || '2000');
        const startTime = Date.now();
        
        const updateCount = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(progress * target);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateCount);
            } else {
                element.textContent = target;
            }
        };
        
        requestAnimationFrame(updateCount);
    };

    // Enhanced progress bar animation function
    const animateProgressBar = (element) => {
        const targetWidth = element.dataset.progress || '100';
        const duration = parseInt(element.dataset.progressDuration || '1500');
        
        element.style.transition = `width ${duration}ms ease-out`;
        element.style.width = targetWidth + '%';
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
    };    // AI chat typing animation
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

    // Enhanced staggered children animation
    const animateStaggeredChildren = (container, delay = 100) => {
        const children = container.children;
        Array.from(children).forEach((child, index) => {
            setTimeout(() => {
                child.classList.add('animated');
                child.style.opacity = '1';
                child.style.transform = 'translateY(0) scale(1)';
            }, index * delay);
        });
    };

    // Hero section enhanced animations
    const animateHeroSection = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const heroElements = entry.target.querySelectorAll('[data-hero-animation]');
                    
                    heroElements.forEach((element, index) => {
                        const animationType = element.dataset.heroAnimation;
                        const delay = parseInt(element.dataset.animationDelay) || (index * 200);
                        
                        setTimeout(() => {
                            element.classList.add('animated', `animate-${animationType}`);
                        }, delay);
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px'
        });

        const heroSection = document.querySelector('#hero-section, .hero-section');
        if (heroSection) {
            observer.observe(heroSection);
        }
    };

    // FAQ section accordion animations
    const animateFAQSection = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const faqItems = entry.target.querySelectorAll('.faq-item');
                    
                    faqItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('animated');
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -20% 0px'
        });

        const faqSection = document.querySelector('#faq-section, .faq-section');
        if (faqSection) {
            observer.observe(faqSection);
        }
    };

    // Footer entrance animation
    const animateFooter = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const footerElements = entry.target.querySelectorAll('[data-footer-animation]');
                    
                    footerElements.forEach((element, index) => {
                        setTimeout(() => {
                            element.classList.add('animated');
                            element.style.opacity = '1';
                            element.style.transform = 'translateY(0)';
                        }, index * 150);
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px'
        });

        const footer = document.querySelector('footer');
        if (footer) {
            observer.observe(footer);
        }
    };

    // Advanced scroll progress indicator
    const createScrollProgressIndicator = () => {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-indicator';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, #007bff, #00d4ff);
            z-index: 9999;
            transition: width 0.1s ease-out;
        `;
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (window.scrollY / windowHeight) * 100;
            progressBar.style.width = scrolled + '%';
        });
    };

    // Enhanced section reveal animations with intersection ratios
    const animateSectionReveals = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
                    const section = entry.target;
                    const animationType = section.dataset.sectionAnimation || 'slideInUp';
                    
                    section.classList.add('animated', `animate-${animationType}`);
                    
                    // Animate section headers
                    const headers = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    headers.forEach((header, index) => {
                        setTimeout(() => {
                            header.classList.add('animated');
                            header.style.opacity = '1';
                            header.style.transform = 'translateY(0)';
                        }, 200 + (index * 100));
                    });
                    
                    // Animate section content
                    const content = section.querySelectorAll('p, .card, .feature');
                    content.forEach((element, index) => {
                        setTimeout(() => {
                            element.classList.add('animated');
                            element.style.opacity = '1';
                            element.style.transform = 'translateY(0)';
                        }, 400 + (index * 150));
                    });
                    
                    observer.unobserve(section);
                }
            });
        }, {
            threshold: [0.2, 0.5],
            rootMargin: '0px 0px -10% 0px'
        });

        document.querySelectorAll('section[data-section-animation]').forEach(section => {
            observer.observe(section);
        });
    };

    // Magnetic cursor effect for interactive elements
    const addMagneticEffect = () => {
        const magneticElements = document.querySelectorAll('.magnetic-effect');
        
        magneticElements.forEach(element => {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                element.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translate(0, 0)';
            });
        });
    };    // Initialize all animations
    handleScrollAnimations();
    handleMobileLayout();
    applyParallaxEffect();
    animateTestimonials();
    animateJourneySteps();
    setupSmoothScroll();
    animateChatTyping();
    animateHeroSection();
    animateFAQSection();
    animateFooter();
    // createScrollProgressIndicator(); // Disabled: Removed scroll progress bar as requested
    animateSectionReveals();
    addMagneticEffect();
    
    // Feature card grid animations
    const animateFeatureGrid = () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                    
                    // Animate child feature cards with staggered delay
                    const featureCards = entry.target.querySelectorAll('.feature-card');
                    featureCards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animated');
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 150 * index);
                    });
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -10% 0px'
        });

        // Observe the grid container
        const featureGrids = document.querySelectorAll('#features-section .grid');
        featureGrids.forEach(grid => {
            observer.observe(grid);
        });
        
        // Add keyboard navigation for accessibility
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Trigger click or expand functionality as needed
                    card.click();
                }
            });
        });
    };
    
    animateFeatureGrid();

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
