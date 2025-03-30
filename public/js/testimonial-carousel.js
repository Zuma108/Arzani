// Testimonial carousel functionality
document.addEventListener('DOMContentLoaded', function() {
    initAllTestimonialCarousels();
});

function initAllTestimonialCarousels() {
    // Find all testimonial wrapper sections
    const allCarousels = document.querySelectorAll('.testimonials-wrapper');
    
    if (!allCarousels.length) return;
    
    // Initialize each carousel separately
    allCarousels.forEach((carousel, index) => {
        const container = carousel.closest('.testimonials-scroll-container');
        if (!container) return;
        
        // Find the navigation buttons, using custom IDs if available
        let leftButton, rightButton;
        
        // Check for "buyers" specific buttons first
        if (container.querySelector('#scroll-left-buyers')) {
            leftButton = container.querySelector('#scroll-left-buyers');
            rightButton = container.querySelector('#scroll-right-buyers');
        } else {
            // Fall back to regular buttons
            leftButton = container.querySelector('#scroll-left');
            rightButton = container.querySelector('#scroll-right');
        }
        
        // Find testimonial cards and navigation dots
        const cards = carousel.querySelectorAll('.testimonial-card');
        const dots = container.querySelectorAll('.testimonial-dot');
        
        if (!cards.length) return;
        
        // Calculate the width of a single card including margins
        const getCardWidth = () => {
            if (!cards.length) return 0;
            
            const card = cards[0];
            const style = window.getComputedStyle(card);
            
            // Get the actual width and margins
            const width = card.offsetWidth;
            const marginLeft = parseInt(style.marginLeft) || 0;
            const marginRight = parseInt(style.marginRight) || 0;
            
            return width + marginLeft + marginRight;
        };
        
        // Initialize cards with animation
        cards.forEach((card, i) => {
            // Add animation class with delay for staggered effect
            setTimeout(() => {
                card.classList.add('animate-testimonial');
            }, i * 150);
        });
        
        // Set initial active dot
        if (dots.length) {
            dots[0].classList.add('active');
        }
        
        // Update active dot based on scroll position
        const updateActiveDot = () => {
            if (!dots.length) return;
            
            const scrollPos = carousel.scrollLeft;
            const cardWidth = getCardWidth();
            
            if (cardWidth === 0) return;
            
            // Calculate which card is most visible
            const activeIndex = Math.round(scrollPos / cardWidth);
            
            // Update the active dot
            dots.forEach((dot, i) => {
                if (i === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        };
        
        // Add click handlers for navigation buttons
        if (leftButton) {
            leftButton.addEventListener('click', function() {
                console.log('Left button clicked for carousel', index);
                const cardWidth = getCardWidth();
                
                // Scroll left by one card width
                carousel.scrollBy({
                    left: -cardWidth,
                    behavior: 'smooth'
                });
            });
        }
        
        if (rightButton) {
            rightButton.addEventListener('click', function() {
                console.log('Right button clicked for carousel', index);
                const cardWidth = getCardWidth();
                
                // Scroll right by one card width
                carousel.scrollBy({
                    left: cardWidth,
                    behavior: 'smooth'
                });
            });
        }
        
        // Handle dot navigation
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                const cardWidth = getCardWidth();
                
                // Scroll to the corresponding card
                carousel.scrollTo({
                    left: i * cardWidth,
                    behavior: 'smooth'
                });
                
                // Update active dot immediately
                dots.forEach((d, idx) => {
                    if (idx === i) {
                        d.classList.add('active');
                    } else {
                        d.classList.remove('active');
                    }
                });
            });
        });
        
        // Update active dot on scroll
        carousel.addEventListener('scroll', () => {
            updateActiveDot();
        });
        
        // Handle touch events for mobile swiping
        let touchStartX = 0;
        let touchEndX = 0;
        
        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        carousel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            
            // Calculate swipe distance
            const swipeDistance = touchEndX - touchStartX;
            
            // Handle swipe if it exceeds threshold
            if (Math.abs(swipeDistance) > 50) {
                const cardWidth = getCardWidth();
                
                if (swipeDistance < 0) {
                    // Swipe left - go to next card
                    carousel.scrollBy({
                        left: cardWidth,
                        behavior: 'smooth'
                    });
                } else {
                    // Swipe right - go to previous card
                    carousel.scrollBy({
                        left: -cardWidth,
                        behavior: 'smooth'
                    });
                }
            }
        }, { passive: true });
        
        // Set initial state
        updateActiveDot();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            // Re-calculate positions and update UI after resize
            setTimeout(updateActiveDot, 200);
        });
    });
}