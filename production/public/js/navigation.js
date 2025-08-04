/**
 * Navigation functionality for Arzani
 * Handles mobile menu, dropdowns, and scroll behaviors
 */

document.addEventListener('DOMContentLoaded', function() {
  const header = document.querySelector('header.header-transparent'); // More specific selector
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const blackLogo = document.querySelector('.navbar__logo img[src*="black"]'); // Assuming black logo exists or adjust selector
  const whiteLogo = document.querySelector('.navbar__logo img[src*="white"]'); // Assuming white logo exists
  const navLinks = document.querySelectorAll('.navbar__link, .navbar__drawer_trigger span'); // Target the span for text color
  const burgerLines = document.querySelectorAll('.burger-line');
  const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');

  // --- Mobile Menu Toggle (Combined Logic) ---
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      const isOpening = mobileMenu.classList.contains('hidden');
      this.setAttribute('aria-expanded', isOpening);
      this.classList.toggle('open', isOpening); // Add 'open' class for burger animation if needed
      mobileMenu.classList.toggle('hidden', !isOpening);
      mobileMenu.classList.toggle('open', isOpening); // Add 'open' class for potential styling

      // Optional: Lock body scroll when mobile menu is open
      // document.body.classList.toggle('overflow-hidden', isOpening);

      // Close any open mobile dropdowns when closing the main menu
      if (!isOpening) {
        closeAllMobileDropdowns();
      }
    });
  }

  // --- Mobile Dropdown Toggles ---
  mobileDropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const content = this.closest('div').nextElementSibling; // Find the dropdown content div
      const icon = this.querySelector('svg');
      const isOpening = content.classList.contains('hidden');

      // Close other open dropdowns first
      closeAllMobileDropdowns(content); // Pass current content to exclude it

      // Toggle the clicked dropdown
      content.classList.toggle('hidden', !isOpening);
      if (isOpening) {
        // Set max-height based on scrollHeight for smooth animation
        content.style.maxHeight = content.scrollHeight + "px";
        if (icon) icon.classList.add('rotate-180'); // Add rotation class
      } else {
        content.style.maxHeight = null; // Reset max-height
        if (icon) icon.classList.remove('rotate-180'); // Remove rotation class
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
    if (!header) return; // Exit if header not found

    const isScrolled = window.scrollY > 50;
    header.classList.toggle('scrolled', isScrolled);
    // Add background/blur classes based on scroll - adjust classes as needed for your design
    header.classList.toggle('bg-dark/90', isScrolled); // Example: Dark background when scrolled
    header.classList.toggle('backdrop-blur-md', isScrolled);
    header.classList.toggle('border-b', isScrolled);
    header.classList.toggle('border-gray-800', isScrolled);

    // Logo visibility (assuming you have both and want to switch)
    if (blackLogo && whiteLogo) {
        // Keep white logo visible when scrolled or on dark background pages
        // Adjust logic if initial state needs black logo
        // whiteLogo.classList.toggle('hidden', !isScrolled);
        // blackLogo.classList.toggle('hidden', isScrolled);
    }

    // Text color - Keep white text as default for dark theme
    navLinks.forEach(link => {
        // Example: Change color only if needed, otherwise keep default white
        // link.classList.toggle('text-gray-300', !isScrolled); // Lighter gray when not scrolled?
        // link.classList.toggle('text-white', isScrolled);
    });

    // Burger lines color - Keep white as default for dark theme
    burgerLines.forEach(line => {
        // line.classList.toggle('bg-gray-300', !isScrolled); // Lighter gray when not scrolled?
        // line.classList.toggle('bg-white', isScrolled);
    });
  }

  // Initialize navbar appearance on page load
  updateNavbarAppearance();

  // Listen for scroll events
  window.addEventListener('scroll', updateNavbarAppearance);

  // --- Click Outside Logic ---
  document.addEventListener('click', function(event) {
    // Close Desktop Dropdowns
    const isDesktopDropdownTrigger = event.target.closest('.navbar__drawer_trigger');
    const isDesktopDropdownContent = event.target.closest('.navbar__drawer_dropdown');
    if (!isDesktopDropdownTrigger && !isDesktopDropdownContent) {
      const desktopDropdowns = document.querySelectorAll('.navbar__drawer.group'); // Use group selector
      desktopDropdowns.forEach(dropdown => {
         // We rely on hover, so removing a class might not be needed unless JS controls visibility
         // If JS controls visibility: dropdown.querySelector('.navbar__drawer_dropdown').classList.add('invisible', 'opacity-0');
      });
    }

    // Close Mobile Menu & Dropdowns
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) { // Check if mobile menu is open
        if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            mobileMenuBtn.classList.remove('open');
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('open');
            // document.body.classList.remove('overflow-hidden'); // Unlock scroll
            closeAllMobileDropdowns(); // Close all dropdowns within mobile menu
        }
    }
  });

  // --- Highlight Active Page ---
  const currentPath = window.location.pathname;
  const allNavLinks = document.querySelectorAll('a.navbar__link, .mobile-dropdown-content a'); // Include mobile links

  allNavLinks.forEach(link => {
    const href = link.getAttribute('href');
    // Exact match or startsWith for parent sections, avoid highlighting '/' unless it's the only match
    if (href && (currentPath === href || (href !== '/' && currentPath.startsWith(href)))) {
        // Add active styling - adjust classes as needed
        link.classList.add('text-primary', 'font-semibold'); // Example active classes
        link.classList.remove('text-gray-300'); // Ensure it overrides default gray if necessary

        // Optional: Add active indicator for desktop links
        if (link.matches('.navbar__link span')) { // Check if it's a desktop link span container
            const parentAnchor = link.closest('a.navbar__link');
            if (parentAnchor && !parentAnchor.querySelector('.active-indicator')) {
                const indicatorEl = document.createElement('div');
                indicatorEl.className = 'active-indicator absolute bottom-[-4px] left-0 w-full h-0.5 bg-primary'; // Unique class
                parentAnchor.style.position = 'relative'; // Ensure parent is relative
                parentAnchor.appendChild(indicatorEl);
            }
        }
    }
  });
});
