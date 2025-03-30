// Chat Routes
import express from 'express';
import { renderChatInterface } from '../controllers/chatController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all chat interface routes
router.use(authenticateToken);

// Render chat interface
router.get('/', renderChatInterface);

export default router;