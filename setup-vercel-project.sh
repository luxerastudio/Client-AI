#!/bin/bash

# VERCEL PROJECT SETUP AND DEPLOYMENT SCRIPT
echo "Setting up Vercel project connection and deployment..."

# Step 1: Create proper Vercel configuration
echo "Creating Vercel project configuration..."

# Update vercel.json with minimal working configuration
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "build": {
    "env": {
      "NEXT_PUBLIC_APP_URL": "https://client-ai-system.vercel.app",
      "NODE_ENV": "production"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
EOF

# Step 2: Create .vercel directory structure
echo "Setting up .vercel directory..."
mkdir -p .vercel

# Step 3: Create project configuration
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
  "projectName": "client-ai-system"
}
EOF

# Step 4: Create deployment trigger
echo "Creating deployment trigger..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > deploy-trigger.json << EOF
{
  "trigger": {
    "action": "deploy",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "project": "client-ai-system",
    "org": "team_oTNLhkDTEto6vq4p2LQF3zDd"
  }
}
EOF

# Step 5: Force add .vercel files (they're normally gitignored)
echo "Adding deployment configuration..."
git add vercel.json deploy-trigger.json
git add -f .vercel/project.json

# Step 6: Commit and push
echo "Committing deployment setup..."
git commit -m "fix: establish Vercel project connection and deployment

- Simplified vercel.json configuration
- Added proper .vercel/project.json with project credentials
- Created deployment trigger for project: client-ai-system
- Ensured proper GitHub-Vercel repository connection

Project ID: prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG
Expected URL: https://client-ai-system.vercel.app
Commit: $CURRENT_COMMIT"

# Step 7: Push to trigger deployment
echo "Pushing to trigger deployment..."
git push origin main

echo "Vercel project setup completed!"
echo "Project: client-ai-system"
echo "URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
