const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleController = require('../controllers/roleController');

// Get verification status of a user
router.get('/verification-status/:userId', roleController.getVerificationStatus);

// Submit verification request
router.post('/request-verification', authMiddleware, roleController.requestVerification);

// Get all verification requests (admin only)
router.get('/verification-requests', authMiddleware, roleController.getAllVerificationRequests);

// Process verification request (admin only)
router.post('/process-verification/:requestId', authMiddleware, roleController.processVerificationRequest);

module.exports = router;