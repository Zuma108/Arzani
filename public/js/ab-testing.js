class ABTesting {
    constructor() {
        this.tests = {};
        this.userGroup = this.getUserGroup();
    }

    getUserGroup() {
        let group = localStorage.getItem('ab_group');
        if (!group) {
            group = Math.random() < 0.5 ? 'A' : 'B';
            localStorage.setItem('ab_group', group);
        }
        return group;
    }

    initTest(testName, variants) {
        const variant = this.userGroup === 'A' ? variants.A : variants.B;
        this.tests[testName] = variant;
        this.applyVariant(testName, variant);
        this.trackImpression(testName, variant);
    }

    applyVariant(testName, variant) {
        const element = document.querySelector(`[data-ab-test="${testName}"]`);
        if (element && variant.style) {
            Object.assign(element.style, variant.style);
        }
        if (variant.content) {
            element.innerHTML = variant.content;
        }
    }

    trackImpression(testName, variant) {
        // Send analytics data
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ab_test_impression', {
                'test_name': testName,
                'variant': this.userGroup,
                'plan': window.location.pathname.includes('gold') ? 'gold' : 'platinum'
            });
        }
    }

    trackConversion(testName) {
        // Send conversion data
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ab_test_conversion', {
                'test_name': testName,
                'variant': this.userGroup,
                'plan': window.location.pathname.includes('gold') ? 'gold' : 'platinum'
            });        }
    }
}

// Export to global scope instead of using ES6 modules
window.abTesting = new ABTesting();
