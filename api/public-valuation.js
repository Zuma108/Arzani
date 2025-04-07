/**
 * Public Business Valuation API
 * No authentication required - specifically for the valuation calculator
 */

import express from 'express';
import cors from 'cors';
import pool from '../db.js';

const router = express.Router();

// Configure CORS for all routes in this router
router.use(cors({
  origin: true,
  credentials: true
}));

// JSON parsing middleware
router.use(express.json());

// Override the redirect method for this router to prevent redirects to login
router.use((req, res, next) => {
  const originalRedirect = res.redirect;
  res.redirect = function() {
    console.log('Prevented redirect attempt in public valuation API');
    return res.status(200).json({
      success: false,
      message: 'This is a public API - redirects are not allowed'
    });
  };
  // Force content type to be JSON
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * Public endpoint for calculating business valuation
 * No authentication required
 */
router.post('/calculate', async (req, res) => {
  try {
    console.log('Public valuation API called with data keys:', Object.keys(req.body));
    
    const businessData = req.body;
    
    // Validate required fields
    if (!businessData.revenue && !businessData.ebitda) {
      return res.status(400).json({
        success: false,
        message: 'Missing required financial data (revenue or EBITDA)'
      });
    }
    
    // Get industry-specific multipliers from database
    const industry = businessData.industry || 'Other';
    let multiplierData;
    
    try {
      const query = 'SELECT * FROM industry_multipliers WHERE industry = $1';
      const result = await pool.query(query, [industry]);
      
      if (result.rows.length > 0) {
        multiplierData = result.rows[0];
        console.log(`Using database multipliers for ${industry}:`, multiplierData);
      } else {
        // Try to get the "Other" category as fallback
        const defaultResult = await pool.query('SELECT * FROM industry_multipliers WHERE industry = $1', ['Other']);
        
        if (defaultResult.rows.length > 0) {
          multiplierData = defaultResult.rows[0];
          console.log(`Using 'Other' multipliers for ${industry}:`, multiplierData);
        } else {
          // Hardcoded fallback values
          multiplierData = {
            industry: industry,
            min_revenue_multiplier: 0.5,
            max_revenue_multiplier: 1.5,
            ebitda_multiplier: 3.0
          };
          console.log(`Using hardcoded multipliers for ${industry}:`, multiplierData);
        }
      }
    } catch (dbError) {
      console.error('Database error fetching multipliers:', dbError);
      
      // Fallback to hardcoded industry multipliers if database fails
      multiplierData = getHardcodedMultipliers(industry);
      console.log(`Using hardcoded multipliers after DB error:`, multiplierData);
    }
    
    // Calculate comprehensive valuation using all available business metrics
    const valuation = calculateComprehensiveValuation(businessData, multiplierData);
    
    // Save the data to the database if this is a form submission
    let submissionResult = null;
    
    if (businessData.saveToDatabase !== false) {
      try {
        submissionResult = await saveQuestionnaireSubmission(businessData, valuation);
        console.log('Saved questionnaire submission:', submissionResult);
      } catch (saveError) {
        console.error('Error saving questionnaire submission:', saveError);
        // Continue processing - we'll still return the valuation even if save fails
      }
    }
    
    // Return the calculated valuation
    return res.json({
      success: true,
      valuation: valuation,
      submissionId: submissionResult?.submissionId
    });
  } catch (error) {
    console.error('Valuation calculation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate valuation',
      error: error.message
    });
  }
});

/**
 * Public endpoint for saving questionnaire data without calculating valuation
 */
router.post('/save-questionnaire', async (req, res) => {
  try {
    const questionnaireData = req.body;
    
    // Basic validation
    if (!questionnaireData) {
      return res.status(400).json({
        success: false,
        message: 'No questionnaire data provided'
      });
    }
    
    // Save the data to the database
    const result = await saveQuestionnaireSubmission(questionnaireData);
    
    return res.json({
      success: true,
      message: 'Questionnaire data saved successfully',
      submissionId: result.submissionId
    });
  } catch (error) {
    console.error('Error saving questionnaire data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save questionnaire data',
      error: error.message
    });
  }
});

/**
 * Function to save questionnaire submission data to the database
 * Uses transactions to ensure data integrity and proper error handling
 */
async function saveQuestionnaireSubmission(data, valuation = null) {
  // Start a transaction to ensure all operations succeed or fail together
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generate a submission ID if not provided
    const submissionId = data.submissionId || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Helper functions for data processing
    const toNullableString = (val) => val === undefined || val === null || val === '' ? null : String(val);
    const toNumberOrNull = (val) => val === undefined || val === null || val === '' ? null : 
                                  isNaN(parseFloat(val)) ? null : parseFloat(val);
    
    // Extract email (required) - generate anonymous one if missing
    const email = toNullableString(data.email) || `anonymous_${submissionId}@placeholder.com`;
    
    // Check if submission already exists
    const checkQuery = 'SELECT id FROM questionnaire_submissions WHERE submission_id = $1';
    const checkResult = await client.query(checkQuery, [submissionId]);
    
    let submissionDbId = null;
    
    if (checkResult.rows.length > 0) {
      // Update existing submission
      submissionDbId = checkResult.rows[0].id;
      
      const updateQuery = `
        UPDATE questionnaire_submissions
        SET 
          email = $1,
          business_name = $2,
          industry = $3,
          location = $4,
          description = $5,
          year_established = $6,
          years_in_operation = $7,
          contact_name = $8,
          contact_phone = $9,
          revenue = $10,
          revenue_prev_year = $11,
          revenue_2_years_ago = $12,
          ebitda = $13,
          ebitda_prev_year = $14,
          ebitda_2_years_ago = $15,
          cash_on_cash = $16,
          ffe_value = $17,
          ffe_items = $18,
          growth_rate = $19,
          growth_areas = $20,
          growth_challenges = $21,
          scalability = $22,
          total_debt_amount = $23,
          debt_transferable = $24,
          debt_notes = $25,
          debt_items = $26,
          asking_price = $27,
          valuation_min = $28,
          valuation_max = $29,
          adjusted_valuation = $30,
          data = $31,
          updated_at = NOW()
        WHERE submission_id = $32
        RETURNING id
      `;
      
      const updateResult = await client.query(updateQuery, [
        email,
        toNullableString(data.businessName),
        toNullableString(data.industry),
        toNullableString(data.location),
        toNullableString(data.description),
        toNullableString(data.yearEstablished),
        toNumberOrNull(data.yearsInOperation),
        toNullableString(data.contactName),
        toNullableString(data.contactPhone),
        toNumberOrNull(data.revenue || data.revenueExact),
        toNumberOrNull(data.revenuePrevYear),
        toNumberOrNull(data.revenue2YearsAgo),
        toNumberOrNull(data.ebitda),
        toNumberOrNull(data.ebitdaPrevYear),
        toNumberOrNull(data.ebitda2YearsAgo),
        toNumberOrNull(data.cashOnCash),
        toNumberOrNull(data.ffeValue),
        toNullableString(data.ffeItems),
        toNumberOrNull(data.growthRate),
        toNullableString(data.growthAreas),
        toNullableString(data.growthChallenges),
        toNullableString(data.scalability),
        toNumberOrNull(data.totalDebtAmount),
        toNullableString(data.debtTransferable),
        toNullableString(data.debtNotes),
        toNullableString(data.debtItems),
        toNumberOrNull(data.askingPrice),
        valuation ? toNumberOrNull(valuation.valuationRange?.min) : null,
        valuation ? toNumberOrNull(valuation.valuationRange?.max) : null,
        valuation ? toNumberOrNull(valuation.estimatedValue) : null,
        JSON.stringify(data),
        submissionId
      ]);
      
      console.log(`Updated questionnaire submission ${submissionId}`);
    } else {
      // Insert new submission
      const insertQuery = `
        INSERT INTO questionnaire_submissions (
          submission_id,
          email,
          business_name,
          industry,
          location,
          description,
          year_established,
          years_in_operation,
          contact_name,
          contact_phone,
          revenue,
          revenue_prev_year,
          revenue_2_years_ago,
          ebitda,
          ebitda_prev_year,
          ebitda_2_years_ago,
          cash_on_cash,
          ffe_value,
          ffe_items,
          growth_rate,
          growth_areas,
          growth_challenges,
          scalability,
          total_debt_amount,
          debt_transferable,
          debt_notes,
          debt_items,
          asking_price,
          valuation_min,
          valuation_max,
          adjusted_valuation,
          data,
          status,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, NOW(), NOW()
        )
        RETURNING id
      `;
      
      const insertResult = await client.query(insertQuery, [
        submissionId,
        email,
        toNullableString(data.businessName),
        toNullableString(data.industry),
        toNullableString(data.location),
        toNullableString(data.description),
        toNullableString(data.yearEstablished),
        toNumberOrNull(data.yearsInOperation),
        toNullableString(data.contactName),
        toNullableString(data.contactPhone),
        toNumberOrNull(data.revenue || data.revenueExact),
        toNumberOrNull(data.revenuePrevYear),
        toNumberOrNull(data.revenue2YearsAgo),
        toNumberOrNull(data.ebitda),
        toNumberOrNull(data.ebitdaPrevYear),
        toNumberOrNull(data.ebitda2YearsAgo),
        toNumberOrNull(data.cashOnCash),
        toNumberOrNull(data.ffeValue),
        toNullableString(data.ffeItems),
        toNumberOrNull(data.growthRate),
        toNullableString(data.growthAreas),
        toNullableString(data.growthChallenges),
        toNullableString(data.scalability),
        toNumberOrNull(data.totalDebtAmount),
        toNullableString(data.debtTransferable),
        toNullableString(data.debtNotes),
        toNullableString(data.debtItems),
        toNumberOrNull(data.askingPrice),
        valuation ? toNumberOrNull(valuation.valuationRange?.min) : null,
        valuation ? toNumberOrNull(valuation.valuationRange?.max) : null,
        valuation ? toNumberOrNull(valuation.estimatedValue) : null,
        JSON.stringify(data),
        'pending'
      ]);
      
      submissionDbId = insertResult.rows[0].id;
      console.log(`Inserted new questionnaire submission ${submissionId} with ID ${submissionDbId}`);
    }
    
    // If we have valuation data, save it to the business_valuations table
    if (valuation) {
      // Check if a valuation entry already exists
      const checkValuationQuery = 'SELECT id FROM business_valuations WHERE submission_id = $1';
      const checkValuationResult = await client.query(checkValuationQuery, [submissionId]);
      
      if (checkValuationResult.rows.length > 0) {
        // Update existing valuation
        const updateValuationQuery = `
          UPDATE business_valuations
          SET 
            email = $1,
            valuation_min = $2,
            valuation_max = $3,
            estimated_value = $4,
            confidence = $5,
            multiple = $6,
            multiple_type = $7,
            summary = $8,
            valuation_data = $9,
            updated_at = NOW()
          WHERE submission_id = $10
          RETURNING id
        `;
        
        await client.query(updateValuationQuery, [
          email,
          toNumberOrNull(valuation.valuationRange?.min),
          toNumberOrNull(valuation.valuationRange?.max),
          toNumberOrNull(valuation.estimatedValue),
          toNumberOrNull(valuation.confidence),
          toNumberOrNull(valuation.multiple),
          toNullableString(valuation.multipleType),
          toNullableString(valuation.summary),
          JSON.stringify(valuation),
          submissionId
        ]);
        
        console.log(`Updated business valuation for submission ${submissionId}`);
      } else {
        // Insert new valuation
        const insertValuationQuery = `
          INSERT INTO business_valuations (
            submission_id,
            email,
            valuation_min,
            valuation_max,
            estimated_value,
            confidence,
            multiple,
            multiple_type,
            summary,
            valuation_data,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id
        `;
        
        await client.query(insertValuationQuery, [
          submissionId,
          email,
          toNumberOrNull(valuation.valuationRange?.min),
          toNumberOrNull(valuation.valuationRange?.max),
          toNumberOrNull(valuation.estimatedValue),
          toNumberOrNull(valuation.confidence),
          toNumberOrNull(valuation.multiple),
          toNullableString(valuation.multipleType),
          toNullableString(valuation.summary),
          JSON.stringify(valuation)
        ]);
        
        console.log(`Inserted new business valuation for submission ${submissionId}`);
      }
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    return {
      success: true,
      submissionId,
      submissionDbId
    };
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Database error in saveQuestionnaireSubmission:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

/**
 * Calculate a comprehensive business valuation using all available metrics
 */
function calculateComprehensiveValuation(businessData, multiplierData) {
  console.log('Calculating comprehensive valuation with factors:', {
    industry: businessData.industry,
    revenue: businessData.revenue,
    ebitda: businessData.ebitda,
    yearsInOperation: businessData.yearsInOperation,
    growthRate: businessData.growthRate
  });
  
  // Initialize basic valuation variables
  let estimatedValue, minValue, maxValue, multipleUsed, multipleType;
  const factors = [];
  
  // STEP 1: Calculate base valuation using either EBITDA or revenue
  if (businessData.ebitda > 0) {
    // EBITDA-based valuation (preferred method)
    multipleUsed = multiplierData.ebitda_multiplier;
    multipleType = 'ebitda';
    estimatedValue = Math.round(businessData.ebitda * multipleUsed);
    
    // Use revenue multipliers for the range bounds
    minValue = Math.round(businessData.revenue * multiplierData.min_revenue_multiplier);
    maxValue = Math.round(businessData.revenue * multiplierData.max_revenue_multiplier);
    
    // Add EBITDA as a primary factor
    factors.push({
      name: 'EBITDA',
      impact: 10,
      analysis: `Your EBITDA of £${businessData.ebitda.toLocaleString()} with a ${multipleUsed.toFixed(1)}x multiple forms the core of this valuation.`
    });
  } else {
    // Revenue-based valuation (when EBITDA is not available)
    const avgRevenueMultiplier = (multiplierData.min_revenue_multiplier + multiplierData.max_revenue_multiplier) / 2;
    multipleUsed = avgRevenueMultiplier;
    multipleType = 'revenue';
    estimatedValue = Math.round(businessData.revenue * avgRevenueMultiplier);
    
    // Direct revenue multiplier range
    minValue = Math.round(businessData.revenue * multiplierData.min_revenue_multiplier);
    maxValue = Math.round(businessData.revenue * multiplierData.max_revenue_multiplier);
    
    // Add revenue as a neutral factor
    factors.push({
      name: 'Revenue',
      impact: 5,
      analysis: `Your annual revenue of £${businessData.revenue.toLocaleString()} with a ${multipleUsed.toFixed(2)}x multiple forms the core of this valuation.`
    });
  }
  
  // STEP 2: Apply industry-specific adjustments
  factors.push({
    name: 'Industry',
    impact: 5,
    analysis: `${businessData.industry || 'Your industry'} businesses typically sell for ${multiplierData.min_revenue_multiplier}x-${multiplierData.max_revenue_multiplier}x revenue or ${multiplierData.ebitda_multiplier}x EBITDA.`
  });
  
  // STEP 3: Adjust for growth rate
  if (businessData.growthRate && businessData.growthRate > 0) {
    const growthFactor = 1 + (Math.min(businessData.growthRate, 50) / 100);
    estimatedValue = Math.round(estimatedValue * growthFactor);
    maxValue = Math.round(maxValue * growthFactor);
    
    // Add growth as a factor (positive impact)
    const growthImpact = Math.min(businessData.growthRate / 5, 10);
    factors.push({
      name: 'Growth Rate',
      impact: growthImpact,
      analysis: `Your ${businessData.growthRate}% growth rate increases the valuation by approximately ${((growthFactor-1)*100).toFixed(0)}%.`
    });
  } else if (businessData.growthRate < 0) {
    // Negative growth rate adjustment
    const growthFactor = 1 + (Math.max(businessData.growthRate, -30) / 100);
    estimatedValue = Math.round(estimatedValue * growthFactor);
    minValue = Math.round(minValue * growthFactor);
    
    // Add negative growth as a factor
    factors.push({
      name: 'Negative Growth',
      impact: -5,
      analysis: `Your ${businessData.growthRate}% negative growth rate reduces valuation by approximately ${((1-growthFactor)*100).toFixed(0)}%.`
    });
  }
  
  // STEP 4: Adjust for historical performance
  if (businessData.ebitdaPrevYear > 0 && businessData.ebitda > 0) {
    const ebitdaGrowth = ((businessData.ebitda - businessData.ebitdaPrevYear) / businessData.ebitdaPrevYear) * 100;
    
    if (ebitdaGrowth > 10) {
      // Strong EBITDA growth is positive
      const ebitdaFactor = 1 + (Math.min(ebitdaGrowth, 50) / 200);
      estimatedValue = Math.round(estimatedValue * ebitdaFactor);
      maxValue = Math.round(maxValue * ebitdaFactor);
      
      factors.push({
        name: 'EBITDA Growth',
        impact: 7,
        analysis: `Your year-over-year EBITDA growth of ${ebitdaGrowth.toFixed(1)}% positively impacts valuation.`
      });
    } else if (ebitdaGrowth < -10) {
      // Declining EBITDA is negative
      const ebitdaFactor = 1 + (Math.max(ebitdaGrowth, -30) / 200);
      estimatedValue = Math.round(estimatedValue * ebitdaFactor);
      minValue = Math.round(minValue * ebitdaFactor);
      
      factors.push({
        name: 'EBITDA Decline',
        impact: -5,
        analysis: `Your year-over-year EBITDA decline of ${Math.abs(ebitdaGrowth).toFixed(1)}% negatively impacts valuation.`
      });
    }
  }
  
  // STEP 5: Adjust for business age/stability
  if (businessData.yearsInOperation > 10) {
    // Established businesses get a premium
    const ageFactor = 1.15;
    estimatedValue = Math.round(estimatedValue * ageFactor);
    minValue = Math.round(minValue * 1.1);
    
    factors.push({
      name: 'Business Longevity',
      impact: 6,
      analysis: `Your business's ${businessData.yearsInOperation} years of operation demonstrates stability, adding a premium to valuation.`
    });
  } else if (businessData.yearsInOperation < 3) {
    // Very new businesses may get discounted
    const ageFactor = 0.9;
    estimatedValue = Math.round(estimatedValue * ageFactor);
    maxValue = Math.round(maxValue * 0.95);
    
    factors.push({
      name: 'New Business',
      impact: -3,
      analysis: `Your business's ${businessData.yearsInOperation} years of operation introduces some uncertainty, slightly reducing valuation.`
    });
  }
  
  // STEP 6: Adjust for scalability
  const scalabilityMap = {
    'High': { factor: 1.15, impact: 7, text: 'highly scalable' },
    'Medium': { factor: 1.0, impact: 0, text: 'moderately scalable' },
    'Low': { factor: 0.9, impact: -3, text: 'limited scalability' }
  };
  
  const scalabilityInfo = scalabilityMap[businessData.scalability] || scalabilityMap['Medium'];
  estimatedValue = Math.round(estimatedValue * scalabilityInfo.factor);
  
  if (businessData.scalability !== 'Medium') {
    factors.push({
      name: 'Scalability',
      impact: scalabilityInfo.impact,
      analysis: `Your business has ${scalabilityInfo.text}, which ${scalabilityInfo.impact >= 0 ? 'enhances' : 'limits'} its valuation.`
    });
  }
  
  // STEP 7: Consider assets (FFE) value
  if (businessData.ffeValue > 0) {
    if (businessData.ffeValue > businessData.revenue * 0.2) {
      const ffeImpact = Math.min(businessData.ffeValue * 0.1, businessData.revenue * 0.1);
      estimatedValue += Math.round(ffeImpact);
      minValue += Math.round(ffeImpact * 0.5);
      maxValue += Math.round(ffeImpact * 1.5);
      
      factors.push({
        name: 'Valuable Assets',
        impact: 5,
        analysis: `Your substantial assets (FFE) valued at £${businessData.ffeValue.toLocaleString()} add significant tangible value.`
      });
    }
  }
  
  // STEP 8: Adjust for debt if transferable
  if (businessData.totalDebtAmount > 0) {
    let debtImpact = 0;
    
    if (businessData.debtTransferable === 'yes') {
      debtImpact = businessData.totalDebtAmount;
      estimatedValue -= Math.round(debtImpact);
      minValue -= Math.round(debtImpact);
      maxValue -= Math.round(debtImpact);
      
      factors.push({
        name: 'Transferable Debt',
        impact: -5,
        analysis: `The £${businessData.totalDebtAmount.toLocaleString()} of transferable debt reduces the business value.`
      });
    } else if (businessData.debtTransferable === 'some') {
      debtImpact = businessData.totalDebtAmount * 0.5;
      estimatedValue -= Math.round(debtImpact);
      minValue -= Math.round(debtImpact);
      maxValue -= Math.round(debtImpact);
      
      factors.push({
        name: 'Partial Debt Transfer',
        impact: -3,
        analysis: `Approximately £${debtImpact.toLocaleString()} of transferable debt reduces the business value.`
      });
    }
  }
  
  // STEP 9: Final range adjustments and validation
  if (minValue > maxValue) {
    minValue = Math.round(maxValue * 0.75);
  }
  
  if (estimatedValue < minValue) {
    estimatedValue = minValue;
  } else if (estimatedValue > maxValue) {
    estimatedValue = maxValue;
  }
  
  // Generate market comparables with real metrics
  const marketComparables = generateMarketComparables(businessData);
  
  // Calculate confidence score
  const confidence = calculateConfidenceScore(businessData);
  
  // Generate intelligent recommendations
  const recommendations = generateRecommendations(businessData, factors);
  
  // Return the complete valuation object
  return {
    estimatedValue: estimatedValue,
    valuationRange: {
      min: minValue,
      max: maxValue
    },
    confidence: confidence,
    multiple: multipleUsed,
    multipleType: multipleType,
    summary: `Based on ${businessData.industry || 'standard industry'} multipliers with ${factors.length} business-specific adjustments.`,
    factors: factors.reduce((obj, factor) => {
      obj[factor.name.toLowerCase().replace(/\s+/g, '_')] = factor;
      return obj;
    }, {}),
    industryData: {
      industry: businessData.industry || 'Other',
      revenueMultiplierMin: multiplierData.min_revenue_multiplier,
      revenueMultiplierMax: multiplierData.max_revenue_multiplier,
      ebitdaMultiplier: multiplierData.ebitda_multiplier
    },
    marketComparables: marketComparables,
    recommendations: recommendations,
    businessMetrics: {
      revenue: businessData.revenue,
      ebitda: businessData.ebitda,
      revenuePrevYear: businessData.revenuePrevYear,
      ebitdaPrevYear: businessData.ebitdaPrevYear,
      growthRate: businessData.growthRate,
      yearsInOperation: businessData.yearsInOperation,
      ffeValue: businessData.ffeValue,
      totalDebtAmount: businessData.totalDebtAmount,
      debtTransferable: businessData.debtTransferable,
      scalability: businessData.scalability
    }
  };
}

/**
 * Generate market comparable metrics for the valuation
 */
function generateMarketComparables(businessData) {
  const industry = businessData.industry || 'Other';
  
  // Get industry benchmarks
  const benchmarks = getIndustryBenchmarks(industry);
  
  // Calculate business metrics
  const metrics = [];
  
  // Revenue multiple
  if (businessData.revenue) {
    metrics.push({
      name: 'Revenue Multiple',
      yourValue: businessData.estimatedValue ? 
        (businessData.estimatedValue / businessData.revenue).toFixed(2) + 'x' : 
        'N/A',
      industryAverage: benchmarks.revenueMultiplier.toFixed(2) + 'x'
    });
  }
  
  // EBITDA multiple
  if (businessData.ebitda) {
    metrics.push({
      name: 'EBITDA Multiple',
      yourValue: businessData.estimatedValue ? 
        (businessData.estimatedValue / businessData.ebitda).toFixed(2) + 'x' : 
        'N/A',
      industryAverage: benchmarks.ebitdaMultiplier.toFixed(2) + 'x'
    });
  }
  
  // Profit margin
  if (businessData.revenue && businessData.ebitda) {
    const profitMargin = (businessData.ebitda / businessData.revenue) * 100;
    metrics.push({
      name: 'Profit Margin',
      yourValue: profitMargin.toFixed(1) + '%',
      industryAverage: benchmarks.profitMargin.toFixed(1) + '%'
    });
  }
  
  // Growth rate
  if (businessData.growthRate !== undefined) {
    metrics.push({
      name: 'Growth Rate',
      yourValue: businessData.growthRate.toFixed(1) + '%',
      industryAverage: benchmarks.growthRate.toFixed(1) + '%'
    });
  }
  
  // Years in operation
  if (businessData.yearsInOperation) {
    metrics.push({
      name: 'Years in Operation',
      yourValue: businessData.yearsInOperation.toString(),
      industryAverage: benchmarks.yearsInOperation.toString()
    });
  }
  
  return {
    intro: `Here's how your ${industry} business compares to industry averages:`,
    metrics: metrics
  };
}

/**
 * Get industry benchmarks for comparables
 */
function getIndustryBenchmarks(industry) {
  const benchmarks = {
    'Financial Services': {
      revenueMultiplier: 1.8,
      ebitdaMultiplier: 4.5,
      profitMargin: 25.0,
      growthRate: 8.0,
      yearsInOperation: 12
    },
    'Health Care & Fitness': {
      revenueMultiplier: 1.2,
      ebitdaMultiplier: 4.0,
      profitMargin: 18.0,
      growthRate: 7.5,
      yearsInOperation: 10
    },
    'Manufacturing': {
      revenueMultiplier: 0.8,
      ebitdaMultiplier: 3.5,
      profitMargin: 15.0,
      growthRate: 4.0,
      yearsInOperation: 15
    },
    'Online & Technology': {
      revenueMultiplier: 2.0,
      ebitdaMultiplier: 5.0,
      profitMargin: 22.0,
      growthRate: 15.0,
      yearsInOperation: 6
    },
    'Retail': {
      revenueMultiplier: 0.6,
      ebitdaMultiplier: 3.0,
      profitMargin: 12.0,
      growthRate: 3.5,
      yearsInOperation: 8
    },
    'Service Businesses': {
      revenueMultiplier: 0.9,
      ebitdaMultiplier: 3.5,
      profitMargin: 20.0,
      growthRate: 6.0,
      yearsInOperation: 9
    },
    'Other': {
      revenueMultiplier: 1.0,
      ebitdaMultiplier: 3.0,
      profitMargin: 15.0,
      growthRate: 5.0,
      yearsInOperation: 10
    }
  };
  
  return benchmarks[industry] || benchmarks['Other'];
}

/**
 * Calculate confidence score based on data quality and completeness
 */
function calculateConfidenceScore(businessData) {
  // Critical financial fields
  const criticalFields = [
    'revenue', 
    'ebitda'
  ];
  
  // Important fields that add confidence
  const importantFields = [
    'revenuePrevYear',
    'ebitdaPrevYear',
    'growthRate',
    'yearsInOperation',
    'industry',
    'ffeValue',
    'scalability'
  ];
  
  // Supplemental fields that add some confidence
  const supplementalFields = [
    'revenue2YearsAgo',
    'ebitda2YearsAgo',
    'growthAreas',
    'growthChallenges',
    'ffeItems',
    'debtItems',
    'totalDebtAmount',
    'debtTransferable',
    'debtNotes'
  ];
  
  // Calculate completeness for each category
  let criticalScore = 0;
  criticalFields.forEach(field => {
    if (businessData[field] && businessData[field] > 0) criticalScore++;
  });
  criticalScore = criticalScore / criticalFields.length;
  
  let importantScore = 0;
  importantFields.forEach(field => {
    if (businessData[field] && (
      typeof businessData[field] === 'number' ? businessData[field] > 0 : businessData[field].length > 0
    )) importantScore++;
  });
  importantScore = importantScore / importantFields.length;
  
  let supplementalScore = 0;
  supplementalFields.forEach(field => {
    if (businessData[field] && (
      typeof businessData[field] === 'number' ? businessData[field] > 0 : businessData[field].length > 0
    )) supplementalScore++;
  });
  supplementalScore = supplementalScore / supplementalFields.length;
  
  // Weight the scores
  const weightedScore = 
    (criticalScore * 0.5) + 
    (importantScore * 0.35) + 
    (supplementalScore * 0.15);
  
  // Convert to percentage (0-100)
  return Math.round(weightedScore * 100);
}

/**
 * Generate intelligent recommendations based on the business data and valuation factors
 */
function generateRecommendations(businessData, factors) {
  const recommendations = {
    items: []
  };
  
  // Add general recommendations
  recommendations.items.push("Document your business processes to increase transferability and value.");
  
  // Growth-related recommendations
  if (businessData.growthRate < 5) {
    recommendations.items.push("Focus on improving your growth rate, as this could significantly enhance your valuation.");
  }
  
  // EBITDA-related recommendations
  if (businessData.revenue > 0 && businessData.ebitda > 0) {
    const profitMargin = (businessData.ebitda / businessData.revenue) * 100;
    if (profitMargin < 15) {
      recommendations.items.push("Work on improving your profit margins, which are lower than industry average.");
    }
  }
  
  // Debt-related recommendations
  if (businessData.totalDebtAmount > 0 && businessData.debtTransferable === 'yes') {
    recommendations.items.push("Consider reducing transferable debt to improve your business valuation.");
  }
  
  // Scalability recommendations
  if (businessData.scalability === 'Low') {
    recommendations.items.push("Invest in systems and processes that make your business more scalable to increase its value.");
  }
  
  // FFE recommendations
  if (businessData.ffeValue === 0 || !businessData.ffeValue) {
    recommendations.items.push("Consider documenting your fixtures, furniture, and equipment values, as tangible assets can improve valuation.");
  }
  
  // Ensure we have at least 3 recommendations
  if (recommendations.items.length < 3) {
    recommendations.items.push("Regularly update your financial statements to maintain accurate valuation metrics.");
  }
  
  return recommendations;
}

/**
 * Fallback function to get hardcoded industry multipliers
 */
function getHardcodedMultipliers(industry) {
  const multipliers = {
    'Financial Services': {
      industry: 'Financial Services',
      min_revenue_multiplier: 0.8,
      max_revenue_multiplier: 2.2,
      ebitda_multiplier: 4.5
    },
    'Health Care & Fitness': {
      industry: 'Health Care & Fitness',
      min_revenue_multiplier: 0.7,
      max_revenue_multiplier: 1.8,
      ebitda_multiplier: 4.0
    },
    'Manufacturing': {
      industry: 'Manufacturing',
      min_revenue_multiplier: 0.6,
      max_revenue_multiplier: 1.5,
      ebitda_multiplier: 3.5
    },
    'Online & Technology': {
      industry: 'Online & Technology',
      min_revenue_multiplier: 1.0,
      max_revenue_multiplier: 3.0,
      ebitda_multiplier: 5.0
    },
    'Pet Services': {
      industry: 'Pet Services',
      min_revenue_multiplier: 0.6,
      max_revenue_multiplier: 1.6,
      ebitda_multiplier: 3.0
    },
    'Restaurants & Food': {
      industry: 'Restaurants & Food',
      min_revenue_multiplier: 0.4,
      max_revenue_multiplier: 1.2,
      ebitda_multiplier: 2.5
    },
    'Retail': {
      industry: 'Retail',
      min_revenue_multiplier: 0.3,
      max_revenue_multiplier: 1.0,
      ebitda_multiplier: 3.0
    },
    'Service Businesses': {
      industry: 'Service Businesses',
      min_revenue_multiplier: 0.5,
      max_revenue_multiplier: 1.5,
      ebitda_multiplier: 3.5
    },
    'Transportation & Storage': {
      industry: 'Transportation & Storage',
      min_revenue_multiplier: 0.4,
      max_revenue_multiplier: 1.3,
      ebitda_multiplier: 3.0
    },
    'Travel': {
      industry: 'Travel',
      min_revenue_multiplier: 0.4,
      max_revenue_multiplier: 1.3,
      ebitda_multiplier: 3.0
    },
    'Wholesale & Distributors': {
      industry: 'Wholesale & Distributors',
      min_revenue_multiplier: 0.4,
      max_revenue_multiplier: 1.0,
      ebitda_multiplier: 2.5
    },
    'Other': {
      industry: 'Other',
      min_revenue_multiplier: 0.5,
      max_revenue_multiplier: 1.5,
      ebitda_multiplier: 3.0
    }
  };
  
  return multipliers[industry] || multipliers['Other'];
}

export default router;
