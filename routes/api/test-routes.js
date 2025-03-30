import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import pool from '../../db/index.js';

const router = express.Router();

// Test endpoint to check if chat API is working
router.get('/chat', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Test route for chat API is working',
    timestamp: new Date().toISOString(),
    user: req.user || null
  });
});

// Test endpoint for checking database tables
router.get('/db-tables', authenticateToken, async (req, res) => {
  try {
    // Query to get all tables in the database
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    const result = await pool.query(tableQuery);
    
    res.json({
      success: true,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    console.error('Error fetching database tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database tables'
    });
  }
});

// Test endpoint for checking message table columns
router.get('/messages-schema', authenticateToken, async (req, res) => {
  try {
    // Query to get columns from the messages table
    const columnQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(columnQuery);
    
    res.json({
      success: true,
      table: 'messages',
      columns: result.rows
    });
  } catch (error) {
    console.error('Error fetching message table schema:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message table schema'
    });
  }
});

// Add this export default to fix the import error in server.js
export default router;
