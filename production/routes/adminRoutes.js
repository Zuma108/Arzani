import express from 'express';
import pool from '../db.js'; // Corrected import path
import jwt from 'jsonwebtoken'; // Import jwt if needed for token generation
import { adminAuth } from '../middleware/adminAuth.js'; // Import adminAuth middleware

const router = express.Router();

// --- Frontend Route ---

// GET route to render the admin verification review page
// Apply adminAuth middleware here
router.get('/verification-review', adminAuth, async (req, res) => {
    try {
        // Generate a fresh token for API calls
        const token = jwt.sign(
            { userId: req.user.userId, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        // Render the page with token in the context
        res.render('admin/verification-review', {
            title: 'Admin Verification Review',
            user: req.user,
            token: token // Important: Pass the token to the template
        });
    } catch (error) {
        console.error('Error rendering verification review page:', error);
        res.status(500).render('error', { message: 'Failed to load admin page' });
    }
});

// GET route to render the blog automation dashboard
router.get('/blog-automation', adminAuth, async (req, res) => {
    try {
        // Generate a fresh token for API calls
        const token = jwt.sign(
            { userId: req.user.userId, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        // Render the blog automation dashboard
        res.render('admin/blog-automation-dashboard', {
            title: 'Blog Automation Dashboard',
            user: req.user,
            token: token
        });
    } catch (error) {
        console.error('Error rendering blog automation dashboard:', error);
        res.status(500).render('error', { message: 'Failed to load blog automation dashboard' });
    }
});

// --- API Endpoints ---
// Note: adminAuth is applied globally in server.js for /api/admin routes,
// so it doesn't need to be re-applied to individual API endpoints here.

// API route to get verification requests
router.get('/verification-requests', async (req, res) => {
    try {
        // Check authentication
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        // Ensure user is admin
        const userCheck = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (!userCheck.rows.length || userCheck.rows[0].role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Admin access required'
            });
        }

        // Query verification requests with user information joined
        const result = await pool.query(`
            SELECT 
                pv.id,
                pv.user_id,
                pv.professional_type,
                pv.status,
                pv.request_date,
                pv.review_date,
                pv.review_notes,
                pv.verification_documents,
                pv.reviewer_id,
                u.username,
                u.email
            FROM professional_verification_requests pv
            JOIN users u ON pv.user_id = u.id
            ORDER BY 
                CASE WHEN pv.status = 'pending' THEN 0 ELSE 1 END,
                pv.request_date DESC
        `);

        res.json({
            success: true,
            requests: result.rows
        });
    } catch (error) {
        console.error('Error fetching verification requests:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// POST endpoint to approve a professional verification request
router.post('/verification-requests/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;

        // Update request status to approved
        await pool.query(
            `UPDATE professional_verification_requests 
             SET status = 'approved', 
                 reviewer_id = $1, 
                 review_date = NOW()
             WHERE id = $2`,
            [req.user.userId, id]
        );

        // Get user_id and professional_type from the verification request
        const requestResult = await pool.query(
            'SELECT user_id, professional_type FROM professional_verification_requests WHERE id = $1',
            [id]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Verification request not found'
            });
        }

        const { user_id, professional_type } = requestResult.rows[0];

        // Update user to be verified professional
        await pool.query(
            `UPDATE users 
             SET is_verified_professional = TRUE, 
                 professional_type = $1, 
                 professional_verification_date = NOW() 
             WHERE id = $2`,
            [professional_type, user_id]
        );

        res.json({
            success: true,
            message: 'Verification request approved successfully'
        });
    } catch (error) {
        console.error('Error approving verification request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// POST endpoint to reject a professional verification request
router.post('/verification-requests/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        await pool.query(
            `UPDATE professional_verification_requests 
             SET status = 'rejected', 
                 reviewer_id = $1,
                 review_date = NOW(), 
                 review_notes = $2 
             WHERE id = $3`,
            [req.user.userId, notes, id]
        );

        res.json({
            success: true,
            message: 'Verification request rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting verification request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Add other admin-specific routes here...
// Example: Placeholder for an admin dashboard route
// Apply adminAuth middleware here as well
router.get('/dashboard', adminAuth, (req, res) => {
    res.render('admin/dashboard', { // Assuming admin/dashboard.ejs exists
        title: 'Admin Dashboard',
        user: req.user,
        activePage: 'dashboard'
    });
});

// Example: Placeholder for user management page
// Apply adminAuth middleware here as well
router.get('/users', adminAuth, (req, res) => {
    res.render('admin/user-management', { // Assuming admin/user-management.ejs exists
        title: 'User Management',
        user: req.user,
        activePage: 'users'
    });
});

export default router;
