# Direct EC2 Node.js Deployment Workflow

This workflow builds and deploys a Node.js application directly to an Amazon EC2 instance.

## Prerequisites

1. Create an EC2 instance with Amazon Linux 2023
   - Instance type: t2.micro or similar
   - Security group allowing inbound traffic on port 22 (SSH), 80 (HTTP), and 3000 (Node.js app)
   
2. Configure SSH key pair for the EC2 instance
   - Save the private key securely
   - Add the key content to GitHub repository secrets as `EC2_SSH_KEY`

3. Create IAM user with following permissions:
   - EC2 read/write access (for checking instance status)
   - Any other AWS services your application needs to access

4. Store IAM user credentials in GitHub Actions secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

## Setup on EC2 Instance

1. Install Node.js 18.x:
   ```bash
   # Update system
   sudo dnf update -y
   
   # Install Node.js using NVM
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm alias default 18
   ```

2. Install PM2 for process management:
   ```bash
   npm install -g pm2
   ```

3. Create application directory structure:
   ```bash
   mkdir -p ~/app/current ~/app/backup
   ```

## Deployment Process

The GitHub Actions workflow will:

1. Build the Node.js application
2. Run tests
3. Create a deployment package
4. Check if the EC2 instance is running, start it if needed
5. Transfer the deployment package to the EC2 instance
6. Extract and install dependencies
7. Start the application using PM2
8. Verify the deployment

## Troubleshooting

If deployment fails, check:

1. EC2 instance security groups
2. SSH key permissions and format
3. Node.js and npm versions on the EC2 instance
4. Application logs using `pm2 logs`
5. SSH connection issues using `ssh -i your-key.pem ec2-user@your-instance-ip`