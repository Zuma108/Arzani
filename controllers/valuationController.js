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
  // Normalize input - handle both direct API calls and router forwarded calls
  const formData = req.body || req;
  const isHttpRequest = res && typeof res.setHeader === 'function';
  
  // If this is an HTTP request, set content type
  if (isHttpRequest) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  try {
    console.log('Controller: saveQuestionnaireData request received');

    if (!formData) {
      console.warn('Controller save failed: No form data');
      if (isHttpRequest) {
        return res.status(400).json({
          success: false,
          message: 'No questionnaire data provided'
        });
      }
      return null;
    }

    // For anonymous users, we still need a way to identify them
    if (!formData.email && !formData.anonymousId) {
      console.warn('Controller save failed: Missing both email and anonymousId');
      if (isHttpRequest) {
        return res.status(400).json({
          success: false,
          message: 'Either email or anonymousId is required to save questionnaire data'
        });
      }
      return null;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const submissionId = formData.submissionId || `sub_${Date.now()}_${uuidv4().substring(0, 8)}`;
        const email = formData.email ? formData.email.toLowerCase().trim() : null;
        const anonymousId = formData.anonymousId || null;
        const valuationData = formData.valuationData || formData.valuation || null;

        // Add logging to see if this specific submission ID is being processed frequently
        console.log(`Controller: Processing save request for submissionId: ${submissionId}, email: ${email}, anonymousId: ${anonymousId}`);

        // Check if submission exists
        const checkQuery = 'SELECT id, updated_at FROM questionnaire_submissions WHERE submission_id = $1';
        const checkResult = await client.query(checkQuery, [submissionId]);

        let submissionDbId;
        if (checkResult.rows.length > 0) {
            // Log if we are updating an existing record shortly after its last update
            const lastUpdate = new Date(checkResult.rows[0].updated_at);
            const now = new Date();
            if (now - lastUpdate < 5000) { // Log if updated within last 5 seconds
                console.warn(`Controller: Rapid update detected for submissionId: ${submissionId}. Last update was at ${lastUpdate.toISOString()}`);
            }

            // Update existing submission
            const updateQuery = `
                UPDATE questionnaire_submissions
                SET 
                    email = COALESCE($1, email),
                    anonymous_id = COALESCE($2, anonymous_id),
                    data = $3, 
                    valuation_data = COALESCE($4, valuation_data),
                    updated_at = NOW()
                WHERE submission_id = $5
                RETURNING id
            `;
            const updateResult = await client.query(updateQuery, [
                email, 
                anonymousId,
                JSON.stringify(formData),
                valuationData ? JSON.stringify(valuationData) : null,
                submissionId
            ]);
            submissionDbId = updateResult.rows[0].id;
            console.log(`Controller: Updated questionnaire submission ${submissionId}`);
        } else {
            // Insert new submission - now accepting anonymous submissions
            const insertQuery = `
                INSERT INTO questionnaire_submissions (
                    submission_id, email, anonymous_id, data, valuation_data, status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                RETURNING id
            `;
            const insertResult = await client.query(insertQuery, [
                submissionId,
                email,
                anonymousId,
                JSON.stringify(formData),
                valuationData ? JSON.stringify(valuationData) : null,
                'pending' // All new submissions start as pending
            ]);
            submissionDbId = insertResult.rows[0].id;
            console.log(`Controller: Inserted new questionnaire submission ${submissionId}`);
        }

        // Save to business_questionnaires table for anonymous data collection
        // This helps with marketing and tracking of questionnaire starts
        if (anonymousId) {
            const checkBQQuery = 'SELECT id FROM business_questionnaires WHERE anonymous_id = $1';
            const checkBQResult = await client.query(checkBQQuery, [anonymousId]);
            
            if (checkBQResult.rows.length > 0) {
                // Update existing business questionnaire
                const updateBQQuery = `
                    UPDATE business_questionnaires
                    SET 
                        email = COALESCE($1, email),
                        business_name = COALESCE($2, business_name),
                        industry = COALESCE($3, industry),
                        description = COALESCE($4, description),
                        other_data = $5,
                        valuation_data = COALESCE($6, valuation_data),
                        updated_at = NOW()
                    WHERE anonymous_id = $7
                    RETURNING id
                `;
                await client.query(updateBQQuery, [
                    email,
                    formData.businessName || null,
                    formData.industry || null,
                    formData.description || null,
                    JSON.stringify(formData),
                    valuationData ? JSON.stringify(valuationData) : null,
                    anonymousId
                ]);
                console.log(`Controller: Updated business questionnaire for anonymous ID ${anonymousId}`);
            } else {
                // Insert new business questionnaire
                const insertBQQuery = `
                    INSERT INTO business_questionnaires (
                        email, business_name, industry, description, anonymous_id, other_data, valuation_data, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                    RETURNING id
                `;
                await client.query(insertBQQuery, [
                    email,
                    formData.businessName || null,
                    formData.industry || null,
                    formData.description || null,
                    anonymousId,
                    JSON.stringify(formData),
                    valuationData ? JSON.stringify(valuationData) : null
                ]);
                console.log(`Controller: Inserted new business questionnaire for anonymous ID ${anonymousId}`);
            }
        }

        // Save to business_valuations table if valuation data exists
        if (valuationData) {
            // Get valuation fields or provide defaults
            const valuationMin = parseFloat(valuationData.valuationRange?.min) || null;
            const valuationMax = parseFloat(valuationData.valuationRange?.max) || null;
            const estimatedValue = parseFloat(valuationData.estimatedValue) || null;
            const confidence = parseFloat(valuationData.confidence) || null;
            const multiple = parseFloat(valuationData.multiple) || null;
            const multipleType = valuationData.multipleType || null;
            const summary = valuationData.summary || null;

            const checkValuationQuery = 'SELECT id FROM business_valuations WHERE submission_id = $1';
            const checkValuationResult = await client.query(checkValuationQuery, [submissionId]);

            if (checkValuationResult.rows.length > 0) {
                // Update existing valuation
                const updateValuationQuery = `
                    UPDATE business_valuations SET 
                        email = COALESCE($2, email),
                        valuation_min = COALESCE($3, valuation_min),
                        valuation_max = COALESCE($4, valuation_max),
                        estimated_value = COALESCE($5, estimated_value),
                        confidence = COALESCE($6, confidence),
                        multiple = COALESCE($7, multiple),
                        multiple_type = COALESCE($8, multiple_type),
                        summary = COALESCE($9, summary),
                        valuation_data = COALESCE($10, valuation_data),
                        updated_at = NOW()
                    WHERE submission_id = $1 
                    RETURNING id
                `;
                await client.query(updateValuationQuery, [
                    submissionId,
                    email,
                    valuationMin,
                    valuationMax,
                    estimatedValue,
                    confidence,
                    multiple,
                    multipleType,
                    summary,
                    JSON.stringify(valuationData)
                ]);
                console.log(`Controller: Updated business valuation for submission ${submissionId}`);
            } else {
                // Insert new valuation
                const insertValuationQuery = `
                    INSERT INTO business_valuations (
                        submission_id, email, valuation_min, valuation_max, estimated_value,
                        confidence, multiple, multiple_type, summary, valuation_data, 
                        created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
                    RETURNING id
                `;
                await client.query(insertValuationQuery, [
                    submissionId,
                    email,
                    valuationMin,
                    valuationMax,
                    estimatedValue,
                    confidence,
                    multiple,
                    multipleType,
                    summary,
                    JSON.stringify(valuationData)
                ]);
                console.log(`Controller: Inserted new business valuation for submission ${submissionId}`);
            }
        }

        await client.query('COMMIT');

        // Return success response based on context
        if (isHttpRequest) {
            console.log(`Controller: Successfully saved/updated submissionId: ${submissionId}. Sending HTTP response.`); // Log success before response
            return res.status(200).json({
                success: true,
                message: 'Questionnaire data saved successfully via controller',
                submissionId: submissionId
            });
        }
        console.log(`Controller: Successfully saved/updated submissionId: ${submissionId}. Returning ID.`); // Log success for non-HTTP context
        return submissionId;

    } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('Controller: Database error saving questionnaire data:', dbError);
        throw dbError; // Re-throw to be caught by outer catch block
    } finally {
        client.release();
    }

  } catch (error) {
    console.error('Controller: Error saving questionnaire data:', error);
    // Ensure JSON response for errors in HTTP context
    if (isHttpRequest && !res.headersSent) {
        res.status(500).json({
            success: false,
            message: 'Failed to save questionnaire data via controller',
            error: error.message
        });
    }
    return null;
  }
};

/**
 * Link previously submitted questionnaire data to a user account
 * - Now updates all relevant tables (questionnaire_submissions, business_questionnaires, business_valuations)
 */
export const linkQuestionnaireData = async (userId, email) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Look for any submissions with this email that aren't linked to a user yet
    const findQuery = `
      SELECT id, submission_id, anonymous_id
      FROM questionnaire_submissions 
      WHERE email = $1 AND (user_id IS NULL OR is_linked = FALSE)
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const findResult = await client.query(findQuery, [email.toLowerCase().trim()]);
    
    if (findResult.rows.length === 0) {
      console.log(`No unlinked questionnaire data found for email: ${email}`);
      await client.query('COMMIT');
      return null;
    }
    
    const submissionId = findResult.rows[0].submission_id;
    const submissionDbId = findResult.rows[0].id;
    const anonymousId = findResult.rows[0].anonymous_id;
    
    // 1. Link the questionnaire_submissions to the user
    const updateQuery = `
      UPDATE questionnaire_submissions
      SET user_id = $1, is_linked = TRUE, updated_at = NOW(), status = 'linked'
      WHERE id = $2
      RETURNING submission_id
    `;
    
    await client.query(updateQuery, [userId, submissionDbId]);
    
    // 2. Update the business_questionnaires table if there's an anonymous_id
    if (anonymousId) {
      const updateBQQuery = `
        UPDATE business_questionnaires
        SET user_id = $1, conversion_status = 'converted', updated_at = NOW()
        WHERE anonymous_id = $2 OR email = $3
      `;
      
      const bqResult = await client.query(updateBQQuery, [userId, anonymousId, email.toLowerCase().trim()]);
      console.log(`Updated ${bqResult.rowCount} business_questionnaires records`);
    }
    
    // 3. Update the business_valuations table
    const updateValuationsQuery = `
      UPDATE business_valuations
      SET user_id = $1, updated_at = NOW()
      WHERE submission_id = $2 OR email = $3
    `;
    
    const valResult = await client.query(updateValuationsQuery, [
      userId, 
      submissionId, 
      email.toLowerCase().trim()
    ]);
    console.log(`Updated ${valResult.rowCount} business_valuations records`);
    
    // 4. Also update the users table to show they have questionnaire data
    const userUpdateQuery = `
      UPDATE users
      SET has_questionnaire = TRUE, 
          questionnaire_id = $1, 
          questionnaire_linked_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(userUpdateQuery, [submissionDbId, userId]);
    
    await client.query('COMMIT');
    
    console.log(`Questionnaire data linked to user ${userId} with submission ID: ${submissionId}`);
    return submissionId;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error linking questionnaire data:', error);
    return null;
  } finally {
    client.release();
  }
};

/**
 * Link a specific questionnaire submission to a user by ID
 * - Now updates all relevant tables (questionnaire_submissions, business_questionnaires, business_valuations)
 */
export const linkQuestionnaireSubmissionById = async (userId, submissionId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. First get the submission data including anonymous_id and email
    const getSubmissionQuery = `
      SELECT id, anonymous_id, email
      FROM questionnaire_submissions
      WHERE submission_id = $1 AND (user_id IS NULL OR is_linked = FALSE)
    `;
    
    const subResult = await client.query(getSubmissionQuery, [submissionId]);
    
    if (subResult.rows.length === 0) {
      console.log(`No unlinked questionnaire found with ID: ${submissionId}`);
      await client.query('COMMIT');
      return null;
    }
    
    const submissionDbId = subResult.rows[0].id;
    const anonymousId = subResult.rows[0].anonymous_id;
    const email = subResult.rows[0].email;
    
    // 2. Update the questionnaire_submissions table
    const updateQuery = `
      UPDATE questionnaire_submissions
      SET user_id = $1, is_linked = TRUE, updated_at = NOW(), status = 'linked'
      WHERE id = $2
    `;
    
    await client.query(updateQuery, [userId, submissionDbId]);
    
    // 3. Update business_questionnaires table if there's an anonymous_id or email
    if (anonymousId || email) {
      const updateBQQuery = `
        UPDATE business_questionnaires
        SET user_id = $1, conversion_status = 'converted', updated_at = NOW()
        WHERE ($2::text IS NULL OR anonymous_id = $2) 
           OR ($3::text IS NULL OR email = $3)
      `;
      
      const bqResult = await client.query(updateBQQuery, [
        userId, 
        anonymousId, 
        email ? email.toLowerCase().trim() : null
      ]);
      console.log(`Updated ${bqResult.rowCount} business_questionnaires records`);
    }
    
    // 4. Update business_valuations table
    const updateValuationsQuery = `
      UPDATE business_valuations
      SET user_id = $1, updated_at = NOW()
      WHERE submission_id = $2
        OR ($3::text IS NULL OR email = $3)
    `;
    
    const valResult = await client.query(updateValuationsQuery, [
      userId, 
      submissionId, 
      email ? email.toLowerCase().trim() : null
    ]);
    console.log(`Updated ${valResult.rowCount} business_valuations records`);
    
    // 5. Update the users table
    const userUpdateQuery = `
      UPDATE users
      SET has_questionnaire = TRUE, 
          questionnaire_id = $1, 
          questionnaire_linked_at = NOW()
      WHERE id = $2
    `;
    
    await client.query(userUpdateQuery, [submissionDbId, userId]);
    
    await client.query('COMMIT');
    
    console.log(`Linked submission ${submissionId} to user ${userId} successfully`);
    return submissionDbId;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error linking questionnaire submission by ID:', error);
    return null;
  } finally {
    client.release();
  }
};


// Export all functions
export default {
  calculateValuation,
  saveQuestionnaireData,
  linkQuestionnaireData,
  linkQuestionnaireSubmissionById
};
