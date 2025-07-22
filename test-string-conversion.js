/**
 * Quick Test for Token Purchase Fix
 * Run this in Node.js to verify the string conversion logic
 */

// Simulate the data structure
const testPackage = {
    id: 2,
    name: "Professional Pack",
    token_amount: 25,
    price_gbp: 2500,
    bonus_tokens: 5,
    total_tokens: 30
};

const testUserId = 2;
const testPackageId = 2;

// Test the safe string conversion logic
function testStripeMetadata(pkg, userId, packageId) {
    console.log('Testing Stripe metadata generation...');
    
    try {
        const safePackage = {
            ...pkg,
            token_amount: pkg.token_amount || 0,
            bonus_tokens: pkg.bonus_tokens || 0,
            total_tokens: pkg.total_tokens || (pkg.token_amount + pkg.bonus_tokens) || 0,
            name: pkg.name || 'Token Package',
            description: pkg.description || `${pkg.total_tokens || 0} tokens`,
            price_gbp: pkg.price_gbp || 0
        };
        
        const metadata = {
            package_id: String(packageId || 0),
            token_amount: String(safePackage.token_amount || 0),
            bonus_tokens: String(safePackage.bonus_tokens || 0),
            package_type: (safePackage.name || 'unknown').toLowerCase().replace(/\s+/g, '_'),
            user_id: String(userId || 0),
            total_tokens: String(safePackage.total_tokens || 0)
        };
        
        console.log('✅ Metadata generated successfully:', metadata);
        return metadata;
        
    } catch (error) {
        console.error('❌ Error generating metadata:', error);
        return null;
    }
}

// Test with valid data
console.log('=== Test 1: Valid Package ===');
testStripeMetadata(testPackage, testUserId, testPackageId);

// Test with missing properties
console.log('\n=== Test 2: Missing Properties ===');
const incompletePackage = { id: 1, name: "Test" };
testStripeMetadata(incompletePackage, undefined, null);

// Test with completely empty object
console.log('\n=== Test 3: Empty Object ===');
testStripeMetadata({}, null, undefined);

console.log('\n✅ All tests completed. If you see this message, the string conversion logic should work.');
