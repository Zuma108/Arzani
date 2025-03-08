import pool from '../db.js';

export async function refreshMarketTrends() {
  try {
    // Check if the unique index exists before attempting concurrent refresh
    const indexCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_indexes WHERE indexname = 'market_trends_mv_unique_idx'
      );
    `);
    
    if (indexCheck.rows[0].exists) {
      // Use concurrent refresh since unique index exists
      await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY market_trends_mv');
    } else {
      // Fallback to non-concurrent refresh
      await pool.query('REFRESH MATERIALIZED VIEW market_trends_mv');
      console.warn('Warning: Using non-concurrent refresh for market_trends_mv. Performance may be affected.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error refreshing market trends:', error);
    throw new Error('Failed to refresh market trends data');
  }
}