import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Use SendGrid if API key is available, otherwise use nodemailer with fallback options
const useSendGrid = process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.length > 0;

if (useSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('Email service: Using SendGrid');
} else {
  console.log('Email service: Using nodemailer with fallback configuration');
}

// Configure email provider based on environment
const getTransporter = () => {
  if (process.env.NODE_ENV === 'development') {
    // Development: Use ethereal fake SMTP service
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.DEV_EMAIL_USER || 'k5377jep2vnjslxx@ethereal.email',
        pass: process.env.DEV_EMAIL_PASS || 'XPvTzrWsXXJzF5n5mY'
      }
    });
  } else if (!useSendGrid) {
    // Production: Use SendinBlue/Brevo
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'SendinBlue',
      auth: {
        user: 'hello@arzani.co.uk',
        api_key: process.env.SENDINBLUE_API_KEY
      }
    });
  }
  
  return null; // Will use SendGrid directly
};

export async function sendVerificationEmail(email, verificationCode) {
  if (!email || !verificationCode) {
    throw new Error('Email and verification code are required');
  }

  const SERVER_URL = process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000';
  console.log('Sending verification email to:', email);

  // Email content with 6-digit code
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #c0816f; color: white; padding: 20px; text-align: center;">
        <h2>Arzani Marketplace Email Verification</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello,</p>
        <p>Thank you for signing up for Arzani Marketplace! Please use the verification code below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #333; padding: 15px; background-color: #f5f5f5; border-radius: 4px; display: inline-block;">
            ${verificationCode}
          </div>
        </div>
        <p>This verification code is valid for 10 minutes.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br>The Arzani Marketplace Team</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {      // Use SendGrid
      const msg = {
        to: email,
        from: {
          email: 'hello@arzani.co.uk',
          name: 'Arzani Marketplace'
        },
        subject: 'Verify your Arzani Marketplace account',
        html: htmlContent,
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        }
      };

      const response = await sgMail.send(msg);
      console.log('Verification email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Marketplace" <hello@arzani.co.uk>',
        to: email,
        subject: 'Verify your Arzani Marketplace account',
        html: htmlContent
      });
      
      console.log('Verification email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send verification email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(email, username, resetUrl) {
  if (!email || !resetUrl) {
    throw new Error('Email and reset URL are required');
  }
  
  // Email content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #c0816f; color: white; padding: 20px; text-align: center;">
        <h2>Password Reset Request</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello ${username || ''},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #c0816f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, please copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This password reset link is valid for 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>Team Arzani</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {      // Use SendGrid
      const msg = {
        to: email,
        from: {
          email: 'hello@arzani.co.uk',
          name: 'Arzani Marketplace'
        },
        subject: 'Reset your Arzani Marketplace password',
        html: htmlContent,
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        }
      };

      const response = await sgMail.send(msg);
      console.log('Password reset email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Marketplace" <hello@arzani.co.uk>',
        to: email,
        subject: 'Reset your Arzani Marketplace password',
        html: htmlContent
      });
      
      console.log('Password reset email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

export async function sendWelcomeEmail(email, username) {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const SERVER_URL = process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000';
  console.log('Sending welcome email to:', email);

  // Email content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>Welcome to Arzani Marketplace!</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello ${username || 'there'},</p>
        <p><strong>Excited to have you on board. Let's get you up and running fast. Here's everything you need to get started:</strong></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #041b76;">
          <h3 style="margin-top: 0; color: #333;">Your Marketplace Hub</h3>
          <p>You'll be automatically redirected to our marketplace after login, where you can browse all businesses.</p>
          <p><a href="${SERVER_URL}/marketplace2" style="color: #041b76; text-decoration: none; font-weight: bold;">/marketplace2</a> - Find and explore businesses for sale or investment opportunities.</p>
        </div>
        
        <h3>Key Features:</h3>
        <ul style="line-height: 1.6;">
          <li><a href="${SERVER_URL}/post-business" style="color: #041b76; font-weight: bold;">/post-business</a> - List your business for sale and reach qualified buyers.</li>
          <li><a href="${SERVER_URL}/profile" style="color: #041b76; font-weight: bold;">/profile</a> - Manage your account settings, saved listings, and personal information.</li>
          <li><a href="${SERVER_URL}/seller-questionnaire" style="color: #041b76; font-weight: bold;">/seller-questionnaire</a> - Get an estimated valuation for your business before listing.</li>
          <li><a href="${SERVER_URL}/market-trends" style="color: #041b76; font-weight: bold;">/market-trends</a> - Explore industry insights and current market conditions.</li>
          <li><a href="${SERVER_URL}/saved-searches" style="color: #041b76; font-weight: bold;">/saved-searches</a> - Save your search criteria to receive personalized updates.</li>
          <li><a href="${SERVER_URL}/dashboard" style="color: #041b76; font-weight: bold;">/dashboard</a> - View all your activities, listings and communications in one place.</li>
        </ul>
        
        <p style="margin-top: 25px;">If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:hello@arzani.co.uk" style="color: #041b76;">hello@arzani.co.uk</a>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SERVER_URL}/marketplace2" style="background-color: #041b76; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Explore Marketplace
          </a>
        </div>
        
        <p>Best regards,<br>The Arzani Marketplace Team</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {      // Use SendGrid
      const msg = {
        to: email,
        from: {
          email: 'hello@arzani.co.uk',
          name: 'Arzani Marketplace'
        },
        subject: 'Welcome to Arzani Marketplace!',
        html: htmlContent,
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        }
      };

      const response = await sgMail.send(msg);
      console.log('Welcome email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Marketplace" <hello@arzani.co.uk>',
        to: email,
        subject: 'Welcome to Arzani!',
        html: htmlContent
      });
      
      console.log('Welcome email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
}

export async function sendContactEmail(email, name, subject, message) {
  if (!email || !message) {
    throw new Error('Email and message are required');
  }
  
  console.log('Sending contact form submission notification:', email);

  // Email content for notification to admin
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>New Contact Form Submission</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #041b76;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p>Please respond to this inquiry at your earliest convenience.</p>
      </div>
    </div>
  `;

  // Email content for confirmation to the sender
  const confirmationHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>We've Received Your Message</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello ${name},</p>
        <p>Thank you for contacting Arzani Marketplace. We've received your message and will get back to you shortly.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #041b76;">
          <p><strong>Your message details:</strong></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <p>If you have any additional information to share, please feel free to reply to this email.</p>
        <p>Best regards,<br>The Arzani Marketplace Team</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {      // Send notification to admin
      const adminMsg = {
        to: process.env.ADMIN_EMAIL || 'hello@arzani.co.uk',
        from: {
          email: 'hello@arzani.co.uk',
          name: 'Arzani Marketplace Contact Form'
        },
        subject: `New Contact: ${subject}`,
        html: htmlContent,
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        }
      };

      // Send confirmation to user
      const userMsg = {
        to: email,
        from: {
          email: 'hello@arzani.co.uk',
          name: 'Arzani Marketplace'
        },
        subject: 'We\'ve received your message - Arzani Marketplace',
        html: confirmationHtml,
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        }
      };

      await sgMail.send(adminMsg);
      await sgMail.send(userMsg);
      
      console.log('Contact form emails sent successfully via SendGrid');
      return true;
    } else {
      const transporter = getTransporter();
      
      // Send notification to admin
      await transporter.sendMail({
        from: '"Arzani Marketplace" <hello@arzani.co.uk>',
        to: process.env.ADMIN_EMAIL || 'hello@arzani.co.uk',
        subject: `New Contact: ${subject}`,
        html: htmlContent
      });
      
      // Send confirmation to user
      await transporter.sendMail({
        from: '"Arzani Marketplace" <hello@arzani.co.uk>',
        to: email,
        subject: 'We\'ve received your message - Arzani Marketplace',
        html: confirmationHtml
      });
      
      console.log('Contact form emails sent successfully via Nodemailer');
      return true;
    }
  } catch (error) {
    console.error('Failed to send contact form emails:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error(`Failed to send contact form emails: ${error.message}`);
  }
}

export async function sendVerificationStatusEmail(email, username, status, professionalType, notes) {
  if (!email || !status) {
    throw new Error('Email and status are required');
  }
  
  const SERVER_URL = process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000';
  console.log(`Sending verification ${status} email to:`, email);

  // Customize content based on status
  let subject = '';
  let statusMessage = '';
  let actionButton = '';
  let statusColor = '';
  
  if (status === 'approved') {
    subject = 'Professional Verification Approved - Arzani Marketplace';
    statusMessage = `<p>Congratulations! Your professional verification as a ${professionalType} has been <strong style="color: #28a745;">approved</strong>. You now have access to all verified professional features on the Arzani Marketplace.</p>`;
    actionButton = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${SERVER_URL}/professional-dashboard" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Explore Professional Features
        </a>
      </div>
    `;
    statusColor = '#28a745'; // Green
  } else if (status === 'rejected') {
    subject = 'Professional Verification Update - Arzani Marketplace';
    statusMessage = `
      <p>Thank you for submitting your professional verification request as a ${professionalType}.</p>
      <p>After careful review, we were unable to approve your verification at this time. ${notes ? `<br><strong>Reason:</strong> ${notes}` : ''}</p>
      <p>You are welcome to submit a new verification request with additional documentation.</p>
    `;
    actionButton = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${SERVER_URL}/professional-verification" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Submit New Verification
        </a>
      </div>
    `;
    statusColor = '#dc3545'; // Red
  } else if (status === 'pending') {
    subject = 'Professional Verification Request Received - Arzani Marketplace';
    statusMessage = `
      <p>We have received your professional verification request as a ${professionalType}.</p>
      <p>Our team will review your documentation and credentials shortly. This process typically takes 1-2 business days.</p>
    `;
    actionButton = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${SERVER_URL}/verification-status" style="background-color: #ffc107; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Check Verification Status
        </a>
      </div>
    `;
    statusColor = '#ffc107'; // Yellow
  }

  // Email content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
        <h2>Professional Verification Status Update</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello ${username || 'there'},</p>
        ${statusMessage}
        ${actionButton}
        <p>If you have any questions about your verification status, please contact our support team at <a href="mailto:support@arzani.co.uk" style="color: #041b76;">support@arzani.co.uk</a>.</p>
        <p>Best regards,<br>The Arzani Marketplace Team</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {      // Use SendGrid
      const msg = {
        to: email,
        from: {
          email: 'hello@arzani.co.uk',
          name: 'Arzani Marketplace'
        },
        subject: subject,
        html: htmlContent,
        tracking_settings: {
          click_tracking: {
            enable: false
          },
          open_tracking: {
            enable: false
          }
        }
      };

      const response = await sgMail.send(msg);
      console.log(`Verification ${status} email sent successfully via SendGrid`);
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Marketplace" <hello@arzani.co.uk>',
        to: email,
        subject: subject,
        html: htmlContent
      });
      
      console.log(`Verification ${status} email sent successfully via Nodemailer:`, info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error(`Failed to send verification ${status} email:`, error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error(`Failed to send verification ${status} email: ${error.message}`);
  }
}

export async function sendSignupAnalyticsEmail(userEmail, userId, timestamp = new Date().toISOString()) {
  console.log('Sending signup analytics email for user:', userId);

  // Email content with analytics data
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>New User Signup Analytics</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p><strong>A new user has signed up to Arzani Marketplace!</strong></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #041b76;">
          <h3 style="margin-top: 0; color: #333;">Signup Details</h3>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Signup Time:</strong> ${timestamp}</p>
          <p><strong>Status:</strong> Verification pending</p>
        </div>
        
        <p>This is an automated notification for analytics purposes.</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {
      // Use SendGrid
      const msg = {
        to: 'hello@arzani.co.uk',
        from: {
          email: 'analytics@arzani.co.uk',
          name: 'Arzani Analytics'
        },
        subject: 'New User Signup Analytics',
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log('Signup analytics email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Analytics" <analytics@arzani.co.uk>',
        to: 'hello@arzani.co.uk',
        subject: 'New User Signup Analytics',
        html: htmlContent
      });
      
      console.log('Signup analytics email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send signup analytics email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    // Just log the error without throwing, so it doesn't block the signup process
    return null;
  }
}

export async function sendVerificationSuccessAnalyticsEmail(userEmail, userId, username, timestamp = new Date().toISOString()) {
  console.log('Sending verification success analytics email for user:', userId);

  // Email content with verification success analytics data
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>User Verification Success</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p><strong>A user has successfully verified their account!</strong></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #097969;">
          <h3 style="margin-top: 0; color: #333;">Verification Details</h3>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Username:</strong> ${username || 'N/A'}</p>
          <p><strong>Verification Time:</strong> ${timestamp}</p>
          <p><strong>Status:</strong> <span style="color: #097969; font-weight: bold;">Verified Successfully</span></p>
        </div>
        
        <p>This is an automated notification for analytics purposes.</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {
      // Use SendGrid
      const msg = {
        to: 'hello@arzani.co.uk',
        from: {
          email: 'analytics@arzani.co.uk',
          name: 'Arzani Analytics'
        },
        subject: 'User Verification Success Analytics',
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log('Verification success analytics email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Analytics" <analytics@arzani.co.uk>',
        to: 'hello@arzani.co.uk',
        subject: 'User Verification Success Analytics',
        html: htmlContent
      });
      
      console.log('Verification success analytics email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send verification success analytics email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    // Just log the error without throwing, so it doesn't block the verification process
    return null;
  }
}

export async function sendVerificationFailureAnalyticsEmail(userEmail, userId, reason, attemptCount, timestamp = new Date().toISOString()) {
  console.log('Sending verification failure analytics email for user:', userId);

  // Email content with verification failure analytics data
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>User Verification Failure</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p><strong>A user has failed to verify their account.</strong></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0; color: #333;">Verification Failure Details</h3>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Failed Attempt Time:</strong> ${timestamp}</p>
          <p><strong>Attempt Count:</strong> ${attemptCount}</p>
          <p><strong>Failure Reason:</strong> <span style="color: #dc3545; font-weight: bold;">${reason}</span></p>
          <p><strong>Status:</strong> <span style="color: #dc3545; font-weight: bold;">Verification Failed</span></p>
        </div>
        
        <p>This is an automated notification for analytics purposes.</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {
      // Use SendGrid
      const msg = {
        to: 'hello@arzani.co.uk',
        from: {
          email: 'analytics@arzani.co.uk',
          name: 'Arzani Analytics'
        },
        subject: 'User Verification Failure Analytics',
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log('Verification failure analytics email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Analytics" <analytics@arzani.co.uk>',
        to: 'hello@arzani.co.uk',
        subject: 'User Verification Failure Analytics',
        html: htmlContent
      });
      
      console.log('Verification failure analytics email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send verification failure analytics email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    // Just log the error without throwing, so it doesn't block the process
    return null;
  }
}

export async function sendWeeklyAnalyticsSummaryEmail(stats) {
  console.log('Sending weekly analytics summary email');

  const {
    signupCount = 0,
    verificationSuccessCount = 0, 
    verificationFailureCount = 0,
    totalUsers = 0,
    conversionRate = 0,
    weekStart,
    weekEnd,
    topFailureReasons = []
  } = stats;

  // Format date ranges
  const formattedStartDate = new Date(weekStart).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedEndDate = new Date(weekEnd).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });

  // Generate failure reasons HTML if available
  let failureReasonsHtml = '';
  if (topFailureReasons && topFailureReasons.length > 0) {
    failureReasonsHtml = `
      <div style="margin-top: 20px;">
        <h4 style="margin-bottom: 10px; color: #333;">Top Verification Failure Reasons:</h4>
        <ul style="margin: 0; padding: 0 0 0 20px;">
          ${topFailureReasons.map(reason => `<li style="margin-bottom: 5px;">${reason.reason} (${reason.count} occurrences)</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Email content with weekly analytics summary
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #041b76; color: white; padding: 20px; text-align: center;">
        <h2>Weekly User Analytics Summary</h2>
        <p style="margin: 5px 0;">${formattedStartDate} - ${formattedEndDate}</p>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p><strong>Here's your weekly user verification analytics summary:</strong></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #041b76;">
          <h3 style="margin-top: 0; color: #333;">Overview</h3>
          
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 15px;">
            <div style="flex: 0 0 48%; background-color: #e6f7ff; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #0366d6;">New Signups</h4>
              <p style="font-size: 24px; margin: 0; font-weight: bold;">${signupCount}</p>
            </div>
            
            <div style="flex: 0 0 48%; background-color: #e6ffed; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #28a745;">Successful Verifications</h4>
              <p style="font-size: 24px; margin: 0; font-weight: bold;">${verificationSuccessCount}</p>
            </div>
            
            <div style="flex: 0 0 48%; background-color: #fff5e6; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #f66a0a;">Failed Verifications</h4>
              <p style="font-size: 24px; margin: 0; font-weight: bold;">${verificationFailureCount}</p>
            </div>
            
            <div style="flex: 0 0 48%; background-color: #f6f8fa; padding: 15px; margin-bottom: 10px; border-radius: 4px;">
              <h4 style="margin: 0 0 10px 0; color: #586069;">Conversion Rate</h4>
              <p style="font-size: 24px; margin: 0; font-weight: bold;">${conversionRate}%</p>
            </div>
          </div>
          
          <p><strong>Total Users:</strong> ${totalUsers}</p>
          ${failureReasonsHtml}
        </div>
        
        <div style="margin-top: 25px;">
          <h3>Recommendations:</h3>
          <ul style="padding-left: 20px; line-height: 1.6;">
            ${conversionRate < 70 ? 
              '<li>Consider simplifying the verification process as the conversion rate is below 70%.</li>' : ''}
            ${verificationFailureCount > 10 ? 
              '<li>Review the top failure reasons to identify and address common verification issues.</li>' : ''}
            ${verificationSuccessCount < signupCount / 2 ? 
              '<li>Send reminder emails to users who signed up but haven\'t completed verification.</li>' : ''}
          </ul>
        </div>
        
        <p style="margin-top: 25px;">For detailed analytics, please visit the <a href="${process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000'}/admin/analytics" style="color: #041b76;">Analytics Dashboard</a>.</p>
        
        <p>This is an automated analytics report.</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {
      // Use SendGrid
      const msg = {
        to: 'hello@arzani.co.uk',
        from: {
          email: 'analytics@arzani.co.uk',
          name: 'Arzani Analytics'
        },
        subject: `Weekly User Analytics: ${formattedStartDate} - ${formattedEndDate}`,
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log('Weekly analytics summary email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: '"Arzani Analytics" <analytics@arzani.co.uk>',
        to: 'hello@arzani.co.uk',
        subject: `Weekly User Analytics: ${formattedStartDate} - ${formattedEndDate}`,
        html: htmlContent
      });
      
      console.log('Weekly analytics summary email sent successfully via Nodemailer:', info.messageId);
      
      // For development, log preview URL
      if (process.env.NODE_ENV === 'development' && info.previewUrl) {
        console.log('Preview URL:', info.previewUrl);
      }
      
      return info;
    }
  } catch (error) {
    console.error('Failed to send weekly analytics summary email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return null;
  }
}

export default { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendContactEmail, sendVerificationStatusEmail, sendSignupAnalyticsEmail, sendVerificationSuccessAnalyticsEmail, sendVerificationFailureAnalyticsEmail, sendWeeklyAnalyticsSummaryEmail };
