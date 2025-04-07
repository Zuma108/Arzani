/**
 * Blog Approval Routes
 * Handles routes for approving/rejecting AI-generated blog content
 */

import express from 'express';
import blogApprovalController from '../controllers/blogApprovalController.js';

const router = express.Router();

// Preview the AI-generated content
router.get('/preview', blogApprovalController.previewContent);

// Approve the AI-generated content
router.get('/approve', blogApprovalController.approveContent);

// Reject the AI-generated content
router.get('/reject', blogApprovalController.rejectContent);

export default router;
