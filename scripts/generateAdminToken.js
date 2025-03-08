import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Create an admin token with extended privileges
const adminToken = jwt.sign(
  { 
    userId: 'admin',
    role: 'admin',
    isAdmin: true
  },
  process.env.JWT_SECRET,
  { 
    expiresIn: '30d' // Token valid for 30 days
  }
);

console.log('Generated Admin Token:', adminToken);
