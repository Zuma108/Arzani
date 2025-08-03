import pool from '../db.js';

async function createMarketTrendsView() {
    try {
        // Check if the view already exists
        const viewCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM pg_matviews 
                WHERE matviewname = 'market_trends_mv'
            );
        `);
        
        // If view exists, refresh it
        if (viewCheck.rows[0].exists) {
            console.log('Refreshing existing market_trends_mv materialized view...');
            await pool.query('REFRESH MATERIALIZED VIEW market_trends_mv;');
            console.log('Market trends view refreshed successfully.');
            return;
        }

        // Create the materialized view
        console.log('Creating market_trends_mv materialized view...');
        await pool.query(`
            CREATE MATERIALIZED VIEW market_trends_mv AS
            SELECT 
                DATE_TRUNC('day', date_listed) as date,
                industry,
                location,
                AVG(price::numeric) as avg_price,
                COUNT(*) as listings_count,
                AVG(CASE 
                    WHEN gross_revenue::numeric > 0 
                    THEN price::numeric / gross_revenue::numeric 
                    ELSE NULL 
                END) as avg_multiple,
                AVG(gross_revenue::numeric) as avg_gross_revenue,
                AVG(ebitda::numeric) as avg_ebitda,
                AVG(CASE 
                    WHEN prev_year_revenue::numeric > 0 AND gross_revenue::numeric > 0
                    THEN (gross_revenue::numeric - prev_year_revenue::numeric) / prev_year_revenue::numeric * 100
                    ELSE NULL 
                END) as growth_rate
            FROM businesses
            WHERE date_listed IS NOT NULL
            GROUP BY DATE_TRUNC('day', date_listed), industry, location
            ORDER BY date DESC;
            
            CREATE INDEX market_trends_date_idx ON market_trends_mv (date);
            CREATE INDEX market_trends_industry_idx ON market_trends_mv (industry);
            CREATE INDEX market_trends_location_idx ON market_trends_mv (location);
        `);
        console.log('Market trends view created successfully.');
    } catch (error) {
        console.error('Error creating market_trends_mv:', error);
        throw error;
    }
}

// Run this directly or add to your migration scripts
createMarketTrendsView()
    .then(() => console.log('Completed'))
    .catch(err => console.error('Failed:', err))
    .finally(() => process.exit());
