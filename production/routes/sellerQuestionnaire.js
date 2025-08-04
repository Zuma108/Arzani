import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import valuationService from '../services/valuationService.js';
import valuationController from '../controllers/valuationController.js';

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

// Route for the email page
router.get('/email', (req, res) => {
    res.render('seller-questionnaire-email', {
        title: 'Seller Questionnaire - Your Email'
    });
});

// Route for the form page (business details)
router.get('/form', (req, res) => {
    res.render('seller-questionnaire-form', {
        title: 'Seller Questionnaire - Business Details'
    });
});

// Route for the location page
router.get('/location', (req, res) => {
    res.render('seller-questionnaire-location', {
        title: 'Seller Questionnaire - Business Location'
    });
});

// Route for the revenue page
router.get('/revenue', (req, res) => {
    res.render('seller-questionnaire-revenue', {
        title: 'Seller Questionnaire - Yearly Revenue'
    });
});

// Route for the EBITDA page
router.get('/ebitda', (req, res) => {
    res.render('seller-questionnaire-ebitda', {
        title: 'Seller Questionnaire - EBITDA'
    });
});

// Route for the Cash on Cash return page
router.get('/cash-on-cash', (req, res) => {
    res.render('seller-questionnaire-cash-on-cash', {
        title: 'Seller Questionnaire - Cash on Cash Return'
    });
});

// Route for the FFE page
router.get('/ffe', (req, res) => {
    res.render('seller-questionnaire-ffe', {
        title: 'Seller Questionnaire - FFE Value'
    });
});

// Route for growth projections
router.get('/growth', (req, res) => {
    res.render('seller-questionnaire-growth', {
        title: 'Seller Questionnaire - Growth Projections'
    });
});

// Route for debts and liabilities
router.get('/debts', (req, res) => {
    res.render('seller-questionnaire-debts', {
        title: 'Seller Questionnaire - Debts & Liabilities'
    });
});

// Route for business valuation
router.get('/valuation', (req, res) => {
    res.render('seller-questionnaire-valuation', {
        title: 'Seller Questionnaire - Business Valuation'
    });
});

// Route for the thank you page
router.get('/thank-you', (req, res) => {
    res.render('seller-questionnaire-thank-you', {
        title: 'Thank You'
    });
});

// If someone hits the old signup URL, redirect them to the main signup page
router.get('/signup', (req, res) => {
    res.redirect('/signup');
});

// Default route - redirect to basics page since questionnaire is now free
router.get('/', (req, res) => {
    res.redirect('/seller-questionnaire/basics');
});

// API endpoint to calculate business valuation - now free access
router.post('/api/business/calculate-valuation', async (req, res) => {
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