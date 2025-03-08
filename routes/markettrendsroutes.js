import express from 'express';
import pool from '../db.js';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';

const router = express.Router();

// Simple auth middleware
const authCheck = (req, res, next) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Get market trends data - enhanced with additional metrics
router.get('/data', authCheck, async (req, res) => {
    console.log('Market trends data request received');
    try {
        const { timeRange = 30, industry, location } = req.query;

        let query = `
            SELECT 
                created_at,
                industry,
                location,
                avg_price,
                listings_count,
                avg_multiple,
                avg_gross_revenue,
                avg_ebitda,
                growth_rate
            FROM market_trends_mv
            WHERE created_at >= NOW() - INTERVAL '${timeRange} days'
        `;

        const params = [];
        if (industry) {
            params.push(industry);
            query += ` AND industry = $${params.length}`;
        }
        if (location) {
            params.push(location);
            query += ` AND location = $${params.length}`;
        }

        query += ` ORDER BY created_at ASC`;

        const result = await pool.query(query, params);

        // Add additional query for growth trends
        if (req.query.includeGrowth) {
            const growthQuery = `
                SELECT 
                    industry,
                    AVG(growth_rate) as avg_growth_rate
                FROM business_growth_metrics
                WHERE created_at >= NOW() - INTERVAL '${timeRange} days'
                GROUP BY industry
                ORDER BY avg_growth_rate DESC
                LIMIT 10
            `;
            
            const growthData = await pool.query(growthQuery);
            result.growthTrends = growthData.rows;
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Market trends error:', error);
        res.status(500).json({ error: 'Failed to fetch market trends' });
    }
});

// Get available filters
router.get('/filters', authCheck, async (req, res) => {
    console.log('Market trends filters request received');
    try {
        const filters = await pool.query(`
            SELECT 
                ARRAY_AGG(DISTINCT industry) as industries,
                ARRAY_AGG(DISTINCT location) as locations
            FROM businesses
            WHERE industry IS NOT NULL 
            AND location IS NOT NULL
        `);
        
        res.json(filters.rows[0]);
    } catch (error) {
        console.error('Filters error:', error);
        res.status(500).json({ error: 'Failed to fetch filters' });
    }
});

// Export market trends data in various formats
router.get('/export', authCheck, async (req, res) => {
    try {
        const { format, timeRange = 30, industry, location } = req.query;
        
        // Fetch data using existing query logic
        let query = `
            SELECT 
                created_at,
                industry,
                location,
                avg_price,
                listings_count,
                avg_multiple,
                avg_gross_revenue,
                avg_ebitda
            FROM market_trends_mv
            WHERE created_at >= NOW() - INTERVAL '${timeRange} days'
        `;

        const params = [];
        if (industry) {
            params.push(industry);
            query += ` AND industry = $${params.length}`;
        }
        if (location) {
            params.push(location);
            query += ` AND location = $${params.length}`;
        }

        query += ` ORDER BY created_at ASC`;
        
        const result = await pool.query(query, params);
        const data = result.rows;
        
        if (format === 'csv') {
            // Generate simple CSV without csv-stringify package
            const header = 'Date,Industry,Location,Average Price,Listings Count,Average Multiple,Average Gross Revenue,Average EBITDA\n';
            const rows = data.map(item => {
                return [
                    new Date(item.created_at).toISOString().split('T')[0],
                    item.industry.replace(/,/g, ' '), // Replace commas to avoid CSV parsing issues
                    item.location.replace(/,/g, ' '),
                    item.avg_price,
                    item.listings_count,
                    item.avg_multiple,
                    item.avg_gross_revenue,
                    item.avg_ebitda
                ].join(',');
            }).join('\n');
            
            const csvContent = header + rows;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=market_trends_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csvContent);
            
        } else if (format === 'json') {
            // Provide JSON format as an alternative to PDF
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=market_trends_${new Date().toISOString().split('T')[0]}.json`);
            res.json({
                generatedAt: new Date().toISOString(),
                filters: {
                    timeRange,
                    industry: industry || 'All',
                    location: location || 'All'
                },
                data
            });
            
        } else {
            res.status(400).json({ 
                error: 'Unsupported export format', 
                message: 'Currently supported formats: csv, json. PDF support requires installing the pdfkit package.'
            });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

export default router;
