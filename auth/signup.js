const signupForm = document.getElementById('signup-form');

signupForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const formData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    fetch('http://localhost:5000/auth/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Inform the user that they need to verify their email
            alert('Sign-up successful! Please check your email to verify your account before logging in.');
        } else {
            alert('Error during sign-up: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error during sign-up:', error);
        alert('An unexpected error occurred. Please try again.');
    });
});
