import ensureIndustryMetricsTable from '../../scripts/seed-industry-metrics.js';

/**
 * Run startup tasks for the application
 */
async function runStartupTasks() {
  console.log('Running startup tasks...');
  
  try {
    // Ensure industry metrics table and data exist
    await ensureIndustryMetricsTable();
    
    // Additional startup tasks can be added here
    
    console.log('All startup tasks completed successfully');
  } catch (error) {
    console.error('Error during startup tasks:', error);
    // Don't crash the app, just log the error
  }
}

export default runStartupTasks;
