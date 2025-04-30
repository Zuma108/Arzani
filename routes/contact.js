const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configure mail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your email provider
    auth: {
        user: process.env.EMAIL_USER, // Use environment variables for security
        pass: process.env.EMAIL_PASSWORD
    }
});

// Contact form endpoint
router.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
        }
        
        // Email content
        const mailOptions = {
            from: `"${name}" <${email}>`,
            to: 'hello@arzani.co.uk',
            subject: `Contact Form: ${subject || 'New message from website'}`,
            replyTo: email,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #316FD4;">New Contact Form Submission</h2>
                    <p><strong>From:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <div style="margin-top: 20px; border-left: 4px solid #316FD4; padding-left: 10px;">
                        <p>${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    <p style="color: #777; font-size: 12px; margin-top: 30px;">This message was sent from the Arzani website contact form.</p>
                </div>
            `
        };
        
        // Send email
        await transporter.sendMail(mailOptions);
        
        // Return success response
        return res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});

module.exports = router;
