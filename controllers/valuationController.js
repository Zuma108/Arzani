import pool from '../db.js'; // Fixed import to match db.js export style
import valuationService from '../services/valuationService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get industry-specific multipliers from the database
 * This function queries the industry_metrics table to get accurate multipliers
 */
async function getIndustryMultipliers(industry) {
  try {
    console.log(`Looking up multipliers for industry: ${industry}`);
    
    // Query the industry_metrics table for the specified industry
    const query = `
      SELECT 
        industry, 
        avg_sales_multiple, 
        avg_ebitda_multiple, 
        avg_profit_margin,
        business_count,
        median_price
      FROM industry_metrics 
      WHERE LOWER(industry) = LOWER($1)
    `;
    
    const result = await pool.query(query, [industry]);
    
    // Check if we found metrics for this industry
    if (result.rows.length > 0) {
      const metrics = result.rows[0];
      console.log(`Found industry metrics for ${industry}:`, metrics);
      
      return {
        minRevenueMultiplier: parseFloat(metrics.avg_sales_multiple) * 0.8 || 0.5,
        maxRevenueMultiplier: parseFloat(metrics.avg_sales_multiple) * 1.2 || 2.5,
        avgRevenueMultiple: parseFloat(metrics.avg_sales_multiple) || 1.5,
        avgEbitdaMultiple: parseFloat(metrics.avg_ebitda_multiple) || 3.5,
        avgProfitMargin: parseFloat(metrics.avg_profit_margin) || 15,
        businessCount: parseInt(metrics.business_count) || 0,
        medianPrice: parseFloat(metrics.median_price) || 0
      };
    }
    
    // If not found by exact name, try partial match
    const fuzzyQuery = `
      SELECT 
        industry, 
        avg_sales_multiple, 
        avg_ebitda_multiple, 
        avg_profit_margin,
        business_count,
        median_price
      FROM industry_metrics 
      WHERE LOWER(industry) LIKE LOWER($1)
      LIMIT 1
    `;
    
    const fuzzyResult = await pool.query(fuzzyQuery, [`%${industry}%`]);
    
    if (fuzzyResult.rows.length > 0) {
      const metrics = fuzzyResult.rows[0];
      console.log(`Found partial match industry metrics for ${industry}:`, metrics);
      
      return {
        minRevenueMultiplier: parseFloat(metrics.avg_sales_multiple) * 0.8 || 0.5,
        maxRevenueMultiplier: parseFloat(metrics.avg_sales_multiple) * 1.2 || 2.5,
        avgRevenueMultiple: parseFloat(metrics.avg_sales_multiple) || 1.5,
        avgEbitdaMultiple: parseFloat(metrics.avg_ebitda_multiple) || 3.5,
        avgProfitMargin: parseFloat(metrics.avg_profit_margin) || 15,
        businessCount: parseInt(metrics.business_count) || 0,
        medianPrice: parseFloat(metrics.median_price) || 0
      };
    }
    
    // If we couldn't find any metrics, log a warning and return defaults
    console.warn(`No industry metrics found for '${industry}'. Using default multipliers.`);
    return {
      minRevenueMultiplier: 0.5,
      maxRevenueMultiplier: 2.5,
      avgRevenueMultiple: 1.5,
      avgEbitdaMultiple: 3.5,
      avgProfitMargin: 15,
      businessCount: 0,
      medianPrice: 0
    };
  } catch (error) {
    console.error('Error getting industry multipliers:', error);
    
    // In case of error, return default multipliers
    return {
      minRevenueMultiplier: 0.5,
      maxRevenueMultiplier: 2.5,
      avgRevenueMultiple: 1.5,
      avgEbitdaMultiple: 3.5,
      avgProfitMargin: 15,
      businessCount: 0,
      medianPrice: 0
    };
  }
}

/**
 * Calculate business valuation based on provided data
 */
async function calculateValuation(req, res) {
  try {
    const businessData = req.body;
    
    console.log('Database connected');
    
    // Fix the function name: change calculateBusinessValue to calculateBusinessValuation
    // This is the line causing the error at line 152
    const result = await valuationService.calculateBusinessValuation(businessData);
    
    // Return the valuation result
    return res.status(200).json({
      success: true,
      valuation: result
    });
    
  } catch (error) {
    console.error('Valuation calculation error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate valuation',
        error: error.message
      });
    }
  }
}

/**
 * Save valuation to database for future reference
 */
async function saveValuationToDatabase(email, businessData, valuation) {
  try {
    // Ensure email is provided
    if (!email) {
      console.warn('Cannot save valuation - email is missing');
      throw new Error('Email is required to save valuation data');
    }

    const query = `
      INSERT INTO business_valuations 
      (email, business_data, valuation_results, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    
    const values = [
      email.toLowerCase(),
      JSON.stringify(businessData),
      JSON.stringify(valuation)
    ];
    
    console.log('Saving valuation to database with email:', email);
    const result = await pool.query(query, values);
    console.log('Valuation saved successfully with ID:', result.rows[0].id);
    return result.rows[0].id;
  } catch (error) {
    console.error('Database error saving valuation:', error);
    // Re-throw to allow caller to handle
    throw error;
  }
}

/**
 * Save questionnaire data submitted via authenticated or fallback routes
 */
export const saveQuestionnaireData = async (req, res) => {
  // Force content type early
  res.setHeader('Content-Type', 'application/json');
  try {
    console.log('Controller: saveQuestionnaireData request received');

    const formData = req.body;

    if (!formData) {
      console.warn('Controller save failed: No form data');
      return res.status(400).json({
        success: false,
        message: 'No questionnaire data provided'
      });
    }
    if (!formData.email) {
      console.warn('Controller save failed: Missing email');
      return res.status(400).json({
        success: false,
        message: 'Email is required to save questionnaire data'
      });
    }

    // Option 1: Re-use the robust save function from public-valuation.js
    // This requires careful import/export setup or moving the function to a shared service.
    // Example (if saveQuestionnaireSubmission was exported from public-valuation):
    // import { saveQuestionnaireSubmission as publicSave } from '../api/public-valuation.js'; // Adjust path as needed
    // const result = await publicSave(formData, formData.valuationData || null);

    // Option 2: Enhance this controller's save logic (shown below)
    // This duplicates logic but keeps controller self-contained for now.

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const submissionId = formData.submissionId || `sub_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const email = formData.email.toLowerCase().trim();
        const valuationData = formData.valuationData || null; // Extract valuation data if present

        // Check if submission exists
        const checkQuery = 'SELECT id FROM questionnaire_submissions WHERE submission_id = $1';
        const checkResult = await client.query(checkQuery, [submissionId]);

        if (checkResult.rows.length > 0) {
            // Update existing submission (Simplified example - copy full logic if needed)
            const updateQuery = `
                UPDATE questionnaire_submissions
                SET email = $1, data = $2, valuation_data = $3, updated_at = NOW()
                WHERE submission_id = $4
                RETURNING id
            `;
            await client.query(updateQuery, [
                email,
                JSON.stringify(formData),
                valuationData ? JSON.stringify(valuationData) : null,
                submissionId
            ]);
            console.log(`Controller: Updated questionnaire submission ${submissionId}`);
        } else {
            // Insert new submission
            const insertQuery = `
                INSERT INTO questionnaire_submissions (
                    submission_id, email, data, valuation_data, status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING id
            `;
            await client.query(insertQuery, [
                submissionId,
                email,
                JSON.stringify(formData),
                valuationData ? JSON.stringify(valuationData) : null,
                'pending' // Or 'linked' if user context is available
            ]);
            console.log(`Controller: Inserted new questionnaire submission ${submissionId}`);
        }

        // Save to business_valuations table if valuation data exists
        if (valuationData) {
             const checkValuationQuery = 'SELECT id FROM business_valuations WHERE submission_id = $1';
             const checkValuationResult = await client.query(checkValuationQuery, [submissionId]);

             const valuationValues = [
                 submissionId,
                 email,
                 parseFloat(valuationData.valuationRange?.min) || null,
                 parseFloat(valuationData.valuationRange?.max) || null,
                 parseFloat(valuationData.estimatedValue) || null,
                 parseFloat(valuationData.confidence) || null,
                 parseFloat(valuationData.multiple) || null,
                 valuationData.multipleType || null,
                 valuationData.summary || null,
                 JSON.stringify(valuationData)
             ];

             if (checkValuationResult.rows.length > 0) {
                 // Update existing valuation
                 const updateValuationQuery = `
                     UPDATE business_valuations SET email=$2, valuation_min=$3, valuation_max=$4, estimated_value=$5,
                     confidence=$6, multiple=$7, multiple_type=$8, summary=$9, valuation_data=$10, updated_at=NOW()
                     WHERE submission_id = $1 RETURNING id
                 `;
                 await client.query(updateValuationQuery, valuationValues);
                 console.log(`Controller: Updated business valuation for submission ${submissionId}`);
             } else {
                 // Insert new valuation
                 const insertValuationQuery = `
                     INSERT INTO business_valuations (submission_id, email, valuation_min, valuation_max, estimated_value,
                     confidence, multiple, multiple_type, summary, valuation_data, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING id
                 `;
                 await client.query(insertValuationQuery, valuationValues);
                 console.log(`Controller: Inserted new business valuation for submission ${submissionId}`);
             }
        }

        await client.query('COMMIT');

        // Return success response
        return res.status(200).json({
            success: true,
            message: 'Questionnaire data saved successfully via controller',
            submissionId: submissionId
        });

    } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('Controller: Database error saving questionnaire data:', dbError);
        throw dbError; // Re-throw to be caught by outer catch block
    } finally {
        client.release();
    }

  } catch (error) {
    console.error('Controller: Error saving questionnaire data:', error);
    // Ensure JSON response for errors
    if (!res.headersSent) {
        res.status(500).json({
            success: false,
            message: 'Failed to save questionnaire data via controller',
            error: error.message
        });
    }
  }
};

/**
 * Link previously submitted questionnaire data to a user account
 */
export const linkQuestionnaireData = async (userId, email) => {
  try {
    // Look for any submissions with this email that aren't linked to a user yet
    const findQuery = `
      SELECT id, submission_id 
      FROM questionnaire_submissions 
      WHERE email = $1 AND (user_id IS NULL OR is_linked = FALSE)
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const findResult = await pool.query(findQuery, [email.toLowerCase().trim()]);
    
    if (findResult.rows.length === 0) {
      console.log(`No unlinked questionnaire data found for email: ${email}`);
      return null;
    }
    
    // Link the submission to the user
    const updateQuery = `
      UPDATE questionnaire_submissions
      SET user_id = $1, is_linked = TRUE, updated_at = NOW(), status = 'linked'
      WHERE id = $2
      RETURNING submission_id
    `;
    
    const updateResult = await pool.query(updateQuery, [userId, findResult.rows[0].id]);
    
    // Also update the users table to show they have questionnaire data
    const userUpdateQuery = `
      UPDATE users
      SET has_questionnaire = TRUE, 
          questionnaire_id = $1, 
          questionnaire_linked_at = NOW()
      WHERE id = $2
    `;
    
    await pool.query(userUpdateQuery, [findResult.rows[0].id, userId]);
    
    console.log(`Questionnaire data linked to user ${userId} with submission ID: ${updateResult.rows[0].submission_id}`);
    
    return updateResult.rows[0].submission_id;
  } catch (error) {
    console.error('Error linking questionnaire data:', error);
    return null;
  }
};

/**
 * Link a specific questionnaire submission to a user by ID
 */
export const linkQuestionnaireSubmissionById = async (userId, submissionId) => {
  try {
    const query = `
      UPDATE questionnaire_submissions
      SET user_id = $1, is_linked = TRUE, updated_at = NOW(), status = 'linked'
      WHERE submission_id = $2 AND (user_id IS NULL OR is_linked = FALSE)
      RETURNING id
    `;
    
    const result = await pool.query(query, [userId, submissionId]);
    
    // If we found and updated a submission, also update the user
    if (result.rows.length > 0) {
      const userUpdateQuery = `
        UPDATE users
        SET has_questionnaire = TRUE, 
            questionnaire_id = $1, 
            questionnaire_linked_at = NOW()
        WHERE id = $2
      `;
      
      await pool.query(userUpdateQuery, [result.rows[0].id, userId]);
      return result.rows[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error linking questionnaire submission by ID:', error);
    return null;
  }
};


// Export all functions
export default {
  calculateValuation,
  saveQuestionnaireData,
  linkQuestionnaireData,
  linkQuestionnaireSubmissionById
};
