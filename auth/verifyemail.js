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

        // Redirect or respond with success
        res.status(200).send('<h1>Email verified successfully! You can now log in.</h1>');
    } catch (error) {
        console.error('Error during email verification:', error);
        res.status(400).send('<h1>Invalid or expired verification link. Please sign up again.</h1>');
    }
});
