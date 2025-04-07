/**
 * Blog Approval Controller
 * Handles approval/rejection of AI-generated blog content
 */

import db from '../db.js';
import blogController from './blogController.js';

/**
 * Render the blog content preview page
 */
async function previewContent(req, res) {
  try {
    const { id, token } = req.query;
    
    // Validate token (basic security check)
    if (!token || !id) {
      return res.status(400).render('error', {
        message: 'Invalid preview request. Missing required parameters.'
      });
    }
    
    // Fetch the content from the database using the sheet ID reference
    const result = await db.query(
      'SELECT * FROM blog_drafts WHERE sheet_id = $1 AND status = $2',
      [id, 'For Approval']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).render('error', {
        message: 'Blog content not found or already processed.'
      });
    }
    
    const draftPost = result.rows[0];
    
    // Render the preview page
    return res.render('blog/approval-preview', {
      post: draftPost,
      title: `Preview: ${draftPost.title}`,
      token,
      id
    });
  } catch (error) {
    console.error('Error rendering blog preview:', error);
    return res.status(500).render('error', {
      message: 'Error loading blog preview. Please try again later.'
    });
  }
}

/**
 * Handle blog content approval
 */
async function approveContent(req, res) {
  try {
    const { id, token } = req.query;
    
    // Validate token (basic security check)
    if (!token || !id) {
      return res.status(400).render('error', {
        message: 'Invalid approval request. Missing required parameters.'
      });
    }
    
    // Call the n8n webhook with approval action
    // We'll use fetch to make a simple HTTP request
    const response = await fetch(process.env.BLOG_APPROVAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'approve',
        originalSheetId: id,
        token
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to approve content: ${response.statusText}`);
    }
    
    // Render success page
    return res.render('blog/approval-success', {
      message: 'Blog content has been approved. It will be added to your content sheet for final review.',
      title: 'Content Approved'
    });
  } catch (error) {
    console.error('Error approving blog content:', error);
    return res.status(500).render('error', {
      message: 'Error approving blog content. Please try again later.'
    });
  }
}

/**
 * Handle blog content rejection
 */
async function rejectContent(req, res) {
  try {
    const { id, token } = req.query;
    
    // Validate token (basic security check)
    if (!token || !id) {
      return res.status(400).render('error', {
        message: 'Invalid rejection request. Missing required parameters.'
      });
    }
    
    // Call the n8n webhook with reject action
    const response = await fetch(process.env.BLOG_APPROVAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'reject',
        originalSheetId: id,
        token
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reject content: ${response.statusText}`);
    }
    
    // Render success page
    return res.render('blog/approval-success', {
      message: 'Blog content has been rejected. You can now write the content manually or regenerate it.',
      title: 'Content Rejected'
    });
  } catch (error) {
    console.error('Error rejecting blog content:', error);
    return res.status(500).render('error', {
      message: 'Error rejecting blog content. Please try again later.'
    });
  }
}

export default {
  previewContent,
  approveContent,
  rejectContent
};
