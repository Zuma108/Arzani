const awsConfig = {
    region: 'eu-west-2',
    bucketName: 'arzani-images1'
};

// Export to global scope instead of ES6 module
window.awsConfig = awsConfig;
