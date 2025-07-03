# Let's Encrypt SSL Certificate Installation Guide

This guide will help you install and renew your Let's Encrypt SSL certificate for arzani.co.uk.

## Let's Encrypt Certificate Renewal

Let's Encrypt certificates are valid for 90 days and should be renewed automatically. If you need to manually renew:

## Step 1: Connect to Your Server

1. Connect to your server via SSH:
   ```bash
   ssh username@your-server-ip
   ```

2. Make sure you have sudo/root privileges

## Step 2: Renew the Certificate

Let's Encrypt certificates can be renewed using the Certbot tool:

```bash
# Test renewal process (doesn't make actual changes)
sudo certbot renew --dry-run

# Actual renewal command
sudo certbot renew
```

If you want to force renewal regardless of expiration date:

```bash
sudo certbot renew --force-renewal
```

If you need to specify which certificate to renew:

```bash
sudo certbot renew --cert-name arzani.co.uk
```

## Step 3: Verify Nginx Configuration

Your Nginx configuration should already be set up, but it's good to verify:

1. Check the SSL configuration in your Nginx site config:
   ```bash
   sudo nano /etc/nginx/sites-available/arzani.co.uk
   ```

2. Make sure it contains these lines:
   ```nginx
   server {
       listen 443 ssl;
       server_name arzani.co.uk www.arzani.co.uk;
       
       ssl_certificate /etc/letsencrypt/live/arzani.co.uk/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/arzani.co.uk/privkey.pem;
       
       # Other SSL settings
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
       
       # Other server configurations
       # ...
   }
   ```

3. Test the Nginx configuration:
   ```bash
   sudo nginx -t
   ```

4. Reload Nginx if the test is successful:
   ```bash
   sudo systemctl reload nginx
   ```

## Step 4: Verify Certificate Renewal

1. Check the certificate expiration date:
   ```bash
   sudo certbot certificates
   ```

2. Or use OpenSSL to check:
   ```bash
   echo | openssl s_client -servername arzani.co.uk -connect arzani.co.uk:443 2>/dev/null | openssl x509 -noout -dates
   ```

3. Open a browser and visit https://arzani.co.uk, then check the certificate details.

## Setting Up Automatic Renewal

Let's Encrypt certificates should be renewed automatically through a cron job. To verify it's set up:

1. Check existing cron jobs:
   ```bash
   sudo systemctl list-timers | grep certbot
   ```

2. If you don't see a certbot timer, create a cron job:
   ```bash
   sudo crontab -e
   ```

3. Add this line to run renewal twice daily (recommended by Let's Encrypt):
   ```
   0 */12 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
   ```

## Troubleshooting

1. **Certificate not renewed automatically**: Verify cron job is running correctly.
2. **Renewal errors**: Check certbot logs at `/var/log/letsencrypt/`.
3. **Certificate verification failed**: Make sure your domain is pointing to the correct server IP.

## Reinstalling Certificate (If Needed)

If you need to completely reinstall the certificate:

```bash
sudo certbot certonly --webroot -w /path/to/webroot -d arzani.co.uk -d www.arzani.co.uk
```

Replace `/path/to/webroot` with your actual website root directory (e.g., `/var/www/html`).

## Need Help?

If you encounter issues with your Let's Encrypt certificate:
1. Check the [Let's Encrypt documentation](https://letsencrypt.org/docs/)
2. Visit the [Let's Encrypt community forum](https://community.letsencrypt.org/)
3. Check the [Certbot documentation](https://certbot.eff.org/docs/)
