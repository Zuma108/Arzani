/**
 * Navigation functionality for Arzani Light Navbar
 * Handles mobile menu, dropdowns, and scroll behaviors for light theme navbar
 */

document.addEventListener('DOMContentLoaded', function() {
  const header = document.querySelector('header.header-light');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const navLinks = document.querySelectorAll('.navbar__link, .navbar__drawer_trigger span');
  const burgerLines = document.querySelectorAll('.burger-line');
  const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');

  // --- Mobile Menu Toggle ---
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      const isOpening = mobileMenu.classList.contains('hidden');
      this.setAttribute('aria-expanded', isOpening);
      this.classList.toggle('open', isOpening);
      mobileMenu.classList.toggle('hidden', !isOpening);
      mobileMenu.classList.toggle('open', isOpening);

      // Close any open mobile dropdowns when closing the main menu
      if (!isOpening) {
        closeAllMobileDropdowns();
      }
    });
  }

  // --- Mobile Dropdown Toggles ---
  mobileDropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const content = this.closest('div').nextElementSibling;
      const icon = this.querySelector('svg');
      const isOpening = content.classList.contains('hidden');

      // Close other open dropdowns first
      closeAllMobileDropdowns(content);

      // Toggle the clicked dropdown
      content.classList.toggle('hidden', !isOpening);
      if (isOpening) {
        content.style.maxHeight = content.scrollHeight + "px";
        if (icon) icon.classList.add('rotate-180');
      } else {
        content.style.maxHeight = null;
        if (icon) icon.classList.remove('rotate-180');
      }
    });
  });

  function closeAllMobileDropdowns(excludeContent = null) {
    document.querySelectorAll('.mobile-dropdown-content:not(.hidden)').forEach(openContent => {
      if (openContent !== excludeContent) {
        openContent.classList.add('hidden');
        openContent.style.maxHeight = null;
        const otherIcon = openContent.previousElementSibling.querySelector('.mobile-dropdown-toggle svg');
        if (otherIcon) {
          otherIcon.classList.remove('rotate-180');
        }
      }
    });
  }

  // --- Header Styling on Scroll ---
  function updateNavbarAppearance() {
    if (!header) return;

    const heroSection = document.querySelector('.hero-section-video');
    const heroHeight = heroSection ? heroSection.offsetHeight : window.innerHeight;
    const scrollY = window.scrollY;
    
    // Hide navbar when scrolling past the hero section
    if (scrollY > heroHeight - 100) { // 100px buffer before hero section ends
      header.style.transform = 'translateY(-100%)';
      header.style.opacity = '0';
    } else {
      header.style.transform = 'translateY(0)';
      header.style.opacity = '1';
      
      // Apply scrolled styling for background changes within hero section
      const isScrolled = scrollY > 30;
      header.classList.toggle('scrolled', isScrolled);
    }
  }

  // Initialize navbar appearance on page load
  updateNavbarAppearance();

  // Listen for scroll events with throttling for better performance
  let ticking = false;
  function throttledScrollHandler() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateNavbarAppearance();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', throttledScrollHandler);

  // --- Click Outside Logic ---
  document.addEventListener('click', function(event) {
    // Close Desktop Dropdowns
    const isDesktopDropdownTrigger = event.target.closest('.navbar__drawer_trigger');
    const isDesktopDropdownContent = event.target.closest('.navbar__drawer_dropdown');
    
    if (!isDesktopDropdownTrigger && !isDesktopDropdownContent) {
      // Force close any manually opened dropdowns (if JS controls them)
      const desktopDropdowns = document.querySelectorAll('.navbar__drawer_dropdown');
      desktopDropdowns.forEach(dropdown => {
        dropdown.classList.add('invisible', 'opacity-0');
        dropdown.classList.remove('visible', 'opacity-100');
      });
    }

    // Close Mobile Menu & Dropdowns
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.classList.remove('open');
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('open');
        closeAllMobileDropdowns();
      }
    }
  });

  // --- Smooth Dropdown Hover Effects (Desktop) ---
  const desktopDropdowns = document.querySelectorAll('.navbar__drawer.group');
  desktopDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.navbar__drawer_trigger');
    const content = dropdown.querySelector('.navbar__drawer_dropdown');
    
    if (trigger && content) {
      let timeoutId;
      
      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId);
        content.classList.remove('invisible', 'opacity-0');
        content.classList.add('visible', 'opacity-100');
      });
      
      dropdown.addEventListener('mouseleave', () => {
        timeoutId = setTimeout(() => {
          content.classList.add('invisible', 'opacity-0');
          content.classList.remove('visible', 'opacity-100');
        }, 150); // Small delay to prevent flickering
      });
    }
  });

  // --- Highlight Active Page ---
  const currentPath = window.location.pathname;
  const allNavLinks = document.querySelectorAll('a.navbar__link, .mobile-dropdown-content a');

  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath === href || (href !== '/' && currentPath.startsWith(href)))) {
      // Add active styling
      const textElement = link.querySelector('span') || link;
      textElement.classList.add('text-primary', 'font-semibold');
      
      // Optional: Add active indicator for desktop links
      if (link.matches('.navbar__link') && !link.querySelector('.active-indicator')) {
        const indicatorEl = document.createElement('div');
        indicatorEl.className = 'active-indicator absolute bottom-[-2px] left-0 w-full h-0.5 bg-blue-600';
        link.style.position = 'relative';
        link.appendChild(indicatorEl);
      }
    }
  });

  // --- Accessibility Improvements ---
  
  // Keyboard navigation for dropdowns
  desktopDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.navbar__drawer_trigger');
    const links = dropdown.querySelectorAll('.navbar__link');
    
    if (trigger) {
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const content = dropdown.querySelector('.navbar__drawer_dropdown');
          const isVisible = content.classList.contains('visible');
          
          if (isVisible) {
            content.classList.add('invisible', 'opacity-0');
            content.classList.remove('visible', 'opacity-100');
          } else {
            content.classList.remove('invisible', 'opacity-0');
            content.classList.add('visible', 'opacity-100');
            // Focus first link
            const firstLink = content.querySelector('.navbar__link');
            if (firstLink) firstLink.focus();
          }
        }
      });
    }
  });

  // Focus management for mobile menu
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        mobileMenuBtn.click();
      }
    });
  }

  // Escape key to close menus
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close desktop dropdowns
      const openDropdowns = document.querySelectorAll('.navbar__drawer_dropdown.visible');
      openDropdowns.forEach(dropdown => {
        dropdown.classList.add('invisible', 'opacity-0');
        dropdown.classList.remove('visible', 'opacity-100');
      });
      
      // Close mobile menu
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.classList.remove('open');
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('open');
        closeAllMobileDropdowns();
        mobileMenuBtn.focus();
      }
    }
  });
});
