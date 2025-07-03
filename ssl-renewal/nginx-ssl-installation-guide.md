# Installing Renewed GoDaddy SSL Certificate on Nginx

After you've renewed your SSL certificate through GoDaddy, follow these steps to install it on your Nginx server.

## Step 1: Prepare the Certificate Files

1. Download the certificate files from GoDaddy:
   - Your primary certificate file (usually `[domain].crt`)
   - The certificate bundle/chain file (usually `gd_bundle.crt`)

2. Make sure you have your private key file (`.key` file). If you don't have it:
   - It should be on your server in the SSL directory
   - The typical location is `/etc/ssl/private/[domain].key`

## Step 2: Copy Files to Your Server

1. Create a directory for your certificates if it doesn't exist:
   ```bash
   sudo mkdir -p /etc/ssl/arzani.co.uk
   ```

2. Upload/copy your certificate files to this directory:
   - Your primary certificate: `/etc/ssl/arzani.co.uk/arzani.co.uk.crt`
   - The certificate bundle: `/etc/ssl/arzani.co.uk/gd_bundle.crt`
   
3. Make sure your private key is secure:
   ```bash
   sudo chmod 600 /etc/ssl/private/arzani.co.uk.key
   ```

## Step 3: Create a Full Certificate Chain (if needed)

For Nginx, you'll want to combine your certificate with the bundle:

```bash
sudo cat /etc/ssl/arzani.co.uk/arzani.co.uk.crt /etc/ssl/arzani.co.uk/gd_bundle.crt > /etc/ssl/arzani.co.uk/arzani.co.uk.chained.crt
```

## Step 4: Update Nginx Configuration

1. Edit your Nginx server block configuration file:
   ```bash
   sudo nano /etc/nginx/sites-available/arzani.co.uk
   ```

2. Update the SSL certificate paths:
   ```nginx
   server {
       listen 443 ssl;
       server_name arzani.co.uk www.arzani.co.uk;
       
       ssl_certificate /etc/ssl/arzani.co.uk/arzani.co.uk.chained.crt;
       ssl_certificate_key /etc/ssl/private/arzani.co.uk.key;
       
       # Other SSL settings...
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_prefer_server_ciphers on;
       ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
       
       # Your other settings...
   }
   ```

3. Test the Nginx configuration:
   ```bash
   sudo nginx -t
   ```

4. If the test is successful, reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

## Step 5: Verify Installation

1. Visit your website with HTTPS: `https://arzani.co.uk`
2. Check the certificate details in your browser:
   - Click the padlock icon in the address bar
   - Verify the expiration date is updated
   - Check that the certificate is valid

## Troubleshooting

If you encounter issues:

1. Check Nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

2. Verify file permissions:
   ```bash
   sudo ls -la /etc/ssl/arzani.co.uk/
   sudo ls -la /etc/ssl/private/
   ```

3. Ensure the certificate chain is correct:
   ```bash
   openssl verify -CAfile /etc/ssl/arzani.co.uk/gd_bundle.crt /etc/ssl/arzani.co.uk/arzani.co.uk.crt
   ```

4. Test SSL configuration:
   ```bash
   openssl s_client -connect arzani.co.uk:443 -servername arzani.co.uk
   ```
