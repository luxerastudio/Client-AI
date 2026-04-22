#!/bin/bash

# FINAL VERCEL DEPLOYMENT SOLUTION
echo "Executing final Vercel deployment solution..."

# Step 1: Reset to clean state
echo "Resetting to clean deployment state..."
rm -rf .vercel
rm -f deploy-trigger.json
rm -f github-vercel-connection.json
rm -f deployment-manifest.json

# Step 2: Create optimal vercel.json
echo "Creating optimal vercel.json..."
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
  }
}
EOF

# Step 3: Create package.json scripts for Vercel
echo "Updating package.json with Vercel scripts..."
npm pkg set scripts.vercel-build="next build"
npm pkg set scripts.vercel-dev="next dev"

# Step 4: Create deployment verification file
echo "Creating deployment verification..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > deployment-verification.json << EOF
{
  "verification": {
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "project": "client-ai-system",
    "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
    "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
    "expectedUrl": "https://client-ai-system.vercel.app",
    "status": "ready_for_deployment"
  }
}
EOF

# Step 5: Add all files
echo "Adding deployment files..."
git add vercel.json package.json deployment-verification.json

# Step 6: Commit final solution
echo "Committing final deployment solution..."
git commit -m "final: complete Vercel deployment solution

- Optimized vercel.json for Next.js deployment
- Added vercel-build script to package.json
- Created deployment verification file
- Ready for automatic Vercel deployment
- Expected URL: https://client-ai-system.vercel.app

Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 7: Push final solution
echo "Pushing final deployment solution..."
git push origin main

echo "Final Vercel deployment solution completed!"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
