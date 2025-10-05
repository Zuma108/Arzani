/**
 * reCAPTCHA Enterprise verification utility
 * Handles server-side verification of reCAPTCHA Enterprise tokens
 */

import fetch from 'node-fetch';

class RecaptchaEnterpriseVerifier {
    constructor() {
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'arzani-marketplace';
        this.apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        this.siteKey = process.env.RECAPTCHA_SITE_KEY;
        
        if (!this.apiKey) {
            console.warn('GOOGLE_CLOUD_API_KEY not set - reCAPTCHA verification will fail');
        }
    }

    /**
     * Verify a reCAPTCHA Enterprise token
     * @param {string} token - The token from the frontend
     * @param {string} expectedAction - The expected action (e.g., 'ONBOARDING', 'LOGIN')
     * @param {string} userIpAddress - Optional: User's IP address
     * @param {string} userAgent - Optional: User's user agent
     * @returns {Promise<Object>} Verification result
     */
    async verifyToken(token, expectedAction = 'ONBOARDING', userIpAddress = null, userAgent = null) {
        if (!this.apiKey) {
            console.error('Google Cloud API key not configured');
            return {
                success: false,
                error: 'Server configuration error',
                score: 0
            };
        }

        if (!token || token.startsWith('manual_verification_')) {
            // Handle fallback manual verification
            return {
                success: true,
                score: 0.5,
                action: expectedAction,
                reasons: ['MANUAL_VERIFICATION'],
                challenge: 'NOCAPTCHA'
            };
        }

        try {
            const requestBody = {
                event: {
                    token: token,
                    expectedAction: expectedAction,
                    siteKey: this.siteKey
                }
            };

            // Add optional fields if provided
            if (userIpAddress) {
                requestBody.event.userIpAddress = userIpAddress;
            }
            if (userAgent) {
                requestBody.event.userAgent = userAgent;
            }

            const response = await fetch(
                `https://recaptchaenterprise.googleapis.com/v1/projects/${this.projectId}/assessments?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('reCAPTCHA Enterprise API error:', response.status, errorText);
                return {
                    success: false,
                    error: `API error: ${response.status}`,
                    score: 0
                };
            }

            const result = await response.json();
            
            // Check if the token is valid and the action matches
            const isValid = result.tokenProperties?.valid === true;
            const actionMatches = result.tokenProperties?.action === expectedAction;
            const score = result.riskAnalysis?.score || 0;

            console.log('reCAPTCHA Enterprise verification result:', {
                valid: isValid,
                action: result.tokenProperties?.action,
                expectedAction,
                actionMatches,
                score,
                reasons: result.riskAnalysis?.reasons
            });

            return {
                success: isValid && actionMatches,
                score: score,
                action: result.tokenProperties?.action,
                reasons: result.riskAnalysis?.reasons || [],
                challenge: result.tokenProperties?.challenge || 'NOCAPTCHA',
                raw: result
            };

        } catch (error) {
            console.error('reCAPTCHA Enterprise verification error:', error);
            return {
                success: false,
                error: error.message,
                score: 0
            };
        }
    }

    /**
     * Check if a verification result should be accepted
     * @param {Object} verificationResult - Result from verifyToken
     * @param {number} minScore - Minimum acceptable score (0.0 to 1.0)
     * @returns {boolean} Whether the verification should be accepted
     */
    isVerificationAcceptable(verificationResult, minScore = 0.5) {
        if (!verificationResult.success) {
            return false;
        }

        // Accept manual verification with lower score requirement
        if (verificationResult.reasons?.includes('MANUAL_VERIFICATION')) {
            return true;
        }

        return verificationResult.score >= minScore;
    }
}

export default RecaptchaEnterpriseVerifier;