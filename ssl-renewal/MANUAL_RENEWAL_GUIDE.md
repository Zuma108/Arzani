# Manual SSL Certificate Renewal Guide

This guide will help you manually renew your SSL certificate for arzani.co.uk.

## Step 1: Purchase or Obtain a New SSL Certificate

### Option A: Purchase from a Certificate Authority (CA)

1. Choose a Certificate Authority provider like:
   - [Let's Encrypt](https://letsencrypt.org/) (free)
   - [Comodo](https://ssl.comodo.com/)
   - [DigiCert](https://www.digicert.com/)
   - [GoDaddy](https://www.godaddy.com/web-security/ssl-certificate)
   - [Namecheap](https://www.namecheap.com/security/ssl-certificates/)

2. Purchase the appropriate certificate type:
   - DV (Domain Validation) - Basic security, fastest to obtain
   - OV (Organization Validation) - Includes organization details
   - EV (Extended Validation) - Highest security, shows company name in address bar

### Option B: Use Your Hosting Provider

Many hosting providers offer one-click SSL certificate installation:
- Check your hosting control panel for SSL options
- Look for "Security" or "SSL/TLS" sections
- Some providers include free Let's Encrypt certificates

## Step 2: Generate a Certificate Signing Request (CSR)

1. Log into your web server control panel
2. Navigate to the SSL/TLS section
3. Select "Generate CSR"
4. Fill in your domain details:
   - Common Name: arzani.co.uk
   - Organization: Your business name
   - Department: Optional (e.g., IT)
   - City/Locality: Your city
   - State/Province: Your state/province
   - Country: Your country code (e.g., GB)
   - Email: Your admin email
5. Generate the CSR
6. Copy the CSR text (including BEGIN and END lines)

## Step 3: Submit CSR to Certificate Authority

1. Go to your chosen certificate provider's website
2. Start the certificate order process
3. Paste your CSR when prompted
4. Complete domain validation:
   - Email validation: Respond to an email sent to admin@arzani.co.uk
   - DNS validation: Add a TXT record to your domain's DNS settings
   - HTTP validation: Upload a file to your website

## Step 4: Download Your Certificate Files

Once validated, you'll receive:
- Certificate file (.crt or .pem)
- Intermediate certificate bundle
- (Sometimes) Root certificate

## Step 5: Install the Certificate on Your Web Server

### For cPanel:
1. Log into cPanel
2. Go to "SSL/TLS" section
3. Click "Install Certificate"
4. Paste your certificate and intermediate bundle
5. Click "Install"

### For Plesk:
1. Log into Plesk
2. Go to "Websites & Domains"
3. Click on your domain
4. Select "SSL/TLS Certificates"
5. Click "Add" or "Upload"
6. Follow the prompts to install

### For Microsoft IIS:
1. Open IIS Manager
2. Select your server/site
3. Double-click "Server Certificates"
4. Click "Complete Certificate Request"
5. Browse to your certificate file
6. Provide a friendly name
7. Bind the certificate to your website

### For Nginx:
1. Upload certificate files to your server
2. Edit nginx configuration:
   ```
   server {
       listen 443 ssl;
       server_name arzani.co.uk www.arzani.co.uk;
       
       ssl_certificate /path/to/your/certificate.crt;
       ssl_certificate_key /path/to/your/private.key;
       ssl_trusted_certificate /path/to/intermediate.crt;
   }
   ```
3. Test configuration: `nginx -t`
4. Reload Nginx: `nginx -s reload`

### For Apache:
1. Upload certificate files to your server
2. Edit Apache configuration:
   ```
   <VirtualHost *:443>
       ServerName arzani.co.uk
       ServerAlias www.arzani.co.uk
       
       SSLEngine on
       SSLCertificateFile /path/to/your/certificate.crt
       SSLCertificateKeyFile /path/to/your/private.key
       SSLCertificateChainFile /path/to/intermediate.crt
   </VirtualHost>
   ```
3. Test configuration: `apachectl configtest`
4. Restart Apache: `apachectl restart`

## Step 6: Verify Installation

1. Visit your website with HTTPS: https://arzani.co.uk
2. Check for the padlock icon in the browser
3. Use an SSL checker tool:
   - [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
   - [SSL Checker](https://www.sslshopper.com/ssl-checker.html)
   - [DigiCert SSL Checker](https://www.digicert.com/help/)

## Important Notes

- Back up your private key - you'll need it for renewals
- Set a calendar reminder 30 days before expiration
- Some CAs send renewal reminders via email
- Consider automating the process with Let's Encrypt and Certbot for future renewals

## Need Help?

If you need assistance with your SSL certificate renewal, consider:
1. Contacting your hosting provider's support
2. Hiring a web developer or system administrator for one-time help
3. Using a managed SSL service from your domain registrar
