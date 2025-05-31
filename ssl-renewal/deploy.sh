#!/bin/bash

# Quick Deployment Script for SSL Renewal Automation
# This script helps deploy the SSL renewal automation to your server

set -euo pipefail

# Configuration
REMOTE_USER="root"
REMOTE_HOST=""
REMOTE_PATH="/opt/ssl-renewal"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
show_usage() {
    echo "Usage: $0 [user@]hostname"
    echo
    echo "Examples:"
    echo "  $0 root@arzani.co.uk"
    echo "  $0 ubuntu@192.168.1.100"
    echo "  $0 myserver.com"
    echo
    echo "This script will:"
    echo "  1. Copy SSL renewal scripts to the server"
    echo "  2. Set up the cron job for automatic renewal"
    echo "  3. Test the complete setup"
    echo "  4. Provide next steps and monitoring instructions"
    echo
}

# Parse server argument
parse_server() {
    local server="$1"
    
    if [[ "$server" == *"@"* ]]; then
        REMOTE_USER="${server%@*}"
        REMOTE_HOST="${server#*@}"
    else
        REMOTE_HOST="$server"
    fi
    
    log "Target server: $REMOTE_USER@$REMOTE_HOST"
    log "Remote path: $REMOTE_PATH"
}

# Test SSH connection
test_ssh_connection() {
    log "Testing SSH connection..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE_USER@$REMOTE_HOST" 'echo "SSH connection successful"' 2>/dev/null; then
        success "SSH connection test passed"
    else
        error "Cannot connect to $REMOTE_USER@$REMOTE_HOST"
        echo "Please ensure:"
        echo "  1. SSH key authentication is set up"
        echo "  2. Server is accessible"
        echo "  3. User has sudo privileges"
        exit 1
    fi
}

# Check prerequisites on server
check_server_prerequisites() {
    log "Checking server prerequisites..."
    
    # Create a script to check prerequisites
    local check_script=$(cat << 'EOF'
#!/bin/bash
echo "=== Server Prerequisites Check ==="

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
    echo "ERROR: Need root access or passwordless sudo"
    exit 1
fi

# Check for certbot
if ! command -v certbot &> /dev/null; then
    echo "WARNING: certbot not found - will need to install"
    CERTBOT_MISSING=1
fi

# Check for nginx
if ! command -v nginx &> /dev/null; then
    echo "ERROR: nginx not found"
    exit 1
fi

# Check for certificates
if [[ ! -d "/etc/letsencrypt/live/arzani.co.uk" ]]; then
    echo "ERROR: SSL certificates not found for arzani.co.uk"
    exit 1
fi

echo "SUCCESS: Prerequisites check passed"
exit 0
EOF
)
    
    if ssh "$REMOTE_USER@$REMOTE_HOST" "$check_script"; then
        success "Server prerequisites check passed"
    else
        error "Server prerequisites check failed"
        exit 1
    fi
}

# Deploy scripts to server
deploy_scripts() {
    log "Creating remote directory..."
    ssh "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $REMOTE_PATH"
    
    log "Copying scripts to server..."
    
    local files=(
        "renew-ssl.sh"
        "setup-cron.sh"
        "test-setup.sh"
        "check-status.sh"
        "config.conf"
        "README.md"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$LOCAL_DIR/$file" ]]; then
            log "Copying $file..."
            scp "$LOCAL_DIR/$file" "$REMOTE_USER@$REMOTE_HOST:/tmp/"
            ssh "$REMOTE_USER@$REMOTE_HOST" "sudo mv /tmp/$file $REMOTE_PATH/ && sudo chmod +x $REMOTE_PATH/*.sh 2>/dev/null || true"
        else
            error "Local file not found: $file"
        fi
    done
    
    success "Scripts deployed successfully"
}

# Set up automation on server
setup_automation() {
    log "Setting up SSL renewal automation..."
    
    local setup_script=$(cat << EOF
#!/bin/bash
cd $REMOTE_PATH
sudo ./setup-cron.sh
EOF
)
    
    if ssh "$REMOTE_USER@$REMOTE_HOST" "$setup_script"; then
        success "Automation setup completed"
    else
        error "Automation setup failed"
        return 1
    fi
}

# Run tests on server
run_tests() {
    log "Running comprehensive tests..."
    
    local test_script=$(cat << EOF
#!/bin/bash
cd $REMOTE_PATH
sudo ./test-setup.sh
EOF
)
    
    if ssh "$REMOTE_USER@$REMOTE_HOST" "$test_script"; then
        success "All tests passed"
    else
        error "Some tests failed - please review the output"
        return 1
    fi
}

# Check status on server
check_status() {
    log "Checking SSL certificate status..."
    
    local status_script=$(cat << EOF
#!/bin/bash
cd $REMOTE_PATH
sudo ./check-status.sh
EOF
)
    
    ssh "$REMOTE_USER@$REMOTE_HOST" "$status_script"
}

# Show completion summary
show_completion_summary() {
    echo
    success "=== SSL Renewal Automation Deployment Complete ==="
    echo
    echo "What was set up:"
    echo "  ✓ SSL renewal scripts deployed to $REMOTE_PATH"
    echo "  ✓ Cron job configured (runs twice daily)"
    echo "  ✓ Logging configured (/var/log/ssl-renewal.log)"
    echo "  ✓ All tests passed"
    echo
    echo "Next steps:"
    echo "  1. Monitor the first renewal attempt in the logs"
    echo "  2. Set up email notifications (edit config.conf)"
    echo "  3. Review logs periodically"
    echo
    echo "Useful commands on the server:"
    echo "  • Check status: sudo $REMOTE_PATH/check-status.sh"
    echo "  • View logs: sudo tail -f /var/log/ssl-renewal.log"
    echo "  • Test renewal: sudo $REMOTE_PATH/renew-ssl.sh --dry-run"
    echo "  • Manual renewal: sudo $REMOTE_PATH/renew-ssl.sh"
    echo
    echo "Your certificates expire on June 14, 2025 - they will now renew automatically!"
}

# Main deployment function
main() {
    echo "=== SSL Certificate Renewal Automation Deployment ==="
    echo
    
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 1
    fi
    
    local server="$1"
    parse_server "$server"
    
    # Run deployment steps
    test_ssh_connection
    check_server_prerequisites
    deploy_scripts
    setup_automation
    
    if run_tests; then
        check_status
        show_completion_summary
    else
        error "Deployment completed but tests failed. Please review and fix issues."
        echo "You can run tests manually: ssh $REMOTE_USER@$REMOTE_HOST 'sudo $REMOTE_PATH/test-setup.sh'"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            exit 0
            ;;
        --*)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            main "$@"
            exit 0
            ;;
    esac
done

# If no arguments provided
show_usage
exit 1
