#!/bin/bash
# Script to deploy Nginx configuration in production environment

echo "==================================================="
echo "    Deploying Nginx configuration to production    "
echo "==================================================="

# Define variables
NGINX_CONF_SOURCE="./conf/nginx.conf"
NGINX_CONF_DEST="/etc/nginx/conf.d/marketplace.conf"
NGINX_DEFAULT_CONF="/etc/nginx/nginx.conf"

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root or with sudo"
  exit 1
fi

# Check if the source configuration file exists
if [ ! -f "$NGINX_CONF_SOURCE" ]; then
  echo "Error: Configuration file not found: $NGINX_CONF_SOURCE"
  exit 1
fi

# Create a backup of existing configuration if it exists
if [ -f "$NGINX_CONF_DEST" ]; then
  backup_file="${NGINX_CONF_DEST}.backup-$(date +%Y%m%d-%H%M%S)"
  echo "Creating backup of existing configuration: $backup_file"
  cp "$NGINX_CONF_DEST" "$backup_file"
fi

# Copy the new configuration
echo "Copying configuration to $NGINX_CONF_DEST"
cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_DEST"

# Check if we need to modify the main nginx.conf
if ! grep -q "client_max_body_size 25M;" "$NGINX_DEFAULT_CONF"; then
  echo "Adding client_max_body_size directive to main Nginx configuration"
  # Insert the client_max_body_size directive after the http { line
  sed -i '/http {/a \    client_max_body_size 25M;' "$NGINX_DEFAULT_CONF"
fi

# Test the Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# If the test was successful, reload Nginx
if [ $? -eq 0 ]; then
  echo "Configuration test successful. Reloading Nginx..."
  systemctl reload nginx
  echo "Nginx configuration deployed successfully!"
else
  echo "Error: Nginx configuration test failed. Please check the syntax."
  exit 1
fi

echo ""
echo "Done! Your upload size limit has been increased to 25MB."