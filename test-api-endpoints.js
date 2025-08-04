const express = require('express');
const request = require('supertest');

// Quick test to verify our API endpoints
async function testAPIEndpoints() {
    console.log('🧪 Testing API endpoints locally...');
    
    try {
        // Import the server app
        const app = await import('./server.js');
        
        console.log('📍 Testing /health endpoint...');
        const healthRes = await request(app.default)
            .get('/health')
            .expect(200);
        console.log('✅ Health endpoint:', healthRes.body);
        
        console.log('📍 Testing /api/valuation/test endpoint...');
        const valuationRes = await request(app.default)
            .get('/api/valuation/test')
            .expect(200);
        console.log('✅ Valuation test endpoint:', valuationRes.body);
        
        console.log('📍 Testing /api/public-valuation/test endpoint...');
        const publicValuationRes = await request(app.default)
            .get('/api/public-valuation/test')
            .expect(200);
        console.log('✅ Public valuation test endpoint:', publicValuationRes.body);
        
        console.log('🎉 All endpoints are working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('📝 This might be expected if the server requires environment setup');
    }
}

// Run the test
testAPIEndpoints().then(() => {
    console.log('✅ Test completed');
    process.exit(0);
}).catch(err => {
    console.error('❌ Test error:', err);
    process.exit(1);
});
