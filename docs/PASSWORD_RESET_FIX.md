# Password Reset Feature Fix Documentation

## Issue
The password reset functionality was not working properly on the production server. Users were encountering a "Page not found" error when trying to access the reset password page at https://www.arzani.co.uk/auth/reset-password.

## Root Cause
The auth.js routes file was missing the necessary routes to handle the password reset functionality:
1. No GET route for `/auth/forgot-password` to render the forgot password page
2. No GET route for `/auth/reset-password` to render the reset password page
3. No POST route for `/auth/forgot-password` to handle the forgot password form submission
4. No POST route for `/auth/reset-password` to handle the reset password form submission

## Solution
We added the following routes to the auth.js file:

```javascript
// Page rendering routes
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    user: null
  });
});

router.get('/reset-password', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect('/auth/forgot-password');
  }
  
  res.render('auth/reset-password', {
    title: 'Reset Password',
    token,
    user: null
  });
});

// Password reset API endpoints
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Check if user exists
    const user = await getUserByEmail(email);
    
    if (!user) {
      // Don't reveal whether a user exists for security reasons
      return res.status(200).json({ 
        success: true,
        message: 'If your email exists in our system, you will receive password reset instructions.'
      });
    }
    
    // Generate a JWT token for password reset
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'password_reset' },
      EMAIL_SECRET,
      { expiresIn: '1h' }
    );
    
    // Create reset URL
    const resetUrl = `${process.env.NODE_ENV === 'production' ? 'https://www.arzani.co.uk' : 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;
    
    // Send password reset email
    await sendPasswordResetEmail(user.email, user.username, resetUrl);
    
    // Log the event
    await recordAnalyticsEvent('password_reset_requested', user.id, { email: user.email });
    
    return res.status(200).json({
      success: true,
      message: 'Password reset instructions have been sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { password, token } = req.body;
    
    if (!password || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password and token are required' 
      });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, EMAIL_SECRET);
      
      // Check if token is for password reset
      if (decoded.purpose !== 'password_reset') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid reset token' 
        });
      }
    } catch (err) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password
    await pool.query(
      'UPDATE users_auth SET password_hash = $1 WHERE user_id = $2',
      [hashedPassword, decoded.userId]
    );
    
    // Log the event
    await recordAnalyticsEvent('password_reset_completed', decoded.userId, { email: decoded.email });
    
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});
```

We also added a route for the login2 page to handle the passwordReset parameter:

```javascript
// Login2 page route
router.get('/login2', (req, res) => {
  res.render('auth/login2', {
    title: 'Login',
    passwordReset: req.query.passwordReset === 'true',
    verified: req.query.verified === 'true',
    email: req.query.email || '',
    user: null
  });
});
```

## Deployment
To deploy these changes to the production server, you'll need to:

1. Copy the updated auth.js file to the production server
2. Restart the Node.js application

You can use the provided deployment script (`deploy-to-production.ps1`) to automate this process. Make sure to update the script with your actual server details before running it.

```powershell
# Update configuration in the script first
./deploy-to-production.ps1
```

## Verification
After deploying the changes, verify that:
1. Users can access the forgot password page at https://www.arzani.co.uk/auth/forgot-password
2. Users can submit their email to request a password reset
3. Users receive a reset link via email
4. Users can click the reset link to access the reset password page
5. Users can set a new password
6. Users are redirected to the login page with a success message

## Notes
- The frontend JavaScript code (password-reset.js) was already correctly implemented
- The login2-handler.js was already set up to properly display a success message when redirected from the password reset page
