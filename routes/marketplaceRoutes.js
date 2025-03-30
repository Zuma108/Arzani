import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();
const router = express.Router();

// Home route now renders homepage.ejs
router.get('/', (req, res) => {
  res.render('homepage', { 
    title: 'Welcome to Arzani Marketplace',
    user: req.user || null
  });
});

// Marketplace main page - redirect old route
router.get('/marketplace', (req, res) => {
  res.redirect('/marketplace2');
});

// New marketplace page
router.get('/marketplace2', (req, res) => {
  res.render('marketplace2', { user: req.user || null });
});

// Profile page (requires authentication)
router.get('/profile', authenticateUser, (req, res) => {
  res.render('profile', { userId: req.user.userId });
});

// UI render routes for different marketplace sections
router.get('/marketplace/items', (req, res) => {
  res.render('marketplace/items', { user: req.user || null });
});

router.get('/marketplace/services', (req, res) => {
  res.render('marketplace/services', { user: req.user || null });
});

router.get('/marketplace/create', authenticateUser, (req, res) => {
  res.render('marketplace/create-listing', { user: req.user });
});

router.get('/marketplace/edit/:id', authenticateUser, async (req, res) => {
  try {
    const listingId = req.params.id;
    const listingQuery = await pool.query(
      'SELECT * FROM listings WHERE id = $1 AND user_id = $2',
      [listingId, req.user.userId]
    );
    
    if (listingQuery.rows.length === 0) {
      return res.status(404).render('404');
    }
    
    res.render('marketplace/edit-listing', { 
      user: req.user,
      listing: listingQuery.rows[0]
    });
  } catch (error) {
    console.error('Error fetching listing for edit:', error);
    res.status(500).render('error', { error });
  }
});

// API endpoints for marketplace functionality
router.get('/api/listings', async (req, res) => {
  try {
    const { category, sort, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM listings WHERE is_active = true';
    const queryParams = [];
    
    if (category) {
      query += ' AND category = $1';
      queryParams.push(category);
    }
    
    // Add sorting
    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'newest') {
      query += ' ORDER BY created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    // Add pagination
    query += ' LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);
    
    const listings = await pool.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM listings WHERE is_active = true';
    if (category) {
      countQuery += ' AND category = $1';
    }
    
    const countResult = await pool.query(countQuery, category ? [category] : []);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: listings.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch listings' });
  }
});

// Create new listing (requires auth)
router.post('/api/listings', authenticateUser, async (req, res) => {
  try {
    const { title, description, price, category, images } = req.body;
    
    if (!title || !description || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO listings 
       (title, description, price, category, images, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title, description, price, category, images || [], req.user.userId]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Listing created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ success: false, message: 'Failed to create listing' });
  }
});

// Other marketplace routes...

export default router;