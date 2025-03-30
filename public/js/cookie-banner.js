document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const cookieConsent = document.getElementById('cookieConsent');
    const cookieClose = document.getElementById('cookieClose');
    const cookieAcceptAll = document.getElementById('cookieAcceptAll');
    const cookieAcceptSelected = document.getElementById('cookieAcceptSelected');
    const analyticsCookies = document.getElementById('analyticsCookies');
    const marketingCookies = document.getElementById('marketingCookies');
    
    // Check if user has already set cookie preferences
    const cookiePreferences = getCookie('arzani_cookie_preferences');
    
    // If no preferences are set, show the cookie consent popup after a short delay
    if (!cookiePreferences) {
        setTimeout(() => {
            if (cookieConsent) {
                cookieConsent.classList.remove('hidden');
                cookieConsent.classList.add('cookie-slide-up');
                
                // Set max height based on screen size
                adjustCookieConsentHeight();
            }
        }, 1500); // 1.5 second delay for better user experience
    } else {
        try {
            // Parse the saved preferences and apply them
            const preferences = JSON.parse(cookiePreferences);
            if (analyticsCookies && preferences.analytics) {
                analyticsCookies.checked = true;
                const toggleBg = analyticsCookies.parentElement.querySelector('.toggle-bg');
                if (toggleBg) {
                    toggleBg.classList.add('toggle-active');
                }
            }
            if (marketingCookies && preferences.marketing) {
                marketingCookies.checked = true;
                const toggleBg = marketingCookies.parentElement.querySelector('.toggle-bg');
                if (toggleBg) {
                    toggleBg.classList.add('toggle-active');
                }
            }
            
            // Apply the saved preferences
            applyPreferences(preferences);
        } catch (e) {
            console.error('Error parsing cookie preferences', e);
            // If error in parsing, show the banner again
            if (cookieConsent) {
                cookieConsent.classList.remove('hidden');
                cookieConsent.classList.add('cookie-slide-up');
                adjustCookieConsentHeight();
            }
        }
    }
    
    // Handle window resize for responsive cookie consent
    window.addEventListener('resize', adjustCookieConsentHeight);
    
    // Add event listeners only if elements exist
    if (cookieClose) {
        cookieClose.addEventListener('click', () => {
            if (cookieConsent) {
                cookieConsent.classList.add('cookie-slide-down');
                setTimeout(() => {
                    cookieConsent.classList.add('hidden');
                    cookieConsent.classList.remove('cookie-slide-down');
                }, 500); // Wait for animation to complete
            }
        });
    }
    
    if (cookieAcceptAll) {
        cookieAcceptAll.addEventListener('click', () => {
            // Set all cookie types to true
            const preferences = {
                essential: true,
                analytics: true,
                marketing: true
            };
            
            // Update toggle visuals if elements exist
            if (analyticsCookies) {
                analyticsCookies.checked = true;
                const toggleBg = analyticsCookies.parentElement.querySelector('.toggle-bg');
                if (toggleBg) {
                    toggleBg.classList.add('toggle-active');
                }
            }
            
            if (marketingCookies) {
                marketingCookies.checked = true;
                const toggleBg = marketingCookies.parentElement.querySelector('.toggle-bg');
                if (toggleBg) {
                    toggleBg.classList.add('toggle-active');
                }
            }
            
            // Save preferences
            savePreferences(preferences);
            
            // Apply preferences
            applyPreferences(preferences);
            
            // Hide the cookie consent popup
            if (cookieConsent) {
                cookieConsent.classList.add('cookie-slide-down');
                setTimeout(() => {
                    cookieConsent.classList.add('hidden');
                    cookieConsent.classList.remove('cookie-slide-down');
                }, 500);
            }
        });
    }
    
    if (cookieAcceptSelected) {
        cookieAcceptSelected.addEventListener('click', () => {
            // Get selected preferences
            const preferences = {
                essential: true, // Essential cookies are always required
                analytics: analyticsCookies ? analyticsCookies.checked : false,
                marketing: marketingCookies ? marketingCookies.checked : false
            };
            
            // Save preferences
            savePreferences(preferences);
            
            // Apply preferences
            applyPreferences(preferences);
            
            // Hide the cookie consent popup
            if (cookieConsent) {
                cookieConsent.classList.add('cookie-slide-down');
                setTimeout(() => {
                    cookieConsent.classList.add('hidden');
                    cookieConsent.classList.remove('cookie-slide-down');
                }, 500);
            }
        });
    }
    
    // Toggle inputs styling
    const toggleInputs = document.querySelectorAll('.cookie-option input[type="checkbox"]');
    toggleInputs.forEach(input => {
        // Set initial state class
        if (input.checked) {
            const toggleBg = input.parentElement.querySelector('.toggle-bg');
            if (toggleBg) {
                toggleBg.classList.add('toggle-active');
            }
        }
        
        // Add event listener
        input.addEventListener('change', function() {
            const toggleBg = this.parentElement.querySelector('.toggle-bg');
            if (toggleBg) {
                if (this.checked) {
                    toggleBg.classList.add('toggle-active');
                } else {
                    toggleBg.classList.remove('toggle-active');
                }
            }
        });
    });
    
    // Improve mobile usability for cookie options
    const cookieOptions = document.querySelectorAll('.cookie-option');
    cookieOptions.forEach(option => {
        if (!option.querySelector('input[disabled]')) {
            option.addEventListener('click', function(e) {
                // Only toggle if not clicking directly on the toggle or label
                if (!e.target.closest('label')) {
                    const input = this.querySelector('input[type="checkbox"]');
                    if (input) {
                        input.checked = !input.checked;
                        
                        // Trigger change event
                        const event = new Event('change');
                        input.dispatchEvent(event);
                    }
                }
            });
        }
    });
    
    // Helper functions
    function savePreferences(preferences) {
        // Save preferences for 365 days
        setCookie('arzani_cookie_preferences', JSON.stringify(preferences), 365);
    }
    
    function applyPreferences(preferences) {
        // Apply the preferences to the website
        // For analytics cookies
        if (preferences.analytics) {
            // Initialize analytics (example: Google Analytics)
            // enableAnalytics();
            console.log('Analytics cookies enabled');
        }
        
        // For marketing cookies
        if (preferences.marketing) {
            // Initialize marketing tools
            // enableMarketingTools();
            console.log('Marketing cookies enabled');
        }
    }
    
    function adjustCookieConsentHeight() {
        if (!cookieConsent) return;
        
        // Check if on mobile and adjust max-height for cookie consent
        if (window.innerWidth < 768) {
            cookieConsent.style.maxHeight = '85vh';
            cookieConsent.style.overflowY = 'auto';
        } else {
            cookieConsent.style.maxHeight = '';
            cookieConsent.style.overflowY = '';
        }
    }
    
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
    }
    
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }
});
