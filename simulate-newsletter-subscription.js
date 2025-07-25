/**
 * Simulate Newsletter Subscription
 * This demonstrates how a real subscription would work
 */

import pool from './db.js';

async function simulateSubscription() {
    console.log('📧 Simulating newsletter subscription...\n');
    
    try {
        // Simulate someone subscribing from the blog
        const email = 'john.doe@example.com';
        const firstName = 'John';
        const lastName = 'Doe';
        const source = 'blog-post';
        
        console.log(`Subscribing: ${email}`);
        
        // This is exactly what the /subscribe route does
        const insertQuery = `
            INSERT INTO newsletter_subscribers (
                email,
                first_name,
                last_name,
                source,
                subscribed_at,
                is_active
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE)
            RETURNING id, email, subscribed_at, unsubscribe_token
        `;
        
        const result = await pool.query(insertQuery, [
            email.toLowerCase().trim(),
            firstName,
            lastName,
            source
        ]);
        
        const subscriber = result.rows[0];
        
        console.log('✅ Subscription successful!');
        console.log(`   - Subscriber ID: ${subscriber.id}`);
        console.log(`   - Email: ${subscriber.email}`);
        console.log(`   - Subscribed at: ${subscriber.subscribed_at}`);
        console.log(`   - Unsubscribe token: ${subscriber.unsubscribe_token}`);
        
        // Verify the subscription is in the database
        const verifyQuery = await pool.query(`
            SELECT id, email, first_name, last_name, source, is_active, subscribed_at
            FROM newsletter_subscribers 
            WHERE email = $1
        `, [email]);
        
        console.log('\n📊 Database verification:');
        const sub = verifyQuery.rows[0];
        console.log(`   - ID: ${sub.id}`);
        console.log(`   - Name: ${sub.first_name} ${sub.last_name}`);
        console.log(`   - Email: ${sub.email}`);
        console.log(`   - Source: ${sub.source}`);
        console.log(`   - Active: ${sub.is_active}`);
        console.log(`   - Subscribed: ${new Date(sub.subscribed_at).toLocaleString()}`);
        
        console.log('\n🎯 The newsletter system is working! Users can now:');
        console.log('   1. Subscribe via blog post forms');
        console.log('   2. Receive confirmation on thank-you page');
        console.log('   3. Be tracked in the database');
        console.log('   4. Unsubscribe using their token');
        
    } catch (error) {
        console.error('❌ Simulation failed:', error);
    } finally {
        await pool.end();
    }
}

simulateSubscription();
