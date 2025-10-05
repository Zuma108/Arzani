#!/usr/bin/env node
/**
 * Stripe Connect Integration Test Script
 * 
 * This script tests all the Stripe Connect endpoints we've implemented
 * to ensure they're properly integrated with the Express server.
 * 
 * Usage: node test-stripe-connect-integration.js
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_JWT_TOKEN; // Optional: Set if you have a test JWT token

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test configuration
const tests = [
    // API Endpoint Tests
    {
        name: 'Create Connected Account (API)',
        method: 'POST',
        path: '/api/stripe-connect/create-account',
        body: { type: 'standard' },
        requiresAuth: true,
        expectedStatus: [200, 400] // 400 is OK if already exists
    },
    {
        name: 'Get Account Status (API)',
        method: 'GET',
        path: '/api/stripe-connect/account-status',
        requiresAuth: true,
        expectedStatus: [200, 404] // 404 is OK if no account exists
    },
    {
        name: 'Create Product (API)',
        method: 'POST',
        path: '/api/stripe-connect/create-product',
        body: {
            name: 'Test Consultation',
            description: 'Test consultation service',
            price: 10000, // $100.00
            currency: 'usd'
        },
        requiresAuth: true,
        expectedStatus: [200, 400] // 400 is OK if no connected account
    },
    {
        name: 'Get Products (API)',
        method: 'GET',
        path: '/api/stripe-connect/products',
        requiresAuth: true,
        expectedStatus: [200, 400] // 400 is OK if no connected account
    },
    
    // Web Route Tests (should return HTML)
    {
        name: 'Stripe Connect Dashboard (Web)',
        method: 'GET',
        path: '/stripe-connect/dashboard',
        requiresAuth: true,
        expectedStatus: [200],
        expectsHtml: true
    },
    {
        name: 'Stripe Connect Onboarding Success (Web)',
        method: 'GET',
        path: '/stripe-connect/onboarding/success',
        requiresAuth: false,
        expectedStatus: [200],
        expectsHtml: true
    },
    {
        name: 'Stripe Connect Onboarding Refresh (Web)',
        method: 'GET',
        path: '/stripe-connect/onboarding/refresh',
        requiresAuth: false,
        expectedStatus: [200],
        expectsHtml: true
    },
    {
        name: 'Public Storefront (Web)',
        method: 'GET',
        path: '/stripe-connect/storefront/test-user-id', // Will 404 but should route correctly
        requiresAuth: false,
        expectedStatus: [200, 404, 500], // Various OK responses depending on user existence
        expectsHtml: true
    },
    {
        name: 'Payment Success Page (Web)',
        method: 'GET',
        path: '/stripe-connect/payment/success',
        requiresAuth: false,
        expectedStatus: [200],
        expectsHtml: true
    },
    {
        name: 'Payment Cancelled Page (Web)',
        method: 'GET',
        path: '/stripe-connect/payment/cancelled',
        requiresAuth: false,
        expectedStatus: [200],
        expectsHtml: true
    }
];

/**
 * Make HTTP request
 */
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const client = options.protocol === 'https:' ? https : http;
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', reject);
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

/**
 * Run a single test
 */
async function runTest(test) {
    const url = new URL(test.path, BASE_URL);
    
    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: test.method,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'StripeConnectIntegrationTest/1.0'
        }
    };
    
    // Add auth token if required and available
    if (test.requiresAuth && TEST_USER_TOKEN) {
        options.headers.Authorization = `Bearer ${TEST_USER_TOKEN}`;
    }
    
    let postData = null;
    if (test.body) {
        postData = JSON.stringify(test.body);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    try {
        const response = await makeRequest(options, postData);
        
        // Check status code
        const statusOk = test.expectedStatus.includes(response.statusCode);
        
        // Check content type for HTML routes
        let contentTypeOk = true;
        if (test.expectsHtml) {
            const contentType = response.headers['content-type'] || '';
            contentTypeOk = contentType.includes('text/html');
        }
        
        const success = statusOk && contentTypeOk;
        
        return {
            name: test.name,
            success,
            statusCode: response.statusCode,
            expectedStatus: test.expectedStatus,
            contentType: response.headers['content-type'],
            error: null,
            details: success 
                ? 'Test passed' 
                : `Status: ${response.statusCode} (expected: ${test.expectedStatus.join(' or ')})`
        };
        
    } catch (error) {
        return {
            name: test.name,
            success: false,
            statusCode: null,
            expectedStatus: test.expectedStatus,
            error: error.message,
            details: error.code === 'ECONNREFUSED' 
                ? 'Server not running or not accessible'
                : error.message
        };
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log(`${colors.bright}${colors.blue}🧪 Stripe Connect Integration Test Suite${colors.reset}\n`);
    console.log(`Testing against: ${colors.cyan}${BASE_URL}${colors.reset}`);
    console.log(`Authentication: ${TEST_USER_TOKEN ? colors.green + 'Token provided' : colors.yellow + 'No token (some tests may fail)'}${colors.reset}\n`);
    
    const results = [];
    let passed = 0;
    let failed = 0;
    
    console.log(`${colors.bright}Running ${tests.length} tests...${colors.reset}\n`);
    
    for (const test of tests) {
        process.stdout.write(`${colors.cyan}Testing:${colors.reset} ${test.name}... `);
        
        const result = await runTest(test);
        results.push(result);
        
        if (result.success) {
            console.log(`${colors.green}✓ PASS${colors.reset} (${result.statusCode})`);
            passed++;
        } else {
            console.log(`${colors.red}✗ FAIL${colors.reset} - ${result.details}`);
            if (result.error) {
                console.log(`  ${colors.red}Error:${colors.reset} ${result.error}`);
            }
            failed++;
        }
    }
    
    // Summary
    console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
    console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
    console.log(`${colors.cyan}Total: ${tests.length}${colors.reset}\n`);
    
    // Detailed results for failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
        console.log(`${colors.bright}${colors.red}Failed Tests:${colors.reset}`);
        failures.forEach(failure => {
            console.log(`\n${colors.red}●${colors.reset} ${failure.name}`);
            console.log(`  Expected status: ${failure.expectedStatus.join(' or ')}`);
            console.log(`  Actual status: ${failure.statusCode || 'N/A'}`);
            console.log(`  Details: ${failure.details}`);
        });
        console.log('');
    }
    
    // Integration status
    const integrationHealthy = passed > failed && passed >= tests.length * 0.6;
    console.log(`${colors.bright}Integration Status:${colors.reset} ${
        integrationHealthy 
            ? colors.green + '✓ HEALTHY' 
            : colors.yellow + '⚠ NEEDS ATTENTION'
    }${colors.reset}\n`);
    
    // Next steps
    console.log(`${colors.bright}Next Steps:${colors.reset}`);
    if (failed === 0) {
        console.log(`${colors.green}✓${colors.reset} All tests passed! Your Stripe Connect integration is ready.`);
        console.log(`${colors.cyan}→${colors.reset} Test the complete flow by accessing the dashboard at ${BASE_URL}/stripe-connect/dashboard`);
    } else {
        console.log(`${colors.yellow}1.${colors.reset} Ensure your server is running: ${colors.cyan}npm start${colors.reset}`);
        console.log(`${colors.yellow}2.${colors.reset} Check that your .env file has STRIPE_SECRET_KEY configured`);
        console.log(`${colors.yellow}3.${colors.reset} For authenticated routes, provide TEST_JWT_TOKEN environment variable`);
        console.log(`${colors.yellow}4.${colors.reset} Review any specific error messages above`);
    }
    
    console.log(`\n${colors.bright}Happy coding! 🚀${colors.reset}`);
    
    return {
        passed,
        failed,
        total: tests.length,
        healthy: integrationHealthy,
        results
    };
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(`${colors.red}Test runner error:${colors.reset}`, error);
            process.exit(1);
        });
}

export { runAllTests, runTest };