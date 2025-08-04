/**
 * Analytics Helper - Functions to streamline Google Analytics event tracking
 */

// Track general events
function trackEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, params);
        console.log(`Event tracked: ${eventName}`, params);
    } else {
        console.warn('Google Analytics not loaded. Event not tracked:', eventName);
    }
}

// Track business views
function trackBusinessView(businessId, businessName, businessType) {
    trackEvent('business_view', {
        business_id: businessId,
        business_name: businessName,
        business_type: businessType
    });
}

// Track lead generation
function trackLeadGeneration(businessId, leadType) {
    trackEvent('lead_generated', {
        business_id: businessId,
        lead_type: leadType
    });
}

// Track subscription events
function trackSubscription(planName, planPrice, currency = 'GBP') {
    trackEvent('subscription_started', {
        plan_name: planName,
        plan_price: planPrice,
        currency: currency
    });
}

// Track search events
function trackSearch(searchTerm, resultsCount) {
    trackEvent('search', {
        search_term: searchTerm,
        results_count: resultsCount
    });
}

// Track user interactions with specific features
function trackFeatureUsage(featureName, actionType) {
    trackEvent('feature_usage', {
        feature_name: featureName,
        action_type: actionType
    });
}

// Initialize enhanced ecommerce tracking (for marketplace transactions)
function initEcommerceTracking() {
    if (typeof gtag === 'function') {
        gtag('require', 'ecommerce');
        console.log('Enhanced ecommerce tracking initialized');
    }
}
