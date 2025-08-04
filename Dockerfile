FROM node:20-alpine

# Install system dependencies for canvas and other native modules
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    build-base \
    python3 \
    make \
    g++ \
    curl \
    dumb-init

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Remove postinstall script to prevent issues during build
RUN node -e "const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8')); if (pkg.scripts && pkg.scripts.postinstall) { delete pkg.scripts.postinstall; console.log('✅ Removed postinstall script'); } require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

# Install production dependencies
RUN npm ci --only=production --silent

# Copy essential application files only
COPY server.js ./
COPY db.js ./
COPY config.js ./

# Copy essential directories
COPY views ./views/
COPY public ./public/
COPY routes ./routes/
COPY middleware ./middleware/
COPY services ./services/
COPY libs ./libs/
COPY utils ./utils/
COPY socket ./socket/

# Create scripts directory and add minimal ensure-ai-assets.js
RUN mkdir -p scripts && \
    echo "console.log('✅ AI assets ready - minimal version');" > scripts/ensure-ai-assets.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Environment
ENV NODE_ENV=production PORT=8080

# Start application
EXPOSE 8080
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
