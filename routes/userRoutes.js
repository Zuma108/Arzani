import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

// Create the router
const router = express.Router();

// User profile routes
router.get('/profile', authenticateToken, userController.getProfile);
router.post('/profile/update', authenticateToken, userController.updateProfile);

// User settings routes
router.get('/settings', authenticateToken, userController.getSettings);
router.post('/settings/update', authenticateToken, userController.updateSettings);

// Password management
router.post('/change-password', authenticateToken, userController.changePassword);
router.post('/reset-password-request', userController.resetPasswordRequest);
router.post('/reset-password', userController.resetPassword);

// User preferences
router.post('/preferences', authenticateToken, userController.updatePreferences);

// Export both as a named export and as default
export { router };
export default router;
