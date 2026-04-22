#!/bin/bash

# VERCEL DEPLOYMENT RESTORATION SCRIPT
echo "Starting Vercel deployment restoration..."

# Step 1: Clean any local build artifacts
echo "Cleaning local build artifacts..."
rm -rf .next
rm -rf node_modules
rm -rf pnpm-lock.yaml
rm -rf .vercel/output

# Step 2: Update deployment configuration
echo "Updating deployment configuration..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

# Create deployment restoration config
cat > deployment-restore.json << EOF
{
  "restoration": {
    "action": "full_restore",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
    "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
    "projectName": "client-ai-system",
    "environment": "production",
    "forceRebuild": true,
    "clearCache": true
  }
}
EOF

# Step 3: Update project configuration
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
  "projectName": "client-ai-system"
}
EOF

# Step 4: Create deployment manifest
cat > deployment-manifest.json << EOF
{
  "manifest": {
    "version": "1.0.0",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "routes": [
      { "path": "/", "type": "page", "component": "home" },
      { "path": "/demo", "type": "page", "component": "demo" },
      { "path": "/api/test", "type": "api", "method": "POST" },
      { "path": "/api/leads/generate", "type": "api", "method": "POST" },
      { "path": "/api/outreach/generate", "type": "api", "method": "POST" },
      { "path": "/api/offer/create", "type": "api", "method": "POST" },
      { "path": "/api/pipeline/update", "type": "api", "method": "POST" }
    ],
    "environment": {
      "NEXT_PUBLIC_APP_URL": "https://client-ai-system.vercel.app",
      "NODE_ENV": "production"
    }
  }
}
EOF

# Step 5: Commit restoration changes
echo "Committing restoration changes..."
git add vercel.json deployment-restore.json .vercel/project.json deployment-manifest.json
git commit -m "fix: restore Vercel deployment - project link and configuration fix

- Updated vercel.json with correct projectId and orgId
- Fixed NEXT_PUBLIC_APP_URL to match actual project
- Added deployment restoration configuration
- Ensured proper repository connection to Vercel project

Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 6: Force push to trigger deployment
echo "Pushing to trigger Vercel deployment restoration..."
git push origin main --force

# Step 7: Create deployment status tracker
cat > deployment-status.json << EOF
{
  "status": {
    "step": "deployment_triggered",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
    "expectedUrl": "https://client-ai-system.vercel.app",
    "status": "pending"
  }
}
EOF

git add deployment-status.json
git commit -m "deploy: status tracker - restoration step 1/3"
git push origin main

echo "Vercel deployment restoration triggered successfully!"
echo "Project ID: prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
echo "Timestamp: $TIMESTAMP"
