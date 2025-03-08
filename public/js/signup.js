

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const submitButton = signupForm.querySelector('button[type="submit"]');

    function validateForm(username, email, password) {
        if (!username || username.length < 3) return 'Username must be at least 3 characters';
        if (!email || !email.includes('@')) return 'Please enter a valid email';
        if (!password || password.length < 6) return 'Password must be at least 6 characters';
        return null;
    }

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const validationError = validateForm(username, email, password);
        if (validationError) {
            alert(validationError);
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Signing up...';

        try {
            const response = await fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registration successful! Please check your email to verify your account.');
                window.location.href = '/login';
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert(error.message || 'Error during registration. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Sign Up';
        }
    });
});
