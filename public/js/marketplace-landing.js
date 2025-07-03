/**
 * Marketplace Landing Page JavaScript
 * Handles video background optimization and interactive features
 */

document.addEventListener('DOMContentLoaded', function() {
    // Video background optimization
    const heroVideo = document.getElementById('hero-video');
    
    if (heroVideo) {
        // Remove poster immediately to prevent the zoom effect
        heroVideo.removeAttribute('poster');
        
        // Check for mobile devices to potentially use a different video source or image
        const isMobile = window.innerWidth <= 768;
        
        // Ensure video playback works properly
        heroVideo.play().catch(error => {
            console.log('Auto-play was prevented by the browser:', error);
            
            // Add play button for browsers that block autoplay
            const playButton = document.createElement('button');
            playButton.className = 'video-play-button';
            playButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>';
            
            heroVideo.parentElement.appendChild(playButton);
            
            playButton.addEventListener('click', () => {
                heroVideo.play();
                playButton.style.display = 'none';
            });
        });
        
        // Video performance optimization
        if (isMobile) {
            heroVideo.setAttribute('preload', 'none');
        }
    }
    
    // Scroll animations
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    };
    
    // Initialize animations
    animateOnScroll();
    window.addEventListener('scroll', animateOnScroll);
    
    // Feature card hover effects
    const featureCards = document.querySelectorAll('.blue-glow-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            // Add active class to intensify glow effect
            this.classList.add('active');
        });
        
        card.addEventListener('mouseleave', function() {
            // Remove active class when not hovering
            this.classList.remove('active');
        });
    });
    
    // Stat counter animation
    const startCounters = () => {
        const counters = document.querySelectorAll('.stat-counter');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60 FPS
            
            let current = 0;
            const updateCounter = () => {
                current += increment;
                
                if (current < target) {
                    counter.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            };
            
            // Start animation when element is in viewport
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateCounter();
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(counter);
        });
    };

    // Animate search bar on load for emphasis
    const searchBar = document.querySelector('.search-bar-glow');
    if (searchBar) {
        // Initial state for animation
        searchBar.style.opacity = '0';
        searchBar.style.transform = 'scale(0.95)';
        searchBar.style.transition = 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        // Animate in after a short delay
        setTimeout(() => {
            searchBar.style.opacity = '1';
            searchBar.style.transform = 'scale(1)';
        }, 400); // Delay to sync with other hero animations
    }

    // Start stat counters when the section is visible
    startCounters();
    
    // Mobile menu functionality
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const expanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
            mobileMenuBtn.setAttribute('aria-expanded', !expanded);
            mobileMenu.classList.toggle('hidden');
            
            // Toggle burger menu animation
            mobileMenuBtn.classList.toggle('active');
        });
        
        // Mobile dropdown toggles
        const dropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
        
        dropdownToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const dropdownContent = this.parentElement.nextElementSibling;
                dropdownContent.classList.toggle('hidden');
                this.classList.toggle('active');
            });
        });
    }
    
    // Handle window resize events
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= 768;
        
        // Adjust video quality for mobile if needed
        if (heroVideo) {
            if (isMobile) {
                heroVideo.setAttribute('preload', 'none');
            } else {
                heroVideo.setAttribute('preload', 'metadata');
            }
        }
    });
    
    // Enhanced Search Bar Functionality
    initializeSearchBar();
    
    // Animated Search Bar Logic (if any is needed in the future, e.g., for dynamic suggestions)
    const searchInput = document.querySelector('input[name="query"]');
    const searchForm = document.querySelector('.animated-search-border + form');

    if (searchInput && searchForm) {
        searchInput.addEventListener('focus', () => {
            document.querySelector('.animated-search-border').style.animationPlayState = 'running';
        });

        searchInput.addEventListener('blur', () => {
            // Optional: pause animation when not focused to save resources
            // document.querySelector('.animated-search-border').style.animationPlayState = 'paused';
        });

        searchForm.addEventListener('submit', (e) => {
            if (searchInput.value.trim() === '') {
                e.preventDefault();
                // Optional: add a shake animation or a tooltip to indicate input is required
                searchForm.classList.add('shake-animation');
                setTimeout(() => {
                    searchForm.classList.remove('shake-animation');
                }, 500);
            }
        });
    }
});

/**
 * Initialize Enhanced Search Bar Features
 */
function initializeSearchBar() {
    const searchInput = document.getElementById('search-input');
    const filtersToggle = document.getElementById('filters-toggle');
    const filtersPanel = document.getElementById('filters-panel');
    const suggestionsDropdown = document.getElementById('suggestions-dropdown');
    const searchTags = document.querySelectorAll('.search-tag');
    
    // Toggle filters panel
    if (filtersToggle && filtersPanel) {
        filtersToggle.addEventListener('click', (e) => {
            e.preventDefault();
            filtersPanel.classList.toggle('hidden');
            
            // Update button icon rotation
            const icon = filtersToggle.querySelector('svg');
            if (filtersPanel.classList.contains('hidden')) {
                icon.style.transform = 'rotate(0deg)';
            } else {
                icon.style.transform = 'rotate(180deg)';
            }
        });
    }
    
    // Search input enhancements
    if (searchInput) {
        let searchTimeout;
        
        // Auto-suggestions on input
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    showSearchSuggestions(query);
                }, 300);
            } else {
                hideSuggestions();
            }
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.relative')) {
                hideSuggestions();
            }
        });
        
        // Focus effects
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.classList.add('ring-2', 'ring-blue-500');
        });
        
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                searchInput.parentElement.classList.remove('ring-2', 'ring-blue-500');
            }, 200);
        });
    }
    
    // Search tags functionality
    searchTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const searchTerm = tag.getAttribute('data-search');
            if (searchInput) {
                searchInput.value = searchTerm;
                searchInput.focus();
                // Trigger search form submission
                const form = searchInput.closest('form');
                if (form) {
                    // Update the form action to ensure it goes to /marketplace2
                    form.action = '/marketplace2';
                    form.submit();
                }
            }
        });
    });
}

/**
 * Show search suggestions dropdown
 */
function showSearchSuggestions(query) {
    const suggestionsDropdown = document.getElementById('suggestions-dropdown');
    if (!suggestionsDropdown) return;
    
    // Sample suggestions - in a real app, these would come from an API
    const suggestions = [
        { text: 'SaaS companies in London', type: 'industry' },
        { text: 'E-commerce businesses £1M+', type: 'revenue' },
        { text: 'Technology startups', type: 'industry' },
        { text: 'Restaurants in Manchester', type: 'location' },
        { text: 'Healthcare services', type: 'industry' },
        { text: 'Manufacturing companies', type: 'industry' }
    ].filter(suggestion => 
        suggestion.text.toLowerCase().includes(query.toLowerCase())
    );
    
    if (suggestions.length > 0) {
        const suggestionsHTML = suggestions.map(suggestion => 
            `<div class="suggestion-item px-6 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between border-b border-gray-100 last:border-b-0" data-suggestion="${suggestion.text}">
                <div class="flex items-center">
                    <svg class="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span class="text-gray-800">${suggestion.text}</span>
                </div>
                <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">${suggestion.type}</span>
            </div>`
        ).join('');
        
        suggestionsDropdown.innerHTML = suggestionsHTML;
        suggestionsDropdown.classList.remove('hidden');
        
        // Add click handlers to suggestions
        suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const suggestionText = item.getAttribute('data-suggestion');
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = suggestionText;
                    hideSuggestions();
                    // Trigger search
                    const form = searchInput.closest('form');
                    if (form) {
                        // Update the form action to ensure it goes to /marketplace2
                        form.action = '/marketplace2';
                        form.submit();
                    }
                }
            });
        });
    } else {
        hideSuggestions();
    }
}

/**
 * Hide search suggestions dropdown
 */
function hideSuggestions() {
    const suggestionsDropdown = document.getElementById('suggestions-dropdown');
    if (suggestionsDropdown) {
        suggestionsDropdown.classList.add('hidden');
    }
}
