/**
 * Example route implementation with reCAPTCHA Enterprise verification
 * Add this to your existing route files or server.js
 */

import RecaptchaEnterpriseVerifier from '../utils/recaptcha-enterprise.js';

const recaptchaVerifier = new RecaptchaEnterpriseVerifier();

/**
 * Example: Verify reCAPTCHA token during onboarding
 * POST /api/onboarding/verify-recaptcha
 */
export const verifyRecaptchaOnboarding = async (req, res) => {
    try {
        const { token, userIpAddress, userAgent } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'reCAPTCHA token is required'
            });
        }

        // Get user IP from request if not provided
        const clientIp = userIpAddress || req.ip || req.connection.remoteAddress;
        const clientUserAgent = userAgent || req.get('User-Agent');

        // Verify the token
        const verificationResult = await recaptchaVerifier.verifyToken(
            token,
            'ONBOARDING',
            clientIp,
            clientUserAgent
        );

        // Check if verification is acceptable (score >= 0.5)
        const isAcceptable = recaptchaVerifier.isVerificationAcceptable(verificationResult, 0.5);

        if (!isAcceptable) {
            return res.status(400).json({
                success: false,
                error: 'reCAPTCHA verification failed',
                details: {
                    score: verificationResult.score,
                    reasons: verificationResult.reasons
                }
            });
        }

        // Verification successful
        res.json({
            success: true,
            message: 'reCAPTCHA verification successful',
            score: verificationResult.score,
            action: verificationResult.action
        });

    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during verification'
        });
    }
};

/**
 * Example: Verify reCAPTCHA token during login
 * POST /api/auth/verify-recaptcha
 */
export const verifyRecaptchaLogin = async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'reCAPTCHA token is required'
            });
        }

        const verificationResult = await recaptchaVerifier.verifyToken(
            token,
            'LOGIN',
            req.ip,
            req.get('User-Agent')
        );

        const isAcceptable = recaptchaVerifier.isVerificationAcceptable(verificationResult, 0.7); // Higher threshold for login

        res.json({
            success: isAcceptable,
            score: verificationResult.score,
            message: isAcceptable ? 'Verification successful' : 'Verification failed'
        });

    } catch (error) {
        console.error('reCAPTCHA login verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during verification'
        });
    }
};

/**
 * Add these routes to your Express app:
 * 
 * app.post('/api/onboarding/verify-recaptcha', verifyRecaptchaOnboarding);
 * app.post('/api/auth/verify-recaptcha', verifyRecaptchaLogin);
 */