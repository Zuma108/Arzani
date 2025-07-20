/**
 * Debug A/B Testing Integration
 * Check if JavaScript analytics are working properly
 */

const puppeteer = require('puppeteer');

async function debugABTesting() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Listen for console logs
    page.on('console', (msg) => {
        console.log('BROWSER LOG:', msg.text());
    });
    
    // Listen for errors
    page.on('pageerror', (err) => {
        console.error('BROWSER ERROR:', err.message);
    });
    
    // Navigate to marketplace-landing
    console.log('Testing marketplace-landing page...');
    await page.goto('http://localhost:5000/marketplace-landing');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if ABTestingAnalytics is loaded
    const analyticsLoaded = await page.evaluate(() => {
        return {
            classExists: typeof ABTestingAnalytics !== 'undefined',
            instanceExists: typeof window.abTestAnalytics !== 'undefined',
            variant: window.abTestAnalytics?.variant,
            sessionId: window.abTestAnalytics?.sessionId
        };
    });
    
    console.log('Analytics Status:', analyticsLoaded);
    
    // Check if CTA buttons exist
    const ctaButtons = await page.evaluate(() => {
        const buttons = document.querySelectorAll('.ab-track-cta');
        return Array.from(buttons).map(btn => ({
            text: btn.textContent.trim(),
            href: btn.href,
            ctaType: btn.getAttribute('data-cta-type'),
            ctaLocation: btn.getAttribute('data-cta-location')
        }));
    });
    
    console.log('CTA Buttons found:', ctaButtons);
    
    // Test clicking a CTA
    if (ctaButtons.length > 0) {
        console.log('Testing CTA click...');
        await page.click('.ab-track-cta');
        await page.waitForTimeout(1000);
    }
    
    // Check events array
    const events = await page.evaluate(() => {
        return window.abTestAnalytics?.events || [];
    });
    
    console.log('Events recorded:', events);
    
    await browser.close();
}

debugABTesting().catch(console.error);
