import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import pineconeService from '../services/pineconeService.js';
import OpenAI from 'openai';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate vector embeddings from text using OpenAI
 * @param {string} text - The text to convert to a vector embedding
 * @returns {Promise<Array>} The vector embedding
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Extract and format business valuation data from the database
 */
async function extractBusinessValuationData() {
  console.log('🔍 Extracting business valuation data from database...');
  
  const query = `
    SELECT 
      qs.id as submission_id,
      qs.email,
      qs.business_name,
      qs.industry,
      qs.description,
      qs.year_established,
      qs.years_in_operation,
      qs.revenue,
      qs.revenue_prev_year,
      qs.revenue_2_years_ago,
      qs.ebitda,
      qs.ebitda_prev_year,
      qs.ebitda_2_years_ago,
      qs.assets_amount,
      qs.total_debt_amount,
      qs.ffe_value,
      qs.location_city,
      qs.location_state,
      qs.employee_count,
      qs.growth_rate,
      qs.scalability,
      qs.debt_transferable,
      qs.reason_for_sale,
      qs.additional_info,
      qs.created_at,
      bv.id as valuation_id,
      bv.valuation_range_min,
      bv.valuation_range_max,
      bv.estimated_value,
      bv.confidence_score,
      bv.multiple_used,
      bv.multiple_type,
      bv.valuation_summary,
      bv.valuation_details,
      bv.created_at as valuation_date
    FROM questionnaire_submissions qs
    LEFT JOIN business_valuations bv ON qs.id = bv.questionnaire_id
    WHERE qs.business_name IS NOT NULL 
      AND qs.industry IS NOT NULL
      AND qs.revenue IS NOT NULL
    ORDER BY qs.created_at DESC
  `;
  
  try {
    const result = await pool.query(query);
    console.log(`📊 Found ${result.rows.length} business valuation records`);
    return result.rows;
  } catch (error) {
    console.error('Error extracting business data:', error);
    throw error;
  }
}

/**
 * Extract industry metrics and benchmarks
 */
async function extractIndustryMetrics() {
  console.log('🏭 Extracting industry metrics data...');
  
  const query = `
    SELECT 
      industry,
      avg_sales_multiple,
      avg_ebitda_multiple,
      avg_profit_margin,
      business_count,
      median_price,
      avg_revenue,
      avg_ebitda,
      growth_rate,
      risk_score,
      market_conditions
    FROM industry_metrics
    ORDER BY business_count DESC
  `;
  
  try {
    const result = await pool.query(query);
    console.log(`📈 Found ${result.rows.length} industry metrics records`);
    return result.rows;
  } catch (error) {
    console.error('Error extracting industry metrics:', error);
    throw error;
  }
}

/**
 * Create comprehensive text representation for RAG embedding
 */
function createBusinessRAGText(business) {
  const revenue = parseFloat(business.revenue) || 0;
  const ebitda = parseFloat(business.ebitda) || 0;
  const estimatedValue = parseFloat(business.estimated_value) || 0;
  const minValue = parseFloat(business.valuation_range_min) || 0;
  const maxValue = parseFloat(business.valuation_range_max) || 0;
  
  // Calculate key metrics
  const revenueGrowth = business.revenue_prev_year ? 
    ((revenue - parseFloat(business.revenue_prev_year)) / parseFloat(business.revenue_prev_year) * 100).toFixed(1) : 'N/A';
  
  const ebitdaMargin = revenue > 0 ? (ebitda / revenue * 100).toFixed(1) : 'N/A';
  
  const text = `
Business Valuation Case Study:

Company: ${business.business_name}
Industry: ${business.industry}
Location: ${business.location_city || 'Not specified'}, ${business.location_state || ''}

Business Description: ${business.description || 'No description provided'}

Financial Performance:
- Current Revenue: £${revenue.toLocaleString()}
- Previous Year Revenue: £${(parseFloat(business.revenue_prev_year) || 0).toLocaleString()}
- Revenue Growth: ${revenueGrowth}%
- Current EBITDA: £${ebitda.toLocaleString()}
- EBITDA Margin: ${ebitdaMargin}%
- Assets Value: £${(parseFloat(business.assets_amount) || 0).toLocaleString()}
- Total Debt: £${(parseFloat(business.total_debt_amount) || 0).toLocaleString()}

Business Characteristics:
- Years in Operation: ${business.years_in_operation || 'Not specified'}
- Employee Count: ${business.employee_count || 'Not specified'}
- Growth Rate: ${business.growth_rate || 'Not specified'}%
- Scalability: ${business.scalability || 'Not assessed'}
- Reason for Sale: ${business.reason_for_sale || 'Not specified'}

Valuation Results:
- Estimated Value: £${estimatedValue.toLocaleString()}
- Valuation Range: £${minValue.toLocaleString()} - £${maxValue.toLocaleString()}
- Multiple Used: ${business.multiple_used || 'N/A'}x (${business.multiple_type || 'N/A'})
- Confidence Score: ${business.confidence_score || 'N/A'}%
- Valuation Summary: ${business.valuation_summary || 'No summary available'}

Additional Information: ${business.additional_info || 'None provided'}

This case demonstrates ${business.industry} sector valuation methodologies and provides insights into business valuation factors including financial performance, growth trends, market positioning, and risk assessment.
  `.trim();
  
  return text;
}

/**
 * Create industry metrics text for RAG embedding
 */
function createIndustryRAGText(industry) {
  const text = `
Industry Analysis and Valuation Benchmarks:

Industry: ${industry.industry}

Key Valuation Multiples:
- Average Sales Multiple: ${industry.avg_sales_multiple}x
- Average EBITDA Multiple: ${industry.avg_ebitda_multiple}x
- Average Profit Margin: ${industry.avg_profit_margin}%

Market Data:
- Number of Businesses Analyzed: ${industry.business_count}
- Median Business Price: £${(parseFloat(industry.median_price) || 0).toLocaleString()}
- Average Revenue: £${(parseFloat(industry.avg_revenue) || 0).toLocaleString()}
- Average EBITDA: £${(parseFloat(industry.avg_ebitda) || 0).toLocaleString()}

Market Conditions:
- Industry Growth Rate: ${industry.growth_rate || 'N/A'}%
- Risk Score: ${industry.risk_score || 'N/A'}
- Market Conditions: ${industry.market_conditions || 'Stable'}

Industry Insights:
This ${industry.industry} sector data provides benchmark valuation multiples for business appraisal, merger and acquisition analysis, and investment decision-making. The metrics are based on ${industry.business_count} businesses and reflect current market conditions for ${industry.industry} businesses.

Use these benchmarks to:
- Assess fair market value for ${industry.industry} businesses
- Compare individual business performance against industry standards  
- Identify valuation discrepancies and opportunities
- Support due diligence and investment analysis
- Guide pricing strategies for business sales and acquisitions
  `.trim();
  
  return text;
}

/**
 * Prepare vectors for Pinecone upsert
 */
async function prepareBusinessVectors(businesses) {
  console.log('🔄 Preparing business data vectors...');
  const vectors = [];
  
  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    
    try {
      // Create RAG text
      const ragText = createBusinessRAGText(business);
      
      // Generate embedding
      const embedding = await generateEmbedding(ragText);
      
      // Create vector object
      const vector = {
        id: `business-${business.submission_id}`,
        values: embedding,
        metadata: {
          type: 'business_valuation',
          business_name: business.business_name,
          industry: business.industry,
          location: `${business.location_city || ''}, ${business.location_state || ''}`.trim(),
          revenue: parseFloat(business.revenue) || 0,
          ebitda: parseFloat(business.ebitda) || 0,
          estimated_value: parseFloat(business.estimated_value) || 0,
          valuation_range_min: parseFloat(business.valuation_range_min) || 0,
          valuation_range_max: parseFloat(business.valuation_range_max) || 0,
          multiple_type: business.multiple_type || 'revenue',
          multiple_used: parseFloat(business.multiple_used) || 0,
          confidence_score: parseFloat(business.confidence_score) || 0,
          years_in_operation: parseInt(business.years_in_operation) || 0,
          employee_count: parseInt(business.employee_count) || 0,
          created_at: business.created_at,
          valuation_date: business.valuation_date,
          text_content: ragText.substring(0, 1000) // Store truncated version for metadata
        }
      };
      
      vectors.push(vector);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Processed ${i + 1}/${businesses.length} businesses`);
      }
      
    } catch (error) {
      console.error(`Error processing business ${business.submission_id}:`, error);
    }
  }
  
  return vectors;
}

/**
 * Prepare industry metrics vectors for Pinecone upsert
 */
async function prepareIndustryVectors(industries) {
  console.log('🔄 Preparing industry metrics vectors...');
  const vectors = [];
  
  for (let i = 0; i < industries.length; i++) {
    const industry = industries[i];
    
    try {
      // Create RAG text
      const ragText = createIndustryRAGText(industry);
      
      // Generate embedding
      const embedding = await generateEmbedding(ragText);
      
      // Create vector object
      const vector = {
        id: `industry-${industry.industry.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        values: embedding,
        metadata: {
          type: 'industry_metrics',
          industry: industry.industry,
          avg_sales_multiple: parseFloat(industry.avg_sales_multiple) || 0,
          avg_ebitda_multiple: parseFloat(industry.avg_ebitda_multiple) || 0,
          avg_profit_margin: parseFloat(industry.avg_profit_margin) || 0,
          business_count: parseInt(industry.business_count) || 0,
          median_price: parseFloat(industry.median_price) || 0,
          avg_revenue: parseFloat(industry.avg_revenue) || 0,
          avg_ebitda: parseFloat(industry.avg_ebitda) || 0,
          growth_rate: parseFloat(industry.growth_rate) || 0,
          risk_score: parseFloat(industry.risk_score) || 0,
          market_conditions: industry.market_conditions || 'stable',
          text_content: ragText.substring(0, 1000) // Store truncated version for metadata
        }
      };
      
      vectors.push(vector);
      console.log(`   ✅ Processed industry: ${industry.industry}`);
      
    } catch (error) {
      console.error(`Error processing industry ${industry.industry}:`, error);
    }
  }
  
  return vectors;
}

/**
 * Batch upsert vectors to Pinecone
 */
async function batchUpsertVectors(vectors, batchSize = 50) {
  console.log(`📤 Upserting ${vectors.length} vectors to Pinecone in batches of ${batchSize}...`);
  
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    
    try {
      const result = await pineconeService.upsertVectors({
        vectors: batch
      });
      
      console.log(`   ✅ Upserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectors.length/batchSize)} (${batch.length} vectors)`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error upserting batch ${Math.floor(i/batchSize) + 1}:`, error);
      throw error;
    }
  }
  
  console.log('🎉 All vectors upserted successfully!');
}

/**
 * Main function to populate RAG data
 */
async function populateRAGData() {
  try {
    console.log('🚀 Starting RAG data population process...');
    
    // Ensure Pinecone index exists
    console.log('🔧 Setting up Pinecone index...');
    await pineconeService.createIndex({
      dimension: 1536, // OpenAI text-embedding-3-small dimension
      metric: 'cosine'
    });
    
    // Extract data from database
    const [businesses, industries] = await Promise.all([
      extractBusinessValuationData(),
      extractIndustryMetrics()
    ]);
    
    // Prepare vectors
    const [businessVectors, industryVectors] = await Promise.all([
      prepareBusinessVectors(businesses),
      prepareIndustryVectors(industries)
    ]);
    
    // Combine all vectors
    const allVectors = [...businessVectors, ...industryVectors];
    console.log(`📊 Total vectors to upload: ${allVectors.length}`);
    
    // Upsert to Pinecone
    await batchUpsertVectors(allVectors);
    
    console.log('✅ RAG data population completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   - Business valuations: ${businessVectors.length}`);
    console.log(`   - Industry metrics: ${industryVectors.length}`);
    console.log(`   - Total vectors: ${allVectors.length}`);
    
  } catch (error) {
    console.error('❌ Error during RAG data population:', error);
    throw error;
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Test function to verify embeddings work
async function testEmbedding() {
  try {
    console.log('🧪 Testing embedding generation...');
    const testText = "This is a test business valuation for a restaurant in London with £100k revenue.";
    const embedding = await generateEmbedding(testText);
    console.log(`✅ Embedding generated successfully! Dimension: ${embedding.length}`);
    return true;
  } catch (error) {
    console.error('❌ Embedding test failed:', error);
    return false;
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  // Test embedding first
  testEmbedding().then(success => {
    if (success) {
      return populateRAGData();
    } else {
      throw new Error('Embedding test failed');
    }
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export {
  populateRAGData,
  extractBusinessValuationData,
  extractIndustryMetrics,
  prepareBusinessVectors,
  prepareIndustryVectors,
  generateEmbedding
};
