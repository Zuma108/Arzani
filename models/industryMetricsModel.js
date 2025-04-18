import pool from '../db.js';

/**
 * Model for handling industry metrics data
 */
class IndustryMetricsModel {
  /**
   * Get all industry metrics
   */
  static async getAllIndustries() {
    try {
      const query = `
        SELECT 
          industry, 
          avg_sales_multiple, 
          avg_ebitda_multiple, 
          avg_cash_flow, 
          avg_profit_margin, 
          business_count
        FROM industry_metrics
        ORDER BY industry ASC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching industry metrics:', error);
      throw error;
    }
  }

  /**
   * Get metrics for a specific industry with fuzzy matching
   */
  static async getIndustryMetrics(industry) {
    if (!industry) {
      throw new Error('Industry name is required');
    }
    
    try {
      // Try exact match first
      const normalizedIndustry = industry.toLowerCase().trim();
      let query = `
        SELECT 
          industry, 
          avg_sales_multiple, 
          avg_ebitda_multiple, 
          avg_cash_flow, 
          avg_profit_margin, 
          business_count
        FROM industry_metrics
        WHERE LOWER(industry) = $1
      `;
      
      let result = await pool.query(query, [normalizedIndustry]);
      
      // If no exact match, try with LIKE
      if (result.rows.length === 0) {
        query = `
          SELECT 
            industry, 
            avg_sales_multiple, 
            avg_ebitda_multiple, 
            avg_cash_flow, 
            avg_profit_margin, 
            business_count
          FROM industry_metrics
          WHERE LOWER(industry) LIKE $1
          LIMIT 1
        `;
        
        result = await pool.query(query, [`%${normalizedIndustry}%`]);
      }
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error(`Error fetching industry metrics for ${industry}:`, error);
      throw error;
    }
  }

  /**
   * Create or update industry metrics
   */
  static async upsertIndustryMetrics(data) {
    if (!data.industry) {
      throw new Error('Industry name is required');
    }
    
    try {
      const query = `
        INSERT INTO industry_metrics (
          industry, 
          avg_sales_multiple, 
          avg_ebitda_multiple, 
          avg_cash_flow, 
          avg_profit_margin, 
          business_count
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (industry) DO UPDATE SET
          avg_sales_multiple = $2,
          avg_ebitda_multiple = $3,
          avg_cash_flow = $4,
          avg_profit_margin = $5,
          business_count = $6
        RETURNING *
      `;
      
      const values = [
        data.industry,
        data.avg_sales_multiple || 1.0,
        data.avg_ebitda_multiple || 3.0,
        data.avg_cash_flow || 0,
        data.avg_profit_margin || 15,
        data.business_count || 0
      ];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Error upserting industry metrics for ${data.industry}:`, error);
      throw error;
    }
  }
}

export default IndustryMetricsModel;
