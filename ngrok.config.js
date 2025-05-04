module.exports = {
    addr: 5000,
    authtoken: 'your-ngrok-auth-token',
    region: 'us',
    hostname: 'your-subdomain.ngrok.io',
    // Add configuration for handling larger requests
    inspect: false,
    // Add configuration to extend request timeout
    request_timeout: '120s' 
};