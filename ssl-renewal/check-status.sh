#!/bin/bash

# SSL Certificate Status Check Script
# Provides detailed information about SSL certificate status and renewal readiness

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
DOMAINS=("arzani.co.uk" "www.arzani.co.uk")
CERT_PATH="/etc/letsencrypt/live/arzani.co.uk"

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo -e "\n${BOLD}=== $1 ===${NC}"
}

# Check certificate files
check_certificate_files() {
    header "Certificate Files Status"
    
    local files=(
        "cert.pem:Certificate file"
        "privkey.pem:Private key"
        "fullchain.pem:Full certificate chain"
        "chain.pem:Certificate chain"
    )
    
    for file_info in "${files[@]}"; do
        IFS=':' read -ra PARTS <<< "$file_info"
        local file="${PARTS[0]}"
        local description="${PARTS[1]}"
        local full_path="$CERT_PATH/$file"
        
        if [[ -f "$full_path" ]]; then
            local size=$(stat -c%s "$full_path" 2>/dev/null || echo "unknown")
            local modified=$(stat -c%y "$full_path" 2>/dev/null | cut -d' ' -f1 || echo "unknown")
            success "$description: $full_path (${size} bytes, modified: $modified)"
        else
            error "$description: Missing - $full_path"
        fi
    done
}

# Check certificate expiration
check_certificate_expiration() {
    header "Certificate Expiration Status"
    
    local cert_file="$CERT_PATH/cert.pem"
    
    if [[ ! -f "$cert_file" ]]; then
        error "Certificate file not found: $cert_file"
        return 1
    fi
    
    # Get certificate information
    local subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null | sed 's/subject=//')
    local issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    local start_date=$(openssl x509 -in "$cert_file" -noout -startdate 2>/dev/null | cut -d= -f2)
    local end_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
    
    echo "Subject: $subject"
    echo "Issuer: $issuer"
    echo "Valid from: $start_date"
    echo "Valid until: $end_date"
    
    # Calculate days until expiry
    local expiry_epoch=$(date -d "$end_date" +%s 2>/dev/null || echo "0")
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    echo "Days until expiry: $days_until_expiry"
    
    if [[ $days_until_expiry -lt 0 ]]; then
        error "Certificate has EXPIRED!"
        return 1
    elif [[ $days_until_expiry -lt 7 ]]; then
        error "Certificate expires in less than 7 days - URGENT renewal needed!"
    elif [[ $days_until_expiry -lt 30 ]]; then
        warning "Certificate expires in less than 30 days - renewal recommended"
    else
        success "Certificate is valid for $days_until_expiry more days"
    fi
    
    # Check SAN (Subject Alternative Names)
    echo -e "\nSubject Alternative Names:"
    local san=$(openssl x509 -in "$cert_file" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/^[[:space:]]*//' || echo "None found")
    echo "  $san"
}

# Test SSL connections
test_ssl_connections() {
    header "SSL Connection Tests"
    
    for domain in "${DOMAINS[@]}"; do
        echo -e "\nTesting: $domain"
        
        # Test SSL connection
        if timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            success "SSL connection successful"
            
            # Get certificate info from live connection
            local live_cert_info=$(timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "Failed to get info")
            echo "  Live certificate expires: $live_cert_info"
            
            # Test HTTPS redirect
            local redirect_test=$(curl -s -I -L "http://$domain" 2>/dev/null | head -1 || echo "Failed")
            if echo "$redirect_test" | grep -q "200"; then
                success "HTTPS redirect working"
            else
                warning "HTTPS redirect test inconclusive: $redirect_test"
            fi
            
        else
            error "SSL connection failed for $domain"
        fi
    done
}

# Check certbot status
check_certbot_status() {
    header "Certbot Status"
    
    if command -v certbot &> /dev/null; then
        success "Certbot is installed"
        echo "Version: $(certbot --version 2>&1 | head -1)"
        
        # List certificates
        echo -e "\nManaged certificates:"
        if sudo certbot certificates 2>/dev/null; then
            success "Certificate list retrieved successfully"
        else
            warning "Could not retrieve certificate list (may require sudo)"
        fi
        
        # Check if renewal is needed
        echo -e "\nRenewal check:"
        if sudo certbot renew --dry-run --quiet 2>/dev/null; then
            success "Dry-run renewal test passed"
        else
            warning "Dry-run renewal test failed or requires attention"
        fi
        
    else
        error "Certbot is not installed or not in PATH"
    fi
}

# Check nginx status
check_nginx_status() {
    header "Nginx Status"
    
    if command -v nginx &> /dev/null; then
        success "Nginx is installed"
        echo "Version: $(nginx -v 2>&1)"
        
        # Check if nginx is running
        if systemctl is-active --quiet nginx 2>/dev/null; then
            success "Nginx service is running"
        else
            warning "Nginx service is not running"
        fi
        
        # Test configuration
        if nginx -t 2>/dev/null; then
            success "Nginx configuration is valid"
        else
            error "Nginx configuration has errors"
        fi
        
        # Check SSL configuration
        echo -e "\nSSL configuration check:"
        if grep -q "ssl_certificate.*arzani.co.uk" /etc/nginx/nginx.conf 2>/dev/null; then
            success "SSL certificate configuration found in nginx.conf"
        else
            warning "SSL certificate configuration not found in main nginx.conf (may be in site-specific config)"
        fi
        
    else
        error "Nginx is not installed or not in PATH"
    fi
}

# Check automation status
check_automation_status() {
    header "Automation Status"
    
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local renewal_script="$script_dir/renew-ssl.sh"
    
    # Check if renewal script exists
    if [[ -f "$renewal_script" ]]; then
        success "Renewal script found: $renewal_script"
        
        if [[ -x "$renewal_script" ]]; then
            success "Renewal script is executable"
        else
            warning "Renewal script is not executable"
        fi
    else
        error "Renewal script not found: $renewal_script"
    fi
    
    # Check cron job
    if [[ $EUID -eq 0 ]]; then
        echo -e "\nCron job status:"
        if crontab -l 2>/dev/null | grep -q "renew-ssl.sh"; then
            success "SSL renewal cron job is configured"
            echo "Cron entries:"
            crontab -l 2>/dev/null | grep "renew-ssl.sh" | sed 's/^/  /'
        else
            warning "No SSL renewal cron job found"
        fi
    else
        warning "Not running as root - cannot check cron jobs"
    fi
    
    # Check log file
    local log_file="/var/log/ssl-renewal.log"
    if [[ -f "$log_file" ]]; then
        success "Log file exists: $log_file"
        local log_size=$(stat -c%s "$log_file" 2>/dev/null || echo "0")
        local last_modified=$(stat -c%y "$log_file" 2>/dev/null | cut -d'.' -f1 || echo "unknown")
        echo "  Size: $log_size bytes"
        echo "  Last modified: $last_modified"
        
        if [[ $log_size -gt 0 ]]; then
            echo -e "\nRecent log entries:"
            tail -5 "$log_file" 2>/dev/null | sed 's/^/  /' || echo "  Could not read log file"
        fi
    else
        warning "Log file not found: $log_file"
    fi
}

# Generate summary
generate_summary() {
    header "Summary and Recommendations"
    
    local cert_file="$CERT_PATH/cert.pem"
    
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        echo "Current Status:"
        echo "  • Certificate expires in: $days_until_expiry days ($expiry_date)"
        
        if [[ $days_until_expiry -lt 0 ]]; then
            echo -e "  • ${RED}STATUS: EXPIRED - IMMEDIATE ACTION REQUIRED${NC}"
            echo
            echo "Immediate Actions:"
            echo "  1. Run: sudo certbot renew --force-renewal"
            echo "  2. Run: sudo systemctl reload nginx"
            echo "  3. Verify: curl -I https://arzani.co.uk"
        elif [[ $days_until_expiry -lt 7 ]]; then
            echo -e "  • ${RED}STATUS: CRITICAL - Expires within 7 days${NC}"
            echo
            echo "Urgent Actions:"
            echo "  1. Set up automatic renewal immediately"
            echo "  2. Test renewal: sudo /path/to/renew-ssl.sh --dry-run"
            echo "  3. Monitor renewal attempts closely"
        elif [[ $days_until_expiry -lt 30 ]]; then
            echo -e "  • ${YELLOW}STATUS: WARNING - Expires within 30 days${NC}"
            echo
            echo "Recommended Actions:"
            echo "  1. Complete automatic renewal setup"
            echo "  2. Test the setup: sudo ./test-setup.sh"
            echo "  3. Monitor first automated renewal"
        else
            echo -e "  • ${GREEN}STATUS: OK - Certificate is valid${NC}"
            echo
            echo "Maintenance Tasks:"
            echo "  1. Ensure automatic renewal is working"
            echo "  2. Review logs periodically"
            echo "  3. Test renewal process quarterly"
        fi
    else
        echo -e "  • ${RED}STATUS: NO CERTIFICATE FOUND${NC}"
        echo
        echo "Setup Required:"
        echo "  1. Obtain SSL certificate: sudo certbot --nginx -d arzani.co.uk -d www.arzani.co.uk"
        echo "  2. Set up automatic renewal"
        echo "  3. Test the complete setup"
    fi
    
    echo
    echo "Next Steps:"
    echo "  • Deploy automation scripts to server"
    echo "  • Run: sudo ./setup-cron.sh"
    echo "  • Test: sudo ./test-setup.sh"
    echo "  • Monitor: tail -f /var/log/ssl-renewal.log"
}

# Main function
main() {
    echo -e "${BOLD}SSL Certificate Status Report${NC}"
    echo "Generated: $(date)"
    echo "Domains: ${DOMAINS[*]}"
    echo
    
    check_certificate_files
    check_certificate_expiration
    test_ssl_connections
    check_certbot_status
    check_nginx_status
    check_automation_status
    generate_summary
    
    echo
    log "Status check complete!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --help      Show this help message"
            echo
            echo "This script provides a comprehensive status check of SSL certificates"
            echo "and renewal automation for arzani.co.uk and www.arzani.co.uk"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
