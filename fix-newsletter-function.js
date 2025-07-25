/**
 * Fix Newsletter Token Function
 * Fixes the gen_random_bytes issue in the newsletter_subscribers table
 */

import pool from './db.js';
import fs from 'fs';

async function fixNewsletterTokenFunction() {
    console.log('🔧 Fixing newsletter token function...\n');
    
    try {
        // Read the SQL fix
        const sqlFix = fs.readFileSync('fix-newsletter-token-function.sql', 'utf8');
        
        // Execute the fix
        await pool.query(sqlFix);
        
        console.log('✅ Newsletter token function fixed successfully!');
        
        // Test the function by inserting a test record
        console.log('\n🧪 Testing the fixed function...');
        const testEmail = `test-fix-${Date.now()}@example.com`;
        
        const insertResult = await pool.query(`
            INSERT INTO newsletter_subscribers (
                email,
                first_name,
                source
            ) VALUES ($1, $2, $3)
            RETURNING id, email, unsubscribe_token
        `, [testEmail, 'Test', 'fix-script']);
        
        const newSubscriber = insertResult.rows[0];
        console.log('✅ Test insertion successful:');
        console.log(`   - ID: ${newSubscriber.id}`);
        console.log(`   - Email: ${newSubscriber.email}`);
        console.log(`   - Token: ${newSubscriber.unsubscribe_token}`);
        
        // Clean up test data
        await pool.query('DELETE FROM newsletter_subscribers WHERE email = $1', [testEmail]);
        console.log('✅ Test data cleaned up');
        
        console.log('\n🎉 Newsletter system is now fully functional!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error);
    } finally {
        await pool.end();
    }
}

fixNewsletterTokenFunction();
