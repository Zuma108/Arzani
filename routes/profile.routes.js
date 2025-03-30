import express from 'express';
import Stripe from 'stripe';
import multer from 'multer';
import auth from '../middleware/auth.js';
import pool from '../db.js';
import { uploadToS3 } from '../utils/s3.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia; custom_checkout_beta=v1'
});

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Add authentication middleware to all routes
router.use(auth.authenticateToken);

// Main profile page - improved authentication handling
router.get('/', async (req, res) => {
  try {
    console.log('Profile request:', {
      hasUser: !!req.user,
      userId: req.user?.userId || req.session?.userId,
      sessionId: req.sessionID
    });
    
    // Check auth from multiple sources
    const userId = req.user?.userId || req.session?.userId;
    
    // If user is not authenticated, redirect to login
    if (!userId) {
      console.log('No user ID found, redirecting to login');
      return res.redirect('/login2?returnTo=' + encodeURIComponent('/profile'));
    }

    // Get user data from database
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.profile_picture, u.created_at, 
              COUNT(DISTINCT b.id) AS business_count
       FROM users u
       LEFT JOIN businesses b ON u.id = b.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    // If user not found, redirect to login
    if (result.rows.length === 0) {
      console.log('User not found in database, redirecting to login');
      return res.redirect('/login2');
    }

    const user = result.rows[0];
    console.log('User profile loaded successfully:', user.id);
    
    // Render the profile page with user data
    res.render('profile', {
      title: 'My Profile',
      user: user,
      formattedDate: new Date(user.created_at).toLocaleDateString()
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).render('error', {
      message: 'Error loading profile',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Subscription management page - use the unified auth system
router.get('/subscription', auth.enhancedAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user data
    const userQuery = await pool.query(
      `SELECT id, username, email, profile_picture, created_at, subscription_type, 
              subscription_id, subscription_end
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).send('User not found');
    }
    
    const user = userQuery.rows[0];
    let subscription = null;
    let invoices = [];
    
    // If user has a subscription, fetch details from Stripe
    if (user.subscription_id) {
      try {
        // Get subscription details from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(user.subscription_id);
        
        // Format subscription data
        subscription = {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          plan: user.subscription_type,
          price: stripeSubscription.items.data[0].price.unit_amount / 100,
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
        };
        
        // Get invoice history
        const stripeInvoices = await stripe.invoices.list({
          subscription: user.subscription_id,
          limit: 5
        });
        
        invoices = stripeInvoices.data.map(invoice => {
          return {
            id: invoice.id,
            invoice_date: new Date(invoice.created * 1000),
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            status: invoice.status,
            receipt_url: invoice.hosted_invoice_url
          };
        });
      } catch (error) {
        console.error('Error fetching subscription details:', error);
        // Continue with limited information
        subscription = {
          status: user.subscription_type ? 'active' : 'inactive',
          plan: user.subscription_type || 'free',
          currentPeriodEnd: user.subscription_end
        };
      }
    }
    
    // Render subscription management page
    res.render('profile/subscription', {
      user,
      subscription,
      invoices,
      title: 'Subscription Management',
      activeTab: 'subscription'
    });
    
  } catch (error) {
    console.error('Subscription page error:', error);
    res.status(500).send('Error loading subscription details');
  }
});

// Update profile information - use the unified auth system
router.post('/update', auth.enhancedAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email } = req.body;
    
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    // Check if email is already in use by another user
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );
    
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already in use' });
    }
    
    // Update user
    await pool.query(
      'UPDATE users SET username = $1, email = $2, updated_at = NOW() WHERE id = $3',
      [username, email, userId]
    );
    
    res.json({ success: true, message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update profile picture - use the unified auth system
router.post('/update-picture', auth.enhancedAuth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No profile picture uploaded' });
    }
    
    const userId = req.user.userId;
    
    // Upload file to S3
    const s3Key = `profiles/${userId}/${Date.now()}-${req.file.originalname}`;
    const s3Url = await uploadToS3(req.file, s3Key);
    
    // Update user profile picture
    await pool.query(
      'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
      [s3Url, userId]
    );
    
    res.json({ 
      success: true, 
      message: 'Profile picture updated', 
      profilePicture: s3Url 
    });
    
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

// Change password - use the unified auth system
router.post('/change-password', auth.enhancedAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new passwords are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Get user data for password verification
    const userQuery = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userQuery.rows[0];
    
    // Verify current password
    const bcrypt = await import('bcrypt');
    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    
    if (!passwordMatches) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
