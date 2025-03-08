/**
 * Test script for marketplace2 routes and functionality
 * Run with: node tests/test-marketplace-routes.js
 */

import fetch from 'node-fetch';
import { createServer } from 'http';
import { app } from '../server.js';
import { performance } from 'perf_hooks';

// Test configuration
const config = {
  baseUrl: 'http://localhost:5000',
  apiRoutes: [
    '/api/business/listings',
    '/api/business/listings?page=1&limit=10',
    '/api/business/listings?industries=Retail',
    '/api/business/listings?priceMin=100000&priceMax=500000',
    '/api/market/trends',
    '/api/verify-token'
  ],
  pageRoutes: [
    '/',
    '/marketplace',
    '/marketplace2',
    '/login',
    '/signup',
    '/profile',
    '/history'
  ],
  // Mock user for testing authenticated routes
  testUser: {
    email: 'test@example.com',
    password: 'password123'
  }
};

// Test server and functions
class MarketplaceTester {
  constructor() {
    this.server = null;
    this.token = null;
    this.results = {
      api: [],
      pages: [],
      functionality: []
    };
    this.startTime = 0;
  }

  async start() {
    try {
      // Start the test server
      await this.startServer();
      
      console.log('\n========= MARKETPLACE2 TEST SUITE =========\n');

      // Run tests
      await this.testPageLoads();
      await this.authenticateUser();
      await this.testApiRoutes();
      await this.testFunctionality();

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('Test failed with error:', error);
    } finally {
      this.stopServer();
    }
  }

  async startServer() {
    return new Promise((resolve) => {
      const port = process.env.TEST_PORT || 5001;
      this.server = createServer(app).listen(port, () => {
        console.log(`Test server running on port ${port}`);
        // Set base URL to test server
        config.baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  }

  stopServer() {
    if (this.server) {
      this.server.close();
      console.log('Test server stopped');
    }
  }

  async testPageLoads() {
    console.log('\n➡️ Testing page load times...\n');

    for (const route of config.pageRoutes) {
      this.startTime = performance.now();
      
      try {
        const response = await fetch(`${config.baseUrl}${route}`);
        const timeElapsed = (performance.now() - this.startTime).toFixed(2);
        
        const html = await response.text();
        const size = html.length / 1024;
        
        this.results.pages.push({
          route,
          status: response.status,
          time: timeElapsed,
          size: size.toFixed(2),
          success: response.status === 200
        });

        console.log(`${response.status === 200 ? '✅' : '❌'} ${route} - ${response.status} - ${timeElapsed}ms - ${size.toFixed(2)}KB`);
      } catch (error) {
        const timeElapsed = (performance.now() - this.startTime).toFixed(2);
        this.results.pages.push({
          route,
          status: 'Error',
          time: timeElapsed,
          error: error.message,
          success: false
        });
        console.log(`❌ ${route} - Error: ${error.message} - ${timeElapsed}ms`);
      }
    }
  }

  async authenticateUser() {
    console.log('\n➡️ Getting authentication token...');
    
    try {
      const response = await fetch(`${config.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config.testUser)
      });
      
      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      return false;
    }
  }

  async testApiRoutes() {
    console.log('\n➡️ Testing API routes...\n');
    
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    for (const route of config.apiRoutes) {
      this.startTime = performance.now();
      
      try {
        const response = await fetch(`${config.baseUrl}${route}`, { 
          headers 
        });
        const timeElapsed = (performance.now() - this.startTime).toFixed(2);
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          data = { error: 'Could not parse JSON response' };
        }
        
        const size = JSON.stringify(data).length / 1024;
        
        this.results.api.push({
          route,
          status: response.status,
          time: timeElapsed,
          size: size.toFixed(2),
          success: response.status >= 200 && response.status < 300
        });
        
        console.log(`${response.ok ? '✅' : '❌'} ${route} - ${response.status} - ${timeElapsed}ms - ${size.toFixed(2)}KB`);
      } catch (error) {
        const timeElapsed = (performance.now() - this.startTime).toFixed(2);
        
        this.results.api.push({
          route,
          status: 'Error',
          time: timeElapsed,
          error: error.message,
          success: false
        });
        
        console.log(`❌ ${route} - Error: ${error.message} - ${timeElapsed}ms`);
      }
    }
  }

  async testFunctionality() {
    console.log('\n➡️ Testing core functionality...\n');
    
    const tests = [
      { name: 'Business Listings Filter', fn: this.testBusinessFilters.bind(this) },
      { name: 'Business Search', fn: this.testBusinessSearch.bind(this) },
      { name: 'Get Single Business', fn: this.testSingleBusiness.bind(this) },
      { name: 'Pagination', fn: this.testPagination.bind(this) }
    ];
    
    for (const test of tests) {
      console.log(`Testing: ${test.name}...`);
      await test.fn();
    }
  }

  async testBusinessFilters() {
    const filters = [
      { industries: 'Retail', name: 'Industry filter' },
      { priceMin: 100000, name: 'Price minimum filter' },
      { priceMax: 500000, name: 'Price maximum filter' },
      { location: 'London', name: 'Location filter' }
    ];
    
    for (const filter of filters) {
      const params = new URLSearchParams();
      
      // Add filter parameters
      Object.entries(filter).forEach(([key, value]) => {
        if (key !== 'name') params.append(key, value);
      });
      
      const startTime = performance.now();
      
      try {
        const response = await fetch(`${config.baseUrl}/api/business/listings?${params.toString()}`);
        const timeElapsed = (performance.now() - startTime).toFixed(2);
        const data = await response.json();
        
        this.results.functionality.push({
          test: `Filter - ${filter.name}`,
          status: response.status,
          time: timeElapsed,
          recordsReturned: data.businesses?.length || 0,
          success: response.ok && Array.isArray(data.businesses)
        });
        
        console.log(`${response.ok ? '✅' : '❌'} Filter ${filter.name} - ${data.businesses?.length || 0} results - ${timeElapsed}ms`);
      } catch (error) {
        const timeElapsed = (performance.now() - startTime).toFixed(2);
        
        this.results.functionality.push({
          test: `Filter - ${filter.name}`,
          status: 'Error',
          time: timeElapsed,
          error: error.message,
          success: false
        });
        
        console.log(`❌ Filter ${filter.name} - Error: ${error.message} - ${timeElapsed}ms`);
      }
    }
  }

  async testBusinessSearch() {
    const startTime = performance.now();
    
    try {
      const searchTerm = 'business';
      const response = await fetch(`${config.baseUrl}/api/business/listings/search?query=${searchTerm}`);
      const timeElapsed = (performance.now() - startTime).toFixed(2);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { error: 'Could not parse JSON response' };
      }
      
      this.results.functionality.push({
        test: 'Business Search',
        status: response.status,
        time: timeElapsed,
        recordsReturned: data.results?.length || 0,
        success: response.ok && Array.isArray(data.results || data.businesses)
      });
      
      console.log(`${response.ok ? '✅' : '❌'} Business Search - ${data.results?.length || data.businesses?.length || 0} results - ${timeElapsed}ms`);
    } catch (error) {
      const timeElapsed = (performance.now() - startTime).toFixed(2);
      
      this.results.functionality.push({
        test: 'Business Search',
        status: 'Error',
        time: timeElapsed,
        error: error.message,
        success: false
      });
      
      console.log(`❌ Business Search - Error: ${error.message} - ${timeElapsed}ms`);
    }
  }

  async testSingleBusiness() {
    // First get a list of businesses
    try {
      const listResponse = await fetch(`${config.baseUrl}/api/business/listings`);
      const listData = await listResponse.json();
      
      if (!listData.businesses || listData.businesses.length === 0) {
        console.log('❌ Cannot test single business - no business listings available');
        return;
      }
      
      const businessId = listData.businesses[0].id;
      const startTime = performance.now();
      
      try {
        const response = await fetch(`${config.baseUrl}/api/business/${businessId}`);
        const timeElapsed = (performance.now() - startTime).toFixed(2);
        const data = await response.json();
        
        this.results.functionality.push({
          test: 'Get Single Business',
          status: response.status,
          time: timeElapsed,
          businessId,
          success: response.ok && data.id === businessId
        });
        
        console.log(`${response.ok ? '✅' : '❌'} Get Business ID ${businessId} - ${response.status} - ${timeElapsed}ms`);
      } catch (error) {
        const timeElapsed = (performance.now() - startTime).toFixed(2);
        
        this.results.functionality.push({
          test: 'Get Single Business',
          status: 'Error',
          time: timeElapsed,
          businessId,
          error: error.message,
          success: false
        });
        
        console.log(`❌ Get Business - Error: ${error.message} - ${timeElapsed}ms`);
      }
    } catch (error) {
      console.log('❌ Failed to get business listings:', error.message);
    }
  }

  async testPagination() {
    const pageTests = [1, 2, 3];
    
    for (const page of pageTests) {
      const startTime = performance.now();
      
      try {
        const response = await fetch(`${config.baseUrl}/api/business/listings?page=${page}&limit=5`);
        const timeElapsed = (performance.now() - startTime).toFixed(2);
        const data = await response.json();
        
        this.results.functionality.push({
          test: `Pagination - Page ${page}`,
          status: response.status,
          time: timeElapsed,
          recordsReturned: data.businesses?.length || 0,
          currentPage: data.currentPage,
          success: response.ok && data.currentPage === page
        });
        
        console.log(`${response.ok ? '✅' : '❌'} Pagination page ${page} - ${data.businesses?.length || 0} results - ${timeElapsed}ms`);
      } catch (error) {
        const timeElapsed = (performance.now() - startTime).toFixed(2);
        
        this.results.functionality.push({
          test: `Pagination - Page ${page}`,
          status: 'Error',
          time: timeElapsed,
          error: error.message,
          success: false
        });
        
        console.log(`❌ Pagination page ${page} - Error: ${error.message} - ${timeElapsed}ms`);
      }
    }
  }

  printSummary() {
    console.log('\n========= TEST SUMMARY =========\n');
    
    // Page load summary
    const pageResults = this.results.pages;
    const successfulPages = pageResults.filter(r => r.success).length;
    const avgPageTime = pageResults.reduce((sum, r) => sum + parseFloat(r.time), 0) / pageResults.length;
    
    console.log(`📄 Page Tests: ${successfulPages}/${pageResults.length} successful, avg: ${avgPageTime.toFixed(2)}ms`);
    
    // API route summary
    const apiResults = this.results.api;
    const successfulApi = apiResults.filter(r => r.success).length;
    const avgApiTime = apiResults.reduce((sum, r) => sum + parseFloat(r.time), 0) / apiResults.length;
    
    console.log(`🌐 API Tests: ${successfulApi}/${apiResults.length} successful, avg: ${avgApiTime.toFixed(2)}ms`);
    
    // Functionality summary
    const functionalityResults = this.results.functionality;
    const successfulFunctionality = functionalityResults.filter(r => r.success).length;
    
    console.log(`⚙️ Functionality Tests: ${successfulFunctionality}/${functionalityResults.length} successful`);
    
    // Overall performance
    const allTimes = [
      ...pageResults.map(r => parseFloat(r.time)),
      ...apiResults.map(r => parseFloat(r.time)),
      ...functionalityResults.map(r => parseFloat(r.time))
    ];
    
    const maxTime = Math.max(...allTimes);
    const minTime = Math.min(...allTimes);
    const avgTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
    
    console.log(`\n⏱️ Performance: min ${minTime.toFixed(2)}ms, max ${maxTime.toFixed(2)}ms, avg ${avgTime.toFixed(2)}ms`);
    
    // Issues
    const slowThreshold = 1000; // 1 second
    const slowTests = [
      ...pageResults.filter(r => parseFloat(r.time) > slowThreshold),
      ...apiResults.filter(r => parseFloat(r.time) > slowThreshold),
      ...functionalityResults.filter(r => parseFloat(r.time) > slowThreshold)
    ];
    
    if (slowTests.length > 0) {
      console.log(`\n⚠️ Found ${slowTests.length} slow tests (>${slowThreshold}ms):`);
      slowTests.forEach(test => {
        const route = test.route || test.test;
        console.log(`  - ${route}: ${test.time}ms`);
      });
    }
    
    // Errors
    const failedTests = [
      ...pageResults.filter(r => !r.success),
      ...apiResults.filter(r => !r.success),
      ...functionalityResults.filter(r => !r.success)
    ];
    
    if (failedTests.length > 0) {
      console.log(`\n❌ Found ${failedTests.length} failed tests:`);
      failedTests.forEach(test => {
        const route = test.route || test.test;
        const error = test.error ? `: ${test.error}` : '';
        console.log(`  - ${route}${error}`);
      });
    }
    
    // Report success percentage
    const totalTests = pageResults.length + apiResults.length + functionalityResults.length;
    const successfulTests = successfulPages + successfulApi + successfulFunctionality;
    const successRate = (successfulTests / totalTests) * 100;
    
    console.log(`\n🏆 Overall success rate: ${successRate.toFixed(2)}%`);
    
    // Recommendations
    console.log('\n✨ Recommendations:');
    
    if (avgPageTime > 500) {
      console.log('  - Consider optimizing page load times (current avg: ' + avgPageTime.toFixed(2) + 'ms)');
    }
    
    if (slowTests.length > 0) {
      console.log('  - Optimize slow endpoints and routes (found ' + slowTests.length + ' slow tests)');
    }
    
    if (failedTests.length > 0) {
      console.log('  - Fix failed routes and functionality (found ' + failedTests.length + ' failures)');
    } else {
      console.log('  - All tests passed! Focus on performance optimizations.');
    }
    
    console.log('\n========= END OF TEST SUMMARY =========');
  }
}

// Run the tests
const tester = new MarketplaceTester();
tester.start();
