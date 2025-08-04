/**
 * Handle verification code entry and submission
 * Frontend handler for 6-digit code verification
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const verificationForm = document.getElementById('verification-form');
    const codeInputs = document.querySelectorAll('.code-input');
    const verifyButton = document.querySelector('.verify-button');
    const resendButton = document.getElementById('resend-code');
    const resendTimer = document.getElementById('resend-timer');
    const errorElement = document.getElementById('verification-error');
    const successElement = document.getElementById('verification-success');
    
    // Get user ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    
    if (!userId) {
        showError('Missing user information. Please try signing up again.');
        verifyButton.disabled = true;
        return;
    }
    
    // Set up input handling for code boxes
    codeInputs.forEach((input, index) => {
        // Focus first input on load
        if (index === 0) input.focus();
        
        // Handle input in each box
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Auto advance to next input when a digit is entered
            if (value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
            
            // Enable/disable verify button based on all inputs having values
            verifyButton.disabled = !areAllInputsFilled();
        });
        
        // Handle backspace to go to previous input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
        
        // Handle paste event for the entire code
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            
            if (/^\d+$/.test(paste) && paste.length <= codeInputs.length) {
                for (let i = 0; i < paste.length; i++) {
                    if (index + i < codeInputs.length) {
                        codeInputs[index + i].value = paste[i];
                    }
                }
                
                // Focus the next empty input or the last one
                const nextIndex = Math.min(index + paste.length, codeInputs.length - 1);
                codeInputs[nextIndex].focus();
                
                // Enable verify button if all inputs are filled
                verifyButton.disabled = !areAllInputsFilled();
            }
        });
    });
    
    // Form submission
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get verification code from inputs
        const code = Array.from(codeInputs).map(input => input.value).join('');
        
        if (code.length !== 6) {
            showError('Please enter the complete 6-digit code.');
            return;
        }
        
        try {
            verifyButton.disabled = true;
            verifyButton.textContent = 'Verifying...';
            
            const response = await fetch('/auth/verify-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    code
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Verification failed. Please try again.');
            }
            
            // Verification successful
            showSuccess('Email verified successfully! Redirecting to login...');
            
            // Clear any stored email
            localStorage.removeItem('pendingVerificationEmail');
            
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/auth/login?verified=true';
            }, 2000);
            
        } catch (error) {
            showError(error.message || 'Verification failed. Please try again.');
            verifyButton.disabled = false;
            verifyButton.textContent = 'Verify Email';
        }
    });
    
    // Resend code functionality
    let cooldownTime = 0;
    let cooldownInterval;
    
    function startCooldown(seconds = 60) {
        resendButton.disabled = true;
        cooldownTime = seconds;
        updateResendTimer();
        
        cooldownInterval = setInterval(() => {
            cooldownTime--;
            updateResendTimer();
            
            if (cooldownTime <= 0) {
                clearInterval(cooldownInterval);
                resendButton.disabled = false;
                resendTimer.textContent = '';
            }
        }, 1000);
    }
    
    function updateResendTimer() {
        resendTimer.textContent = cooldownTime > 0 ? `(${cooldownTime}s)` : '';
    }
    
    resendButton.addEventListener('click', async () => {
        if (resendButton.disabled) return;
        
        try {
            resendButton.disabled = true;
            
            const response = await fetch('/auth/resend-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Failed to resend code. Please try again later.');
            }
            
            showSuccess('Verification code resent. Please check your email.');
            startCooldown(60);
            
        } catch (error) {
            showError(error.message || 'Failed to resend code. Please try again later.');
            resendButton.disabled = false;
        }
    });
    
    // Start initial cooldown to prevent immediate resend
    startCooldown(30);
    
    // Helper functions
    function areAllInputsFilled() {
        return Array.from(codeInputs).every(input => input.value.length === 1);
    }
    
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        successElement.style.display = 'none';
    }
    
    function showSuccess(message) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        errorElement.style.display = 'none';
    }
});
