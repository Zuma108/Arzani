import cron from 'node-cron';
import { generateAndSendWeeklyReport } from './utils/analytics-tracker.js';

/**
 * Set up scheduled tasks for the application
 */
export function setupScheduledTasks() {
  console.log('Setting up scheduled tasks...');
  
  // Schedule weekly analytics report - runs every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    console.log('Running scheduled task: Weekly analytics report');
    try {
      await generateAndSendWeeklyReport();
      console.log('Weekly analytics report completed successfully');
    } catch (error) {
      console.error('Error running weekly analytics report:', error);
    }
  }, {
    timezone: 'Europe/London' // Adjust to your timezone
  });
  
  console.log('Scheduled tasks configured successfully');
}

export default { setupScheduledTasks };
