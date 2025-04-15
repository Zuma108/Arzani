/**
 * Role Selection Routes
 * Handles role selection during user onboarding
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db.js';

const router = express.Router();

// Main role selection page
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user data including roles
    const userData = await pool.query(
      'SELECT id, username, email, primary_role, roles, is_verified_professional, professional_type FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userData.rows.length === 0) {
      return res.redirect('/login2?returnTo=' + encodeURIComponent('/role-selection'));
    }

    const user = userData.rows[0];

    res.render('role-selection', {
      title: 'Select Your Role',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        primaryRole: user.primary_role,
        roles: user.roles || {},
        isVerifiedProfessional: user.is_verified_professional,
        professionalType: user.professional_type
      }
    });
  } catch (error) {
    console.error('Error loading role selection page:', error);
    res.status(500).render('error', {
      message: 'Failed to load role selection page',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Onboarding questionnaire route
router.get('/questionnaire', authenticateToken, async (req, res) => {
  try {
    res.render('role-questionnaire', {
      title: 'Role Questionnaire',
      userId: req.user.userId
    });
  } catch (error) {
    console.error('Error loading role questionnaire:', error);
    res.status(500).render('error', {
      message: 'Failed to load role questionnaire',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Process questionnaire results
router.post('/process-questionnaire', authenticateToken, async (req, res) => {
  try {
    const { responses } = req.body;
    
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ error: 'Invalid questionnaire responses' });
    }
    
    // Analyze responses to recommend primary role
    let buyerScore = 0;
    let sellerScore = 0;
    let professionalScore = 0;
    
    // Simple scoring algorithm based on responses
    if (responses.intent === 'buy') buyerScore += 3;
    if (responses.intent === 'sell') sellerScore += 3;
    if (responses.intent === 'advise') professionalScore += 3;
    
    if (responses.experience === 'new_buyer') buyerScore += 2;
    if (responses.experience === 'experienced_seller') sellerScore += 2;
    if (responses.experience === 'industry_expert') professionalScore += 2;
    
    // Determine recommended role
    let recommendedRole = 'buyer'; // Default
    let recommendedRoleScore = buyerScore;
    
    if (sellerScore > recommendedRoleScore) {
      recommendedRole = 'seller';
      recommendedRoleScore = sellerScore;
    }
    
    if (professionalScore > recommendedRoleScore) {
      recommendedRole = 'professional';
      recommendedRoleScore = professionalScore;
    }
    
    // Store questionnaire data
    await pool.query(
      'INSERT INTO user_questionnaires (user_id, responses, recommended_role, created_at) VALUES ($1, $2, $3, NOW())',
      [req.user.userId, JSON.stringify(responses), recommendedRole]
    );
    
    // Update user's primary role if they don't have one yet
    const userCheck = await pool.query(
      'SELECT primary_role FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (!userCheck.rows[0].primary_role) {
      await pool.query(
        'UPDATE users SET primary_role = $1 WHERE id = $2',
        [recommendedRole, req.user.userId]
      );
    }
    
    res.json({
      success: true,
      recommendedRole,
      scores: {
        buyer: buyerScore,
        seller: sellerScore,
        professional: professionalScore
      },
      nextStep: recommendedRole === 'professional' ? '/professional-verification' : '/dashboard'
    });
  } catch (error) {
    console.error('Error processing questionnaire:', error);
    res.status(500).json({ error: 'Failed to process questionnaire' });
  }
});

// Role dashboard redirect
router.get('/dashboard/:role', authenticateToken, async (req, res) => {
  const { role } = req.params;
  
  if (!['buyer', 'seller', 'professional'].includes(role)) {
    return res.redirect('/dashboard');
  }
  
  // Update primary role if different
  await pool.query(
    'UPDATE users SET primary_role = $1 WHERE id = $2 AND primary_role IS DISTINCT FROM $1',
    [role, req.user.userId]
  );
  
  // Redirect to appropriate dashboard
  switch (role) {
    case 'professional':
      res.redirect('/professional-dashboard');
      break;
    case 'seller':
      res.redirect('/marketplace/sell');
      break;
    case 'buyer':
    default:
      res.redirect('/marketplace');
      break;
  }
});

export default router;