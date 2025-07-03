#!/bin/bash
# Let's Encrypt SSL Certificate Renewal Script
# For arzani.co.uk
# Created: July 3, 2025

# Log file setup
LOG_FILE="/var/log/letsencrypt-renewal.log"
DOMAIN="arzani.co.uk"
WEBROOT="/var/www/html"  # Update this to your actual web root path
EMAIL="admin@arzani.co.uk"  # Update with your email

# Create log directory if it doesn't exist
mkdir -p $(dirname $LOG_FILE)

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Error handling
handle_error() {
  log "ERROR: $1"
  exit 1
}

# Start renewal process
log "Starting Let's Encrypt certificate renewal for $DOMAIN"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
  handle_error "Certbot is not installed. Please install it first."
fi

# Check if we have existing certificates
if certbot certificates | grep -q "$DOMAIN"; then
  log "Found existing certificate for $DOMAIN"
  
  # Check if we should force renewal
  if [[ "$1" == "--force" ]]; then
    log "Forcing renewal of certificate"
    certbot renew --cert-name $DOMAIN --force-renewal || handle_error "Failed to force renew certificate"
  else
    # Normal renewal
    log "Attempting standard renewal"
    certbot renew || handle_error "Failed to renew certificate"
  fi
else
  # No existing certificate, need to create a new one
  log "No existing certificate found for $DOMAIN. Creating a new one."
  
  # Create new certificate
  certbot certonly --webroot -w $WEBROOT -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive || handle_error "Failed to create new certificate"
  
  log "New certificate created successfully"
fi

# Verify certificate
log "Verifying certificate..."
CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -noout -enddate | cut -d= -f2)
log "Certificate expires on: $CERT_EXPIRY"

# Reload web server
log "Reloading Nginx..."
nginx -t && systemctl reload nginx || handle_error "Failed to reload Nginx"

log "Certificate renewal process completed successfully"
log "================================================="

exit 0
