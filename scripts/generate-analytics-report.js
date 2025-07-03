import { generateAndSendWeeklyReport } from './utils/analytics-tracker.js';

console.log('Generating analytics report...');

generateAndSendWeeklyReport()
  .then(() => {
    console.log('Analytics report generated and sent successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error generating analytics report:', error);
    process.exit(1);
  });
