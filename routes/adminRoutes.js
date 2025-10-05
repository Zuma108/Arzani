import express from 'express';
import pool from '../db.js'; // Corrected import path
import jwt from 'jsonwebtoken'; // Import jwt if needed for token generation
import { adminAuth } from '../middleware/adminAuth.js'; // Import adminAuth middleware
import { sendVerificationStatusEmail } from '../utils/email.js';

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

        // Get user_id, professional_type, and profile_data from the verification request
        const requestResult = await pool.query(
            'SELECT user_id, professional_type, profile_data FROM professional_verification_requests WHERE id = $1',
            [id]
        );

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Verification request not found'
            });
        }

        const { user_id, professional_type, profile_data } = requestResult.rows[0];

        // Update user to be verified professional
        await pool.query(
            `UPDATE users 
             SET is_verified_professional = TRUE, 
                 professional_type = $1, 
                 professional_verification_date = NOW() 
             WHERE id = $2`,
            [professional_type, user_id]
        );

        // Create professional_profiles entry from verification request profile_data
        if (profile_data) {
            // Check if professional profile already exists
            const existingProfile = await pool.query(
                'SELECT id FROM professional_profiles WHERE user_id = $1',
                [user_id]
            );

            if (existingProfile.rows.length === 0) {
                // Create new professional profile
                await pool.query(`
                    INSERT INTO professional_profiles (
                        user_id, professional_bio, professional_tagline, years_experience,
                        professional_website, services_offered, industries_serviced, specializations,
                        professional_contact, availability_schedule, preferred_contact_method,
                        pricing_info, service_locations, languages_spoken, social_links,
                        profile_visibility, allow_direct_contact, featured_professional, professional_picture_url
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                `, [
                    user_id,
                    profile_data.bio || profile_data.professional_bio || '',
                    profile_data.tagline || profile_data.professional_tagline || '',
                    parseInt(profile_data.yearsExperience || profile_data.years_experience) || 0,
                    profile_data.website || profile_data.professional_website || '',
                    JSON.stringify(profile_data.servicesOffered || profile_data.services_offered || []),
                    JSON.stringify(profile_data.industriesServiced || profile_data.industries_serviced || []),
                    JSON.stringify(profile_data.specializations || []),
                    JSON.stringify({ phone: profile_data.phone } || profile_data.professional_contact || {}),
                    JSON.stringify(profile_data.availability_schedule || {}),
                    profile_data.preferred_contact_method || 'email',
                    JSON.stringify(profile_data.pricing_info || {}),
                    JSON.stringify(profile_data.service_locations || []),
                    JSON.stringify(profile_data.languages_spoken || ['English']),
                    JSON.stringify(profile_data.social_links || {}),
                    profile_data.visibility || 'public',
                    profile_data.allowDirectContact !== false,
                    profile_data.featuredProfessional || false,
                    profile_data.profilePictureUrl || profile_data.professional_picture_url || null
                ]);
            }
        }

        // Get user information for email notification
        const userInfoQuery = await pool.query(
            'SELECT email, username FROM users WHERE id = $1',
            [user_id]
        );
        
        const userData = userInfoQuery.rows[0];
        
        // Send approval email to user (async, don't wait for it)
        if (userData) {
            sendVerificationStatusEmail(
                userData.email,
                userData.username,
                'approved',
                professional_type,
                null
            ).catch(error => {
                console.error('Error sending verification approval email:', error);
            });
        }

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

        // Get user and request information for email notification
        const requestInfoQuery = await pool.query(
            `SELECT pvr.professional_type, u.email, u.username 
             FROM professional_verification_requests pvr 
             JOIN users u ON pvr.user_id = u.id 
             WHERE pvr.id = $1`,
            [id]
        );
        
        const requestData = requestInfoQuery.rows[0];
        
        // Send rejection email to user (async, don't wait for it)
        if (requestData) {
            sendVerificationStatusEmail(
                requestData.email,
                requestData.username,
                'rejected',
                requestData.professional_type,
                notes
            ).catch(error => {
                console.error('Error sending verification rejection email:', error);
            });
        }

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
