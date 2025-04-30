// Header scroll behavior
document.addEventListener('DOMContentLoaded', function() {
  // Header scroll effect
  const header = document.querySelector('header');
  window.addEventListener('scroll', function() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function() {
      this.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      // Toggle body scroll lock if needed
      // document.body.classList.toggle('overflow-hidden');
    });
  }

  // Mobile dropdown toggles
  const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
  mobileDropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const content = this.closest('div').nextElementSibling; // Find the dropdown content div
      const icon = this.querySelector('svg');

      if (content.classList.contains('hidden')) {
        // Close other open dropdowns first
        document.querySelectorAll('.mobile-dropdown-content:not(.hidden)').forEach(openContent => {
          if (openContent !== content) {
            openContent.classList.add('hidden');
            openContent.style.maxHeight = null;
            const otherIcon = openContent.previousElementSibling.querySelector('.mobile-dropdown-toggle svg');
            if (otherIcon) {
              otherIcon.classList.remove('rotate-180');
            }
          }
        });

        // Open the clicked dropdown
        content.classList.remove('hidden');
        // Set max-height based on scrollHeight for smooth animation
        content.style.maxHeight = content.scrollHeight + "px";
        if (icon) icon.classList.add('rotate-180');
      } else {
        // Close the clicked dropdown
        content.classList.add('hidden');
        content.style.maxHeight = null; // Reset max-height
        if (icon) icon.classList.remove('rotate-180');
      }
    });
  });

  // Ensure dropdowns close when clicking outside (optional but good UX)
  document.addEventListener('click', function(event) {
    if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
      // Close all mobile dropdowns if click is outside menu and button
      document.querySelectorAll('.mobile-dropdown-content:not(.hidden)').forEach(openContent => {
        openContent.classList.add('hidden');
        openContent.style.maxHeight = null;
        const icon = openContent.previousElementSibling.querySelector('.mobile-dropdown-toggle svg');
        if (icon) {
          icon.classList.remove('rotate-180');
        }
      });
      // Close the main mobile menu if it's open
      if (mobileMenu.classList.contains('open')) {
        mobileMenuBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
      }
    }
  });

});
