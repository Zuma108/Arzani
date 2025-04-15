/**
 * User Role Management Controller
 * Handles operations related to user roles, preferences, and professional verification
 */

import pool from '../db.js';
import { sendVerificationStatusEmail } from '../utils/email.js';
import { analyzeVerificationWithAI, getAIVerificationRecommendation } from '../services/aiVerificationService.js';

/**
 * Set a user's primary role preference
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const setPrimaryRole = async (req, res) => {
  const { userId } = req.user;
  const { role } = req.body;
  
  // Validate role
  const validRoles = ['buyer', 'seller', 'broker', 'solicitor', 'accountant', 'advisor'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
    });
  }
  
  try {
    // Update the user's primary role
    const updateQuery = `
      UPDATE users
      SET 
        primary_role = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, primary_role, roles
    `;
    
    const result = await pool.query(updateQuery, [role, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Log this role change in the activity tracking table
    await pool.query(`
      INSERT INTO user_role_activities 
        (user_id, role, activity_type, activity_data)
      VALUES 
        ($1, $2, 'primary_role_set', $3)
    `, [
      userId, 
      role, 
      JSON.stringify({ previous_role: req.user.primary_role })
    ]);
    
    return res.status(200).json({
      success: true,
      message: `Primary role set to ${role}`,
      data: {
        primary_role: result.rows[0].primary_role,
        roles: result.rows[0].roles
      }
    });
  } catch (error) {
    console.error('Error setting primary role:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update primary role',
      error: error.message
    });
  }
};

/**
 * Update user roles JSONB data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateRoles = async (req, res) => {
  const { userId } = req.user;
  const { roles } = req.body;
  
  if (!roles || typeof roles !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid roles data' });
  }
  
  try {
    // Update the roles JSONB field
    const updateQuery = `
      UPDATE users
      SET 
        roles = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, primary_role, roles
    `;
    
    const result = await pool.query(updateQuery, [JSON.stringify(roles), userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'User roles updated successfully',
      data: {
        primary_role: result.rows[0].primary_role,
        roles: result.rows[0].roles
      }
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update user roles',
      error: error.message
    });
  }
};

/**
 * Submit a professional verification request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const requestProfessionalVerification = async (req, res) => {
  const { userId } = req.user;
  const { professionalType, documents } = req.body;
  
  // Validate professional type
  const validTypes = ['broker', 'solicitor', 'accountant', 'advisor'];
  if (!validTypes.includes(professionalType)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid professional type. Must be one of: ${validTypes.join(', ')}` 
    });
  }
  
  // Validate documents
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'At least one verification document is required' 
    });
  }
  
  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if user already has a pending verification request
      const checkQuery = `
        SELECT id FROM professional_verification_requests
        WHERE user_id = $1 AND status = 'pending'
      `;
      
      const checkResult = await client.query(checkQuery, [userId]);
      
      if (checkResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ 
          success: false, 
          message: 'You already have a pending verification request' 
        });
      }
      
      // Get user details for email notification
      const userQuery = `
        SELECT email, username FROM users WHERE id = $1
      `;
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const { email, username } = userResult.rows[0];
      
      // Insert verification request
      const insertQuery = `
        INSERT INTO professional_verification_requests
          (user_id, professional_type, verification_documents)
        VALUES
          ($1, $2, $3)
        RETURNING id, request_date, status
      `;
      
      const result = await client.query(insertQuery, [
        userId,
        professionalType,
        documents
      ]);
      
      const newRequest = result.rows[0];
      
      // Update user's professional_type field
      await client.query(`
        UPDATE users
        SET professional_type = $1
        WHERE id = $2
      `, [professionalType, userId]);
      
      // Log this activity
      await client.query(`
        INSERT INTO user_role_activities 
          (user_id, role, activity_type, activity_data)
        VALUES 
          ($1, $2, 'verification_requested', $3)
      `, [
        userId, 
        professionalType, 
        JSON.stringify({ request_id: newRequest.id })
      ]);
      
      await client.query('COMMIT');
      
      // Run AI verification analysis in the background
      analyzeVerificationWithAI(newRequest.id, documents, professionalType)
        .then(aiAnalysis => {
          console.log(`AI analysis completed for request ${newRequest.id} with recommendation: ${aiAnalysis.recommendation}`);
          
          // If AI is highly confident in approval (over 90%), auto-approve the request
          if (aiAnalysis.recommendation === 'Approve' && aiAnalysis.confidenceScore >= 90) {
            console.log(`Auto-approving verification request ${newRequest.id} based on AI recommendation`);
            
            // Update request status to approved
            pool.query(`
              UPDATE professional_verification_requests
              SET 
                status = 'approved',
                reviewed_by = 'AI System',
                review_notes = $1,
                reviewed_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [
              `Auto-approved by AI with ${aiAnalysis.confidenceScore}% confidence. Reasoning: ${aiAnalysis.reasoning}`,
              newRequest.id
            ]);
            
            // Update user's professional status
            pool.query(`
              UPDATE users
              SET 
                is_verified_professional = TRUE,
                professional_type = $1,
                professional_verification_date = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [professionalType, userId]);
            
            // Send approval email
            sendVerificationStatusEmail(email, username, 'approved', professionalType);
          }
        })
        .catch(error => {
          console.error(`Error in background AI analysis for request ${newRequest.id}:`, error);
        });
      
      // Send confirmation email to user
      try {
        await sendVerificationStatusEmail(
          email,
          username,
          'pending',
          professionalType
        );
        console.log(`Sent verification request confirmation email to ${email}`);
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error('Error sending verification request confirmation email:', emailError);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Professional verification request submitted successfully',
        data: {
          requestId: newRequest.id,
          requestDate: newRequest.request_date,
          status: newRequest.status
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error requesting professional verification:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit verification request',
      error: error.message
    });
  }
};

/**
 * Get role-specific data for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRoleData = async (req, res) => {
  const { userId } = req.user;
  const { role } = req.query;
  
  try {
    // Get user role data
    const userQuery = `
      SELECT 
        primary_role, 
        roles, 
        is_verified_professional, 
        professional_type,
        professional_verification_date
      FROM users
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userData = userResult.rows[0];
    
    // If specific role requested, get relevant data for that role
    let roleSpecificData = {};
    
    if (role) {
      switch (role) {
        case 'seller':
          // Get user's business listings
          const businessesQuery = `
            SELECT id, business_name, industry, is_active
            FROM businesses
            WHERE user_id = $1
            ORDER BY date_listed DESC
          `;
          
          const businessesResult = await pool.query(businessesQuery, [userId]);
          roleSpecificData.businesses = businessesResult.rows;
          break;
          
        case 'buyer':
          // Get user's recent views and saved businesses
          const savedQuery = `
            SELECT 
              b.id, b.business_name, b.industry, b.price,
              sb.saved_at
            FROM saved_businesses sb
            JOIN businesses b ON sb.business_id = b.id
            WHERE sb.user_id = $1
            ORDER BY sb.saved_at DESC
            LIMIT 5
          `;
          
          const savedResult = await pool.query(savedQuery, [userId]);
          roleSpecificData.savedBusinesses = savedResult.rows;
          break;
          
        case 'broker':
        case 'solicitor':
        case 'accountant':
        case 'advisor':
          // Get professional verification status
          const verificationQuery = `
            SELECT 
              status, request_date, review_date
            FROM professional_verification_requests
            WHERE user_id = $1
            ORDER BY request_date DESC
            LIMIT 1
          `;
          
          const verificationResult = await pool.query(verificationQuery, [userId]);
          roleSpecificData.verificationStatus = verificationResult.rows[0] || { status: 'none' };
          break;
          
        default:
          // No specific role data needed
          break;
      }
    }
    
    // Get recent role activities
    const activityQuery = `
      SELECT 
        role, activity_type, created_at
      FROM user_role_activities
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    const activityResult = await pool.query(activityQuery, [userId]);
    
    return res.status(200).json({
      success: true,
      data: {
        user: userData,
        roleSpecificData,
        recentActivities: activityResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching role data:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve role data',
      error: error.message
    });
  }
};

/**
 * Get verification requests for admin review
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getVerificationRequests = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized. Admin access required.' 
    });
  }
  
  const { status = 'pending', limit = 20, offset = 0 } = req.query;
  
  try {
    const requestsQuery = `
      SELECT 
        pvr.id, pvr.user_id, pvr.professional_type, pvr.request_date,
        pvr.status, pvr.verification_documents, pvr.review_date,
        u.username, u.email
      FROM professional_verification_requests pvr
      JOIN users u ON pvr.user_id = u.id
      WHERE pvr.status = $1
      ORDER BY pvr.request_date DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(requestsQuery, [status, limit, offset]);
    const requests = result.rows;
    
    // Add AI recommendations to the requests
    for (const request of requests) {
      try {
        const aiRecommendation = await getAIVerificationRecommendation(request.id);
        if (aiRecommendation) {
          request.aiRecommendation = aiRecommendation.analysis;
          request.aiAnalysisDate = aiRecommendation.date;
        }
      } catch (err) {
        console.error(`Error getting AI recommendation for request ${request.id}:`, err);
      }
    }
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) FROM professional_verification_requests
      WHERE status = $1
    `;
    
    const countResult = await pool.query(countQuery, [status]);
    const totalCount = parseInt(countResult.rows[0].count);
    
    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve verification requests',
      error: error.message
    });
  }
};

/**
 * Process a verification request (approve/reject)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const processVerificationRequest = async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized. Admin access required.' 
    });
  }
  
  const { requestId } = req.params;
  const { action, notes } = req.body;
  
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid action. Must be "approve" or "reject".' 
    });
  }
  
  try {
    // Begin transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get request details and user information for email notification
      const requestQuery = `
        SELECT 
          pvr.user_id, pvr.professional_type, 
          u.email, u.username
        FROM professional_verification_requests pvr
        JOIN users u ON pvr.user_id = u.id
        WHERE pvr.id = $1 AND pvr.status = 'pending'
      `;
      
      const requestResult = await client.query(requestQuery, [requestId]);
      
      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          message: 'Pending verification request not found' 
        });
      }
      
      const { user_id, professional_type, email, username } = requestResult.rows[0];
      
      // Get AI recommendation for this request to include in response
      let aiRecommendation = null;
      try {
        aiRecommendation = await getAIVerificationRecommendation(requestId);
      } catch (err) {
        console.error(`Error getting AI recommendation for request ${requestId}:`, err);
      }
      
      // Update request status
      const updateRequestQuery = `
        UPDATE professional_verification_requests
        SET 
          status = $1, 
          reviewer_id = $2,
          review_date = CURRENT_TIMESTAMP,
          review_notes = $3
        WHERE id = $4
        RETURNING id, status, review_date
      `;
      
      const requestStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const updateResult = await client.query(updateRequestQuery, [
        requestStatus,
        req.user.userId,
        notes || null,
        requestId
      ]);
      
      if (action === 'approve') {
        // Update user verification status
        await client.query(`
          UPDATE users
          SET 
            is_verified_professional = TRUE,
            professional_verification_date = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [user_id]);
      }
      
      // Log this activity
      await client.query(`
        INSERT INTO user_role_activities 
          (user_id, role, activity_type, activity_data)
        VALUES 
          ($1, $2, $3, $4)
      `, [
        user_id, 
        professional_type, 
        `verification_${requestStatus}`,
        JSON.stringify({ 
          request_id: requestId,
          reviewer_id: req.user.userId,
          notes: notes
        })
      ]);
      
      await client.query('COMMIT');
      
      // Send email notification to user
      try {
        await sendVerificationStatusEmail(
          email,
          username,
          requestStatus,
          professional_type,
          notes
        );
        console.log(`Sent ${requestStatus} verification notification email to ${email}`);
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error('Error sending verification status email:', emailError);
      }
      
      const responseData = {
        success: true,
        message: `Verification request ${requestStatus}`,
        data: updateResult.rows[0]
      };
      
      // Include AI recommendation in response if available
      if (aiRecommendation) {
        responseData.aiRecommendation = aiRecommendation.analysis;
      }
      
      return res.status(200).json(responseData);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing verification request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process verification request',
      error: error.message
    });
  }
};

export default {
  setPrimaryRole,
  updateRoles,
  requestProfessionalVerification,
  getRoleData,
  getVerificationRequests,
  processVerificationRequest
};