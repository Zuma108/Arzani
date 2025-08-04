import express from 'express';
import { authenticateToken } from '../../utils/auth.js';
import pool from '../../db/index.js';
import { formatProfilePicture } from '../../utils/imageHelper.js';

const router = express.Router();

// Get current user's profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Ensure we have a user ID from auth middleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    console.log('Fetching profile for user ID:', userId);

    // Query database for user profile
    const result = await pool.query(`
      SELECT 
        id, 
        username, 
        email, 
        profile_picture, 
        bio, 
        location, 
        website,
        last_active,
        created_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    // Check if user exists
    if (result.rows.length === 0) {
      console.log('User not found:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get profile data
    const profile = result.rows[0];
    console.log('Profile found:', profile);

    // Format profile picture URL if needed
    if (profile.profile_picture && typeof formatProfilePicture === 'function') {
      profile.profile_picture = formatProfilePicture(profile.profile_picture);
    }

    // Fetch additional data if needed, such as social links
    const socialLinks = await fetchSocialLinks(userId);
    if (socialLinks.length > 0) {
      profile.social_links = socialLinks;
    }

    // Return profile data in the consistent format
    return res.json({
      success: true,
      profile: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching profile data'
    });
  }
});

// Update user's profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    // Ensure we have a user ID from auth middleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    const { username, bio, location, website } = req.body;

    // Validate inputs
    if (username && (username.length < 3 || username.length > 30)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 30 characters'
      });
    }

    // Build update query dynamically based on provided fields
    let updateFields = [];
    let queryParams = [];
    let paramCounter = 1;

    if (username !== undefined) {
      updateFields.push(`username = $${paramCounter++}`);
      queryParams.push(username);
    }

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramCounter++}`);
      queryParams.push(bio);
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramCounter++}`);
      queryParams.push(location);
    }

    if (website !== undefined) {
      updateFields.push(`website = $${paramCounter++}`);
      queryParams.push(website);
    }

    // Add user ID as the last parameter
    queryParams.push(userId);

    // If no fields to update, return success
    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'No fields to update'
      });
    }

    // Execute update query
    const result = await pool.query(`
      UPDATE users
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCounter}
      RETURNING id, username, email, profile_picture, bio, location, website, last_active, created_at
    `, queryParams);

    // Format profile picture URL if needed
    const updatedProfile = result.rows[0];
    if (updatedProfile.profile_picture && typeof formatProfilePicture === 'function') {
      updatedProfile.profile_picture = formatProfilePicture(updatedProfile.profile_picture);
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating profile'
    });
  }
});

// Update profile picture
router.put('/picture', authenticateToken, async (req, res) => {
  try {
    // Ensure we have a user ID from auth middleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.userId;
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl) {
      return res.status(400).json({
        success: false,
        error: 'Profile picture URL is required'
      });
    }

    // Update profile picture
    const result = await pool.query(`
      UPDATE users
      SET profile_picture = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, username, profile_picture
    `, [profilePictureUrl, userId]);

    // Format profile picture URL if needed
    const updatedProfile = result.rows[0];
    if (updatedProfile.profile_picture && typeof formatProfilePicture === 'function') {
      updatedProfile.profile_picture = formatProfilePicture(updatedProfile.profile_picture);
    }

    return res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating profile picture'
    });
  }
});

// Update last active timestamp
router.post('/active', authenticateToken, async (req, res) => {
  try {
    // Ensure we have a user ID from auth middleware
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userId = req.user.userId;

    // Update last active timestamp
    await pool.query(`
      UPDATE users
      SET last_active = NOW()
      WHERE id = $1
    `, [userId]);

    return res.json({
      success: true,
      message: 'Last active timestamp updated'
    });
  } catch (error) {
    console.error('Error updating last active timestamp:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating last active timestamp'
    });
  }
});

// Helper function to fetch social links
async function fetchSocialLinks(userId) {
  try {
    const result = await pool.query(`
      SELECT type, url
      FROM user_social_links
      WHERE user_id = $1
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Error fetching social links:', error);
    return [];
  }
}

export default router;
