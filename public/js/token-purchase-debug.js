/**
 * Debug Token Purchase Issues
 * Test script to verify token package data and purchase flow
 */

async function debugTokenPurchase() {
    console.log('🔍 Starting Token Purchase Debug...');
    
    try {
        // Test 1: Check if packages endpoint works
        console.log('\n📦 Testing packages endpoint...');
        const packagesResponse = await fetch('/api/tokens/packages', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (packagesResponse.ok) {
            const packagesData = await packagesResponse.json();
            console.log('✅ Packages loaded successfully:', packagesData);
            
            packagesData.packages.forEach(pkg => {
                console.log(`Package ${pkg.id}:`, {
                    name: pkg.name,
                    token_amount: pkg.token_amount,
                    bonus_tokens: pkg.bonus_tokens,
                    total_tokens: pkg.total_tokens,
                    price_gbp: pkg.price_gbp,
                    price_formatted: pkg.price_gbp_formatted
                });
            });
        } else {
            console.error('❌ Failed to load packages:', packagesResponse.status, packagesResponse.statusText);
        }
        
        // Test 2: Try a purchase request with package ID 1
        console.log('\n💳 Testing purchase endpoint...');
        const purchaseResponse = await fetch('/api/tokens/purchase', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ packageId: 1 })
        });
        
        const purchaseData = await purchaseResponse.json();
        
        if (purchaseResponse.ok) {
            console.log('✅ Purchase endpoint working:', purchaseData);
        } else {
            console.error('❌ Purchase failed:', purchaseResponse.status, purchaseData);
        }
        
    } catch (error) {
        console.error('❌ Debug test failed:', error);
    }
}

// Add debug button to page
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const debugButton = document.createElement('button');
        debugButton.textContent = '🔍 Debug Token Purchase';
        debugButton.className = 'bg-red-600 text-white px-4 py-2 rounded mb-4 ml-2';
        debugButton.onclick = debugTokenPurchase;
        
        const testButton = document.querySelector('button[onclick*="simulatePurchaseTest"]');
        if (testButton) {
            testButton.parentNode.insertBefore(debugButton, testButton.nextSibling);
        }
    }, 2500);
});

console.log('🔍 Token Purchase Debug Script Loaded');
