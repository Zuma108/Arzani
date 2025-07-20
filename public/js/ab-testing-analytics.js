/**
 * A/B Testing Analytics Tracker
 * Comprehensive tracking for seller-first marketplace conversion optimization
 */

class ABTestingAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.variant = this.getVariant();
        this.events = [];
        this.pageLoadTime = Date.now();
        this.scrollDepth = 0;
        this.maxScrollDepth = 0;
        this.timeOnPage = 0;
        this.interactions = [];
        
        this.init();
    }

    init() {
        this.trackPageView();
        this.setupScrollTracking();
        this.setupTimeTracking();
        this.setupHeatmapTracking();
        this.setupFormTracking();
        this.setupCTATracking();
        this.setupExitTracking();
        
        // Send data every 30 seconds
        setInterval(() => this.sendBatch(), 30000);
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getUserId() {
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }

    getVariant() {
        // Determine if this is seller-first (new) or buyer-first (control)
        const variant = localStorage.getItem('ab_variant');
        if (!variant) {
            // 50/50 split for A/B testing
            const newVariant = Math.random() < 0.5 ? 'seller_first' : 'buyer_first';
            localStorage.setItem('ab_variant', newVariant);
            return newVariant;
        }
        return variant;
    }

    trackEvent(eventName, properties = {}) {
        const event = {
            event: eventName,
            properties: {
                ...properties,
                sessionId: this.sessionId,
                userId: this.userId,
                variant: this.variant,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                screenResolution: `${screen.width}x${screen.height}`,
                viewportSize: `${window.innerWidth}x${window.innerHeight}`
            }
        };
        
        this.events.push(event);
        console.log('AB Test Event:', event);
        
        // Send immediately for critical events
        if (this.isCriticalEvent(eventName)) {
            this.sendEvent(event);
        }
    }

    isCriticalEvent(eventName) {
        const criticalEvents = [
            'seller_cta_click',
            'buyer_cta_click',
            'form_submission',
            'signup_started',
            'signup_completed',
            'pricing_viewed',
            'valuation_requested'
        ];
        return criticalEvents.includes(eventName);
    }

    // PAGE TRACKING
    trackPageView() {
        this.trackEvent('page_view', {
            referrer: document.referrer,
            loadTime: Date.now() - this.pageLoadTime
        });
    }

    // SCROLL TRACKING
    setupScrollTracking() {
        let ticking = false;
        
        const updateScrollDepth = () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            this.scrollDepth = Math.round((scrollTop / docHeight) * 100);
            
            if (this.scrollDepth > this.maxScrollDepth) {
                this.maxScrollDepth = this.scrollDepth;
                
                // Track milestone scroll depths
                const milestones = [25, 50, 75, 90, 100];
                milestones.forEach(milestone => {
                    if (this.maxScrollDepth >= milestone && !this.scrollMilestones?.[milestone]) {
                        this.scrollMilestones = this.scrollMilestones || {};
                        this.scrollMilestones[milestone] = true;
                        this.trackEvent('scroll_milestone', {
                            depth: milestone,
                            timeToReach: Date.now() - this.pageLoadTime
                        });
                    }
                });
            }
            ticking = false;
        };

        const requestScrollUpdate = () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollDepth);
                ticking = true;
            }
        };

        window.addEventListener('scroll', requestScrollUpdate);
    }

    // TIME TRACKING
    setupTimeTracking() {
        setInterval(() => {
            this.timeOnPage = Date.now() - this.pageLoadTime;
            
            // Track time milestones
            const timeMilliseconds = this.timeOnPage;
            const timeSeconds = Math.floor(timeMilliseconds / 1000);
            const milestones = [10, 30, 60, 120, 300]; // seconds
            
            milestones.forEach(milestone => {
                if (timeSeconds >= milestone && !this.timeMilestones?.[milestone]) {
                    this.timeMilestones = this.timeMilestones || {};
                    this.timeMilestones[milestone] = true;
                    this.trackEvent('time_milestone', {
                        timeSeconds: milestone,
                        scrollDepth: this.scrollDepth
                    });
                }
            });
        }, 1000);
    }

    // HEATMAP & INTERACTION TRACKING
    setupHeatmapTracking() {
        const trackClick = (event) => {
            const rect = event.target.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            this.interactions.push({
                type: 'click',
                element: this.getElementSelector(event.target),
                x: event.clientX,
                y: event.clientY,
                relativeX: x,
                relativeY: y,
                timestamp: Date.now(),
                elementText: event.target.textContent?.trim().substring(0, 100)
            });

            this.trackEvent('element_click', {
                element: this.getElementSelector(event.target),
                text: event.target.textContent?.trim().substring(0, 100),
                coordinates: { x: event.clientX, y: event.clientY }
            });
        };

        document.addEventListener('click', trackClick);
    }

    // CTA TRACKING - Key for A/B testing
    setupCTATracking() {
        // Track seller CTAs
        const sellerCTAs = [
            'a[href="/sell"]',
            'a[href*="valuation"]',
            'button:contains("List Your Business")',
            '.journey-cta-primary',
            'a:contains("List Your Business")',
            'a:contains("Get Free Business Valuation")'
        ];

        // Track buyer CTAs
        const buyerCTAs = [
            'a[href="/marketplace2"]',
            'a[href*="browse"]',
            'a:contains("Find Businesses")',
            'a:contains("Browse Businesses")',
            '.view-all-btn-white'
        ];

        // Seller CTA tracking
        sellerCTAs.forEach(selector => {
            this.trackCTAClicks(selector, 'seller_cta_click');
        });

        // Buyer CTA tracking
        buyerCTAs.forEach(selector => {
            this.trackCTAClicks(selector, 'buyer_cta_click');
        });

        // Navigation tracking
        this.trackNavigation();
        
        // Pricing transparency tracking
        this.trackPricingViews();
    }

    trackCTAClicks(selector, eventName) {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.addEventListener('click', (e) => {
                    this.trackEvent(eventName, {
                        ctaText: element.textContent?.trim(),
                        ctaLocation: this.getElementLocation(element),
                        href: element.href || element.getAttribute('href'),
                        timeOnPageBeforeClick: Date.now() - this.pageLoadTime,
                        scrollDepthAtClick: this.scrollDepth
                    });
                });
            });
        } catch (error) {
            console.warn('CTA tracking error for selector:', selector, error);
        }
    }

    trackNavigation() {
        // Track navigation clicks
        const navLinks = document.querySelectorAll('nav a, .navbar a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.trackEvent('navigation_click', {
                    linkText: link.textContent?.trim(),
                    href: link.href,
                    section: this.getNavSection(link)
                });
            });
        });
    }

    trackPricingViews() {
        // Track when pricing information becomes visible
        const pricingElements = document.querySelectorAll('[class*="pricing"], [id*="pricing"]');
        
        if (pricingElements.length > 0) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.trackEvent('pricing_viewed', {
                            element: this.getElementSelector(entry.target),
                            timeToView: Date.now() - this.pageLoadTime
                        });
                    }
                });
            }, { threshold: 0.5 });

            pricingElements.forEach(el => observer.observe(el));
        }
    }

    // FORM TRACKING
    setupFormTracking() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Track form starts
            form.addEventListener('focusin', (e) => {
                if (!form.dataset.tracked) {
                    form.dataset.tracked = 'true';
                    this.trackEvent('form_started', {
                        formId: form.id || 'unknown',
                        formAction: form.action,
                        firstField: e.target.name || e.target.id || 'unknown'
                    });
                }
            });

            // Track form submissions
            form.addEventListener('submit', (e) => {
                this.trackEvent('form_submission', {
                    formId: form.id || 'unknown',
                    formAction: form.action,
                    timeToSubmit: Date.now() - this.pageLoadTime
                });
            });

            // Track form abandonment
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => {
                    setTimeout(() => {
                        if (!form.contains(document.activeElement)) {
                            this.trackEvent('form_field_abandon', {
                                formId: form.id || 'unknown',
                                fieldName: input.name || input.id || 'unknown',
                                fieldValue: input.value ? 'filled' : 'empty'
                            });
                        }
                    }, 100);
                });
            });
        });
    }

    // EXIT TRACKING
    setupExitTracking() {
        // Track page exit
        window.addEventListener('beforeunload', () => {
            this.trackEvent('page_exit', {
                timeOnPage: Date.now() - this.pageLoadTime,
                maxScrollDepth: this.maxScrollDepth,
                totalInteractions: this.interactions.length
            });
            this.sendBatch(); // Send final batch
        });

        // Track tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('tab_hidden', {
                    timeOnPage: Date.now() - this.pageLoadTime
                });
            } else {
                this.trackEvent('tab_visible', {
                    timeAway: Date.now() - this.pageLoadTime
                });
            }
        });
    }

    // CONVERSION FUNNEL TRACKING
    trackConversionFunnel(step, properties = {}) {
        const funnelSteps = {
            'landing': 1,
            'engagement': 2,
            'interest': 3,
            'consideration': 4,
            'signup_intent': 5,
            'signup_complete': 6
        };

        this.trackEvent('funnel_step', {
            step: step,
            stepNumber: funnelSteps[step] || 0,
            ...properties
        });
    }

    // UTILITY METHODS
    getElementSelector(element) {
        if (element.id) return `#${element.id}`;
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c).slice(0, 2).join('.');
            return `.${classes}`;
        }
        return element.tagName.toLowerCase();
    }

    getElementLocation(element) {
        const rect = element.getBoundingClientRect();
        const sections = ['hero', 'features', 'journey', 'testimonials', 'footer'];
        
        for (const section of sections) {
            const sectionEl = document.querySelector(`[class*="${section}"], #${section}`);
            if (sectionEl && sectionEl.contains(element)) {
                return section;
            }
        }
        
        return 'unknown';
    }

    getNavSection(link) {
        if (link.textContent?.toLowerCase().includes('sell')) return 'seller';
        if (link.textContent?.toLowerCase().includes('buy') || link.textContent?.toLowerCase().includes('find')) return 'buyer';
        if (link.textContent?.toLowerCase().includes('pricing')) return 'pricing';
        return 'other';
    }

    // DATA SENDING
    sendEvent(event) {
        this.sendToAnalytics([event]);
    }

    sendBatch() {
        if (this.events.length > 0) {
            this.sendToAnalytics(this.events);
            this.events = []; // Clear sent events
        }
    }

    sendToAnalytics(events) {
        // Send to multiple analytics services
        this.sendToGoogleAnalytics(events);
        this.sendToCustomEndpoint(events);
        this.logToConsole(events);
    }

    sendToGoogleAnalytics(events) {
        if (typeof gtag !== 'undefined') {
            events.forEach(event => {
                gtag('event', event.event, {
                    ...event.properties,
                    custom_parameter_variant: this.variant,
                    custom_parameter_session: this.sessionId
                });
            });
        }
    }

    sendToCustomEndpoint(events) {
        // Map events to the format expected by the server
        const mappedEvents = events.map(event => ({
            type: event.event, // Map 'event' to 'type' for server compatibility
            page: event.properties.url,
            element: event.properties.element || null,
            timestamp: event.properties.timestamp,
            data: {
                ...event.properties,
                scrollDepth: event.properties.scrollDepth,
                timeOnPage: event.properties.timeOnPage,
                interactions: event.properties.interactions || []
            }
        }));

        const payload = {
            sessionId: this.sessionId,
            userId: this.userId,
            variant: this.variant,
            events: mappedEvents, // Use the mapped events
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                url: window.location.href
            }
        };

        // Send to your custom analytics endpoint
        fetch('/api/analytics/ab-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        }).catch(error => {
            console.warn('Failed to send AB test data:', error);
            // Store in localStorage for retry
            this.storeForRetry(payload);
        });
    }

    storeForRetry(payload) {
        const stored = JSON.parse(localStorage.getItem('ab_test_failed') || '[]');
        stored.push(payload);
        localStorage.setItem('ab_test_failed', JSON.stringify(stored.slice(-10))); // Keep last 10
    }

    logToConsole(events) {
        console.group('🧪 A/B Test Analytics Batch');
        console.log('Variant:', this.variant);
        console.log('Session:', this.sessionId);
        console.log('Events:', events);
        console.groupEnd();
    }

    // PUBLIC API
    track(eventName, properties = {}) {
        this.trackEvent(eventName, properties);
    }

    identify(userId, traits = {}) {
        this.userId = userId;
        localStorage.setItem('user_id', userId);
        this.trackEvent('user_identified', { traits });
    }

    setVariant(variant) {
        this.variant = variant;
        localStorage.setItem('ab_variant', variant);
        this.trackEvent('variant_set', { variant });
    }

    getAnalytics() {
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            variant: this.variant,
            timeOnPage: Date.now() - this.pageLoadTime,
            scrollDepth: this.maxScrollDepth,
            interactions: this.interactions.length,
            events: this.events.length
        };
    }
}

// Initialize tracking
window.ABTestAnalytics = new ABTestingAnalytics();

// Expose global tracking function
window.trackABEvent = (eventName, properties) => {
    window.ABTestAnalytics.track(eventName, properties);
};

// Auto-track common conversion events
document.addEventListener('DOMContentLoaded', () => {
    // Track seller journey interactions
    setTimeout(() => {
        const sellerElements = document.querySelectorAll('[data-step="1"], [data-step="2"], [data-step="3"]');
        sellerElements.forEach((element, index) => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        window.ABTestAnalytics.trackConversionFunnel('engagement', {
                            journeyStep: index + 1,
                            timeToView: Date.now() - window.ABTestAnalytics.pageLoadTime
                        });
                    }
                });
            }, { threshold: 0.7 });
            
            observer.observe(element);
        });
    }, 1000);
});
