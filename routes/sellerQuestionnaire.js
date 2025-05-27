import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import valuationService from '../services/valuationService.js';
import valuationController from '../controllers/valuationController.js';
import valuationPaymentController from '../controllers/valuationPaymentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Route for the first page (basics) - This is the landing page after payment, so ensure it's accessible
router.get('/basics', (req, res) => {
    console.log('Seller questionnaire basics page accessed', {
        query: req.query,
        referrer: req.headers.referer || 'none',
        sessionExists: !!req.session,
        sessionData: req.session ? {
            accessedQuestionnaire: req.session.accessedQuestionnaire,
            paymentComplete: req.session.paymentComplete
        } : null,
        cookies: req.cookies || {}
    });
    
    // Set a session flag to indicate this user has accessed the questionnaire
    if (req.session) {
        req.session.accessedQuestionnaire = true;
        req.session.paymentComplete = true;
        req.session.save();
    }
    
    // Also set a cookie as backup method in case session is lost
    res.cookie('valuation_payment_complete', 'true', { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
    
    // Render the basics page
    res.render('seller-questionnaire-basics', {
        title: 'Seller Questionnaire - The Basics'
    });
});

// API endpoint to save questionnaire data without user account
router.post('/save-data', async (req, res) => {
    try {
        // Extract all data from the request
        const formData = req.body;
        console.log('Received questionnaire data to save');
        
        // Ensure anonymous ID exists
        if (!formData.anonymousId) {
            formData.anonymousId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // Here we'll use the ValuationController to save the data to the questionnaire_submissions table
        const submissionId = await valuationController.saveQuestionnaireData(formData);
        
        // Return success response
        res.status(200).json({
            success: true,
            message: 'Questionnaire data saved successfully',
            submissionId: submissionId
        });
    } catch (error) {
        console.error('Error saving questionnaire data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save questionnaire data',
            error: error.message
        });
    }
});

// FOR OTHER PAGES: We can still use the payment verification middleware
// but with a fallback - check if they've accessed the basics page first
const verifyQuestionnaireAccess = async (req, res, next) => {
    console.log('Verifying questionnaire access:', {
        sessionExists: !!req.session,
        sessionData: req.session ? {
            accessedQuestionnaire: req.session.accessedQuestionnaire,
            paymentComplete: req.session.paymentComplete
        } : null,
        cookies: req.cookies || {},
        headers: {
            referer: req.headers.referer || 'none'
        }
    });
    
    // Check multiple indicators of payment completion
    if (req.session && (req.session.accessedQuestionnaire || req.session.paymentComplete)) {
        console.log('Access granted via session flags');
        return next();
    }
    
    // Check for the backup cookie
    if (req.cookies && req.cookies.valuation_payment_complete === 'true') {
        console.log('Access granted via cookie');
        
        // Also set session flag for future requests
        if (req.session) {
            req.session.accessedQuestionnaire = true;
            req.session.paymentComplete = true;
            req.session.save();
        }
        
        return next();
    }
    
    // Check local storage via query param (set by frontend)
    if (req.query.payment_verified === 'true') {
        console.log('Access granted via query parameter');
        
        if (req.session) {
            req.session.accessedQuestionnaire = true;
            req.session.paymentComplete = true;
            req.session.save();
        }
        
        return next();
    }
    
    // Otherwise use the standard payment verification
    console.log('No quick verification methods succeeded, trying full payment verification');
    return valuationPaymentController.verifyPayment(req, res, next);
};

// Route for the email page
router.get('/email', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-email', {
        title: 'Seller Questionnaire - Your Email'
    });
});

// Route for the form page (business details)
router.get('/form', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-form', {
        title: 'Seller Questionnaire - Business Details'
    });
});

// Route for the location page
router.get('/location', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-location', {
        title: 'Seller Questionnaire - Business Location'
    });
});

// Route for the revenue page
router.get('/revenue', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-revenue', {
        title: 'Seller Questionnaire - Yearly Revenue'
    });
});

// Route for the EBITDA page
router.get('/ebitda', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-ebitda', {
        title: 'Seller Questionnaire - EBITDA'
    });
});

// Route for the Cash on Cash return page
router.get('/cash-on-cash', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-cash-on-cash', {
        title: 'Seller Questionnaire - Cash on Cash Return'
    });
});

// Route for the FFE page
router.get('/ffe', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-ffe', {
        title: 'Seller Questionnaire - FFE Value'
    });
});

// Route for growth projections
router.get('/growth', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-growth', {
        title: 'Seller Questionnaire - Growth Projections'
    });
});

// Route for debts and liabilities
router.get('/debts', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-debts', {
        title: 'Seller Questionnaire - Debts & Liabilities'
    });
});

// Route for business valuation
router.get('/valuation', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-valuation', {
        title: 'Seller Questionnaire - Business Valuation'
    });
});

// Route for the thank you page
router.get('/thank-you', verifyQuestionnaireAccess, (req, res) => {
    res.render('seller-questionnaire-thank-you', {
        title: 'Thank You'
    });
});

// If someone hits the old signup URL, redirect them to the main signup page
router.get('/signup', (req, res) => {
    res.redirect('/signup');
});

// Default route - redirect to payment page instead of basics
router.get('/', (req, res) => {
    res.redirect('/valuation-payment');
});

// API endpoint to calculate business valuation
router.post('/api/business/calculate-valuation', verifyQuestionnaireAccess, async (req, res) => {
    try {
        const businessData = req.body;
        
        // Validate required fields
        if (!businessData.revenue || !businessData.ebitda) {
            return res.status(400).json({
                success: false,
                message: 'Missing required financial data'
            });
        }
        
        // Calculate valuation using the valuation service
        const valuation = await valuationService.calculateBusinessValuation(businessData);
        
        return res.json({
            success: true,
            valuation: valuation
        });
    } catch (error) {
        console.error('Error calculating valuation:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to calculate valuation',
            error: error.message
        });
    }
});

export default router;