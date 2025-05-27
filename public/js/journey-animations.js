// Enhanced Journey Section Animations and Interactions
document.addEventListener('DOMContentLoaded', function() {
  // Initialize animation for journey cards when they come into view
  const journeyCards = document.querySelectorAll('.journey-card');
  const progressBars = document.querySelectorAll('.journey-progress-fill');
  const journeySection = document.querySelector('.journey-section');
  
  // Setup Intersection Observer with improved thresholds for better timing
  if ('IntersectionObserver' in window) {
    // Card animations with staggered timing
    const cardObserverOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -100px 0px"
    };
    
    const cardObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Staggered animation delay for each card
          setTimeout(() => {
            entry.target.classList.remove('journey-card-hidden');
            entry.target.classList.add('journey-card-visible');
          }, index * 150); // 150ms staggered delay between each card
          
          observer.unobserve(entry.target);
        }
      });
    }, cardObserverOptions);
    
    // Progress bar animations
    const progressObserverOptions = {
      threshold: 0.6,
      rootMargin: "0px"
    };
    
    const progressObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('animated');
          }, 300); // Slight delay for better visual effect
          
          observer.unobserve(entry.target);
        }
      });
    }, progressObserverOptions);
    
    // Section entry animation
    const sectionObserverOptions = {
      threshold: 0.1
    };
    
    const sectionObserver = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          journeySection.classList.add('section-visible');
        }
      });
    }, sectionObserverOptions);
    
    // Apply observers
    journeyCards.forEach((card, index) => {
      card.classList.add('journey-card-hidden');
      card.style.transitionDelay = `${index * 0.1}s`;
      cardObserver.observe(card);
    });
    
    progressBars.forEach(bar => {
      progressObserver.observe(bar);
    });
    
    if (journeySection) {
      sectionObserver.observe(journeySection);
    }
  } else {
    // Fallback for browsers that don't support Intersection Observer
    journeyCards.forEach(card => {
      card.classList.add('journey-card-visible');
    });
    
    progressBars.forEach(bar => {
      bar.classList.add('animated');
    });
  }
  
  // Enhanced hover and focus interactions
  journeyCards.forEach(card => {
    // Enhanced mouse interactions
    card.addEventListener('mouseenter', function() {
      // Add subtle particle effect or highlight when hovering
      this.querySelector('.journey-icon-container').classList.add('pulse-effect');
      
      // Animate the progress indicators
      const indicators = this.querySelectorAll('.journey-step-indicator');
      indicators.forEach((indicator, i) => {
        indicator.style.transition = `transform 0.3s ease ${i * 0.1}s, background-color 0.3s ease ${i * 0.1}s`;
        indicator.style.transform = 'scaleX(1.2)';
      });
    });
    
    card.addEventListener('mouseleave', function() {
      this.querySelector('.journey-icon-container').classList.remove('pulse-effect');
      
      // Reset indicators
      const indicators = this.querySelectorAll('.journey-step-indicator');
      indicators.forEach(indicator => {
        indicator.style.transform = 'scaleX(1)';
      });
    });
    
    // Improved accessibility with keyboard focus
    card.addEventListener('focusin', function() {
      this.classList.add('journey-card-focused');
      this.querySelector('.journey-icon-container').classList.add('pulse-effect');
    });
    
    card.addEventListener('focusout', function() {
      this.classList.remove('journey-card-focused');
      this.querySelector('.journey-icon-container').classList.remove('pulse-effect');
    });
    
    // Make the entire card clickable for better UX
    card.addEventListener('click', function() {
      // Find the first link within the card and click it
      const cardLink = this.querySelector('a');
      if (cardLink) {
        cardLink.click();
      }
    });
    
    // Keyboard accessibility enhancement
    card.addEventListener('keydown', function(e) {
      // Trigger click on Enter or Space
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const cardLink = this.querySelector('a');
        if (cardLink) {
          cardLink.click();
        }
      }
    });
  });
  
  // Create a subtle parallax effect for background elements
  if (journeySection) {
    const bgElements = journeySection.querySelectorAll('.bg-decoration-circle');
    
    window.addEventListener('scroll', function() {
      const scrollPosition = window.scrollY;
      const sectionTop = journeySection.offsetTop;
      const sectionHeight = journeySection.offsetHeight;
      
      // Check if section is in viewport
      if (scrollPosition > sectionTop - window.innerHeight && 
          scrollPosition < sectionTop + sectionHeight) {
        
        // Calculate how far through the section we've scrolled (0-1)
        const scrollProgress = (scrollPosition - (sectionTop - window.innerHeight)) / 
                               (sectionHeight + window.innerHeight);
        
        // Apply different parallax rates to each decoration circle
        bgElements.forEach((el, index) => {
          const parallaxRate = (index + 1) * 15; // Different rates for different elements
          const yOffset = (scrollProgress - 0.5) * parallaxRate;
          
          el.style.transform = `translateY(${yOffset}px)`;
        });
      }
    });
  }
  
  // Enhanced hover effect for CTA buttons
  const ctaButtons = document.querySelectorAll('.journey-cta-primary, .journey-cta-secondary');
  
  ctaButtons.forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
});
