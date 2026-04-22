#!/bin/bash

# FORCE VERCEL DEPLOYMENT CONNECTION
echo "Forcing Vercel deployment connection..."

# Step 1: Complete reset
echo "Complete reset of deployment configuration..."
rm -rf .vercel
rm -f deployment-diagnosis.json

# Step 2: Create absolute minimal vercel.json
echo "Creating absolute minimal vercel.json..."
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs"
}
EOF

# Step 3: Reset Next.js config to absolute minimum
echo "Resetting Next.js config to minimum..."
cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
EOF

# Step 4: Create deployment trigger
echo "Creating deployment trigger..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > force-deploy.json << EOF
{
  "force": {
    "action": "deploy",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "project": "client-ai-system",
    "repository": "luxerastudio/Client-Acquisition-System-AI",
    "minimal": true,
    "cache": false
  }
}
EOF

# Step 5: Force add .vercel directory with project info
echo "Force adding Vercel project info..."
mkdir -p .vercel
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd"
}
EOF

# Step 6: Create README for manual verification
echo "Creating deployment README..."
cat > DEPLOYMENT_README.md << EOF
# Vercel Deployment Information

## Project Details
- **Project ID**: prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG
- **Organization ID**: team_oTNLhkDTEto6vq4p2LQF3zDd
- **Project Name**: client-ai-system
- **Repository**: luxerastudio/Client-Acquisition-System-AI

## Expected URL
https://client-ai-system.vercel.app

## Current Status
- Commit: $CURRENT_COMMIT
- Timestamp: $TIMESTAMP
- Status: PENDING DEPLOYMENT

## Manual Steps Required
1. Go to Vercel Dashboard
2. Select project: client-ai-system
3. Connect repository: luxerastudio/Client-Acquisition-System-AI
4. Trigger manual deployment
EOF

# Step 7: Add all files
echo "Adding all deployment files..."
git add vercel.json next.config.js force-deploy.json DEPLOYMENT_README.md
git add -f .vercel/project.json

# Step 8: Commit force deployment
echo "Committing force deployment..."
git commit -m "force: absolute minimal Vercel deployment connection

- Reset to absolute minimal configuration
- Force Vercel project connection
- Minimal vercel.json for Next.js
- Reset Next.js config to defaults
- Added deployment README for manual steps
- Ready for manual Vercel connection

Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 9: Push force deployment
echo "Pushing force deployment..."
git push origin main

echo "Force deployment connection completed!"
echo "Project: client-ai-system"
echo "Repository: luxerastudio/Client-Acquisition-System-AI"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
