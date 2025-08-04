/**
 * Mobile Navbar Fix for Production
 * Ensures mobile dropdown menu is always visible with proper styling
 * Handles logo switching for mobile white background
 */

document.addEventListener('DOMContentLoaded', function() {
  // Function to handle logo switching
  function handleLogoSwitch() {
    const header = document.querySelector('.header-light');
    const whiteLogo = document.querySelector('.navbar-logo-white');
    const blackLogo = document.querySelector('.navbar-logo-black');
    
    if (!header || !whiteLogo || !blackLogo) return;
    
    const isMobile = window.innerWidth <= 1023;
    const hasWhiteBackground = header.classList.contains('mobile-scrolled') || 
                               header.classList.contains('mobile-menu-open');
    
    if (isMobile && hasWhiteBackground) {
      // Show black logo on white background
      whiteLogo.style.display = 'none';
      blackLogo.style.display = 'block';
    } else {
      // Show white logo on transparent/dark background
      whiteLogo.style.display = 'block';
      blackLogo.style.display = 'none';
    }
  }
  // Function to force mobile menu visibility
  function forceMobileMenuVisibility() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;
    
    // Apply forced styles
    mobileMenu.style.backgroundColor = '#ffffff';
    mobileMenu.style.border = '2px solid #e5e7eb';
    mobileMenu.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.15)';
    
    // Ensure all links are visible
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
      link.style.color = '#1f2937';
      link.style.fontWeight = '600';
      link.style.display = 'block';
      link.style.textShadow = 'none';
      link.style.webkitTextFillColor = '#1f2937';
      
      // Add hover effects
      link.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#f3f4f6';
        this.style.color = '#3b82f6';
      });
      
      link.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
        this.style.color = '#1f2937';
      });
    });
  }
  
  // Override the mobile menu toggle to ensure visibility and handle logo
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    // Add additional click handler with forced styling and logo switching
    mobileMenuBtn.addEventListener('click', function() {
      setTimeout(() => {
        if (!mobileMenu.classList.contains('hidden')) {
          forceMobileMenuVisibility();
        }
        // Handle logo switch after menu state change
        handleLogoSwitch();
      }, 50);
    });
    
    // Mutation observer to watch for class changes
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!mobileMenu.classList.contains('hidden')) {
            forceMobileMenuVisibility();
          }
          // Handle logo switch on any class change
          handleLogoSwitch();
        }
      });
    });
    
    observer.observe(mobileMenu, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Also observe header class changes for scrolled state
    const header = document.querySelector('.header-light');
    if (header) {
      const headerObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            handleLogoSwitch();
          }
        });
      });
      
      headerObserver.observe(header, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }
  
  // Additional check on window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 1023 && mobileMenu && !mobileMenu.classList.contains('hidden')) {
      forceMobileMenuVisibility();
    }
    // Always handle logo switch on resize
    handleLogoSwitch();
  });
  
  // Handle scroll events for logo switching
  window.addEventListener('scroll', function() {
    // Small delay to allow navbar classes to update
    setTimeout(handleLogoSwitch, 10);
  });
  
  // Initial checks
  if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
    forceMobileMenuVisibility();
  }
  handleLogoSwitch();
  
  // Debug function - can be called from console
  window.debugMobileMenu = function() {
    const menu = document.getElementById('mobileMenu');
    const header = document.querySelector('.header-light');
    const whiteLogo = document.querySelector('.navbar-logo-white');
    const blackLogo = document.querySelector('.navbar-logo-black');
    
    if (menu) {
      menu.classList.add('debug-mobile-menu');
      console.log('Mobile menu debug styles applied');
      console.log('Menu element:', menu);
      console.log('Menu links:', menu.querySelectorAll('a'));
    }
    
    console.log('Header classes:', header?.className);
    console.log('White logo display:', whiteLogo?.style.display || 'default');
    console.log('Black logo display:', blackLogo?.style.display || 'default');
    console.log('Window width:', window.innerWidth);
    console.log('Is mobile:', window.innerWidth <= 1023);
  };
  
  // Production diagnostic
  console.log('Mobile navbar fix with logo switching loaded');
  if (mobileMenu) {
    console.log('Mobile menu found:', mobileMenu);
  } else {
    console.warn('Mobile menu not found');
  }
  
  const whiteLogo = document.querySelector('.navbar-logo-white');
  const blackLogo = document.querySelector('.navbar-logo-black');
  console.log('White logo found:', !!whiteLogo);
  console.log('Black logo found:', !!blackLogo);
});
