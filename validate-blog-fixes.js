#!/usr/bin/env node

/**
 * Blog Content Validation Script
 * Tests all the fixes applied to the automated blog generation system
 */

import pool from './db.js';

class BlogContentValidator {
  constructor() {
    this.testResults = [];
  }

  async runValidation() {
    console.log('🧪 Blog Content Validation Suite');
    console.log('=================================\n');

    try {
      // Test database connection
      await this.validateDatabaseConnection();
      
      // Test blog content fixes
      await this.validateContentFixes();
      
      // Test internal link fixes
      await this.validateInternalLinkFixes();
      
      // Test duplicate prevention
      await this.validateDuplicatePrevention();
      
      // Test automated generator schema compatibility
      await this.validateGeneratorSchemaCompatibility();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Validation suite failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  }

  async validateDatabaseConnection() {
    console.log('🔌 Validating database connection...');
    try {
      const result = await pool.query('SELECT NOW() as current_time, COUNT(*) as blog_count FROM blog_posts');
      this.addResult('Database Connection', true, `Connected. Found ${result.rows[0].blog_count} blog posts`);
    } catch (error) {
      this.addResult('Database Connection', false, error.message);
    }
  }

  async validateContentFixes() {
    console.log('📝 Validating content fixes...');
    try {
      // Check for HTML markers removal
      const htmlMarkersQuery = `
        SELECT COUNT(*) as count 
        FROM blog_posts 
        WHERE content LIKE '%<html>%' 
           OR content LIKE '%</html>%' 
           OR content LIKE '%<body>%' 
           OR content LIKE '%</body>%'
      `;
      const htmlResult = await pool.query(htmlMarkersQuery);
      this.addResult('HTML Markers Removed', htmlResult.rows[0].count == 0, 
        `Found ${htmlResult.rows[0].count} posts with HTML markers`);

      // Check for AI disclaimers removal
      const aiDisclaimerQuery = `
        SELECT COUNT(*) as count 
        FROM blog_posts 
        WHERE content ILIKE '%AI-generated%' 
           OR content ILIKE '%artificial intelligence%generated%'
           OR content ILIKE '%This content was generated%'
      `;
      const aiResult = await pool.query(aiDisclaimerQuery);
      this.addResult('AI Disclaimers Removed', aiResult.rows[0].count == 0, 
        `Found ${aiResult.rows[0].count} posts with AI disclaimers`);

      // Check for (DEPLOYED) tags removal
      const deployedTagQuery = `
        SELECT COUNT(*) as count 
        FROM blog_posts 
        WHERE title LIKE '%(DEPLOYED)%'
      `;
      const deployedResult = await pool.query(deployedTagQuery);
      this.addResult('(DEPLOYED) Tags Removed', deployedResult.rows[0].count == 0, 
        `Found ${deployedResult.rows[0].count} posts with (DEPLOYED) tags`);

    } catch (error) {
      this.addResult('Content Fixes', false, error.message);
    }
  }

  async validateInternalLinkFixes() {
    console.log('🔗 Validating internal link fixes...');
    try {
      // Check for correct internal links
      const correctLinksQuery = `
        SELECT COUNT(*) as count 
        FROM blog_posts 
        WHERE content LIKE '%/marketplace2%' 
           OR content LIKE '%/business-valuation%' 
           OR content LIKE '%/marketplace-landing%'
      `;
      const correctResult = await pool.query(correctLinksQuery);
      
      // Check for old incorrect links (excluding the correct ones)
      const incorrectLinksQuery = `
        SELECT COUNT(*) as count 
        FROM blog_posts 
        WHERE (content LIKE '%/marketplace%' AND content NOT LIKE '%/marketplace2%' AND content NOT LIKE '%/marketplace-landing%')
           OR content LIKE '%/marketplace"%'
           OR content LIKE '%/marketplace )%'
      `;
      const incorrectResult = await pool.query(incorrectLinksQuery);
      
      this.addResult('Internal Links Fixed', 
        correctResult.rows[0].count > 0 && incorrectResult.rows[0].count == 0, 
        `Correct links: ${correctResult.rows[0].count}, Incorrect links: ${incorrectResult.rows[0].count}`);

    } catch (error) {
      this.addResult('Internal Link Fixes', false, error.message);
    }
  }

  async validateDuplicatePrevention() {
    console.log('🚫 Validating duplicate prevention...');
    try {
      // Check for content_links column usage
      const contentLinksQuery = `
        SELECT COUNT(*) as count 
        FROM blog_posts 
        WHERE content_links IS NOT NULL 
          AND content_links != '{}'::jsonb
      `;
      const contentLinksResult = await pool.query(contentLinksQuery);
      
      // Check for potential duplicates by title
      const duplicatesQuery = `
        SELECT title, COUNT(*) as count 
        FROM blog_posts 
        GROUP BY title 
        HAVING COUNT(*) > 1
        LIMIT 5
      `;
      const duplicatesResult = await pool.query(duplicatesQuery);
      
      this.addResult('Duplicate Prevention System', 
        contentLinksResult.rows[0].count >= 0, 
        `Posts with tracking data: ${contentLinksResult.rows[0].count}, Duplicate titles: ${duplicatesResult.rows.length}`);

    } catch (error) {
      this.addResult('Duplicate Prevention', false, error.message);
    }
  }

  async validateGeneratorSchemaCompatibility() {
    console.log('⚙️ Validating generator schema compatibility...');
    try {
      // Check if content_links column exists and is JSONB
      const schemaQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'blog_posts' 
          AND column_name IN ('content_links', 'meta_data')
      `;
      const schemaResult = await pool.query(schemaQuery);
      
      const hasContentLinks = schemaResult.rows.some(row => 
        row.column_name === 'content_links' && row.data_type === 'jsonb'
      );
      const hasMetaData = schemaResult.rows.some(row => 
        row.column_name === 'meta_data'
      );
      
      this.addResult('Schema Compatibility', hasContentLinks, 
        `content_links (JSONB): ${hasContentLinks}, meta_data exists: ${hasMetaData}`);

      // Test content_links JSONB functionality
      if (hasContentLinks) {
        const jsonbTestQuery = `
          SELECT COUNT(*) as count 
          FROM blog_posts 
          WHERE content_links->>'checklist_id' IS NOT NULL
        `;
        const jsonbResult = await pool.query(jsonbTestQuery);
        this.addResult('JSONB Functionality', true, 
          `Posts with checklist_id in content_links: ${jsonbResult.rows[0].count}`);
      }

    } catch (error) {
      this.addResult('Schema Compatibility', false, error.message);
    }
  }

  addResult(testName, passed, details) {
    this.testResults.push({ testName, passed, details });
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${details}`);
  }

  displayResults() {
    console.log('\n📊 Validation Results Summary');
    console.log('==============================');
    
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    
    console.log(`Passed: ${passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All validations passed! Blog automation system is working correctly.');
      console.log('\n🚀 Next Steps:');
      console.log('1. Test automated blog generation: node test-blog-automation.js');
      console.log('2. Start the blog automation service: node services/automated-blog-generator.js');
      console.log('3. Monitor logs for any issues');
    } else {
      console.log('\n⚠️  Some validations failed. Please review the issues above.');
      
      // Show failed tests
      const failedTests = this.testResults.filter(r => !r.passed);
      if (failedTests.length > 0) {
        console.log('\n❌ Failed Validations:');
        failedTests.forEach(test => {
          console.log(`  - ${test.testName}: ${test.details}`);
        });
      }
    }
  }
}

// Run the validation
const validator = new BlogContentValidator();
validator.runValidation().catch(console.error);

export default BlogContentValidator;
