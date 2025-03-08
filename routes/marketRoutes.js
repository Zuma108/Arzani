import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Add trends endpoint
router.get('/trends', async (req, res) => {
  try {
    // For simple implementation, return static data
    // In production, this should query from database
    const trends = {
      industries: [
        { name: 'Retail', businessCount: 125, averagePrice: 450000, growth: 3.2 },
        { name: 'Food & Beverage', businessCount: 98, averagePrice: 380000, growth: 2.8 },
        { name: 'Technology', businessCount: 87, averagePrice: 720000, growth: 5.6 },
        { name: 'Manufacturing', businessCount: 62, averagePrice: 890000, growth: 1.5 },
        { name: 'Services', businessCount: 105, averagePrice: 320000, growth: 4.1 }
      ],
      locations: [
        { name: 'London', businessCount: 175, averagePrice: 620000 },
        { name: 'Manchester', businessCount: 92, averagePrice: 480000 },
        { name: 'Birmingham', businessCount: 88, averagePrice: 510000 },
        { name: 'Glasgow', businessCount: 65, averagePrice: 390000 },
        { name: 'Leeds', businessCount: 53, averagePrice: 410000 }
      ],
      priceRanges: [
        { range: 'Under £100K', percentage: 15 },
        { range: '£100K-£250K', percentage: 25 },
        { range: '£250K-£500K', percentage: 30 },
        { range: '£500K-£1M', percentage: 20 },
        { range: 'Over £1M', percentage: 10 }
      ],
      recentSold: [
        { name: 'Coffee Shop Chain', industry: 'Food & Beverage', price: 420000 },
        { name: 'Digital Marketing Agency', industry: 'Services', price: 350000 },
        { name: 'Local Convenience Store', industry: 'Retail', price: 180000 },
        { name: 'Software Development Firm', industry: 'Technology', price: 950000 }
      ]
    };
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({ error: 'Failed to fetch market trends' });
  }
});

// Add data endpoint
router.get('/data', async (req, res) => {
  try {
    // Query database for market data statistics
    const industryStatsQuery = `
      SELECT 
        industry, 
        COUNT(*) as count, 
        AVG(CAST(price AS numeric)) as avg_price
      FROM businesses 
      GROUP BY industry 
      ORDER BY count DESC
    `;
    
    const industryStats = await pool.query(industryStatsQuery);
    
    res.json({
      industryStats: industryStats.rows,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Add filters endpoint
router.get('/filters', async (req, res) => {
  try {
    // Get all industries
    const industriesQuery = `
      SELECT DISTINCT industry FROM businesses WHERE industry IS NOT NULL
      ORDER BY industry ASC
    `;
    const industries = await pool.query(industriesQuery);
    
    // Get all locations
    const locationsQuery = `
      SELECT DISTINCT location FROM businesses WHERE location IS NOT NULL
      ORDER BY location ASC
    `;
    const locations = await pool.query(locationsQuery);
    
    // Get min and max prices
    const priceRangeQuery = `
      SELECT 
        MIN(CAST(price AS numeric)) as min_price, 
        MAX(CAST(price AS numeric)) as max_price 
      FROM businesses
    `;
    const priceRange = await pool.query(priceRangeQuery);
    
    res.json({
      industries: industries.rows.map(row => row.industry),
      locations: locations.rows.map(row => row.location),
      priceRange: priceRange.rows[0]
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

export default router;
