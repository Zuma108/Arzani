document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const submitButton = document.getElementById('signup-button');
    const signupError = document.getElementById('signup-error');
    const usernameError = document.getElementById('username-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const termsError = document.getElementById('terms-error');
    const passwordInput = document.getElementById('password');
    const resendContainer = document.getElementById('resend-container');
    const loginLink = document.getElementById('login-link');
    
    // Set login link based on environment
    if (loginLink) {
        loginLink.href = getBaseUrl() + '/login';
    }
    
    // Get the base URL for redirects based on environment
    function getBaseUrl() {
        const environmentMeta = document.querySelector('meta[name="site-environment"]');
        const productionDomainMeta = document.querySelector('meta[name="production-domain"]');
        
        const isProduction = environmentMeta && environmentMeta.content === 'production';
        const productionDomain = productionDomainMeta ? productionDomainMeta.content : 'www.arzani.co.uk';
        
        if (isProduction) {
            return 'https://' + productionDomain;
        }
        
        // For development, use relative URLs
        return '';
    }
    
    // Password strength elements
    const strengthBar = document.getElementById('password-strength-bar');
    const strengthText = document.getElementById('password-strength-text');
    
    // Debounce function to limit how often password strength is calculated
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Function to check password strength
    const checkPasswordStrength = debounce((password) => {
        // ...existing code...
    }, 300);
    
    // Monitor password input for strength
    passwordInput.addEventListener('input', (e) => {
        checkPasswordStrength(e.target.value);
    });

    // Input sanitization function
    function sanitizeInput(input) {
        return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function validateForm(username, email, password, termsAccepted) {
        let isValid = true;
        
        // Reset all error displays
        usernameError.style.display = 'none';
        emailError.style.display = 'none';
        passwordError.style.display = 'none';
        if (termsError) termsError.style.display = 'none';
        
        // Username validation - using both length and pattern
        if (!username || username.length < 3) {
            usernameError.style.display = 'flex';
            usernameError.querySelector(':last-child').textContent = 'Username must be at least 3 characters.';
            isValid = false;
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            usernameError.style.display = 'flex';
            usernameError.querySelector(':last-child').textContent = 'Username can only contain letters, numbers, underscores and hyphens.';
            isValid = false;
        }
        
        // Email validation - using regex for better validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailError.style.display = 'flex';
            isValid = false;
        }
        
        // Password validation
        if (!password) {
            passwordError.style.display = 'flex';
            passwordError.querySelector(':last-child').textContent = 'Password is required.';
            isValid = false;
        } else if (password.length < 6) {
            passwordError.style.display = 'flex';
            passwordError.querySelector(':last-child').textContent = 'Password must be at least 6 characters.';
            isValid = false;
        }
        
        // Terms validation
        if (termsError && !termsAccepted) {
            termsError.style.display = 'flex';
            isValid = false;
        }
        
        return isValid;
    }

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Get and sanitize input values
        const username = sanitizeInput(document.getElementById('username').value.trim());
        const email = sanitizeInput(document.getElementById('email').value.trim());
        const password = document.getElementById('password').value; // Don't sanitize password
        const termsAccepted = document.getElementById('terms')?.checked;

        if (!validateForm(username, email, password, termsAccepted)) {
            return;
        }

        // Update button state
        submitButton.disabled = true;
        submitButton.textContent = 'Signing up...';
        submitButton.style.opacity = '0.7';
        signupError.style.display = 'none';

        try {
            // Prepare the request data including questionnaire information
            const requestData = {
                username,
                email,
                password,
                termsAccepted
            };
            
            // Add questionnaire data if available
            const anonymousId = localStorage.getItem('questionnaireAnonymousId');
            const submissionId = localStorage.getItem('questionnaireSubmissionId');
            
            if (anonymousId) {
                requestData.anonymousId = anonymousId;
                console.log('Including anonymousId in signup request:', anonymousId);
            }
            
            if (submissionId) {
                requestData.questionnaireSubmissionId = submissionId;
                console.log('Including questionnaireSubmissionId in signup request:', submissionId);
            }
            
            // Get any additional localStorage data related to the questionnaire
            const questionnaireData = collectQuestionnaireData();
            if (Object.keys(questionnaireData).length > 0) {
                requestData.questionnaireData = questionnaireData;
                console.log('Including questionnaire data in signup request');
            }
            
            const response = await fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': getCsrfToken() // Add CSRF protection if implemented
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                // Show success message
                signupError.style.display = 'block';
                signupError.className = 'alert alert-success';
                signupError.innerHTML = '<strong>Registration successful!</strong> Please check your email to verify your account.';
                
                // Show the resend container
                resendContainer.style.display = 'block';
                
                // Store email temporarily for verification resend functionality
                sessionStorage.setItem('signupEmail', email);
                
                // Clear questionnaire data from localStorage since it's now in the database
                clearQuestionnaireData();
                
                // Clear form
                signupForm.reset();
                strengthBar.style.width = '0%';
                strengthText.textContent = '';
                
                // Redirect after delay with proper domain based on environment
                setTimeout(() => {
                    window.location.href = getBaseUrl() + '/login?registered=true&email=' + encodeURIComponent(email);
                }, 3000);
            } else {
                handleErrorResponse(response, data);
            }
        } catch (error) {
            console.error('Signup error:', error);
            signupError.style.display = 'block';
            signupError.className = 'alert alert-danger';
            signupError.innerHTML = '<strong>Registration Error</strong><br>' + 
                (error.message || 'A network error occurred. Please check your connection and try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Sign Up';
            submitButton.style.opacity = '1';
        }
    });
    
    // Function to collect all questionnaire data from localStorage
    function collectQuestionnaireData() {
        const data = {};
        const questionnaireKeys = [
            'sellerEmail',
            'sellerBusinessName',
            'sellerIndustry',
            'sellerDescription',
            'sellerYearEstablished',
            'sellerYearsInOperation',
            'sellerContactName',
            'sellerContactPhone',
            'sellerLocation',
            'sellerRevenueExact',
            'sellerRevenuePrevYear',
            'sellerRevenue2YearsAgo',
            'sellerRevenue3YearsAgo',
            'sellerEbitda',
            'sellerEbitdaPrevYear',
            'sellerEbitda2YearsAgo',
            'sellerCashOnCash',
            'sellerFfeValue',
            'sellerFfeItems',
            'sellerGrowthRate',
            'sellerGrowthAreas',
            'sellerGrowthChallenges',
            'sellerScalability',
            'sellerTotalDebtAmount',
            'sellerDebtTransferable',
            'sellerDebtNotes',
            'sellerDebtItems',
            'sellerValuationData'
        ];

        questionnaireKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    // Try parsing as JSON first
                    data[key] = JSON.parse(value);
                } catch (e) {
                    // If not valid JSON, store as string
                    data[key] = value;
                }
            }
        });

        return data;
    }
    
    // Function to clear questionnaire data from localStorage
    function clearQuestionnaireData() {
        console.log('Clearing questionnaire data flags from localStorage...');
        
        // Mark data as submitted/linked instead of clearing everything immediately
        localStorage.setItem('questionnaireDataSubmitted', 'true');
        localStorage.setItem('questionnaireLinkStatus', 'linked'); // Mark as linked after signup attempt
        
        // Optionally remove specific sensitive items if needed, but keep IDs for potential debugging
        // localStorage.removeItem('sellerValuationData'); 
        
        // Save the anonymous ID to a session variable in case we need it
        const anonId = localStorage.getItem('questionnaireAnonymousId');
        if (anonId) {
            sessionStorage.setItem('previousAnonymousId', anonId);
        }
        // Consider removing the anonymous ID from local storage now?
        // localStorage.removeItem('questionnaireAnonymousId'); 
    }
    
    // Handle API error responses
    function handleErrorResponse(response, data) {
        signupError.style.display = 'block';
        signupError.className = 'alert alert-danger';
        
        // Handle different types of errors
        if (response.status === 409) {
            // Conflict - typically email or username already exists
            signupError.innerHTML = '<strong>Registration Failed</strong><br>' + (data.message || 'An account with this email or username already exists.');
            
            // If email exists, show login link and resend verification options
            if (data.emailExists) {
                signupError.innerHTML += '<br><br>Already have an account? <a href="' + getBaseUrl() + '/login?email=' + encodeURIComponent(document.getElementById('email').value.trim()) + '">Login here</a>';
                
                // If email exists but isn't verified, show resend option
                if (data.emailNotVerified) {
                    resendContainer.style.display = 'block';
                    sessionStorage.setItem('signupEmail', document.getElementById('email').value.trim());
                }
            }
        } else if (response.status === 400) {
            // Bad request - validation errors
            signupError.innerHTML = '<strong>Registration Failed</strong><br>' + (data.message || 'Please check your information and try again.');
        } else if (response.status === 429) {
            // Too many requests
            signupError.innerHTML = '<strong>Too Many Attempts</strong><br>Please try again later.';
        } else {
            // General error
            signupError.innerHTML = '<strong>Registration Failed</strong><br>' + (data.message || 'An error occurred during registration. Please try again.');
        }
    }
    
    // Get CSRF token (if implemented)
    function getCsrfToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : '';
    }
    
    // Handle resend verification email
    const resendButton = document.getElementById('resend-email-btn');
    if (resendButton) {
        resendButton.addEventListener('click', async () => {
            // Get email from form or session storage
            const formEmail = document.getElementById('email').value.trim();
            const storedEmail = sessionStorage.getItem('signupEmail');
            const email = formEmail || storedEmail;
            
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (emailError) emailError.style.display = 'flex';
                signupError.style.display = 'block';
                signupError.className = 'alert alert-danger';
                signupError.textContent = 'Please enter a valid email address to resend verification';
                return;
            }
            
            try {
                resendButton.disabled = true;
                resendButton.textContent = 'Sending...';
                
                const response = await fetch('/auth/resend-verification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': getCsrfToken()
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    signupError.style.display = 'block';
                    signupError.className = 'alert alert-success';
                    signupError.innerHTML = '<strong>Email Sent!</strong><br>Verification email resent successfully!';
                    
                    // Redirect to login page after delay
                    setTimeout(() => {
                        window.location.href = getBaseUrl() + '/login?email=' + encodeURIComponent(email) + '&verificationSent=true';
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Failed to resend verification email');
                }
            } catch (error) {
                signupError.style.display = 'block';
                signupError.className = 'alert alert-danger';
                signupError.innerHTML = '<strong>Error</strong><br>' + 
                    (error.message || 'Error sending verification email. Please try again later.');
            } finally {
                resendButton.disabled = false;
                resendButton.textContent = 'Resend Verification Email';
            }
        });
    }
    
    // Additional form field validation on input/blur
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const termsCheckbox = document.getElementById('terms');
    
    usernameInput.addEventListener('blur', () => {
        const username = usernameInput.value.trim();
        if (username && (username.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(username))) {
            usernameError.style.display = 'flex';
            if (username.length < 3) {
                usernameError.querySelector(':last-child').textContent = 'Username must be at least 3 characters.';
            } else {
                usernameError.querySelector(':last-child').textContent = 'Username can only contain letters, numbers, underscores and hyphens.';
            }
        } else {
            usernameError.style.display = 'none';
        }
    });
    
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailError.style.display = 'flex';
        } else {
            emailError.style.display = 'none';
        }
    });
    
    if (termsCheckbox && termsError) {
        termsCheckbox.addEventListener('change', () => {
            termsError.style.display = termsCheckbox.checked ? 'none' : 'flex';
        });
    }
    
    // Check for registration success in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        signupError.style.display = 'block';
        signupError.className = 'alert alert-success';
        signupError.innerHTML = '<strong>Registration successful!</strong> Please check your email to verify your account.';
    }
    
    // Check for questionnaire anonymous ID and prefill email
    const anonymousId = localStorage.getItem('questionnaireAnonymousId');
    const questionnaireEmail = localStorage.getItem('sellerEmail');
    
    if (signupForm) {
        // Add hidden field for anonymous ID if available
        if (anonymousId) {
            const hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = 'anonymousId';
            hiddenField.value = anonymousId;
            signupForm.appendChild(hiddenField);
            
            console.log('Added questionnaire anonymous ID to form:', anonymousId);
        }
        
        // Pre-fill email if available from questionnaire
        if (questionnaireEmail) {
            const emailInput = signupForm.querySelector('input[name="email"], input[type="email"]');
            if (emailInput && !emailInput.value) {
                emailInput.value = questionnaireEmail;
                console.log('Pre-filled email from questionnaire data:', questionnaireEmail);
            }
        }
    }
});
