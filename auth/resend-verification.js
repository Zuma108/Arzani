document.getElementById('resend-email-btn').addEventListener('click', function() {
    const email = document.getElementById('email').value;

    if (!email) {
        alert('Please provide your email address to resend verification.');
        return;
    }

    fetch('http://localhost:5000/auth/resend-verification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Verification email has been resent. Please check your inbox.');
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error during resending verification email:', error);
        alert('An unexpected error occurred. Please try again.');
    });
});
