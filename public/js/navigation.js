/**
 * Navigation functionality for Arzani
 * Handles mobile menu, dropdowns, and scroll behaviors
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      mobileMenu.classList.toggle('hidden');
    });
  }
  
  // Header styling on scroll
  const header = document.querySelector('header');
  const blackLogo = document.querySelector('.logo-black');
  const whiteLogo = document.querySelector('.logo-white');
  const navLinks = document.querySelectorAll('.navbar__link, .navbar__drawer_trigger');
  const burgerLines = document.querySelectorAll('.burger-line');
  
  // Function to update navbar appearance based on scroll position
  function updateNavbarAppearance() {
    if (window.scrollY > 50) {
      // Scrolled state - dark background, white text
      header.classList.add('scrolled', 'bg-dark/80', 'backdrop-blur-md', 'border-b', 'border-gray-800');
      
      // Show white logo on dark background
      if (blackLogo && whiteLogo) {
        blackLogo.classList.add('hidden');
        whiteLogo.classList.remove('hidden');
      }
      
      // Set all nav links to white text
      navLinks.forEach(link => {
        link.classList.add('text-white');
        link.classList.remove('text-gray-900');
      });
      
      // Set burger lines to white
      burgerLines.forEach(line => {
        line.classList.add('bg-white');
        line.classList.remove('bg-gray-900');
      });
    } else {
      // Initial state - transparent background, dark text
      header.classList.remove('scrolled', 'bg-dark/80', 'backdrop-blur-md', 'border-b', 'border-gray-800');
      
      // Show black logo on transparent/white background
      if (blackLogo && whiteLogo) {
        blackLogo.classList.remove('hidden');
        whiteLogo.classList.add('hidden');
      }
      
      // Set all nav links to dark text
      navLinks.forEach(link => {
        link.classList.remove('text-white');
        link.classList.add('text-gray-900');
      });
      
      // Set burger lines to dark
      burgerLines.forEach(line => {
        line.classList.remove('bg-white');
        line.classList.add('bg-gray-900');
      });
    }
  }
  
  // Initialize navbar appearance on page load
  updateNavbarAppearance();
  
  // Listen for scroll events
  window.addEventListener('scroll', updateNavbarAppearance);
  
  // Close dropdown menus when clicking outside
  document.addEventListener('click', function(event) {
    const isDropdownTrigger = event.target.closest('.navbar__drawer_trigger');
    const isDropdownContent = event.target.closest('.navbar__drawer_dropdown');
    
    if (!isDropdownTrigger && !isDropdownContent) {
      // Force close all dropdowns by removing hover state
      const dropdowns = document.querySelectorAll('.navbar__drawer');
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('hover');
      });
    }
  });
  
  // Highlight active page in navigation
  const currentPath = window.location.pathname;
  const navigationLinks = document.querySelectorAll('.navbar__link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.startsWith(href) && href !== '/') {
      link.classList.add('text-primary');
      link.classList.add('font-medium');
      
      // Add active indicator line
      const indicatorEl = document.createElement('div');
      indicatorEl.className = 'absolute bottom-[-4px] left-0 w-full h-0.5 bg-primary';
      link.appendChild(indicatorEl);
    }
  });
});
