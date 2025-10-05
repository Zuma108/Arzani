import dotenv from 'dotenv';
import { sendProfessionalVerificationNotification } from './utils/email.js';

// Load environment variables
dotenv.config();

// Temporarily disable SendGrid to use nodemailer fallback
const originalSendGridKey = process.env.SENDGRID_API_KEY;
delete process.env.SENDGRID_API_KEY;

async function testEmailFallback() {
  console.log('Testing Professional Verification Email with Nodemailer fallback...\n');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY ? 'Present' : 'Not present');
  console.log('SendinBlue API Key:', process.env.SENDINBLUE_API_KEY ? 'Present' : 'Not present');
  console.log('');

  try {
    console.log('Testing Admin Notification Email...');
    await sendProfessionalVerificationNotification(
      'test.professional@example.com',
      'Test Professional',
      'business_broker',
      12345,
      {
        licenseNumber: 'BR-123456',
        documentsCount: 3,
        notes: 'Test verification request - using nodemailer fallback'
      }
    );
    console.log('✅ Email sent successfully with fallback configuration!');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    // Try to get more details
    if (error.response) {
      console.error('Response details:', error.response.body || error.response.data);
    }
  } finally {
    // Restore the original key
    if (originalSendGridKey) {
      process.env.SENDGRID_API_KEY = originalSendGridKey;
    }
  }
}

// Run the test
testEmailFallback();