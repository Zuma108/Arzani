document.addEventListener('DOMContentLoaded', function() {
    const continueButton = document.getElementById('continue-btn');
    
    if (continueButton) {
        continueButton.addEventListener('click', function(event) {
            // ...existing click handler code...
        });
    }
    
    // Modified login functionality to properly handle questionnaire data linking
    const loginForm = document.getElementById('login-form');
    const submitButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Disable submit button to prevent multiple submissions
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = 'Logging in...';
            }
            
            // Get form data
            const formData = new FormData(loginForm);
            const loginData = Object.fromEntries(formData.entries());
            
            // Add questionnaire data identifiers if available
            const questionnaireSubmissionId = localStorage.getItem('questionnaireSubmissionId');
            const anonymousId = localStorage.getItem('questionnaireAnonymousId');
            
            if (questionnaireSubmissionId) {
                loginData.questionnaireSubmissionId = questionnaireSubmissionId;
            }
            
            if (anonymousId) {
                loginData.anonymousId = anonymousId;
            }
            
            try {
                // Send login request
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Success - store token and user info
                    if (data.token) {
                        localStorage.setItem('token', data.token);
                        if (data.refreshToken) {
                            localStorage.setItem('refreshToken', data.refreshToken);
                        }
                    }
                    
                    // After successful login, mark questionnaire data as linked
                    if (questionnaireSubmissionId || anonymousId) {
                        localStorage.setItem('questionnaireLinkStatus', 'linked');
                    }
                    
                    // Redirect to dashboard or home page
                    const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/';
                    window.location.href = returnTo;
                } else {
                    // Handle various error cases
                    if (loginError) {
                        loginError.textContent = data.message || 'Login failed. Please check your credentials.';
                        loginError.style.display = 'block';
                    } else {
                        alert(data.message || 'Login failed. Please check your credentials.');
                    }
                    
                    // Re-enable submit button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Log In';
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
                
                // Display generic error
                if (loginError) {
                    loginError.textContent = 'A network error occurred. Please try again.';
                    loginError.style.display = 'block';
                } else {
                    alert('A network error occurred. Please try again.');
                }
                
                // Re-enable submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Log In';
                }
            }
        });
    }
});
