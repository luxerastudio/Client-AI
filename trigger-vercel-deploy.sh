#!/bin/bash

# TRIGGER VERCEL DEPLOYMENT - DIRECT APPROACH
echo "Triggering direct Vercel deployment..."

# Step 1: Create minimal vercel.json that Vercel recognizes
echo "Creating minimal vercel.json..."
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs"
}
EOF

# Step 2: Ensure .vercel directory exists with project info
echo "Ensuring .vercel project configuration..."
mkdir -p .vercel
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd"
}
EOF

# Step 3: Create deployment trigger file
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
    "url": "https://client-ai-system.vercel.app"
  }
}
EOF

# Step 4: Add all files and commit
echo "Adding deployment files..."
git add vercel.json deploy-trigger.json
git add -f .vercel/project.json

# Step 5: Commit with deployment trigger message
echo "Committing deployment trigger..."
git commit -m "deploy: trigger Vercel deployment - minimal config

- Simplified vercel.json to minimal Next.js configuration
- Ensured project credentials are properly set
- Triggering automatic deployment to https://client-ai-system.vercel.app
- Commit: $CURRENT_COMMIT
- Timestamp: $TIMESTAMP"

# Step 6: Push to trigger deployment
echo "Pushing to trigger Vercel deployment..."
git push origin main

echo "Vercel deployment triggered!"
echo "URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
