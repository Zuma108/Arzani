module.exports = {
  apps: [{
    name: 'marketplace',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Environment variables will be provided via .env file
      // or directly in the PM2 start command
    }
  }]
};
