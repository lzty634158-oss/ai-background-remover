#!/bin/bash

# Cloudflare Pages Deployment Script
# Usage: bash scripts/deploy.sh

set -e

echo "🚀 Starting Cloudflare deployment..."

# Deploy Worker (from worker/ subdirectory)
echo "🔧 Deploying Worker..."
cd worker
wrangler deploy --var REMOVE_BG_API_KEY:7EMBF9RZVxwEQxA2v9mwq1vG
cd ..

echo ""
echo "✅ Deployment complete!"
echo "Worker API: https://ai-background-remover-api.lzty634158.workers.dev"
