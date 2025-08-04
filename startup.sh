#!/bin/bash

# Cloud Run Startup Script
# This script runs before the main application to ensure everything is configured correctly

set -e

echo "🚀 CLOUD RUN STARTUP SCRIPT"
echo "============================"

# Function to log with timestamp
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting Cloud Run container startup script..."

# 1. Environment validation
log "📊 Validating environment variables..."
if [ -z "$DATABASE_URL" ]; then
    log "❌ DATABASE_URL is not set"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    log "❌ JWT_SECRET is not set"
    exit 1
fi

log "✅ Required environment variables are set"

# 2. File system validation
log "📁 Validating critical files..."
CRITICAL_FILES=(
    "package.json"
    "server.js"
    "db.js"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log "❌ Critical file missing: $file"
        exit 1
    fi
done

log "✅ All critical files present"

# 3. Database connection pre-check
log "🗄️ Testing database configuration..."
if echo "$DATABASE_URL" | grep -q "cloudsql"; then
    log "✅ Cloud SQL configuration detected"
    
    # Check if Cloud SQL proxy socket directory exists
    SOCKET_DIR="/cloudsql"
    if [ -d "$SOCKET_DIR" ]; then
        log "✅ Cloud SQL proxy socket directory exists"
    else
        log "⚠️ Cloud SQL proxy socket directory not found at $SOCKET_DIR"
    fi
else
    log "⚠️ No Cloud SQL configuration detected in DATABASE_URL"
fi

# 4. Port configuration
PORT=${PORT:-8080}
log "🌐 Server will listen on port: $PORT"

# 5. Node.js environment check
log "📦 Node.js version: $(node --version)"
log "📦 NPM version: $(npm --version)"

# 6. Run startup diagnostic
log "🔍 Running startup diagnostic..."
if node container-startup-diagnostic.js --health-check; then
    log "✅ Startup diagnostic passed"
else
    log "⚠️ Startup diagnostic completed with warnings (continuing...)"
fi

# 7. Pre-warm the application
log "🏥 Pre-warming application..."
# This helps reduce cold start times by loading modules early

log "🎯 Starting main application..."

# Execute the main command
exec "$@"
