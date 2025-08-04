/**
 * A/B Testing Integration Verification
 * This script will help verify that the fixes work correctly
 */

console.log('🧪 A/B Testing Debug Information');
console.log('================================');

// Check if analytics is loaded
console.log('1. Analytics Instance Check:');
console.log('   - ABTestingAnalytics class exists:', typeof ABTestingAnalytics !== 'undefined');
console.log('   - window.abTestAnalytics exists:', typeof window.abTestAnalytics !== 'undefined');

if (window.abTestAnalytics) {
    console.log('   - Variant:', window.abTestAnalytics.variant);
    console.log('   - Session ID:', window.abTestAnalytics.sessionId);
    console.log('   - trackEvent method:', typeof window.abTestAnalytics.trackEvent);
}

// Check CTA buttons
console.log('\n2. CTA Button Check:');
const ctaButtons = document.querySelectorAll('.ab-track-cta');
console.log('   - Total CTA buttons found:', ctaButtons.length);

ctaButtons.forEach((btn, index) => {
    console.log(`   - Button ${index + 1}:`, {
        text: btn.textContent.trim().substring(0, 50) + '...',
        ctaType: btn.getAttribute('data-cta-type'),
        ctaLocation: btn.getAttribute('data-cta-location'),
        href: btn.href
    });
});

// Test event tracking
console.log('\n3. Testing Event Tracking:');
if (window.abTestAnalytics) {
    try {
        window.abTestAnalytics.trackEvent('debug_test', {
            message: 'Testing A/B analytics integration',
            timestamp: Date.now()
        });
        console.log('   ✅ Test event tracked successfully');
    } catch (error) {
        console.log('   ❌ Error tracking test event:', error);
    }
} else {
    console.log('   ❌ Cannot test - analytics not available');
}

// Monitor events
console.log('\n4. Events in queue:');
if (window.abTestAnalytics && window.abTestAnalytics.events) {
    console.log('   - Events pending:', window.abTestAnalytics.events.length);
    if (window.abTestAnalytics.events.length > 0) {
        console.log('   - Latest events:', window.abTestAnalytics.events.slice(-3));
    }
}

console.log('\n🔍 Open browser console and click on any CTA button to see tracking in action!');
console.log('Expected log messages:');
console.log('   - "Found X CTA buttons for tracking"');
console.log('   - "CTA Click Detected: {...}"');
console.log('   - "✅ CTA Event Tracked: ..."');
