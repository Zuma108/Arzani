/**
 * User Role Management Routes
 * API endpoints for user role management functionality
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// Get user's current roles
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT primary_role, roles FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      primaryRole: result.rows[0].primary_role,
      roles: result.rows[0].roles || {}
    });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Set primary role
router.post('/primary', authenticateToken, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Validate role type
    if (!['buyer', 'seller', 'professional'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role type' });
    }

    // For professional role, check if user is verified
    if (role === 'professional') {
      const verifiedCheck = await pool.query(
        'SELECT is_verified_professional FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (!verifiedCheck.rows[0]?.is_verified_professional) {
        return res.status(403).json({ 
          error: 'You must be verified to set professional as your primary role',
          verificationRequired: true
        });
      }
    }

    // Update primary role
    await pool.query(
      'UPDATE users SET primary_role = $1 WHERE id = $2',
      [role, req.user.userId]
    );

    // Track role activity
    await pool.query(
      'INSERT INTO user_role_activities (user_id, role, activity_type) VALUES ($1, $2, $3)',
      [req.user.userId, role, 'set_primary']
    );

    res.json({
      success: true,
      message: 'Primary role updated successfully',
      primaryRole: role
    });
  } catch (error) {
    console.error('Error updating primary role:', error);
    res.status(500).json({ error: 'Failed to update primary role' });
  }
});

// Update role details
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { roles } = req.body;

    if (!roles || typeof roles !== 'object') {
      return res.status(400).json({ error: 'Invalid roles data' });
    }

    // Get current roles
    const currentRoles = await pool.query(
      'SELECT roles FROM users WHERE id = $1',
      [req.user.userId]
    );

    // Merge existing roles with new roles
    const updatedRoles = {
      ...(currentRoles.rows[0]?.roles || {}),
      ...roles
    };

    // Update roles in database
    await pool.query(
      'UPDATE users SET roles = $1 WHERE id = $2',
      [JSON.stringify(updatedRoles), req.user.userId]
    );

    res.json({
      success: true,
      message: 'Roles updated successfully',
      roles: updatedRoles
    });
  } catch (error) {
    console.error('Error updating roles:', error);
    res.status(500).json({ error: 'Failed to update roles' });
  }
});

// Request professional verification
router.post('/request-verification', authenticateToken, async (req, res) => {
  try {
    const { professionalType } = req.body;

    if (!professionalType) {
      return res.status(400).json({ error: 'Professional type is required' });
    }

    // Update user record to indicate pending verification
    await pool.query(
      'UPDATE users SET professional_type = $1 WHERE id = $2',
      [professionalType, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Verification request initiated',
      nextStep: 'documentation_upload'
    });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({ error: 'Failed to request verification' });
  }
});

// Get role-specific data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const { role } = req.query;

    if (!role) {
      return res.status(400).json({ error: 'Role parameter is required' });
    }

    // Get user's primary role
    const userRoleResult = await pool.query(
      'SELECT primary_role, roles FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userRoleResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userRoleResult.rows[0];
    
    // Check if user has the requested role
    const userRoles = userData.roles || {};
    const hasPrimaryRole = userData.primary_role === role;
    const hasRoleInJson = userRoles[role] !== undefined;

    if (!hasPrimaryRole && !hasRoleInJson) {
      return res.status(403).json({ error: 'User does not have the requested role' });
    }

    // Fetch role-specific data based on role type
    let roleData = {};
    
    if (role === 'buyer') {
      // Get saved searches, recently viewed businesses, etc.
      const savedBusinesses = await pool.query(
        'SELECT * FROM saved_businesses WHERE user_id = $1 ORDER BY saved_at DESC LIMIT 10',
        [req.user.userId]
      );
      
      const viewHistory = await pool.query(
        'SELECT * FROM business_history WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 10',
        [req.user.userId]
      );
      
      roleData = {
        savedBusinesses: savedBusinesses.rows,
        recentlyViewed: viewHistory.rows
      };
    } 
    else if (role === 'seller') {
      // Get listed businesses, inquiries, etc.
      const listedBusinesses = await pool.query(
        'SELECT * FROM businesses WHERE user_id = $1 ORDER BY date_listed DESC',
        [req.user.userId]
      );
      
      roleData = {
        listedBusinesses: listedBusinesses.rows
      };
    }
    else if (role === 'professional') {
      // Get professional profile, client interactions, etc.
      const professionalData = await pool.query(
        'SELECT professional_type, is_verified_professional, professional_verification_date FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      roleData = {
        professionalInfo: professionalData.rows[0]
      };
    }

    res.json({
      role,
      isPrimary: hasPrimaryRole,
      data: roleData
    });
  } catch (error) {
    console.error('Error fetching role data:', error);
    res.status(500).json({ error: 'Failed to fetch role data' });
  }
});

// Admin: Get verification requests
router.get('/verification-requests', authenticateToken, async (req, res) => {
  try {
    const verificationRequests = await pool.query(
      'SELECT * FROM professional_verification_requests ORDER BY request_date DESC'
    );

    res.json({
      success: true,
      verificationRequests: verificationRequests.rows
    });
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    res.status(500).json({ error: 'Failed to fetch verification requests' });
  }
});

// Admin: Process verification request
router.post('/verification-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const verificationRequest = await pool.query(
      'SELECT * FROM professional_verification_requests WHERE id = $1',
      [requestId]
    );

    if (verificationRequest.rows.length === 0) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (action === 'approve') {
      await pool.query(
        'UPDATE users SET is_verified_professional = true, professional_verification_date = NOW() WHERE id = $1',
        [verificationRequest.rows[0].user_id]
      );
    }

    await pool.query(
      'DELETE FROM professional_verification_requests WHERE id = $1',
      [requestId]
    );

    res.json({
      success: true,
      message: `Verification request ${action}d successfully`
    });
  } catch (error) {
    console.error('Error processing verification request:', error);
    res.status(500).json({ error: 'Failed to process verification request' });
  }
});

export default router;