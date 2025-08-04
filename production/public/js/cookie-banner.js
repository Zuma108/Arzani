document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('cookieConsentBanner');
    const acceptNecessaryBtn = document.getElementById('acceptNecessary');
    const acceptAllBtn = document.getElementById('acceptAllCookies');
    const cookieConsentKey = 'arzani_cookie_consent';

    // Check if consent has already been given
    const consentGiven = localStorage.getItem(cookieConsentKey);

    if (!consentGiven) {
        // Use requestAnimationFrame to ensure banner is rendered before adding visible class
        requestAnimationFrame(() => {
            if (banner) {
                banner.classList.remove('hidden');
                // Optionally add a class for fade-in animation
                banner.style.opacity = '0';
                banner.style.transition = 'opacity 0.5s ease-in-out';
                requestAnimationFrame(() => {
                    banner.style.opacity = '1';
                });
            }
        });
    } else {
        // If consent is given, ensure banner is hidden
        if (banner) {
            banner.classList.add('hidden');
        }
        // Initialize analytics based on stored preference if needed
        if (consentGiven === 'all') {
            initializeAnalytics(); // Example function call
        }
    }

    // Function to hide the banner with animation
    const hideBanner = () => {
        if (banner) {
            banner.style.opacity = '0';
            setTimeout(() => {
                banner.classList.add('hidden');
            }, 500); // Match transition duration
        }
    };

    // Handle "Accept Necessary"
    if (acceptNecessaryBtn) {
        acceptNecessaryBtn.addEventListener('click', () => {
            localStorage.setItem(cookieConsentKey, 'necessary');
            hideBanner();
            // Only essential cookies are used by default, no extra action needed
            // Or disable non-essential cookies if they were potentially active
            console.log("Necessary cookies accepted.");
        });
    }

    // Handle "Accept All"
    if (acceptAllBtn) {
        acceptAllBtn.addEventListener('click', () => {
            localStorage.setItem(cookieConsentKey, 'all');
            hideBanner();
            initializeAnalytics(); // Initialize analytics or other non-essential scripts
            console.log("All cookies accepted.");
        });
    }

    // Example function to initialize analytics (like Google Analytics)
    function initializeAnalytics() {
        // Check if gtag function exists (it should if GA script is loaded)
        if (typeof gtag === 'function') {
            // Consent granted for analytics storage
            gtag('consent', 'update', {
              'analytics_storage': 'granted'
            });
            console.log("Analytics initialized.");
            // You might trigger additional tracking events here if needed
        } else {
            console.log("gtag function not found. Analytics not initialized.");
        }
    }

    // Optional: Deny analytics if only necessary are accepted and GA is present
    function disableAnalytics() {
         if (typeof gtag === 'function') {
            gtag('consent', 'update', {
              'analytics_storage': 'denied'
            });
            console.log("Analytics disabled.");
        }
    }

    // Initial check on load based on stored consent
    if (consentGiven === 'necessary') {
        disableAnalytics(); // Ensure analytics are off if only necessary was chosen previously
    } else if (consentGiven === 'all') {
        // Analytics should already be initialized if consent was 'all'
        // but we can call it again safely or ensure it's called if missed
        initializeAnalytics();
    }

});
