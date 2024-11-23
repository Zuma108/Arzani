app.post('/auth/google', async (req, res) => {
  const { id_token } = req.body;

  try {
      console.log('Received ID Token:', id_token);

      const ticket = await client.verifyIdToken({
          idToken: id_token,
          audience: process.env.GOOGLE_CLIENT_ID, // Specify the correct client_id
      });

      const payload = ticket.getPayload();
      const { sub, email, name, picture } = payload;

      let user = await User.findOne({ googleId: sub });
      if (!user) {
          user = new User({
              googleId: sub,
              email,
              name,
              picture,
          });
          await user.save(); // Save the new user to the database
      }

      const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

      // Return a proper JSON response with token and message
      return res.status(200).json({
          message: 'User authenticated!',
          token: token
      });

  } catch (error) {
      console.error('Error verifying Google token:', error);

      // Always return error responses in JSON
      return res.status(400).json({
          error: 'Invalid token',
          details: error.message
      });
  }
});
