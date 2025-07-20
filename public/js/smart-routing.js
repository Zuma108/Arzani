// Smart routing analytics and behavior tracking
class SmartRouting {
  constructor() {
    this.behaviorData = {
      buyerSignals: 0,
      sellerSignals: 0,
      startTime: Date.now()
    };
    this.initializeTracking();
  }

  initializeTracking() {
    // Track user interactions that suggest buyer intent
    this.trackBuyerSignals();
    
    // Track user interactions that suggest seller intent
    this.trackSellerSignals();
    
    // Auto-detect role after sufficient signals
    this.setupAutoDetection();
  }

  trackBuyerSignals() {
    // Elements that suggest buyer intent
    const buyerElements = [
      'a[href*="search"]',
      'a[href*="browse"]',
      'a[href*="categories"]',
      '.product-card',
      '.service-listing',
      'button[data-action="buy"]',
      'button[data-action="contact-seller"]',
      '.buyer-cta',
      '.search-bar'
    ];

    buyerElements.forEach(selector => {
      document.addEventListener('click', (e) => {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          this.recordBuyerSignal('click', selector);
        }
      });
    });

    // Hover tracking for buyer elements
    buyerElements.forEach(selector => {
      document.addEventListener('mouseover', (e) => {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          this.recordBuyerSignal('hover', selector);
        }
      });
    });
  }

  trackSellerSignals() {
    // Elements that suggest seller intent
    const sellerElements = [
      'a[href*="sell"]',
      'a[href*="list"]',
      'a[href*="post"]',
      'a[href*="create"]',
      'button[data-action="sell"]',
      'button[data-action="list-service"]',
      '.seller-cta',
      '.create-listing',
      '.dashboard',
      'a[href*="dashboard"]'
    ];

    sellerElements.forEach(selector => {
      document.addEventListener('click', (e) => {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          this.recordSellerSignal('click', selector);
        }
      });
    });

    // Hover tracking for seller elements
    sellerElements.forEach(selector => {
      document.addEventListener('mouseover', (e) => {
        if (e.target.matches(selector) || e.target.closest(selector)) {
          this.recordSellerSignal('hover', selector);
        }
      });
    });
  }

  recordBuyerSignal(action, element) {
    this.behaviorData.buyerSignals += action === 'click' ? 3 : 1;
    console.log('Buyer signal:', action, element, 'Total:', this.behaviorData.buyerSignals);
    this.checkForRoleDetection();
  }

  recordSellerSignal(action, element) {
    this.behaviorData.sellerSignals += action === 'click' ? 3 : 1;
    console.log('Seller signal:', action, element, 'Total:', this.behaviorData.sellerSignals);
    this.checkForRoleDetection();
  }

  checkForRoleDetection() {
    const threshold = 5;
    const timeSpent = Date.now() - this.behaviorData.startTime;
    
    // Only auto-detect after user has spent at least 10 seconds
    if (timeSpent < 10000) return;

    if (this.behaviorData.buyerSignals >= threshold && 
        this.behaviorData.buyerSignals > this.behaviorData.sellerSignals * 1.5) {
      this.captureIntent('buyer', 'behavior-detection');
    } else if (this.behaviorData.sellerSignals >= threshold && 
               this.behaviorData.sellerSignals > this.behaviorData.buyerSignals * 1.5) {
      this.captureIntent('seller', 'behavior-detection');
    }
  }

  setupAutoDetection() {
    // Check for URL patterns that suggest intent
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('buy') || path.includes('search') || path.includes('browse')) {
      this.recordBuyerSignal('url-pattern', path);
    } else if (path.includes('sell') || path.includes('list') || path.includes('create')) {
      this.recordSellerSignal('url-pattern', path);
    }

    // Check for referrer patterns
    if (document.referrer) {
      const referrer = document.referrer.toLowerCase();
      if (referrer.includes('google') && window.location.search.includes('buy')) {
        this.recordBuyerSignal('search-referrer', 'google-buy');
      } else if (referrer.includes('google') && window.location.search.includes('sell')) {
        this.recordSellerSignal('search-referrer', 'google-sell');
      }
    }
  }

  async captureIntent(intent, source) {
    try {
      const response = await fetch('/api/user-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ intent, source })
      });

      if (response.ok) {
        console.log(`Intent captured: ${intent} (${source})`);
        // Optionally redirect to appropriate landing page
        if (source === 'behavior-detection') {
          this.suggestOptimalLanding(intent);
        }
      }
    } catch (error) {
      console.error('Failed to capture intent:', error);
    }
  }

  suggestOptimalLanding(role) {
    // Show a non-intrusive suggestion
    const suggestion = document.createElement('div');
    suggestion.className = 'smart-routing-suggestion';
    suggestion.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #1f2937; color: white; padding: 15px; border-radius: 8px; z-index: 1000; max-width: 300px;">
        <p style="margin: 0 0 10px 0;">Based on your activity, you might prefer our ${role} experience!</p>
        <button onclick="this.parentElement.parentElement.remove()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
          Switch to ${role} view
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: #9ca3af; border: 1px solid #4b5563; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
          Stay here
        </button>
      </div>
    `;
    
    suggestion.querySelector('button').addEventListener('click', () => {
      window.location.href = role === 'buyer' ? '/buyer-landing' : '/marketplace-landing';
    });
    
    document.body.appendChild(suggestion);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (suggestion.parentElement) {
        suggestion.remove();
      }
    }, 10000);
  }

  // Manual role selection
  async selectRole(role) {
    try {
      const response = await fetch('/api/select-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        console.log(`Role selected: ${role}`);
        window.location.href = role === 'buyer' ? '/buyer-landing' : '/marketplace-landing';
      }
    } catch (error) {
      console.error('Failed to select role:', error);
    }
  }
}

// Initialize smart routing if not already done
if (typeof window !== 'undefined' && !window.smartRouting) {
  window.smartRouting = new SmartRouting();
}

// Expose manual role selection function
window.selectRole = (role) => {
  if (window.smartRouting) {
    window.smartRouting.selectRole(role);
  }
};
