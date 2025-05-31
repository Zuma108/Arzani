#!/bin/bash

# SSL Certificate Renewal Cron Setup Script
# This script sets up automatic SSL certificate renewal using cron

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENEWAL_SCRIPT="$SCRIPT_DIR/renew-ssl.sh"
CRON_USER="root"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [[ ! -f "$RENEWAL_SCRIPT" ]]; then
        error "Renewal script not found: $RENEWAL_SCRIPT"
        exit 1
    fi
    
    if ! command -v crontab &> /dev/null; then
        error "crontab command not found. Please install cron."
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Make renewal script executable
make_executable() {
    log "Making renewal script executable..."
    chmod +x "$RENEWAL_SCRIPT"
    log "Renewal script is now executable"
}

# Create log directory
setup_logging() {
    log "Setting up logging..."
    
    local log_dir="/var/log"
    if [[ ! -d "$log_dir" ]]; then
        mkdir -p "$log_dir"
    fi
    
    # Create log file with proper permissions
    touch "/var/log/ssl-renewal.log"
    chmod 644 "/var/log/ssl-renewal.log"
    
    log "Log file created: /var/log/ssl-renewal.log"
}

# Setup logrotate for SSL renewal logs
setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/ssl-renewal << 'EOF'
/var/log/ssl-renewal.log {
    weekly
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
    
    log "Log rotation configured"
}

# Add cron job
setup_cron() {
    log "Setting up cron job..."
    
    # Define cron job - runs twice daily at 2:30 AM and 2:30 PM
    local cron_job="30 2,14 * * * $RENEWAL_SCRIPT >> /var/log/ssl-renewal.log 2>&1"
    
    # Check if cron job already exists
    if crontab -u "$CRON_USER" -l 2>/dev/null | grep -F "$RENEWAL_SCRIPT" > /dev/null; then
        warning "Cron job for SSL renewal already exists"
        
        echo "Current cron jobs containing SSL renewal script:"
        crontab -u "$CRON_USER" -l 2>/dev/null | grep -F "$RENEWAL_SCRIPT" || true
        
        read -p "Do you want to replace the existing cron job? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Keeping existing cron job"
            return 0
        fi
        
        # Remove existing cron job
        log "Removing existing cron job..."
        (crontab -u "$CRON_USER" -l 2>/dev/null | grep -v -F "$RENEWAL_SCRIPT") | crontab -u "$CRON_USER" -
    fi
    
    # Add new cron job
    log "Adding new cron job..."
    (crontab -u "$CRON_USER" -l 2>/dev/null; echo "$cron_job") | crontab -u "$CRON_USER" -
    
    log "Cron job added successfully"
    log "SSL certificates will be checked for renewal twice daily at 2:30 AM and 2:30 PM"
}

# Test cron job
test_cron() {
    log "Testing cron setup..."
    
    # Verify cron job exists
    if crontab -u "$CRON_USER" -l 2>/dev/null | grep -F "$RENEWAL_SCRIPT" > /dev/null; then
        log "✓ Cron job is properly configured"
    else
        error "✗ Cron job was not added correctly"
        return 1
    fi
    
    # Test renewal script with dry-run
    log "Testing renewal script with dry-run..."
    if "$RENEWAL_SCRIPT" --dry-run; then
        log "✓ Renewal script test passed"
    else
        warning "✗ Renewal script test failed - please check the configuration"
        return 1
    fi
}

# Display summary
show_summary() {
    echo
    log "=== SSL Certificate Renewal Setup Complete ==="
    echo
    echo "Configuration Summary:"
    echo "  • Renewal script: $RENEWAL_SCRIPT"
    echo "  • Cron schedule: Twice daily (2:30 AM and 2:30 PM)"
    echo "  • Log file: /var/log/ssl-renewal.log"
    echo "  • Log rotation: Weekly, keep 52 weeks"
    echo
    echo "Next Steps:"
    echo "  1. Review the configuration in $SCRIPT_DIR/config.conf"
    echo "  2. Set up email notifications by editing EMAIL_ALERT in config.conf"
    echo "  3. Monitor the first few renewal attempts in the log file"
    echo "  4. Test manual renewal: sudo $RENEWAL_SCRIPT --dry-run"
    echo
    echo "Current cron jobs for SSL renewal:"
    crontab -u "$CRON_USER" -l 2>/dev/null | grep -F "$RENEWAL_SCRIPT" || echo "  No cron jobs found"
    echo
}

# Main function
main() {
    echo "=== SSL Certificate Renewal Cron Setup ==="
    echo
    
    check_root
    check_prerequisites
    make_executable
    setup_logging
    setup_logrotate
    setup_cron
    
    if test_cron; then
        show_summary
        log "Setup completed successfully!"
    else
        error "Setup completed with warnings. Please review the configuration."
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --remove)
            log "Removing SSL renewal cron job..."
            if crontab -u "$CRON_USER" -l 2>/dev/null | grep -F "$RENEWAL_SCRIPT" > /dev/null; then
                (crontab -u "$CRON_USER" -l 2>/dev/null | grep -v -F "$RENEWAL_SCRIPT") | crontab -u "$CRON_USER" -
                log "Cron job removed"
            else
                warning "No SSL renewal cron job found"
            fi
            exit 0
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --remove    Remove the SSL renewal cron job"
            echo "  --help      Show this help message"
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
