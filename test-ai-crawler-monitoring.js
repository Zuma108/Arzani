/**
 * Test script for AI Crawler Monitoring
 * Simulates AI crawler visits to test the monitoring system
 * Run with: node test-ai-crawler-monitoring.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test user agents for different AI crawlers
const TEST_CRAWLERS = [
  {
    name: 'GPTBot',
    userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot'
  },
  {
    name: 'ChatGPT-User',
    userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/chatgpt-user'
  },
  {
    name: 'CCBot',
    userAgent: 'CCBot/2.0 (+https://commoncrawl.org/faq/)'
  },
  {
    name: 'Claude-Web',
    userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Claude-Web/1.0; +https://anthropic.com/claude-web'
  },
  {
    name: 'PerplexityBot',
    userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/bot'
  }
];

// Test pages to crawl
const TEST_PAGES = [
  '/',
  '/marketplace-landing',
  '/business-valuation',
  '/blog',
  '/pricing',
  '/about-us',
  '/arzani-x',
  '/marketplace2'
];

async function simulateCrawlerVisit(crawler, page) {
  try {
    console.log(`🤖 Simulating ${crawler.name} visit to ${page}`);
    
    const response = await fetch(`${BASE_URL}${page}`, {
      headers: {
        'User-Agent': crawler.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });
    
    if (response.ok) {
      console.log(`✅ ${crawler.name} successfully crawled ${page} (${response.status})`);
    } else {
      console.log(`❌ ${crawler.name} failed to crawl ${page} (${response.status})`);
    }
    
    return response.status;
  } catch (error) {
    console.error(`❌ Error simulating ${crawler.name} visit to ${page}:`, error.message);
    return null;
  }
}

async function testAICrawlerMonitoring() {
  console.log('🚀 Starting AI Crawler Monitoring Test');
  console.log('=====================================');
  
  let totalRequests = 0;
  let successfulRequests = 0;
  
  // Simulate random crawler visits
  for (let i = 0; i < 20; i++) {
    const randomCrawler = TEST_CRAWLERS[Math.floor(Math.random() * TEST_CRAWLERS.length)];
    const randomPage = TEST_PAGES[Math.floor(Math.random() * TEST_PAGES.length)];
    
    totalRequests++;
    const status = await simulateCrawlerVisit(randomCrawler, randomPage);
    
    if (status && status >= 200 && status < 400) {
      successfulRequests++;
    }
    
    // Random delay between requests (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
  }
  
  console.log('=====================================');
  console.log('📊 Test Results:');
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Successful requests: ${successfulRequests}`);
  console.log(`Success rate: ${((successfulRequests / totalRequests) * 100).toFixed(1)}%`);
  
  // Test the analytics API
  console.log('\\n🔍 Testing Analytics API...');
  try {
    const statsResponse = await fetch(`${BASE_URL}/api/ai-crawler-stats`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Analytics API working');
      console.log(`📈 Total visits recorded: ${stats.data.totalVisits}`);
      console.log(`🤖 Unique crawlers detected: ${stats.data.uniqueCrawlers.length}`);
    } else {
      console.log('❌ Analytics API failed');
    }
  } catch (error) {
    console.error('❌ Error testing analytics API:', error.message);
  }
  
  console.log('\\n🎯 Test complete! Check the dashboard at: http://localhost:5000/ai-crawler-dashboard');
}

// Run the test
testAICrawlerMonitoring().catch(console.error);
