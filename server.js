const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const bodyParser = require('body-parser');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const { Sequelize } = require('sequelize');
const User = require('./models/user'); // Assuming you have a User model
require('dotenv').config(); // Load environment variables from .env

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Define CORS options for frontend
const corsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// JWT and Email Secrets
const JWT_SECRET = process.env.JWT_SECRET || 'supersecureandrandomkeythatnoonecanguess123456';
const EMAIL_SECRET = process.env.EMAIL_SECRET || 'emailverifysupersecretkey123456';
const SENDINBLUE_API_KEY = process.env.SENDINBLUE_API_KEY;

// Nodemailer setup for sending emails using Sendinblue
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,  
    auth: {
        user: '7e8554001@smtp-brevo.com',// Your verified Sendinblue email address
        pass: process.env.SENDINBLUE_API_KEY
    },
    secure: false, // Set to false since Sendinblue uses TLS (not SSL)
    tls: {
        rejectUnauthorized: false // Use only in development to avoid certificate issues
    }
});

// Initialize the Google OAuth2 Client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Serve static files (like HTML pages)
app.use(express.static(path.join(__dirname, 'public')));

// Google Authentication route
app.post('/auth/google', async (req, res) => {
    const { id_token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;

        // Check if user exists or create new one
        let user = await User.findOne({ googleId: sub });
        if (!user) {
            user = new User({ googleId: sub, email, name, picture });
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'User authenticated!', token });
    } catch (error) {
        console.error('Error verifying Google token:', error);
        res.status(400).json({ error: 'Invalid token' });
    }
});

// Sign-up route
app.post('/auth/signup', async (req, res) => {
    console.log('Request body:', req.body);
    const { username, email, password } = req.body;

    try {
        // Check if all fields are provided
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required: username, email, password' });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        if (password.length < 12) {
            return res.status(400).json({ message: 'Password must be at least 12 characters long' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        user = new User({
            username,
            email,
            password: hashedPassword,
            verified: false  // Set verified to false until user verifies email
        });
        await user.save();

        // Generate email verification token
        const emailToken = jwt.sign({ userId: user._id, email: user.email }, EMAIL_SECRET, { expiresIn: '1d' });

        // Verification link to be sent in the email
        const verificationUrl = `http://localhost:5000/auth/verifyemail?token=${emailToken}`;
        const mailOptions = {
            from: '7e8554001@smtp-brevo.com',  // Your verified Sendinblue email address
            to: email,
            subject: 'Verify your email',
            html: `<p>Thank you for signing up! Please verify your email by clicking on the link below:</p>
                   <a href="${verificationUrl}">Verify Email</a>`
        };

        // Send email using Sendinblue
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent.');

        res.status(201).json({ success: true, message: 'User created successfully. Check your email for verification.' });
    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Email verification route
app.get('/auth/verifyemail', async (req, res) => {
    const token = req.query.token;

    try {
        // Verify the token
        const decoded = jwt.verify(token, EMAIL_SECRET);
        const { userId, email } = decoded;

        // Find the user and mark them as verified
        let user = await User.findOne({ _id: userId, email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid verification link' });
        }

        user.verified = true;
        await user.save();

        res.status(200).json({ success: true, message: 'Email verified successfully! You can now log in.' });
    } catch (error) {
        console.error('Error during email verification:', error);
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

// Resend verification email route
app.post('/auth/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User with this email does not exist' });
        }

        // Check if the user is already verified
        if (user.verified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new email verification token
        const emailToken = jwt.sign({ userId: user._id, email: user.email }, EMAIL_SECRET, { expiresIn: '1d' });

        // Create a verification link
        const verificationUrl = `http://localhost:5000/auth/verifyemail?token=${emailToken}`;
        const mailOptions = {
            from: '7e8554001@smtp-brevo.com',  // Your verified Sendinblue email address
            to: email,
            subject: 'Verify your email',
            html: `<p>Please verify your email by clicking on the link below:</p>
                   <a href="${verificationUrl}">Verify Email</a>`
        };

        // Send the email
        await transporter.sendMail(mailOptions);
        console.log('Verification email resent.');

        res.status(200).json({ success: true, message: 'Verification email resent successfully.' });
    } catch (error) {
        console.error('Error during resending verification email:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login route
app.post('/auth/login2', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the email exists in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check if the password is correct
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Check if the user is verified
        if (!user.verified) {
            return res.status(400).json({ message: 'Please verify your email before logging in' });
        }
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ success: true, message: 'Login successful', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/auth/marketplace', (req, res) => {
    const authHeader = req.headers['authorization'];

    // Check if the Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Missing or malformed token' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token after 'Bearer '

    try {
        // Verify the token using the secret
        const decoded = jwt.verify(token, JWT_SECRET);

        // Proceed if token is verified
        res.status(200).json({ message: 'User authorized', data: 'Marketplace data here' });
    } catch (error) {
        // Handle invalid or expired token
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
});

// Serve marketplace HTML directly if verified
app.get('/marketplace.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/marketplace.html'));
});

// Create a new Sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

// Export the sequelize instance for use in other files
console.log('Exporting sequelize instance:', sequelize);
module.exports = sequelize;

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
