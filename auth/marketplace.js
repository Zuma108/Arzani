app.get('/marketplace.html', (req, res) => {
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