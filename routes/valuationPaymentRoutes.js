import express from 'express';
import valuationPaymentController from '../controllers/valuationPaymentController.js';

const router = express.Router();

// Payment page route
router.get('/valuation-payment', valuationPaymentController.renderPaymentPage);

// Create checkout session route
router.post('/create-valuation-session', valuationPaymentController.createCheckoutSession);

// Payment success handler - redirects to questionnaire after payment verification
router.get('/payment/success', valuationPaymentController.handlePaymentSuccess);

// Stripe webhook for payment events
router.post('/webhook', express.raw({ type: 'application/json' }), valuationPaymentController.handleWebhook);

export default router;