import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('questionnaire_submissions', 'business_valuations', 'industry_multipliers')
    `);

    console.log('\n📊 Available tables:', tables.rows.map(r => r.table_name));

    // Check data count in each table
    for (const table of tables.rows) {
      const count = await client.query(`SELECT COUNT(*) FROM ${table.table_name}`);
      console.log(`📈 ${table.table_name}: ${count.rows[0].count} records`);
    }

    // Check questionnaire_submissions structure if it exists
    if (tables.rows.some(t => t.table_name === 'questionnaire_submissions')) {
      const sample = await client.query(`
        SELECT id, business_name, valuation_data, created_at 
        FROM questionnaire_submissions 
        LIMIT 3
      `);
      console.log('\n🔍 Sample questionnaire data:');
      sample.rows.forEach((row, i) => {
        console.log(`${i + 1}. ID: ${row.id}, Business: ${row.business_name || 'N/A'}, Created: ${row.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase().catch(console.error);
