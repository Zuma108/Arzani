import dotenv from 'dotenv';
import { sendVerificationEmail } from './utils/email.js';

dotenv.config();

async function testEmailSending() {
  try {
    console.log('Testing email sending functionality...');
    console.log('SendGrid API Key exists:', !!process.env.SENDGRID_API_KEY);
    console.log('Environment:', process.env.NODE_ENV);
    
    // Test sending a verification email
    const testEmail = 'test@example.com';
    const testToken = 'test-verification-token-123';
    
    const result = await sendVerificationEmail(testEmail, testToken);
    console.log('Email sent successfully:', result);
    
  } catch (error) {
    console.error('Email sending failed:', error);
    if (error.response) {
      console.error('SendGrid response:', error.response.body);
    }
  }
}

testEmailSending();
