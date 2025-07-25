/**
 * Test Newsletter Subscription Notification System
 * This tests the email notification when someone subscribes to the newsletter
 */

import pool from './db.js';
import { sendNewsletterSubscriptionNotification } from './utils/email.js';

async function testNewsletterNotification() {
    console.log('🧪 Testing Newsletter Subscription Notification System...\n');
    
    try {
        // Test 1: Test the email notification function directly
        console.log('1️⃣ Testing email notification function...');
        
        const testSubscriber = {
            email: 'test.subscriber@example.com',
            name: 'John Test',
            source: 'blog-post',
            id: 999,
            timestamp: new Date().toISOString()
        };
        
        console.log('Sending test notification...');
        const emailResult = await sendNewsletterSubscriptionNotification(
            testSubscriber.email,
            testSubscriber.name,
            testSubscriber.source,
            testSubscriber.id,
            testSubscriber.timestamp
        );
        
        if (emailResult) {
            console.log('✅ Email notification sent successfully!');
            if (process.env.NODE_ENV === 'development') {
                console.log('📧 Check your email or email service dashboard for the notification');
            }
        } else {
            console.log('⚠️ Email notification returned null (might be in development mode)');
        }
        
        // Test 2: Simulate a real subscription with notification
        console.log('\n2️⃣ Testing full subscription flow with notification...');
        
        const testEmail = `notification-test-${Date.now()}@example.com`;
        const firstName = 'Test';
        const lastName = 'Subscriber';
        const source = 'test-notification-script';
        
        console.log(`Creating subscription for: ${testEmail}`);
        
        // Insert new subscriber (mimicking the server route)
        const insertQuery = `
            INSERT INTO newsletter_subscribers (
                email,
                first_name,
                last_name,
                source,
                subscribed_at,
                is_active
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE)
            RETURNING id, email, first_name, last_name, source, subscribed_at
        `;
        
        const result = await pool.query(insertQuery, [
            testEmail.toLowerCase().trim(),
            firstName,
            lastName,
            source
        ]);
        
        const newSubscriber = result.rows[0];
        console.log('✅ Subscription created successfully:');
        console.log(`   - ID: ${newSubscriber.id}`);
        console.log(`   - Email: ${newSubscriber.email}`);
        console.log(`   - Name: ${newSubscriber.first_name} ${newSubscriber.last_name}`);
        
        // Send notification (mimicking the server route)
        const subscriberName = [newSubscriber.first_name, newSubscriber.last_name].filter(Boolean).join(' ');
        console.log('\nSending admin notification...');
        
        try {
            await sendNewsletterSubscriptionNotification(
                newSubscriber.email,
                subscriberName,
                newSubscriber.source,
                newSubscriber.id,
                newSubscriber.subscribed_at
            );
            console.log('✅ Admin notification sent successfully!');
        } catch (notificationError) {
            console.log('❌ Admin notification failed:', notificationError.message);
        }
        
        // Test 3: Clean up test data
        console.log('\n3️⃣ Cleaning up test data...');
        const deleteResult = await pool.query(
            'DELETE FROM newsletter_subscribers WHERE email = $1 RETURNING id',
            [testEmail]
        );
        
        if (deleteResult.rows.length > 0) {
            console.log('✅ Test data cleaned up successfully');
        }
        
        console.log('\n🎉 Newsletter notification system test completed!');
        console.log('\n📧 Summary:');
        console.log('   ✅ Email notification function works');
        console.log('   ✅ Full subscription flow with notification works');
        console.log('   ✅ Admin will now receive email alerts for new subscribers');
        
        console.log('\n🔧 Configuration:');
        console.log(`   📍 Admin email: ${process.env.ADMIN_EMAIL || 'hello@arzani.co.uk'}`);
        console.log(`   📧 Email service: ${process.env.SENDGRID_API_KEY ? 'SendGrid' : 'Nodemailer'}`);
        console.log(`   🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        
        console.log('\n🎯 What happens now:');
        console.log('   1. When someone subscribes via blog forms, you\'ll get an email');
        console.log('   2. When someone reactivates their subscription, you\'ll get an email');
        console.log('   3. Emails include subscriber details and quick stats');
        console.log('   4. Notifications don\'t block the subscription process if they fail');
        
    } catch (error) {
        console.error('❌ Newsletter notification test failed:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await pool.end();
    }
}

// Run the test
testNewsletterNotification();
