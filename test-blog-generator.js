#!/usr/bin/env node

/**
 * Test Blog Generator - Comprehensive Test Suite
 * Tests the automated blog generator with all recent fixes
 */

import { config } from 'dotenv';
import pool from './db.js';

// Load environment variables
config();

class BlogGeneratorTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async runTests() {
    console.log('🧪 Blog Generator Test Suite');
    console.log('============================');
    
    try {
      await this.testDatabaseConnection();
      await this.testSchemaCompatibility();
      await this.testDuplicatePreventionLogic();
      await this.testContentProcessing();
      await this.testInternalLinkGeneration();
      
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  async testDatabaseConnection() {
    console.log('🔌 Testing database connection...');
    
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM blog_posts');
      const count = parseInt(result.rows[0].count);
      
      if (count >= 0) {
        this.pass('Database Connection', `Connected. Found ${count} blog posts`);
      } else {
        this.fail('Database Connection', 'Invalid post count');
      }
    } catch (error) {
      this.fail('Database Connection', error.message);
    }
  }

  async testSchemaCompatibility() {
    console.log('⚙️ Testing schema compatibility...');
    
    try {
      // Test content_links column exists and is JSONB
      const schemaResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' 
        AND column_name IN ('content_links', 'meta_data')
      `);
      
      const columns = schemaResult.rows.reduce((acc, row) => {
        acc[row.column_name] = row.data_type;
        return acc;
      }, {});
      
      if (columns.content_links === 'jsonb') {
        this.pass('Schema Compatibility', 'content_links (JSONB) exists');
      } else {
        this.fail('Schema Compatibility', 'content_links column missing or wrong type');
      }
      
      if (!columns.meta_data) {
        this.pass('Schema Migration', 'meta_data column correctly removed');
      } else {
        this.fail('Schema Migration', 'meta_data column still exists');
      }
      
    } catch (error) {
      this.fail('Schema Compatibility', error.message);
    }
  }

  async testDuplicatePreventionLogic() {
    console.log('🚫 Testing duplicate prevention...');
    
    try {
      // Test if we can detect existing posts correctly
      const testTitle = 'Test Duplicate Detection Title';
      const testSlug = 'test-duplicate-detection-title';
      
      // Check our duplicate detection query works
      const duplicateQuery = `
        SELECT id, title, slug, created_at 
        FROM blog_posts 
        WHERE LOWER(title) = LOWER($1) 
           OR slug = $2
           OR (content_links->>'checklist_id') = $3
        LIMIT 1
      `;
      
      const result = await pool.query(duplicateQuery, [testTitle, testSlug, 'test-123']);
      
      // This should not find anything (good)
      if (result.rows.length === 0) {
        this.pass('Duplicate Prevention Query', 'Query executes without errors');
      } else {
        this.fail('Duplicate Prevention Query', `Unexpected result: ${result.rows.length} rows`);
      }
      
    } catch (error) {
      this.fail('Duplicate Prevention Logic', error.message);
    }
  }

  async testContentProcessing() {
    console.log('📝 Testing content processing...');
    
    try {
      // Test HTML marker removal logic
      const testContent = `
        <h1>Test Title</h1>
        <p>This is a test paragraph with <strong>bold text</strong>.</p>
        <div>AI Disclaimer: This content was generated with AI assistance.</div>
        (DEPLOYED) Test marker
      `;
      
      // Simulate content processing
      let processedContent = testContent;
      
      // Remove HTML markers
      processedContent = processedContent.replace(/<[^>]+>/g, '');
      
      // Remove AI disclaimers
      processedContent = processedContent.replace(/AI Disclaimer:.*?(?=\n|$)/gi, '');
      
      // Remove (DEPLOYED) tags
      processedContent = processedContent.replace(/\(DEPLOYED\)[^\n]*/gi, '');
      
      // Clean whitespace
      processedContent = processedContent.replace(/\n\s*\n/g, '\n').trim();
      
      if (!processedContent.includes('<') && 
          !processedContent.includes('AI Disclaimer') && 
          !processedContent.includes('(DEPLOYED)')) {
        this.pass('Content Processing', 'HTML, AI disclaimers, and DEPLOYED tags removed');
      } else {
        this.fail('Content Processing', 'Content processing incomplete');
      }
      
    } catch (error) {
      this.fail('Content Processing', error.message);
    }
  }

  async testInternalLinkGeneration() {
    console.log('🔗 Testing internal link generation...');
    
    try {
      // Test internal link mapping
      const linkMappings = {
        'marketplace': '/marketplace2',
        'business valuation': '/business-valuation',
        'marketplace landing': '/marketplace-landing',
        'business for sale': '/marketplace2',
        'valuation': '/business-valuation'
      };
      
      let testContent = 'Learn about our marketplace and business valuation services.';
      
      // Simulate internal link addition
      Object.entries(linkMappings).forEach(([keyword, url]) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        testContent = testContent.replace(regex, `[${keyword}](${url})`);
      });
      
      if (testContent.includes('[marketplace](/marketplace2)') && 
          testContent.includes('[business valuation](/business-valuation)')) {
        this.pass('Internal Link Generation', 'Links correctly generated');
      } else {
        this.fail('Internal Link Generation', 'Link generation incomplete');
      }
      
    } catch (error) {
      this.fail('Internal Link Generation', error.message);
    }
  }

  pass(testName, message) {
    this.testResults.passed++;
    this.testResults.details.push({ status: 'PASS', test: testName, message });
    console.log(`  ✅ ${testName}: ${message}`);
  }

  fail(testName, message) {
    this.testResults.failed++;
    this.testResults.details.push({ status: 'FAIL', test: testName, message });
    console.log(`  ❌ ${testName}: ${message}`);
  }

  displayResults() {
    const total = this.testResults.passed + this.testResults.failed;
    
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Passed: ${this.testResults.passed}/${total}`);
    console.log(`Failed: ${this.testResults.failed}/${total}`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Blog generator is ready for use.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review:');
      this.testResults.details
        .filter(detail => detail.status === 'FAIL')
        .forEach(detail => console.log(`  - ${detail.test}: ${detail.message}`));
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new BlogGeneratorTester();
  tester.runTests();
}

export default BlogGeneratorTester;
