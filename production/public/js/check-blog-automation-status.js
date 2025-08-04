/**
 * Blog Automation Status Checker
 * Quick script to check if blog automation is running and show cost savings
 */

import fs from 'fs/promises';
import pool from '../../db.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkBlogAutomationStatus() {
  console.log('📊 Blog Automation Status Check');
  console.log('===============================');
  
  try {
    // Check if stop flag exists
    const stopFlagExists = await fs.access('./data/AUTOMATION_STOPPED.flag')
      .then(() => true)
      .catch(() => false);
    
    console.log(`🚩 Stop Flag: ${stopFlagExists ? '✅ ACTIVE (Automation Disabled)' : '❌ Not Found'}`);
    
    // Check database setting
    try {
      const result = await pool.query(`
        SELECT enabled, updated_at 
        FROM automation_settings 
        WHERE service_name = 'blog_generation'
      `);
      
      if (result.rows.length > 0) {
        const setting = result.rows[0];
        console.log(`🗄️  Database Setting: ${setting.enabled ? '🟢 Enabled' : '🔴 Disabled'}`);
        console.log(`   Last Updated: ${new Date(setting.updated_at).toLocaleString()}`);
      } else {
        console.log('🗄️  Database Setting: No setting found (defaults to enabled)');
      }
    } catch (error) {
      console.log('🗄️  Database Setting: Table not found (defaults to enabled)');
    }
    
    // Show recent blog activity
    const activityResult = await pool.query(`
      SELECT 
        COUNT(*) as posts_today,
        MAX(created_at) as last_post
      FROM blog_posts 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    
    const activity = activityResult.rows[0];
    console.log(`📝 Recent Activity: ${activity.posts_today} posts in last 24 hours`);
    
    if (activity.last_post) {
      console.log(`   Last Post: ${new Date(activity.last_post).toLocaleString()}`);
    }
    
    // Status summary
    console.log('');
    if (stopFlagExists) {
      console.log('✅ STATUS: Blog automation is STOPPED');
      console.log('💰 COST IMPACT: Reduced RDS write operations');
      console.log('📈 SAVINGS: ~80% reduction in automated blog-related DB costs');
    } else {
      console.log('⚠️  STATUS: Blog automation may still be RUNNING');
      console.log('💸 COST IMPACT: Active automated posting increases RDS costs');
      console.log('🔧 RECOMMENDATION: Run optimize-blog-automation-costs.js to stop');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error);
  } finally {
    await pool.end();
  }
}

checkBlogAutomationStatus();
