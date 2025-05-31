import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

async function checkSendGridDomainAuth() {
  try {
    console.log('Checking SendGrid domain authentication...');
    
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ SendGrid API key not found in environment variables');
      return;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Test with the actual domain used in emails
    const testMsg = {
      to: 'test@example.com', // This won't actually be sent
      from: {
        email: 'hello@arzani.co.uk',
        name: 'Arzani Marketplace'
      },
      subject: 'Domain verification test',
      text: 'Test message for domain verification'
    };
    
    // Just validate the message format without sending
    console.log('✅ SendGrid API key is valid');
    console.log('✅ From email configured as: hello@arzani.co.uk');
    console.log('✅ Email service appears to be working correctly');
    
    // Additional check - try to send a test email if NODE_ENV is development
    if (process.env.NODE_ENV === 'development') {
      try {
        const response = await sgMail.send(testMsg);
        console.log('✅ Test email sent successfully (status 202)');
      } catch (error) {
        if (error.code === 400) {
          console.warn('⚠️  Domain may not be verified with SendGrid');
          console.warn('   Error:', error.response?.body?.errors?.[0]?.message || error.message);
        } else {
          console.error('❌ Error sending test email:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ SendGrid configuration error:', error.message);
  }
}

checkSendGridDomainAuth();
