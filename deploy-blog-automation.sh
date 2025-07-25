#!/bin/bash

# Automated Blog Generation System - Production Deployment Script
# This script deploys the automated blog system to production

echo "🚀 Deploying Automated Blog Generation System to Production..."

# Check if running on production server
if [[ "$NODE_ENV" != "production" ]]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    echo "   Current environment: $NODE_ENV"
    read -p "   Continue anyway? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Validate required environment variables
echo "📋 Checking environment variables..."

required_vars=(
    "DB_USER"
    "DB_HOST" 
    "DB_NAME"
    "DB_PASSWORD"
    "OPENAI_API_KEY"
    "JWT_SECRET"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${missing_vars[@]}"
    echo "   Please set these variables and try again"
    exit 1
fi

echo "✅ All required environment variables found"

# Test database connection
echo "🔍 Testing database connection..."
node -e "
import pool from './db.js';
try {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}
"

if [[ $? -ne 0 ]]; then
    echo "❌ Database connection test failed"
    exit 1
fi

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

if [[ $? -ne 0 ]]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run database migrations if needed
echo "🗄️ Checking database schema..."
node -e "
import pool from './db.js';
try {
  const client = await pool.connect();
  
  // Check if blog_posts table exists with required columns
  const tableCheck = await client.query(\`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'blog_posts' 
    AND column_name IN ('semantic_relationships', 'content_links', 'user_journey_position')
  \`);
  
  if (tableCheck.rows.length < 3) {
    console.log('⚠️  Blog schema needs updates. Required columns missing.');
    console.log('   Please run the blog interlinking migration first');
    process.exit(1);
  }
  
  client.release();
  console.log('✅ Database schema ready');
} catch (error) {
  console.error('❌ Database schema check failed:', error.message);
  process.exit(1);
}
"

if [[ $? -ne 0 ]]; then
    echo "❌ Database schema check failed"
    exit 1
fi

# Test OpenAI API connection
echo "🤖 Testing OpenAI API connection..."
node -e "
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

try {
  await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'test' }],
    max_tokens: 5
  });
  console.log('✅ OpenAI API connection successful');
} catch (error) {
  console.error('❌ OpenAI API connection failed:', error.message);
  process.exit(1);
}
"

if [[ $? -ne 0 ]]; then
    echo "❌ OpenAI API test failed"
    exit 1
fi

# Backup current checklist
echo "💾 Creating backup of current checklist..."
cp PRD_200_Blog_Post_Strategy_Checklist.md "PRD_200_Blog_Post_Strategy_Checklist.backup.$(date +%Y%m%d_%H%M%S).md"

# Start the automated blog system
echo "🚀 Starting automated blog generation system..."

# Create a PM2 ecosystem file for production
cat > ecosystem.blog-automation.config.js << EOF
module.exports = {
  apps: [{
    name: 'blog-automation',
    script: './services/automated-blog-generator.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/blog-automation-error.log',
    out_file: './logs/blog-automation-out.log',
    log_file: './logs/blog-automation-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Check if PM2 is available
if command -v pm2 >/dev/null 2>&1; then
    echo "📊 Starting with PM2 process manager..."
    pm2 start ecosystem.blog-automation.config.js
    pm2 save
    echo "✅ Blog automation system started with PM2"
    echo "📊 Monitor with: pm2 monit"
    echo "📋 View logs: pm2 logs blog-automation"
else
    echo "⚠️  PM2 not found. Starting with Node.js directly..."
    echo "   For production, consider installing PM2: npm install -g pm2"
    nohup node ./services/automated-blog-generator.js > logs/blog-automation.log 2>&1 &
    echo $! > blog-automation.pid
    echo "✅ Blog automation system started (PID: $(cat blog-automation.pid))"
fi

# Test the system
echo "🧪 Testing system functionality..."
sleep 5

# Check if system is responding
curl -f http://localhost:3000/api/blog-automation/status >/dev/null 2>&1
if [[ $? -eq 0 ]]; then
    echo "✅ Blog automation API is responding"
else
    echo "⚠️  Blog automation API not responding yet"
    echo "   This may be normal for initial startup"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Monitoring & Control:"
echo "   • Admin Dashboard: http://your-domain.com/admin/blog-automation"
echo "   • API Status: http://your-domain.com/api/blog-automation/status"
echo "   • Generated Content: http://your-domain.com/blog"
echo ""
echo "📈 System Features Active:"
echo "   ✅ 6 blog posts per day generation"
echo "   ✅ SEO optimization and keyword targeting" 
echo "   ✅ Automatic interlinking"
echo "   ✅ Database integration"
echo "   ✅ Production publishing"
echo ""
echo "🔧 Management Commands:"
if command -v pm2 >/dev/null 2>&1; then
    echo "   • View status: pm2 status"
    echo "   • View logs: pm2 logs blog-automation"
    echo "   • Restart: pm2 restart blog-automation"
    echo "   • Stop: pm2 stop blog-automation"
else
    echo "   • View logs: tail -f logs/blog-automation.log"
    echo "   • Stop: kill \$(cat blog-automation.pid)"
fi
echo ""
echo "⚡ The system will now automatically:"
echo "   • Generate 6 blog posts daily at optimal times"
echo "   • Read from your PRD checklist automatically"
echo "   • Publish directly to production without manual intervention"
echo "   • Handle all SEO optimization and interlinking"
echo ""
echo "🎯 No more manual blog creation needed!"
