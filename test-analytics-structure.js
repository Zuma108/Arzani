// Quick test of analytics API data structure
import './controllers/ABTestAnalytics.js';
import ABTestAnalytics from './controllers/ABTestAnalytics.js';

const analytics = new ABTestAnalytics();

console.log('Testing analytics data structure...');

try {
  const result = await analytics.getAnalytics({ timeframe: '7d' });
  console.log('Analytics result structure:');
  console.log('- summary:', result.summary?.length || 0, 'records');
  console.log('- significance:', result.significance ? 'exists' : 'missing');
  console.log('- significance.confidence:', result.significance?.confidence || 'missing');
  console.log('- significance.lift:', result.significance?.lift || 'missing');
  console.log('- dateRange:', result.dateRange ? 'exists' : 'missing');
  
  if (result.summary?.length > 0) {
    console.log('First summary record:', result.summary[0]);
  }
  
  if (result.significance) {
    console.log('Significance object:', result.significance);
  }
  
} catch (error) {
  console.error('Error testing analytics:', error.message);
}

process.exit(0);
