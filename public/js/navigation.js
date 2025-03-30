// Header scroll behavior
document.addEventListener('DOMContentLoaded', function() {
    // Header scroll effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 20) {
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
            const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            
            mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
            mobileMenuBtn.classList.toggle('open');
            mobileMenu.classList.toggle('hidden');
            
            // If menu is being opened, add open class
            if (!isExpanded) {
                mobileMenu.classList.add('open');
            } else {
                // If menu is being closed, remove open class
                mobileMenu.classList.remove('open');
            }
        });
    }

    // Mobile dropdown toggles
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
    
    mobileDropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // Find the dropdown content next to this toggle
            const dropdownContent = this.parentElement.nextElementSibling;
            
            // Toggle the hidden class
            dropdownContent.classList.toggle('hidden');
            
            // Rotate the arrow icon
            const arrowIcon = this.querySelector('svg');
            if (arrowIcon) {
                arrowIcon.style.transform = dropdownContent.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
            // Check if click is outside the mobile menu and the hamburger button
            if (!mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
                mobileMenu.classList.add('hidden');
                mobileMenu.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                mobileMenuBtn.classList.remove('open');
            }
        }
    });

    // Initialize - check if we need to add scrolled class on page load
    if (window.scrollY > 20) {
        header.classList.add('scrolled');
    }
});
