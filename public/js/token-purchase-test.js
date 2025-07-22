/**
 * Token Purchase System Test & Debug
 * Run this to test the token purchase flow and check for issues
 */

console.log('🧪 Token Purchase System Test');
console.log('==============================');

// Test 1: Check if multiple event handlers are attached
console.log('\n📋 Test 1: Event Handler Check');
document.addEventListener('DOMContentLoaded', () => {
    // Count event listeners on purchase buttons
    setTimeout(() => {
        const purchaseButtons = document.querySelectorAll('.purchase-package-btn');
        console.log(`Found ${purchaseButtons.length} purchase buttons`);
        
        purchaseButtons.forEach((btn, index) => {
            console.log(`Button ${index + 1}:`, {
                packageId: btn.dataset.packageId,
                hasOnclick: !!btn.onclick,
                classList: Array.from(btn.classList)
            });
        });
    }, 1000);
});

// Test 2: Monitor purchase attempts
let purchaseAttempts = 0;
const originalPurchase = window.TokenPurchase?.prototype?.purchasePackage;

if (originalPurchase) {
    window.TokenPurchase.prototype.purchasePackage = function(packageId) {
        purchaseAttempts++;
        console.log(`🛒 Purchase attempt #${purchaseAttempts} for package ${packageId}`);
        console.log('Time since last attempt:', this.lastPurchaseAttempt ? Date.now() - this.lastPurchaseAttempt : 'N/A');
        
        return originalPurchase.call(this, packageId);
    };
}

// Test 3: Rate limit status checker
async function checkRateLimitStatus() {
    try {
        const response = await fetch('/api/tokens/packages', {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('\n🚦 Rate Limit Headers:');
        console.log('X-RateLimit-Limit:', response.headers.get('X-RateLimit-Limit'));
        console.log('X-RateLimit-Remaining:', response.headers.get('X-RateLimit-Remaining'));
        console.log('X-RateLimit-Reset:', response.headers.get('X-RateLimit-Reset'));
        
    } catch (error) {
        console.error('Rate limit check failed:', error);
    }
}

// Test 4: Simulate purchase test
async function simulatePurchaseTest() {
    console.log('\n🎯 Simulating Purchase Test');
    
    if (window.tokenPurchaseInstance) {
        try {
            // This should trigger our debouncing logic
            console.log('Attempt 1...');
            window.tokenPurchaseInstance.purchasePackage(1);
            
            setTimeout(() => {
                console.log('Attempt 2 (should be debounced)...');
                window.tokenPurchaseInstance.purchasePackage(1);
            }, 500);
            
            setTimeout(() => {
                console.log('Attempt 3 (after debounce period)...');
                window.tokenPurchaseInstance.purchasePackage(1);
            }, 3000);
            
        } catch (error) {
            console.error('Purchase test failed:', error);
        }
    } else {
        console.log('❌ No tokenPurchaseInstance found');
    }
}

// Run tests when page loads
setTimeout(() => {
    checkRateLimitStatus();
    
    // Add test button to page
    const testButton = document.createElement('button');
    testButton.textContent = '🧪 Run Purchase Test';
    testButton.className = 'bg-purple-600 text-white px-4 py-2 rounded mb-4';
    testButton.onclick = simulatePurchaseTest;
    
    const container = document.getElementById('token-packages');
    if (container) {
        container.parentNode.insertBefore(testButton, container);
    }
}, 2000);

console.log('✅ Test script loaded');
