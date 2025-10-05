/**
 * Token Counter Removal Utility
 * Finds and removes any token counter displays from the unified sidebar
 * while preserving the underlying functionality
 */

(function() {
    'use strict';

    // Function to remove token counter elements
    function removeTokenCounters() {
        const sidebar = document.getElementById('unified-sidebar');
        if (!sidebar) return;

        // Common selectors for token counter elements
        const selectors = [
            // Text-based counters
            '*[data-token-counter]',
            '*[data-tokens]',
            '.token-counter',
            '.tokens-counter',
            '.token-balance-display',
            '.sidebar-token-count',
            
            // Elements containing "0 Tokens" text
            ':contains("0 Tokens")',
            ':contains("Token")',
            
            // Badge-like elements that might show token counts
            '.badge:contains("0")',
            '.counter:contains("0")',
            '.token-badge',
            
            // Profile section elements that might show tokens
            '.user-tokens',
            '.profile-tokens',
            '.sidebar-balance'
        ];

        // Remove elements matching selectors
        selectors.forEach(selector => {
            try {
                // Skip :contains selectors as they're not supported in vanilla JS
                if (selector.includes(':contains')) return;
                
                const elements = sidebar.querySelectorAll(selector);
                elements.forEach(element => {
                    console.log('Removing token counter element:', element);
                    element.remove();
                });
            } catch (e) {
                // Ignore invalid selectors
            }
        });

        // Search for text nodes containing token information
        const walker = document.createTreeWalker(
            sidebar,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const text = node.textContent.trim();
                    // Match patterns like "0 Tokens", "Token Balance", etc.
                    if (/\b\d+\s*tokens?\b/i.test(text) || 
                        /\btoken\s*balance\b/i.test(text) ||
                        /\b0\s*tokens?\b/i.test(text)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        // Remove or hide parent elements of matching text nodes
        textNodes.forEach(textNode => {
            const parent = textNode.parentElement;
            if (parent && parent !== sidebar) {
                // Check if this element looks like a token counter
                const elementText = parent.textContent.trim();
                const isTokenCounter = /\b\d+\s*tokens?\b/i.test(elementText) ||
                                    /\btoken\s*balance\b/i.test(elementText) ||
                                    /\b0\s*tokens?\b/i.test(elementText);
                
                if (isTokenCounter) {
                    console.log('Removing token counter element by text content:', parent);
                    parent.style.display = 'none';
                    parent.setAttribute('data-token-counter-hidden', 'true');
                }
            }
        });

        // Look for dynamically added elements with token information
        const allElements = sidebar.querySelectorAll('*');
        allElements.forEach(element => {
            const text = element.textContent.trim();
            const isSmallElement = element.children.length === 0 && text.length < 50;
            
            if (isSmallElement && /\b\d+\s*tokens?\b/i.test(text)) {
                console.log('Hiding potential token counter:', element);
                element.style.display = 'none';
                element.setAttribute('data-token-counter-hidden', 'true');
            }
        });
    }

    // Function to search and log potential token counter elements for debugging
    function findTokenCounters() {
        const sidebar = document.getElementById('unified-sidebar');
        if (!sidebar) return;

        console.log('=== TOKEN COUNTER SEARCH ===');
        
        // Search for any elements that might contain token information
        const allElements = sidebar.querySelectorAll('*');
        const potentialCounters = [];

        allElements.forEach(element => {
            const text = element.textContent.trim();
            const hasTokenText = /token/i.test(text) || /\b\d+\b/.test(text);
            
            if (hasTokenText && text.length < 100) {
                potentialCounters.push({
                    element: element,
                    text: text,
                    tagName: element.tagName,
                    classes: element.className,
                    id: element.id
                });
            }
        });

        if (potentialCounters.length > 0) {
            console.log('Found potential token counter elements:');
            potentialCounters.forEach((item, index) => {
                console.log(`${index + 1}.`, {
                    text: item.text,
                    tagName: item.tagName,
                    classes: item.classes,
                    id: item.id,
                    element: item.element
                });
            });
        } else {
            console.log('No potential token counter elements found');
        }
        
        console.log('=== END SEARCH ===');
    }

    // Run removal function when DOM is ready
    function initialize() {
        console.log('Token counter removal utility initialized');
        
        // Find counters first (for debugging)
        findTokenCounters();
        
        // Remove token counters
        removeTokenCounters();
        
        // Set up mutation observer to catch dynamically added content
        if (window.MutationObserver) {
            const observer = new MutationObserver(function(mutations) {
                let shouldCheck = false;
                
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Check if any added nodes contain token information
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const text = node.textContent || '';
                                if (/token/i.test(text) || /\b\d+\s*token/i.test(text)) {
                                    shouldCheck = true;
                                }
                            }
                        });
                    }
                });
                
                if (shouldCheck) {
                    console.log('New content detected, checking for token counters...');
                    setTimeout(removeTokenCounters, 100);
                }
            });
            
            const sidebar = document.getElementById('unified-sidebar');
            if (sidebar) {
                observer.observe(sidebar, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                console.log('Mutation observer set up for token counter removal');
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Also run on page load to catch any late-loading content
    window.addEventListener('load', function() {
        setTimeout(removeTokenCounters, 500);
    });

    // Expose functions for manual debugging
    window.findTokenCounters = findTokenCounters;
    window.removeTokenCounters = removeTokenCounters;

})();