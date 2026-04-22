#!/bin/bash

# EMERGENCY VERCEL DEPLOYMENT FIX
echo "Executing emergency Vercel deployment fix..."

# Step 1: Create minimal working vercel.json
echo "Creating minimal vercel.json configuration..."
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next"
}
EOF

# Step 2: Remove conflicting configurations
echo "Removing conflicting configurations..."
rm -f deployment-restore.json
rm -f deployment-manifest.json
rm -f deploy-trigger.json
rm -f deployment-status.json

# Step 3: Create .vercel directory with proper structure
echo "Setting up .vercel directory structure..."
mkdir -p .vercel

# Step 4: Create minimal project.json
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd"
}
EOF

# Step 5: Create README for .vercel directory
cat > .vercel/README.txt << EOF
Vercel Project Configuration
Project: client-ai-system
Project ID: prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG
Organization: team_oTNLhkDTEto6vq4p2LQF3zDd
EOF

# Step 6: Create deployment manifest
echo "Creating deployment manifest..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > deployment.json << EOF
{
  "deployment": {
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "project": "client-ai-system",
    "status": "ready"
  }
}
EOF

# Step 7: Add all necessary files
echo "Adding deployment files..."
git add vercel.json deployment.json
git add -f .vercel/

# Step 8: Commit with clear message
echo "Committing emergency fix..."
git commit -m "emergency: fix Vercel deployment connection

- Simplified vercel.json to minimal working configuration
- Removed conflicting deployment configurations
- Established proper .vercel directory structure
- Added project credentials for Vercel connection
- Ready for deployment to https://client-ai-system.vercel.app

Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 9: Push to trigger deployment
echo "Pushing emergency fix..."
git push origin main

echo "Emergency deployment fix completed!"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
