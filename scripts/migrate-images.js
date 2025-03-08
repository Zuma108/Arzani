// Same content as migrateImagesToS3.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { uploadToS3 } from '../utils/s3.js';

// ...existing code...

migrateImagesToS3();
