#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    
    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    if [ -n "$key" ] && [ -n "$value" ]; then
      echo "Adding secret: $key"
      gh secret set "$key" -b "$value" --repo "your-username/my-marketplace-project"
    fi
  done < .env
  echo "Secrets synchronized successfully!"
else
  echo "Error: .env file not found!"
  exit 1
fi
