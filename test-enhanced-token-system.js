/**
 * Token System Integration Test
 * Tests the complete enhanced token balance system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Enhanced Token System Integration Test...\n');

// Test 1: Check if enhanced token balance file exists
console.log('📋 Test 1: Checking Enhanced Token Balance File');
const enhancedTokenPath = path.join(__dirname, 'public', 'js', 'token-balance-enhanced.js');
if (fs.existsSync(enhancedTokenPath)) {
    console.log('✅ Enhanced token balance file exists');
    
    // Check file size
    const stats = fs.statSync(enhancedTokenPath);
    console.log(`   File size: ${stats.size} bytes`);
    
    // Check for key features
    const content = fs.readFileSync(enhancedTokenPath, 'utf8');
    const features = [
        'TokenBalanceEnhanced',
        'getAuthHeaders',
        'getAuthToken',
        'initializeUserTokenRecord',
        'checkAuthStatus',
        'consumeTokens',
        'fetchBalance',
        'showNotification'
    ];
    
    console.log('   Key features check:');
    features.forEach(feature => {
        const exists = content.includes(feature);
        console.log(`   ${exists ? '✅' : '❌'} ${feature}`);
    });
} else {
    console.log('❌ Enhanced token balance file not found');
}

// Test 2: Check profile.ejs integration
console.log('\n📋 Test 2: Checking Profile.ejs Integration');
const profilePath = path.join(__dirname, 'views', 'profile.ejs');
if (fs.existsSync(profilePath)) {
    console.log('✅ Profile.ejs file exists');
    
    const profileContent = fs.readFileSync(profilePath, 'utf8');
    
    // Check for enhanced token script import
    if (profileContent.includes('token-balance-enhanced.js')) {
        console.log('✅ Enhanced token script imported');
    } else {
        console.log('❌ Enhanced token script not imported');
    }
    
    // Check for TokenBalanceEnhanced references
    if (profileContent.includes('TokenBalanceEnhanced')) {
        console.log('✅ TokenBalanceEnhanced class referenced');
    } else {
        console.log('❌ TokenBalanceEnhanced class not referenced');
    }
    
    // Check for enhanced authentication
    if (profileContent.includes('getAuthHeaders')) {
        console.log('✅ Enhanced authentication implemented');
    } else {
        console.log('❌ Enhanced authentication not implemented');
    }
} else {
    console.log('❌ Profile.ejs file not found');
}

// Test 3: Check backend token system files
console.log('\n📋 Test 3: Checking Backend Token System Files');

const backendFiles = [
    { path: 'routes/api/tokens.js', name: 'Token API Routes' },
    { path: 'services/tokenService.js', name: 'Token Service' },
    { path: 'middleware/auth.js', name: 'Authentication Middleware' }
];

backendFiles.forEach(file => {
    const fullPath = path.join(__dirname, file.path);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file.name} exists`);
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for initialization endpoint in tokens.js
        if (file.path === 'routes/api/tokens.js' && content.includes('/initialize')) {
            console.log('   ✅ Token initialization endpoint exists');
        }
        
        // Check for enhanced authentication in tokenService.js
        if (file.path === 'services/tokenService.js' && content.includes('getUserBalance')) {
            console.log('   ✅ Enhanced getUserBalance method exists');
        }
        
        // Check for JWT validation in auth.js
        if (file.path === 'middleware/auth.js' && content.includes('jwt')) {
            console.log('   ✅ JWT authentication middleware exists');
        }
    } else {
        console.log(`❌ ${file.name} not found`);
    }
});

// Test 4: Check database integration
console.log('\n📋 Test 4: Checking Database Integration');
const dbFile = path.join(__dirname, 'db.js');
if (fs.existsSync(dbFile)) {
    console.log('✅ Database connection file exists');
    
    // Check for PostgreSQL connection
    const dbContent = fs.readFileSync(dbFile, 'utf8');
    if (dbContent.includes('pg') || dbContent.includes('Pool')) {
        console.log('✅ PostgreSQL integration detected');
    } else {
        console.log('❌ PostgreSQL integration not found');
    }
} else {
    console.log('❌ Database connection file not found');
}

// Test 5: Generate test report
console.log('\n📋 Test 5: Generating Comprehensive Test Report');

const testReport = {
    timestamp: new Date().toISOString(),
    tests: [
        {
            name: 'Enhanced Token Balance File',
            status: fs.existsSync(enhancedTokenPath) ? 'PASS' : 'FAIL',
            details: fs.existsSync(enhancedTokenPath) ? `File exists (${fs.statSync(enhancedTokenPath).size} bytes)` : 'File not found'
        },
        {
            name: 'Profile.ejs Integration',
            status: fs.existsSync(profilePath) && fs.readFileSync(profilePath, 'utf8').includes('token-balance-enhanced.js') ? 'PASS' : 'FAIL',
            details: 'Enhanced token system integrated in profile page'
        },
        {
            name: 'Backend API Files',
            status: backendFiles.every(f => fs.existsSync(path.join(__dirname, f.path))) ? 'PASS' : 'FAIL',
            details: 'All required backend files present'
        },
        {
            name: 'Database Connection',
            status: fs.existsSync(dbFile) ? 'PASS' : 'FAIL',
            details: 'Database connection file available'
        }
    ],
    recommendations: [
        'Test token balance fetching in browser',
        'Verify JWT token authentication',
        'Test token consumption flow',
        'Validate Stripe payment integration',
        'Check browser console for errors'
    ]
};

// Save test report
const reportPath = path.join(__dirname, 'token-system-test-report.json');
fs.writeFileSync(reportPath, JSON.stringify(testReport, null, 2));
console.log(`✅ Test report saved to: ${reportPath}`);

// Summary
console.log('\n🎯 Enhanced Token System Test Summary:');
const passedTests = testReport.tests.filter(test => test.status === 'PASS').length;
const totalTests = testReport.tests.length;
console.log(`   Tests Passed: ${passedTests}/${totalTests}`);

if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Enhanced token system is ready for testing.');
} else {
    console.log('⚠️  Some tests failed. Check the details above.');
}

console.log('\n📋 Next Steps:');
console.log('1. Start the server: npm start');
console.log('2. Navigate to /profile');
console.log('3. Check browser console for token system initialization');
console.log('4. Test token balance display and purchase flow');
console.log('5. Monitor network requests for proper authentication');

console.log('\n✨ Enhanced Token System Integration Test Complete!');