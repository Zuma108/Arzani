import pool from '../db.js';
import { createUserTable } from '../database.js';
import { createBusinessHistoryTable } from '../services/history.js';
import { createMarketTrendsView } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('Database connected successfully');
    
    // Create tables
    await createUserTable();
    console.log('User table created/verified');
    
    await createBusinessHistoryTable();
    console.log('Business history table created/verified');
    
    await createMarketTrendsView();
    console.log('Market trends view created/verified');
    
    // Add any other initialization functions here
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

initializeDatabase();
