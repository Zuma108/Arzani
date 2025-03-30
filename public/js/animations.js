// Animations.js - Core animation functions for Arzani Marketplace

document.addEventListener('DOMContentLoaded', function() {
    // Animate elements when they come into view
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('[data-animation]');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            // If element enters viewport
            if (elementPosition < windowHeight * 0.85) {
                element.classList.add('animated');
            }
        });
    };

    // Handle counting animations
    const initCounters = () => {
        const counters = document.querySelectorAll('[data-count-up]');
        
        counters.forEach(counter => {
            const target = parseFloat(counter.getAttribute('data-count-up'));
            const duration = parseInt(counter.getAttribute('data-duration')) || 2000;
            const decimal = parseInt(counter.getAttribute('data-decimal')) || 0;
            const countUp = new CountUp(counter, target, duration, decimal);
            
            const elementPosition = counter.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight) {
                countUp.start();
            } else {
                window.addEventListener('scroll', function scrollHandler() {
                    const elementPosition = counter.getBoundingClientRect().top;
                    if (elementPosition < windowHeight * 0.9) {
                        countUp.start();
                        window.removeEventListener('scroll', scrollHandler);
                    }
                });
            }
        });
    };

    // Initialize text typing animations
    const initTypingAnimations = () => {
        document.querySelectorAll('.typing-text').forEach(element => {
            const text = element.getAttribute('data-text') || "Buyers focus on consistent revenue growth (22%), customer retention rates (18%), scalable operations (15%), profit margins (14%), and market positioning (12%). Having proper documentation and proven growth strategies significantly increases valuation multiples.";
            
            let i = 0;
            const typingSpeed = 30; // Speed in milliseconds
            
            function typeWriter() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeWriter, typingSpeed);
                }
            }
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        typeWriter();
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(element);
        });
    };

    // Testimonials carousel functionality
    const initTestimonialCarousel = () => {
        const testimonialWrapper = document.querySelector('.testimonials-wrapper');
        const scrollLeftBtn = document.getElementById('scroll-left');
        const scrollRightBtn = document.getElementById('scroll-right');
        const dots = document.querySelectorAll('.testimonial-dot');
        const testimonialCards = document.querySelectorAll('.testimonial-card');
        
        if (!testimonialWrapper || !scrollLeftBtn || !scrollRightBtn) return;

        // Calculate card width with margin
        const getCardWidth = () => {
            if (window.innerWidth < 640) {
                return testimonialWrapper.offsetWidth; // Full width on mobile
            } else if (window.innerWidth < 1024) {
                return testimonialWrapper.offsetWidth / 2; // 2 cards on tablets
            } else {
                return testimonialWrapper.offsetWidth / 3; // 3 cards on desktop
            }
        };
        
        // Update active dot based on scroll position
        const updateActiveDot = () => {
            const scrollPosition = testimonialWrapper.scrollLeft;
            const cardWidth = getCardWidth();
            const activeIndex = Math.round(scrollPosition / cardWidth);
            
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === activeIndex);
            });
        };
        
        // Scroll to specific card
        const scrollToCard = (index) => {
            const cardWidth = getCardWidth();
            testimonialWrapper.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
            });
        };
        
        // Event listeners for buttons
        scrollLeftBtn.addEventListener('click', () => {
            const cardWidth = getCardWidth();
            testimonialWrapper.scrollBy({
                left: -cardWidth,
                behavior: 'smooth'
            });
        });
        
        scrollRightBtn.addEventListener('click', () => {
            const cardWidth = getCardWidth();
            testimonialWrapper.scrollBy({
                left: cardWidth,
                behavior: 'smooth'
            });
        });
        
        // Event listeners for dots
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                scrollToCard(index);
            });
        });
        
        // Update active dot when scrolling
        testimonialWrapper.addEventListener('scroll', () => {
            updateActiveDot();
        });
        
        // Handle resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const activeIndex = Array.from(dots).findIndex(dot => 
                    dot.classList.contains('active')
                );
                scrollToCard(activeIndex >= 0 ? activeIndex : 0);
            }, 200);
        });
        
        // Animate testimonial cards
        testimonialCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.15}s`;
            card.classList.add('animate-testimonial');
        });
        
        // Initialize first active dot
        dots[0].classList.add('active');
    };

    // CountUp animation class
    class CountUp {
        constructor(element, target, duration = 2000, decimals = 0) {
            this.element = element;
            this.startValue = 0;
            this.endValue = target;
            this.duration = duration;
            this.decimals = decimals;
            this.startTime = null;
        }
        
        easeOutQuart(t) {
            return 1 - Math.pow(1 - t, 4);
        }
        
        animate(timestamp) {
            if (!this.startTime) this.startTime = timestamp;
            const elapsed = timestamp - this.startTime;
            
            const progress = Math.min(elapsed / this.duration, 1);
            const easedProgress = this.easeOutQuart(progress);
            const currentValue = this.startValue + (this.endValue - this.startValue) * easedProgress;
            
            this.element.textContent = currentValue.toFixed(this.decimals);
            
            if (progress < 1) {
                requestAnimationFrame(this.animate.bind(this));
            } else {
                this.element.textContent = this.endValue.toFixed(this.decimals);
            }
        }
        
        start() {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    // Initialize animations
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);
    
    // Initialize testimonial carousel
    initTestimonialCarousel();
    
    // Initialize counters with delay
    setTimeout(initCounters, 500);
    
    // Initialize typing animations
    initTypingAnimations();

    // Animate elements with data-scroll-animation when they come into view
    const animateScrollElements = () => {
        const elements = document.querySelectorAll('[data-scroll-animation]');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementPosition < windowHeight * 0.85) {
                element.classList.add('animated');
            }
        });
    };
    
    animateScrollElements();
    window.addEventListener('scroll', animateScrollElements);
});

// Add extra animation effects if needed
const addParallaxEffect = () => {
    document.addEventListener('mousemove', (e) => {
        const parallaxElements = document.querySelectorAll('.parallax-effect');
        const mouseX = e.clientX / window.innerWidth - 0.5;
        const mouseY = e.clientY / window.innerHeight - 0.5;
        
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed') || 0.1);
            const x = mouseX * speed * 100;
            const y = mouseY * speed * 100;
            el.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
};

// Initialize once DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addParallaxEffect);
} else {
    addParallaxEffect();
}
