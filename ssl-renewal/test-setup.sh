#!/bin/bash

# SSL Certificate Renewal Test Script
# This script tests the SSL renewal setup and validates configuration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENEWAL_SCRIPT="$SCRIPT_DIR/renew-ssl.sh"
CONFIG_FILE="$SCRIPT_DIR/config.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

log() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    ((TESTS_TOTAL++))
    
    log "Running test: $test_name"
    
    if eval "$test_command"; then
        pass "$test_name"
        return 0
    else
        fail "$test_name"
        return 1
    fi
}

# Test 1: Check if files exist
test_files_exist() {
    [[ -f "$RENEWAL_SCRIPT" ]] && [[ -f "$CONFIG_FILE" ]]
}

# Test 2: Check script permissions
test_script_permissions() {
    [[ -x "$RENEWAL_SCRIPT" ]]
}

# Test 3: Check if certbot is available
test_certbot_available() {
    command -v certbot &> /dev/null
}

# Test 4: Check if nginx is available
test_nginx_available() {
    command -v nginx &> /dev/null
}

# Test 5: Check if certificates exist
test_certificates_exist() {
    [[ -d "/etc/letsencrypt/live/arzani.co.uk" ]] && [[ -f "/etc/letsencrypt/live/arzani.co.uk/cert.pem" ]]
}

# Test 6: Check certificate expiration
test_certificate_expiration() {
    if [[ ! -f "/etc/letsencrypt/live/arzani.co.uk/cert.pem" ]]; then
        return 1
    fi
    
    local cert_file="/etc/letsencrypt/live/arzani.co.uk/cert.pem"
    local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    log "Certificate expires in $days_until_expiry days ($expiry_date)"
    
    if [[ $days_until_expiry -lt 0 ]]; then
        fail "Certificate has already expired!"
        return 1
    elif [[ $days_until_expiry -lt 30 ]]; then
        warning "Certificate expires in less than 30 days"
    fi
    
    return 0
}

# Test 7: Check nginx configuration
test_nginx_config() {
    if command -v nginx &> /dev/null; then
        nginx -t 2>/dev/null
    else
        return 1
    fi
}

# Test 8: Test SSL connection
test_ssl_connection() {
    local domains=("arzani.co.uk" "www.arzani.co.uk")
    local all_passed=true
    
    for domain in "${domains[@]}"; do
        log "Testing SSL connection to $domain"
        if timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            pass "SSL connection test for $domain"
        else
            fail "SSL connection test for $domain"
            all_passed=false
        fi
    done
    
    $all_passed
}

# Test 9: Check cron job
test_cron_job() {
    if [[ $EUID -eq 0 ]]; then
        crontab -l 2>/dev/null | grep -q "$RENEWAL_SCRIPT"
    else
        warning "Not running as root - cannot check cron job"
        return 0
    fi
}

# Test 10: Dry run renewal
test_dry_run_renewal() {
    if [[ $EUID -eq 0 ]]; then
        "$RENEWAL_SCRIPT" --dry-run 2>/dev/null
    else
        warning "Not running as root - cannot test renewal"
        return 0
    fi
}

# Test 11: Check log file permissions
test_log_permissions() {
    local log_file="/var/log/ssl-renewal.log"
    if [[ -f "$log_file" ]]; then
        [[ -w "$log_file" ]]
    else
        # Log file doesn't exist yet, which is okay
        [[ -w "/var/log" ]]
    fi
}

# Test 12: Validate configuration file
test_config_file() {
    if [[ -f "$CONFIG_FILE" ]]; then
        # Check if config file can be sourced without errors
        bash -n "$CONFIG_FILE" 2>/dev/null
    else
        return 1
    fi
}

# Display system information
show_system_info() {
    echo
    log "=== System Information ==="
    echo "Date: $(date)"
    echo "User: $(whoami)"
    echo "OS: $(uname -s)"
    echo "Distribution: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
    
    if command -v certbot &> /dev/null; then
        echo "Certbot version: $(certbot --version 2>/dev/null | head -1)"
    else
        echo "Certbot: Not installed"
    fi
    
    if command -v nginx &> /dev/null; then
        echo "Nginx version: $(nginx -v 2>&1 | head -1)"
    else
        echo "Nginx: Not installed"
    fi
    
    echo "OpenSSL version: $(openssl version 2>/dev/null || echo 'Not available')"
    echo
}

# Show certificate information
show_certificate_info() {
    echo
    log "=== Certificate Information ==="
    
    if [[ -f "/etc/letsencrypt/live/arzani.co.uk/cert.pem" ]]; then
        local cert_file="/etc/letsencrypt/live/arzani.co.uk/cert.pem"
        
        echo "Certificate file: $cert_file"
        echo "Issuer: $(openssl x509 -in "$cert_file" -noout -issuer | cut -d= -f2-)"
        echo "Subject: $(openssl x509 -in "$cert_file" -noout -subject | cut -d= -f2-)"
        echo "Valid from: $(openssl x509 -in "$cert_file" -noout -startdate | cut -d= -f2)"
        echo "Valid until: $(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)"
        
        # Calculate days until expiry
        local expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        echo "Days until expiry: $days_until_expiry"
        
        echo "Subject Alternative Names:"
        openssl x509 -in "$cert_file" -noout -text | grep -A1 "Subject Alternative Name" | tail -1 | sed 's/^[[:space:]]*/  /'
    else
        echo "Certificate file not found: /etc/letsencrypt/live/arzani.co.uk/cert.pem"
    fi
    echo
}

# Main test function
run_all_tests() {
    echo "=== SSL Certificate Renewal Test Suite ==="
    echo
    
    # Run all tests
    run_test "Files exist" "test_files_exist"
    run_test "Script permissions" "test_script_permissions"
    run_test "Certbot available" "test_certbot_available"
    run_test "Nginx available" "test_nginx_available"
    run_test "Certificates exist" "test_certificates_exist"
    run_test "Certificate expiration check" "test_certificate_expiration"
    run_test "Nginx configuration" "test_nginx_config"
    run_test "SSL connections" "test_ssl_connection"
    run_test "Cron job setup" "test_cron_job"
    run_test "Dry run renewal" "test_dry_run_renewal"
    run_test "Log file permissions" "test_log_permissions"
    run_test "Configuration file" "test_config_file"
    
    echo
    log "=== Test Results ==="
    echo "Total tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        pass "All tests passed! SSL renewal setup is ready."
        return 0
    else
        fail "$TESTS_FAILED test(s) failed. Please review the setup."
        return 1
    fi
}

# Parse command line arguments
SHOW_INFO=false
RUN_TESTS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --info-only)
            SHOW_INFO=true
            RUN_TESTS=false
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --info-only  Show system and certificate information only"
            echo "  --help       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
show_system_info
show_certificate_info

if [[ "$RUN_TESTS" == "true" ]]; then
    if run_all_tests; then
        exit 0
    else
        exit 1
    fi
fi
