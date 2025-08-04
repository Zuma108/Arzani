import express from 'express';
import pool from '../db.js';

const router = express.Router();

// Debug endpoint to check payment status
router.get('/check-payment/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if there's a payment record
    const result = await pool.query(
      'SELECT * FROM valuation_payments WHERE session_id = $1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        found: false,
        message: 'No payment record found with this session ID'
      });
    }
    
    return res.json({
      found: true,
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Error checking payment:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to manually create a payment record
router.get('/force-payment-success/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Create a payment record
    await pool.query(
      'INSERT INTO valuation_payments (session_id, client_reference, status, amount, payment_date, metadata) VALUES ($1, $2, $3, $4, NOW(), $5) ON CONFLICT (session_id) DO UPDATE SET status = $3, updated_at = NOW()',
      [sessionId, sessionId, 'completed', 0, JSON.stringify({
        source: 'manual_debug',
        timestamp: new Date().toISOString()
      })]
    );
    
    // Set session and cookie flags
    if (req.session) {
      req.session.paymentComplete = true;
      req.session.questionnairePending = true;
      await new Promise(resolve => req.session.save(resolve));
    }
    
    res.cookie('valuation_payment_complete', 'true', {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax'
    });
    
    return res.json({
      success: true,
      message: 'Payment record created and session flags set',
      redirectUrl: '/valuation-confirmation'
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
