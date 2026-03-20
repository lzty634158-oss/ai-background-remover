#!/bin/bash

# Cloudflare Workers + Pages Deployment Script

set -e

echo "🚀 Starting Cloudflare deployment..."

# 1. Create D1 Database
echo "📦 Creating D1 database..."
wrangler d1 create ai-background-remover-db 2>/dev/null || true

# Note: If database already exists, use the existing one
# Update wrangler.toml with the database_id

# 2. Run migrations
echo "🔄 Running database migrations..."
wrangler d1 execute ai-background-remover-db --file=./drizzle/schema.sql --local

# 3. Deploy Worker
echo "🔧 Deploying Worker..."
wrangler deploy

# 4. Create R2 bucket
echo "🪣 Creating R2 bucket..."
wrangler r2 bucket create ai-background-remover-images 2>/dev/null || true

# 5. Set environment variables
echo "🔑 Setting environment variables..."
echo "Enter your Remove.bg API key:"
read -s API_KEY
wrangler secret put REMOVE_BG_API_KEY

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update Cloudflare Pages to connect to this Worker"
echo "2. Configure your custom domain (optional)"
echo "3. Set REMOVE_BG_API_KEY in Cloudflare dashboard if not set"
