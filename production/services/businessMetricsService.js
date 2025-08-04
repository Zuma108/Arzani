import pkg from 'pg';
const { Pool } = pkg;
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default class BusinessMetricsService {
    constructor(pool) {
        // Use the provided pool from db.js to ensure consistent connection settings
        this.pool = pool;
        this.cache = new NodeCache({ stdTTL: 4 * 60 * 60 });
        this.updateInterval = 4 * 60 * 60 * 1000;
        this.metricsQuery = `
            SELECT 
                industry,
                AVG(cash_flow) as avg_cash_flow,
                AVG(ebitda) as avg_ebitda,
                AVG(sales_multiple) as avg_sales_multiple,
                AVG(profit_margin) as avg_profit_margin,
                COUNT(*) as business_count
            FROM businesses 
            GROUP BY industry;
        `;
        this.initializeCache();
    }

    async initializeCache() {
        try {
            await this.updateMetrics();
            setInterval(() => this.updateMetrics(), this.updateInterval);
        } catch (error) {
            console.error('Cache initialization failed:', error);
        }
    }

    async updateMetrics() {
        try {
            if (!this.metricsQuery) {
                throw new Error('Metrics query not defined');
            }
            const result = await this.pool.query(this.metricsQuery);
            this.cache.set('industryMetrics', result.rows);
            console.log(`Metrics updated successfully at ${new Date().toISOString()}`);
            return result.rows;
        } catch (error) {
            console.error('Metrics update failed:', error);
            // Retry in 5 minutes
            setTimeout(() => this.updateMetrics(), 5 * 60 * 1000);
            return this.cache.get('industryMetrics') || [];
        }
    }

    getAllIndustryMetrics() {
        return this.cache.get('industryMetrics') || [];
    }

    async getBusinesses(queryParams = {}) {
        try {
            const query = 'SELECT * FROM businesses';
            const result = await this.pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Error getting businesses:', error);
            return [];
        }
    }
}
