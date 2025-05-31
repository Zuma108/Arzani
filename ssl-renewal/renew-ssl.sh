#!/bin/bash

# SSL Certificate Renewal Script for arzani.co.uk
# This script automatically renews Let's Encrypt certificates and reloads nginx
# Author: SSL Automation Setup
# Date: $(date +%Y-%m-%d)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/ssl-renewal.log"
DOMAINS="arzani.co.uk,www.arzani.co.uk"
EMAIL_ALERT=""  # Set this to receive failure notifications
NGINX_CONFIG_TEST=true
DRY_RUN=false

# Load configuration if exists
if [[ -f "$SCRIPT_DIR/config.conf" ]]; then
    source "$SCRIPT_DIR/config.conf"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    send_notification "SSL Renewal Failed" "$1"
    exit 1
}

# Send notification (email or webhook)
send_notification() {
    local subject="$1"
    local message="$2"
    
    if [[ -n "$EMAIL_ALERT" ]]; then
        echo "$message" | mail -s "$subject" "$EMAIL_ALERT" 2>/dev/null || true
    fi
    
    # Add webhook notification here if needed
    # curl -X POST -H "Content-Type: application/json" \
    #      -d "{\"text\":\"$subject: $message\"}" \
    #      "$WEBHOOK_URL" 2>/dev/null || true
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error_exit "This script must be run as root (use sudo)"
    fi
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        error_exit "certbot is not installed. Please install it first."
    fi
    
    # Check if nginx is installed
    if ! command -v nginx &> /dev/null; then
        error_exit "nginx is not installed or not in PATH"
    fi
    
    # Check if certificates exist
    if [[ ! -d "/etc/letsencrypt/live/arzani.co.uk" ]]; then
        error_exit "SSL certificates for arzani.co.uk not found. Please obtain certificates first."
    fi
    
    log "INFO" "Prerequisites check passed"
}

# Test nginx configuration
test_nginx_config() {
    if [[ "$NGINX_CONFIG_TEST" == "true" ]]; then
        log "INFO" "Testing nginx configuration..."
        if ! nginx -t 2>/dev/null; then
            error_exit "nginx configuration test failed. Please fix configuration before renewal."
        fi
        log "INFO" "nginx configuration test passed"
    fi
}

# Check certificate expiration
check_certificate_expiration() {
    log "INFO" "Checking certificate expiration..."
    
    local cert_file="/etc/letsencrypt/live/arzani.co.uk/cert.pem"
    local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    log "INFO" "Certificate expires in $days_until_expiry days ($expiry_date)"
    
    if [[ $days_until_expiry -lt 30 ]]; then
        log "WARNING" "Certificate expires in less than 30 days!"
    fi
    
    return 0
}

# Perform certificate renewal
renew_certificates() {
    log "INFO" "Starting certificate renewal process..."
    
    local renewal_cmd="certbot renew"
    if [[ "$DRY_RUN" == "true" ]]; then
        renewal_cmd="$renewal_cmd --dry-run"
        log "INFO" "Running in dry-run mode"
    fi
    
    # Add additional options
    renewal_cmd="$renewal_cmd --quiet --no-self-upgrade"
    
    log "INFO" "Running: $renewal_cmd"
    
    if $renewal_cmd 2>&1 | tee -a "$LOG_FILE"; then
        local renewal_status=${PIPESTATUS[0]}
        if [[ $renewal_status -eq 0 ]]; then
            log "INFO" "Certificate renewal completed successfully"
            return 0
        else
            error_exit "Certificate renewal failed with exit code: $renewal_status"
        fi
    else
        error_exit "Certificate renewal command failed"
    fi
}

# Reload nginx
reload_nginx() {
    log "INFO" "Reloading nginx..."
    
    # Test configuration again before reload
    if ! nginx -t 2>/dev/null; then
        error_exit "nginx configuration test failed after renewal. Not reloading nginx."
    fi
    
    if systemctl reload nginx 2>/dev/null; then
        log "INFO" "nginx reloaded successfully"
        
        # Verify nginx is still running
        if ! systemctl is-active --quiet nginx; then
            error_exit "nginx is not running after reload!"
        fi
    else
        error_exit "Failed to reload nginx"
    fi
}

# Verify certificates after renewal
verify_certificates() {
    log "INFO" "Verifying certificate installation..."
    
    local domains_array=(${DOMAINS//,/ })
    for domain in "${domains_array[@]}"; do
        log "INFO" "Testing SSL connection to $domain..."
        
        # Test SSL connection
        if timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            log "INFO" "SSL verification successful for $domain"
        else
            log "WARNING" "SSL verification failed for $domain - this might be normal if renewal wasn't needed"
        fi
    done
}

# Cleanup old certificates
cleanup_old_certificates() {
    log "INFO" "Cleaning up old certificates..."
    
    # Remove certificates older than 30 days from archive
    find /etc/letsencrypt/archive -name "*.pem" -mtime +30 -type f 2>/dev/null | while read file; do
        log "INFO" "Removing old certificate file: $file"
        rm -f "$file"
    done
}

# Main function
main() {
    log "INFO" "=== SSL Certificate Renewal Started ==="
    log "INFO" "Script version: 1.0"
    log "INFO" "Domains: $DOMAINS"
    
    # Create log file if it doesn't exist
    touch "$LOG_FILE" || error_exit "Cannot create log file: $LOG_FILE"
    
    # Run checks and renewal
    check_prerequisites
    test_nginx_config
    check_certificate_expiration
    
    # Store nginx status before renewal
    local nginx_was_running=false
    if systemctl is-active --quiet nginx; then
        nginx_was_running=true
    fi
    
    # Perform renewal
    if renew_certificates; then
        # Only reload nginx if it was running and renewal was successful
        if [[ "$nginx_was_running" == "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
            reload_nginx
        fi
        
        # Verify installation
        if [[ "$DRY_RUN" != "true" ]]; then
            verify_certificates
        fi
        
        # Cleanup
        cleanup_old_certificates
        
        log "INFO" "=== SSL Certificate Renewal Completed Successfully ==="
        send_notification "SSL Renewal Success" "SSL certificates for $DOMAINS have been renewed successfully"
    else
        error_exit "Certificate renewal process failed"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-nginx-test)
            NGINX_CONFIG_TEST=false
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --dry-run        Run renewal in test mode"
            echo "  --no-nginx-test  Skip nginx configuration test"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"