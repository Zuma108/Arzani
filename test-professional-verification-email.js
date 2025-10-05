import dotenv from 'dotenv';
import { sendProfessionalVerificationNotification, sendVerificationStatusEmail } from './utils/email.js';

// Load environment variables
dotenv.config();

async function testProfessionalVerificationEmails() {
  console.log('Testing Professional Verification Email System...\n');

  try {
    // Test 1: Admin notification when professional submits verification
    console.log('1. Testing Admin Notification Email...');
    await sendProfessionalVerificationNotification(
      'test.professional@example.com',
      'Test Professional',
      'business_broker',
      12345,
      {
        licenseNumber: 'BR-123456',
        documentsCount: 3,
        notes: 'Test verification request with additional notes'
      }
    );
    console.log('✅ Admin notification email sent successfully\n');

    // Test 2: Approval notification to professional
    console.log('2. Testing Approval Notification Email...');
    await sendVerificationStatusEmail(
      'test.professional@example.com',
      'Test Professional',
      'approved',
      'business_broker',
      null
    );
    console.log('✅ Approval notification email sent successfully\n');

    // Test 3: Rejection notification to professional
    console.log('3. Testing Rejection Notification Email...');
    await sendVerificationStatusEmail(
      'test.professional@example.com',
      'Test Professional',
      'rejected',
      'lawyer',
      'Documents were not clear enough. Please resubmit with higher quality scans.'
    );
    console.log('✅ Rejection notification email sent successfully\n');

    console.log('🎉 All email tests completed successfully!');
    console.log('\nEmail System Configuration:');
    console.log(`- Using SendGrid: ${process.env.SENDGRID_API_KEY ? 'Yes' : 'No'}`);
    console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`- Admin Email: zumaadekoy@gmail.com (set in email function)`);

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check your .env file contains SENDGRID_API_KEY');
    console.error('2. Verify SendGrid API key is valid and active');
    console.error('3. Check sender email (hello@arzani.co.uk) is verified in SendGrid');
    console.error('4. If using development mode, check nodemailer configuration');
  }
}

// Run the test
testProfessionalVerificationEmails();