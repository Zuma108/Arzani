import pkg from 'pg';
const { Pool } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updatePlansSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        const sql = await fs.readFile(
            path.join(__dirname, '../database/migrations/04_update_plans_schema.sql'),
            'utf8'
        );
        await pool.query(sql);
        console.log('Plans schema updated successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

updatePlansSchema();