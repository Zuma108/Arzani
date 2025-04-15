#!/bin/bash

# Deploy production environment variables to EC2 instance
echo "Deploying production environment variables to EC2..."

# Copy the production environment file to the server
scp -i ~/.ssh/arzani-key.pem .env.production ec2-user@arzani.co.uk:/home/ec2-user/app/current/.env

echo "Environment file deployed successfully."
echo "Restarting application..."

# SSH into the server and restart the application
ssh -i ~/.ssh/arzani-key.pem ec2-user@arzani.co.uk << 'EOF'
  cd /home/ec2-user/app/current
  # Restart with PM2 
  pm2 restart marketplace
EOF

echo "Deployment complete!"