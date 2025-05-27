// AI Hero Section Animations
// Enhanced animations for metrics dashboard with progress bars

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations when page loads
    initializeHeroAnimations();
    
    // Initialize intersection observer for scroll-triggered animations
    setupScrollAnimations();
});

function initializeHeroAnimations() {
    // Add initial opacity and transform to animated elements
    const animatedElements = document.querySelectorAll('[data-animation]');
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.willChange = 'transform, opacity';
        
        // Set initial transform based on animation type
        const animationType = element.getAttribute('data-animation');
        switch(animationType) {
            case 'fade-in-up':
                element.style.transform = 'translateY(30px)';
                break;
            case 'fade-in-left':
            case 'slide-in-left':
                element.style.transform = 'translateX(-30px)';
                break;
            case 'fade-in-right':
            case 'slide-in-right':
                element.style.transform = 'translateX(30px)';
                break;
            case 'slide-in-up':
                element.style.transform = 'translateY(20px)';
                break;
        }
    });
    
    // Trigger animations with delays
    setTimeout(() => {
        triggerHeroAnimations();
    }, 100);
}

function triggerHeroAnimations() {
    const animatedElements = document.querySelectorAll('[data-animation]');
    
    animatedElements.forEach(element => {
        const delay = element.getAttribute('data-delay') || 0;
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translate(0, 0)';
            element.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Add CSS animation class
            element.classList.add('animate-in');
        }, parseInt(delay));
    });
    
    // Trigger progress bar animations after other elements are visible
    setTimeout(() => {
        animateProgressBars();
    }, 1200);
}

function animateProgressBars() {
    const progressBars = document.querySelectorAll('.metric-progress-bar[data-target-width]');
    
    progressBars.forEach((bar, index) => {
        const targetWidth = bar.getAttribute('data-target-width');
        
        // Add staggered delay for each progress bar
        setTimeout(() => {
            bar.style.width = targetWidth;
            
            // Add a subtle bounce effect when animation completes
            setTimeout(() => {
                bar.style.transform = 'scaleX(1.02)';
                setTimeout(() => {
                    bar.style.transform = 'scaleX(1)';
                }, 150);
            }, 2000);
            
        }, index * 200); // 200ms delay between each bar
    });
}

function setupScrollAnimations() {
    // Create intersection observer for scroll-triggered animations
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                
                // Trigger animation for elements that come into view
                if (element.classList.contains('ai-hero-section')) {
                    // Re-trigger animations if user scrolls back up
                    triggerHeroAnimations();
                }
                
                // Add enhanced hover effects when section is visible
                enhanceInteractivity(element);
            }
        });
    }, observerOptions);
    
    // Observe the hero section
    const heroSection = document.querySelector('.ai-hero-section');
    if (heroSection) {
        observer.observe(heroSection);
    }
}

function enhanceInteractivity(section) {
    // Add enhanced interactions for metrics cards
    const metricCards = section.querySelectorAll('.metrics-dashboard > div');
    
    metricCards.forEach(card => {
        // Add subtle animation on hover
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Pulse the progress bar
            const progressBar = this.querySelector('.metric-progress-bar');
            if (progressBar) {
                progressBar.style.filter = 'brightness(1.1)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            
            // Reset progress bar
            const progressBar = this.querySelector('.metric-progress-bar');
            if (progressBar) {
                progressBar.style.filter = 'brightness(1)';
            }
        });
    });
    
    // Add interactive chart animations
    enhanceChartInteractivity(section);
}

function enhanceChartInteractivity(section) {
    const chart = section.querySelector('.chart-animation');
    if (!chart) return;
    
    // Animate chart elements on load
    const chartLine = chart.querySelector('.chart-line');
    const dataPoints = chart.querySelectorAll('circle:not(.search-cursor)');
    const searchCursor = chart.querySelector('.search-cursor');
    
    if (chartLine) {
        // Animate the chart line drawing
        const pathLength = chartLine.getTotalLength();
        chartLine.style.strokeDasharray = pathLength;
        chartLine.style.strokeDashoffset = pathLength;
        
        setTimeout(() => {
            chartLine.style.transition = 'stroke-dashoffset 2s ease-in-out';
            chartLine.style.strokeDashoffset = '0';
        }, 800);
    }
    
    // Animate data points appearing
    dataPoints.forEach((point, index) => {
        setTimeout(() => {
            point.style.opacity = '1';
            point.style.transform = 'scale(1)';
            point.style.transition = 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, 1200 + (index * 100));
    });
    
    // Animate search cursor moving along the chart
    if (searchCursor) {
        animateSearchCursor(searchCursor);
    }
}

function animateSearchCursor(cursor) {
    // Define key points along the chart path
    const keyPoints = [
        {x: 0, y: 150},
        {x: 100, y: 120},
        {x: 200, y: 180},
        {x: 300, y: 80},
        {x: 400, y: 20},
        {x: 500, y: 100},
        {x: 600, y: 60},
        {x: 700, y: 90},
        {x: 800, y: 40}
    ];
    
    let currentIndex = 0;
    
    function moveToNextPoint() {
        if (currentIndex < keyPoints.length) {
            const point = keyPoints[currentIndex];
            cursor.setAttribute('cx', point.x);
            cursor.setAttribute('cy', point.y);
            
            // Add a subtle scale animation
            cursor.style.transform = 'scale(1.2)';
            setTimeout(() => {
                cursor.style.transform = 'scale(1)';
            }, 200);
            
            currentIndex++;
            
            // Move to next point after delay
            setTimeout(moveToNextPoint, 600);
        } else {
            // Reset and start over
            setTimeout(() => {
                currentIndex = 0;
                moveToNextPoint();
            }, 2000);
        }
    }
    
    // Add transition for smooth movement
    cursor.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Start the animation
    setTimeout(moveToNextPoint, 1500);
}

// Enhanced CSS animations via JavaScript
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            animation-fill-mode: forwards;
        }
        
        .metric-progress-bar {
            transform-origin: left center;
        }
        
        .chart-line {
            filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2));
        }
        
        .search-cursor {
            filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4));
        }
        
        .ai-insight-overlay {
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        
        @keyframes chartLineGlow {
            0%, 100% { filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.2)); }
            50% { filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.4)); }
        }
        
        .chart-line:hover {
            animation: chartLineGlow 2s ease-in-out infinite;
        }
    `;
    document.head.appendChild(style);
}

// Initialize dynamic styles
addDynamicStyles();
