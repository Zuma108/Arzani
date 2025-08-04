const express = require('express');
const router = express.Router();
const Business = require('../models/Business');

// Route for marketplace page
router.get('/marketplace', async (req, res) => {
  try {
    const businesses = await Business.find();
    res.render('marketplace', {
      title: 'Business Marketplace',
      businesses: businesses,
      user: req.user || null
    });
  } catch (error) {
    console.error('Error rendering marketplace:', error);
    res.status(500).render('error', { 
      message: 'Error loading marketplace',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Route for marketplace2 page
router.get('/marketplace2', async (req, res) => {
  try {
    // Render the marketplace2 template
    // No need to pass businesses data as it's loaded via JavaScript
    res.render('marketplace2', {
      title: 'Business Marketplace',
      user: req.user || null
    });
  } catch (error) {
    console.error('Error rendering marketplace:', error);
    res.status(500).render('error', { 
      message: 'Error loading marketplace',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

module.exports = router;
