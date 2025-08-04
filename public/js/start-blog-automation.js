/**
 * Production Blog Automation Starter
 * Activates the automated blog generation system for production use
 */

import AutomatedBlogGenerator from '../../services/automated-blog-generator.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Starting Automated Blog Generation System for Production...');

async function startProduction() {
  try {
    // Initialize the automated blog generator
    const generator = new AutomatedBlogGenerator();
    await generator.initialize();
    
    console.log('✅ Automated Blog Generator initialized for production');
    console.log('📅 System will generate 6 blog posts per day automatically');
    console.log('⏰ Posting schedule: 9:00, 11:00, 13:00, 15:00, 17:00, 19:00 UTC');
    console.log('🎯 Target: Complete all 189 remaining blog posts from PRD checklist');
    console.log('');
    console.log('🔗 Monitor the system at:');
    console.log('   • Admin Dashboard: http://localhost:3000/admin/blog-automation');
    console.log('   • API Status: http://localhost:3000/api/blog-automation/status');
    console.log('   • Blog Index: http://localhost:3000/blog');
    console.log('');
    console.log('💡 The system is now running in the background!');
    console.log('   To stop: Press Ctrl+C or restart the main server');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping Automated Blog Generation System...');
      generator.stop();
      process.exit(0);
    });
    
    // Prevent the script from exiting
    setInterval(() => {
      // Keep alive - the cron jobs will handle everything
    }, 60000);
    
  } catch (error) {
    console.error('❌ Failed to start automated blog generation:', error);
    process.exit(1);
  }
}

startProduction();
