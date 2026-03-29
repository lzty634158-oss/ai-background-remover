#!/bin/bash
set -e
echo "🚀 Deploying..."

# Deploy Worker with all env vars
cd /root/.openclaw/workspace_program/project/worker
node /root/.openclaw/workspace_program/project/node_modules/wrangler/bin/wrangler.js deploy \
  --var REMOVE_BG_API_KEY:7EMBF9RZVxwEQxA2v9mwq1vG \
  --var RESEND_API_KEY:re_J4nnnLJp_BwKMG3kVJHKqB7u8B9yR2MhXa4tLpWz \
  --var RESEND_FROM_EMAIL:noreply@aibackgroundremover.space \
  --var FRONTEND_URL:https://aibackgroundremover.space \
  2>&1

echo "✅ Done!"
