import pool from '../db.js';

// Check for missing indexes
async function checkMissingIndexes() {
  try {
    const result = await pool.query(`
      SELECT
        schemaname,
        relname AS table_name,
        seq_scan,
        idx_scan,
        seq_scan - idx_scan AS seq_minus_idx,
        CASE 
          WHEN seq_scan = 0 THEN 0 
          ELSE 100.0 * seq_scan / (seq_scan + idx_scan) 
        END AS seq_percentage
      FROM 
        pg_stat_user_tables
      WHERE 
        seq_scan > 50
        AND seq_scan > idx_scan
      ORDER BY 
        seq_minus_idx DESC
    `);

    if (result.rows.length === 0) {
      console.log('No missing indexes detected.');
      return [];
    }

    console.log('Potential missing indexes:');
    result.rows.forEach(row => {
      console.log(`Table: ${row.table_name}`);
      console.log(`  Sequential scans: ${row.seq_scan}`);
      console.log(`  Index scans: ${row.idx_scan}`);
      console.log(`  Sequential scan percentage: ${row.seq_percentage.toFixed(2)}%`);
      console.log('---');
    });

    return result.rows;
  } catch (error) {
    console.error('Error checking for missing indexes:', error);
    return [];
  }
}

// Get slow queries
async function getSlowQueries() {
  try {
    const result = await pool.query(`
      SELECT
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM
        pg_stat_statements
      ORDER BY
        mean_time DESC
      LIMIT 10;
    `);

    if (result.rows.length === 0) {
      console.log('No slow queries detected.');
      return [];
    }

    console.log('Top 10 slowest queries:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. Mean time: ${row.mean_time.toFixed(2)}ms, Calls: ${row.calls}`);
      console.log(`   Query: ${row.query.substring(0, 100)}...`);
      console.log('---');
    });

    return result.rows;
  } catch (error) {
    console.error('Error getting slow queries:', error);
    return [];
  }
}

export { 
  checkMissingIndexes,
  getSlowQueries
};
