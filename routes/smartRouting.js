import express from 'express';
import pool from '../db.js';

const router = express.Router();

// API endpoint to capture user intent
router.post('/api/user-intent', async (req, res) => {
  try {
    const { intent, source } = req.body; // 'buyer' or 'seller'
    
    if (!intent || !['buyer', 'seller'].includes(intent)) {
      return res.status(400).json({ error: 'Invalid intent' });
    }
    
    // Store in session
    req.session.userRole = intent;
    req.session.roleSource = source;
    
    // Store in database if user is authenticated
    if (req.user?.userId) {
      await pool.query(
        'UPDATE users SET user_role = $1, role_selected_at = NOW() WHERE id = $2',
        [intent, req.user.userId]
      );
    }
    
    // Override A/B test variant
    req.session.abTestVariant = intent === 'buyer' ? 'buyer_first' : 'seller_first';
    
    res.json({ success: true, role: intent });
  } catch (error) {
    console.error('Intent capture error:', error);
    res.status(500).json({ error: 'Failed to capture intent' });
  }
});

// Smart redirect endpoint
router.get('/smart-redirect', (req, res) => {
  const userRole = req.session?.userRole || req.detectedRole;
  
  if (userRole === 'buyer') {
    res.redirect('/buyer-landing');
  } else if (userRole === 'seller') {
    res.redirect('/marketplace-landing');
  } else {
    res.redirect('/'); // Let A/B testing decide
  }
});

// Role selection endpoint
router.post('/api/select-role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Store in session
    req.session.userRole = role;
    req.session.roleSelectedAt = new Date();
    
    // Store in database if authenticated
    if (req.user?.userId) {
      await pool.query(
        'UPDATE users SET user_role = $1, role_selected_at = NOW() WHERE id = $2',
        [role, req.user.userId]
      );
    }
    
    res.json({ success: true, role });
  } catch (error) {
    console.error('Role selection error:', error);
    res.status(500).json({ error: 'Failed to select role' });
  }
});

export default router;
