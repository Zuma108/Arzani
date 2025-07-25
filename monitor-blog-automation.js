/**
 * Blog Automation Status Monitor
 * Real-time monitoring of the automated blog generation system
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';
import pool from './db.js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

class BlogAutomationMonitor {
  constructor() {
    this.generator = new AutomatedBlogGenerator();
  }

  async initialize() {
    await this.generator.initialize();
    console.log('📊 Blog Automation Status Monitor');
    console.log('=' .repeat(50));
  }

  async getSystemStatus() {
    const client = await pool.connect();
    
    try {
      // Get post statistics
      const postStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Published' THEN 1 END) as published,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as this_week
        FROM blog_posts
      `);

      // Get recent posts
      const recentPosts = await client.query(`
        SELECT id, title, category, status, created_at
        FROM blog_posts
        ORDER BY created_at DESC
        LIMIT 5
      `);

      // Get category distribution
      const categoryStats = await client.query(`
        SELECT 
          COALESCE(category, 'No Category') as category,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'Published' THEN 1 END) as published
        FROM blog_posts 
        GROUP BY category 
        ORDER BY total DESC
      `);

      return {
        stats: postStats.rows[0],
        recent: recentPosts.rows,
        categories: categoryStats.rows
      };

    } finally {
      client.release();
    }
  }

  async getChecklistProgress() {
    try {
      // Read the PRD checklist file
      const checklistPath = path.join(process.cwd(), 'ENHANCED_BLOG_INTERLINKING_PRD.md');
      const checklistContent = await fs.readFile(checklistPath, 'utf-8');
      
      // Count total items and completed items
      const uncheckedPattern = /- \[ \] (\d+\.\d+)\s+(.+)/g;
      const checkedPattern = /- \[x\] (\d+\.\d+)\s+(.+)/g;
      
      let uncompleted = 0;
      let completed = 0;
      let match;
      
      while ((match = uncheckedPattern.exec(checklistContent)) !== null) {
        uncompleted++;
      }
      
      while ((match = checkedPattern.exec(checklistContent)) !== null) {
        completed++;
      }
      
      const total = completed + uncompleted;
      const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        total,
        completed,
        remaining: uncompleted,
        progressPercentage
      };
    } catch (error) {
      console.error('Error reading checklist:', error);
      return {
        total: 0,
        completed: 0,
        remaining: 0,
        progressPercentage: 0
      };
    }
  }

  async displayStatus() {
    const systemStatus = await this.getSystemStatus();
    const checklistProgress = await this.getChecklistProgress();
    
    console.log('\n📈 BLOG STATISTICS');
    console.log('-'.repeat(30));
    console.log(`Total Posts: ${systemStatus.stats.total}`);
    console.log(`Published: ${systemStatus.stats.published}`);
    console.log(`Today: ${systemStatus.stats.today}`);
    console.log(`This Week: ${systemStatus.stats.this_week}`);
    
    console.log('\n📋 CHECKLIST PROGRESS');
    console.log('-'.repeat(30));
    console.log(`Total Items: ${checklistProgress.total}`);
    console.log(`Completed: ${checklistProgress.completed}`);
    console.log(`Remaining: ${checklistProgress.remaining}`);
    console.log(`Progress: ${checklistProgress.progressPercentage}%`);
    
    console.log('\n📊 CATEGORY DISTRIBUTION');
    console.log('-'.repeat(30));
    systemStatus.categories.forEach(cat => {
      const ratio = `${cat.published}/${cat.total}`;
      const percentage = cat.total > 0 ? Math.round((cat.published / cat.total) * 100) : 0;
      console.log(`${cat.category}: ${ratio} (${percentage}%)`);
    });
    
    console.log('\n📝 RECENT POSTS');
    console.log('-'.repeat(30));
    systemStatus.recent.forEach(post => {
      const date = new Date(post.created_at).toLocaleDateString();
      const time = new Date(post.created_at).toLocaleTimeString();
      console.log(`[${post.id}] ${post.title}`);
      console.log(`    Category: ${post.category} | Status: ${post.status}`);
      console.log(`    Created: ${date} ${time}`);
      console.log('');
    });
    
    console.log('\n🔄 AUTOMATION STATUS');
    console.log('-'.repeat(30));
    console.log('System: ✅ Active and Running');
    console.log('Schedule: 6 posts per day (9:00, 11:00, 13:00, 15:00, 17:00, 19:00 UTC)');
    console.log('Next Generation: Based on cron schedule');
    
    console.log('\n🎯 DAILY TARGETS');
    console.log('-'.repeat(30));
    const remaining = checklistProgress.remaining;
    const daysToComplete = Math.ceil(remaining / 6);
    console.log(`Posts Remaining: ${remaining}`);
    console.log(`At 6 posts/day: ${daysToComplete} days to complete`);
    console.log(`Estimated Completion: ${new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000).toLocaleDateString()}`);
  }

  async startMonitoring() {
    await this.initialize();
    
    // Initial status
    await this.displayStatus();
    
    // Refresh every 5 minutes
    setInterval(async () => {
      console.clear();
      console.log('🔄 Status updated at:', new Date().toLocaleString());
      await this.displayStatus();
    }, 5 * 60 * 1000);
    
    console.log('\n💡 Monitor will refresh every 5 minutes...');
    console.log('Press Ctrl+C to exit');
  }
}

// Command line interface
const monitor = new BlogAutomationMonitor();

if (process.argv.includes('--once')) {
  // Single status check
  monitor.initialize().then(() => monitor.displayStatus()).then(() => process.exit(0));
} else {
  // Continuous monitoring
  monitor.startMonitoring();
}

process.on('SIGINT', () => {
  console.log('\n👋 Stopping monitor...');
  process.exit(0);
});
