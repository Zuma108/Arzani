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
  if (process.env.NODE_ENV === 'development' && !useSendGrid) {
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
    // Fall back to SendinBlue if no SendGrid
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'SendinBlue',
      auth: {
        user: process.env.EMAIL_USER,
        api_key: process.env.SENDINBLUE_API_KEY
      }
    });
  }
  
  return null; // Will use SendGrid directly
};

export async function sendVerificationEmail(email, verificationToken) {
  if (!email || !verificationToken) {
    throw new Error('Email and verification token are required');
  }

  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
  console.log('Sending verification email to:', email);

  // Email content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #c0816f; color: white; padding: 20px; text-align: center;">
        <h2>Marketplace Email Verification</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello,</p>
        <p>Thank you for signing up for Marketplace! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${SERVER_URL}/auth/verify-email?token=${verificationToken}" style="background-color: #c0816f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, please copy and paste this link into your browser:</p>
        <p><a href="${SERVER_URL}/auth/verify-email?token=${verificationToken}">${SERVER_URL}/auth/verify-email?token=${verificationToken}</a></p>
        <p>This verification link is valid for 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br>The Marketplace Team</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {
      // Use SendGrid
      const msg = {
        to: email,
        from: {
          email: process.env.EMAIL_FROM || 'michaeladekoya321@gmail.com',
          name: 'Marketplace Support'
        },
        subject: 'Verify your Marketplace account',
        html: htmlContent
      };

      const response = await sgMail.send(msg);
      console.log('Verification email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Marketplace" <no-reply@marketplace.com>',
        to: email,
        subject: 'Verify your Marketplace account',
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

export async function sendPasswordResetEmail(email, resetToken) {
  if (!email || !resetToken) {
    throw new Error('Email and reset token are required');
  }
  
  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
  const resetLink = `${SERVER_URL}/auth/reset-password?token=${resetToken}`;
  
  // Email content
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #c0816f; color: white; padding: 20px; text-align: center;">
        <h2>Password Reset Request</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #c0816f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, please copy and paste this link into your browser:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This password reset link is valid for 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>The Marketplace Team</p>
      </div>
    </div>
  `;

  try {
    if (useSendGrid) {
      // Use SendGrid
      const msg = {
        to: email,
        from: {
          email: process.env.EMAIL_FROM || 'michaeladekoya321@gmail.com',
          name: 'Marketplace Support'
        },
        subject: 'Reset your Marketplace password',
        html: htmlContent
      };

      const response = await sgMail.send(msg);
      console.log('Password reset email sent successfully via SendGrid');
      return response;
    } else {
      // Use Nodemailer
      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Marketplace" <no-reply@marketplace.com>',
        to: email,
        subject: 'Reset your Marketplace password',
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

export default { sendVerificationEmail, sendPasswordResetEmail };
