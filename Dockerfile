FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./

# Install build dependencies for canvas first
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Copy scripts for postinstall hook
COPY scripts ./scripts

# Install production dependencies with unsafe-perm
RUN npm ci --only=production --unsafe-perm

# Copy app source
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "app.js"]
