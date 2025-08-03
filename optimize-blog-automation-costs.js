/**
 * Blog Automation Cost Optimizer
 * Script to stop automated blog generation to reduce RDS costs
 */

import AutomatedBlogGenerator from './services/automated-blog-generator.js';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🛑 Blog Automation Cost Optimizer');
console.log('==================================');

class BlogAutomationController {
  constructor() {
    this.generator = null;
  }

  /**
   * Stop all automated blog generation to reduce RDS costs
   */
  async stopAutomation() {
    console.log('🔄 Stopping automated blog generation system...');
    
    try {
      // Initialize generator to access stop methods
      this.generator = new AutomatedBlogGenerator();
      
      // Stop all cron jobs
      this.generator.stop();
      
      // Update database flag to disable automation
      await this.disableAutomationInDatabase();
      
      console.log('✅ Blog automation stopped successfully');
      console.log('💰 This will reduce your RDS write operations and costs');
      console.log('');
      console.log('🔧 To re-enable automation later:');
      console.log('   npm run start:blog-automation');
      console.log('   or use the admin dashboard at /admin/blog-automation');
      
    } catch (error) {
      console.error('❌ Error stopping automation:', error);
      throw error;
    }
  }

  /**
   * Disable automation flag in database
   */
  async disableAutomationInDatabase() {
    try {
      // Create or update automation status table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS automation_settings (
          id SERIAL PRIMARY KEY,
          service_name VARCHAR(100) UNIQUE NOT NULL,
          enabled BOOLEAN DEFAULT false,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Disable blog automation
      await pool.query(`
        INSERT INTO automation_settings (service_name, enabled, updated_at)
        VALUES ('blog_generation', false, NOW())
        ON CONFLICT (service_name) 
        DO UPDATE SET enabled = false, updated_at = NOW()
      `);
      
      console.log('📝 Database flag updated: blog_generation = disabled');
      
    } catch (error) {
      console.error('❌ Database update failed:', error);
      throw error;
    }
  }

  /**
   * Check current automation status
   */
  async getAutomationStatus() {
    try {
      const result = await pool.query(`
        SELECT enabled, updated_at 
        FROM automation_settings 
        WHERE service_name = 'blog_generation'
      `);
      
      if (result.rows.length === 0) {
        return { enabled: true, updated_at: null }; // Default if no record
      }
      
      return result.rows[0];
      
    } catch (error) {
      console.error('❌ Error checking status:', error);
      return { enabled: true, updated_at: null };
    }
  }

  /**
   * Show cost analysis and recommendations
   */
  async showCostAnalysis() {
    console.log('💰 RDS Cost Analysis');
    console.log('====================');
    
    try {
      // Get blog post creation stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_posts,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as posts_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as posts_week
        FROM blog_posts
      `);
      
      const stats = statsResult.rows[0];
      
      console.log(`📊 Blog Posts Created:`);
      console.log(`   • Total: ${stats.total_posts}`);
      console.log(`   • Last 24 hours: ${stats.posts_today}`);
      console.log(`   • Last 7 days: ${stats.posts_week}`);
      console.log('');
      
      // Calculate estimated cost impact
      const dailyOperations = parseInt(stats.posts_today) || 6; // Default to 6 if no recent posts
      const estimatedMonthlyCost = dailyOperations * 30 * 0.10; // Rough estimate
      
      console.log(`💸 Estimated RDS Impact:`);
      console.log(`   • Daily write operations: ~${dailyOperations * 3} (posts + metadata + interlinking)`);
      console.log(`   • Monthly additional cost: ~$${estimatedMonthlyCost.toFixed(2)}`);
      console.log('');
      
      console.log(`💡 Cost Reduction Recommendations:`);
      console.log(`   1. ✅ Stop automation (current action) - saves ~80% of write costs`);
      console.log(`   2. 📝 Manual posting 2-3 times/week - reduce frequency by 70%`);
      console.log(`   3. 📦 Batch operations - combine multiple writes into single transactions`);
      console.log(`   4. ⏰ Off-peak scheduling - run automation during low-cost hours`);
      
    } catch (error) {
      console.error('❌ Error analyzing costs:', error);
    }
  }

  /**
   * Create emergency stop flag file
   */
  async createStopFlag() {
    try {
      const stopFlagPath = './data/AUTOMATION_STOPPED.flag';
      const stopInfo = {
        stopped_at: new Date().toISOString(),
        reason: 'RDS cost optimization',
        stopped_by: 'cost_optimizer_script'
      };
      
      await import('fs/promises').then(fs => 
        fs.writeFile(stopFlagPath, JSON.stringify(stopInfo, null, 2))
      );
      
      console.log('🚩 Stop flag created at ./data/AUTOMATION_STOPPED.flag');
      
    } catch (error) {
      console.error('❌ Error creating stop flag:', error);
    }
  }
}

// Main execution
async function main() {
  const controller = new BlogAutomationController();
  
  try {
    // Show current status and cost analysis
    console.log('🔍 Checking current automation status...');
    const status = await controller.getAutomationStatus();
    console.log(`Current status: ${status.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
    
    if (status.updated_at) {
      console.log(`Last updated: ${new Date(status.updated_at).toLocaleString()}`);
    }
    console.log('');
    
    // Show cost analysis
    await controller.showCostAnalysis();
    console.log('');
    
    // Stop automation if currently enabled
    if (status.enabled) {
      await controller.stopAutomation();
      await controller.createStopFlag();
    } else {
      console.log('ℹ️  Blog automation is already disabled');
    }
    
    console.log('');
    console.log('🎯 Summary: Blog automation has been stopped to reduce RDS costs');
    console.log('📈 You should see reduced database write operations within 24 hours');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await pool.end();
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Script interrupted');
  process.exit(0);
});

// Run the script
main();
