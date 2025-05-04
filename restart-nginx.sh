#!/bin/bash

# Test the Nginx configuration first
echo "Testing Nginx configuration..."
sudo nginx -t

# If the test passes, reload Nginx to apply changes without downtime
if [ $? -eq 0 ]; then
    echo "Configuration test successful. Reloading Nginx..."
    sudo systemctl reload nginx
    # Or use this on systems without systemd
    # sudo service nginx reload
    
    echo "Nginx reloaded successfully."
    echo "Checking if client_max_body_size is properly applied:"
    sudo nginx -T | grep client_max_body_size
else
    echo "Configuration test failed. Please fix the errors before reloading."
fi
