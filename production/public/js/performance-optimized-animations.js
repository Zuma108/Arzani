// Performance-optimized scroll animations with preloading
// This script optimizes the animation loading for heavy sections

document.addEventListener('DOMContentLoaded', function() {
    // Force-show sections after a timeout to prevent black sections
    setTimeout(() => {
        const allSections = document.querySelectorAll('section');
        allSections.forEach(section => {
            if (!section.classList.contains('animated')) {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
                
                // Make sure all inner content is visible too
                const animatedElements = section.querySelectorAll('[data-scroll-animation], [data-section-animation], [data-animation]');
                animatedElements.forEach(el => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                });
            }
        });
    }, 2000); // Force display after 2 seconds max
    
    // Preload journey section and feature section
    const preloadSections = () => {
        const journeySection = document.querySelector('.journey-section');
        const featuresSection = document.querySelector('#features-section');
        
        if (journeySection) {
            // Ensure journey section becomes visible with minimal animation
            journeySection.style.willChange = 'opacity, transform';
            journeySection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Preload any images in the journey section
            const journeyImages = journeySection.querySelectorAll('img');
            journeyImages.forEach(img => {
                if (img.dataset.src) {
                    const preloadImg = new Image();
                    preloadImg.src = img.dataset.src;
                    preloadImg.onload = () => {
                        img.src = img.dataset.src;
                    };
                }
            });
        }
        
        if (featuresSection) {
            // Ensure features section becomes visible with minimal animation
            featuresSection.style.willChange = 'opacity, transform';
            featuresSection.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }
    };
    
    // Call preload function
    preloadSections();
    
    // Optimize intersection observer threshold and margins
    const optimizeObservers = () => {
        // Create a single optimized observer for all sections
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    
                    // Make section visible immediately
                    section.style.opacity = '1';
                    section.style.transform = 'translateY(0)';
                    section.classList.add('animated');
                    
                    // Staggered animation for children with minimal delay
                    const animatedChildren = section.querySelectorAll('[data-scroll-animation], [data-animation]');
                    animatedChildren.forEach((child, index) => {
                        setTimeout(() => {
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0)';
                            child.classList.add('animated');
                        }, index * 50); // Very short delay between elements
                    });
                    
                    // Don't unobserve - allow re-animation when scrolling back
                }
            });
        }, {
            threshold: 0.1, // Lower threshold to start animations earlier
            rootMargin: '0px 0px -5% 0px' // Adjusted root margin
        });
        
        // Observe all major sections, especially those with loading issues
        document.querySelectorAll('section').forEach(section => {
            sectionObserver.observe(section);
        });
    };
    
    // Run optimized observers after a short delay
    setTimeout(optimizeObservers, 100);
});
