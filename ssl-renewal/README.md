# SSL Certificate Automatic Renewal Setup

This directory contains scripts and configuration for automatic SSL certificate renewal using Let's Encrypt for the domains `arzani.co.uk` and `www.arzani.co.uk`.

## 🚨 Important Notice

Your SSL certificates expire on **June 14, 2025** (in ~15 days). This automation will prevent future expirations and ensure continuous HTTPS service.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `renew-ssl.sh` | Main renewal script with comprehensive error handling |
| `setup-cron.sh` | Sets up automated renewal using cron jobs |
| `test-setup.sh` | Tests and validates the entire setup |
| `config.conf` | Configuration file for customizing behavior |
| `README.md` | This documentation file |

## 🚀 Quick Setup

### Prerequisites
- Ubuntu/Debian server with root access
- Certbot installed (`sudo apt install certbot`)
- Nginx web server running
- Existing Let's Encrypt certificates for your domains

### 1. Deploy Scripts to Server

Copy all files from this directory to your server:

```bash
# On your server, create the directory
sudo mkdir -p /opt/ssl-renewal

# Copy files (adjust paths as needed)
sudo cp renew-ssl.sh setup-cron.sh test-setup.sh config.conf /opt/ssl-renewal/
cd /opt/ssl-renewal
```

### 2. Run Setup

```bash
# Make scripts executable
sudo chmod +x *.sh

# Set up automatic renewal (runs as root)
sudo ./setup-cron.sh

# Test the setup
sudo ./test-setup.sh
```

### 3. Configure Notifications (Optional)

Edit the configuration file to receive email alerts:

```bash
sudo nano config.conf
```

Set your email:
```bash
EMAIL_ALERT="your-email@example.com"
```

## 📋 Detailed Setup Instructions

### Step 1: Install Prerequisites

If not already installed:

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Verify nginx is running
sudo systemctl status nginx
```

### Step 2: Test Current Certificate Status

```bash
# Check certificate expiration
sudo openssl x509 -in /etc/letsencrypt/live/arzani.co.uk/cert.pem -noout -enddate

# Test current certificate
sudo openssl s_client -connect arzani.co.uk:443 -servername arzani.co.uk </dev/null
```

### Step 3: Deploy and Configure

1. **Copy scripts to server**:
   ```bash
   sudo mkdir -p /opt/ssl-renewal
   cd /opt/ssl-renewal
   # Copy all files here
   ```

2. **Make scripts executable**:
   ```bash
   sudo chmod +x renew-ssl.sh setup-cron.sh test-setup.sh
   ```

3. **Configure email notifications** (optional):
   ```bash
   sudo nano config.conf
   # Set EMAIL_ALERT="your-email@domain.com"
   ```

4. **Set up automatic renewal**:
   ```bash
   sudo ./setup-cron.sh
   ```

5. **Test the setup**:
   ```bash
   sudo ./test-setup.sh
   ```

## 🔧 Configuration Options

Edit `config.conf` to customize behavior:

```bash
# Email for failure notifications
EMAIL_ALERT="admin@arzani.co.uk"

# Domains to monitor
DOMAINS="arzani.co.uk,www.arzani.co.uk"

# Enable nginx configuration testing
NGINX_CONFIG_TEST=true

# Log file location
LOG_FILE="/var/log/ssl-renewal.log"
```

## 🕐 Renewal Schedule

The cron job runs **twice daily** at:
- **2:30 AM** (02:30)
- **2:30 PM** (14:30)

Certbot automatically determines if renewal is needed (typically 30 days before expiration).

## 📊 Monitoring and Logs

### View Logs
```bash
# View recent renewal attempts
sudo tail -f /var/log/ssl-renewal.log

# View all logs
sudo less /var/log/ssl-renewal.log
```

### Check Cron Job Status
```bash
# View current cron jobs
sudo crontab -l

# Check cron service
sudo systemctl status cron
```

### Manual Testing
```bash
# Test renewal without making changes
sudo /opt/ssl-renewal/renew-ssl.sh --dry-run

# Force renewal (if needed)
sudo certbot renew --force-renewal

# Test nginx configuration
sudo nginx -t
```

## 🛠️ Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   sudo chmod +x /opt/ssl-renewal/*.sh
   ```

2. **Certbot Not Found**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

3. **Nginx Test Fails**
   ```bash
   sudo nginx -t
   # Fix any configuration errors shown
   ```

4. **Certificate Path Issues**
   ```bash
   # Verify certificate location
   sudo ls -la /etc/letsencrypt/live/arzani.co.uk/
   ```

### Manual Renewal

If automatic renewal fails:

```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Renew certificates manually
sudo certbot renew

# Start nginx
sudo systemctl start nginx

# Test SSL
openssl s_client -connect arzani.co.uk:443 -servername arzani.co.uk </dev/null
```

### Recovery Steps

If something goes wrong:

1. **Check logs**: `sudo tail -50 /var/log/ssl-renewal.log`
2. **Test renewal**: `sudo /opt/ssl-renewal/renew-ssl.sh --dry-run`
3. **Verify nginx**: `sudo nginx -t && sudo systemctl status nginx`
4. **Check certificates**: `sudo certbot certificates`

## 📧 Notification Setup

### Email Notifications

1. Install mail utility:
   ```bash
   sudo apt install mailutils
   ```

2. Configure email in `config.conf`:
   ```bash
   EMAIL_ALERT="admin@arzani.co.uk"
   ```

### Slack/Webhook Notifications

1. Get webhook URL from Slack/Discord/Teams
2. Add to `config.conf`:
   ```bash
   WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
   ```

## 🔒 Security Considerations

- Scripts run as root (required for certificate management)
- Log files are created with restricted permissions (644)
- Nginx configuration is tested before reload
- Dry-run capability for safe testing

## 📅 Maintenance

### Regular Checks

- **Monthly**: Review logs for any issues
- **Quarterly**: Test manual renewal process
- **Annually**: Review and update notification settings

### Log Rotation

Logs are automatically rotated weekly, keeping 52 weeks of history.

## 🆘 Emergency Procedures

### If Certificates Expire

1. **Immediate action**:
   ```bash
   sudo certbot renew --force-renewal
   sudo systemctl reload nginx
   ```

2. **Verify renewal**:
   ```bash
   sudo openssl x509 -in /etc/letsencrypt/live/arzani.co.uk/cert.pem -noout -enddate
   ```

3. **Check website**:
   ```bash
   curl -I https://arzani.co.uk
   ```

### Remove Automation

If you need to remove the automatic renewal:

```bash
sudo /opt/ssl-renewal/setup-cron.sh --remove
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review log files for error messages
3. Test individual components using the test script
4. Ensure all prerequisites are properly installed

## 🏆 Success Criteria

After setup, you should see:
- ✅ Cron job scheduled and running
- ✅ Test script passes all checks
- ✅ Logs show successful dry-run
- ✅ SSL certificates remain valid
- ✅ No service interruptions

Your SSL certificates will now automatically renew, preventing expiration and maintaining secure HTTPS access to your marketplace application.
