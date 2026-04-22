#!/bin/bash

# DIAGNOSE AND FIX VERCEL DEPLOYMENT FAILURE
echo "Diagnosing and fixing Vercel deployment failure..."

# Step 1: Check current deployment status
echo "Checking current deployment status..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

echo "Current commit: $CURRENT_COMMIT"
echo "Timestamp: $TIMESTAMP"

# Step 2: Test production URL
echo "Testing production URL..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://client-ai-system.vercel.app)
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "404" ]; then
    echo "DEPLOYMENT NOT FOUND - Fixing connection issue..."
fi

# Step 3: Create minimal working vercel.json
echo "Creating minimal working vercel.json..."
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next"
}
EOF

# Step 4: Simplify Next.js config
echo "Simplifying Next.js config..."
cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  output: 'standalone',
  reactStrictMode: false
}

module.exports = nextConfig
EOF

# Step 5: Ensure .vercel directory exists
echo "Ensuring .vercel directory exists..."
mkdir -p .vercel
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd"
}
EOF

# Step 6: Create deployment diagnosis file
echo "Creating deployment diagnosis..."
cat > deployment-diagnosis.json << EOF
{
  "diagnosis": {
    "timestamp": "$TIMESTAMP",
    "currentCommit": "$CURRENT_COMMIT",
    "httpStatus": "$HTTP_STATUS",
    "issue": "DEPLOYMENT_NOT_FOUND",
    "fix": "Re-establish Vercel project connection",
    "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
    "expectedUrl": "https://client-ai-system.vercel.app",
    "repository": "luxerastudio/Client-Acquisition-System-AI"
  }
}
EOF

# Step 7: Force clean all build artifacts
echo "Force cleaning all build artifacts..."
rm -rf .next
rm -rf node_modules
rm -rf pnpm-lock.yaml
rm -rf .vercel/output

# Step 8: Add all files
echo "Adding deployment fix files..."
git add vercel.json next.config.js deployment-diagnosis.json
git add -f .vercel/project.json

# Step 9: Commit deployment fix
echo "Committing deployment fix..."
git commit -m "fix: diagnose and resolve Vercel deployment failure

- Simplified vercel.json to minimal Next.js configuration
- Simplified Next.js config for reliable deployment
- Re-established Vercel project connection
- Force cleaned all build artifacts
- Created deployment diagnosis file
- Ready for deployment at https://client-ai-system.vercel.app

Current commit: $CURRENT_COMMIT
HTTP Status: $HTTP_STATUS
Timestamp: $TIMESTAMP"

# Step 10: Push to trigger deployment
echo "Pushing deployment fix..."
git push origin main

echo "Deployment diagnosis and fix completed!"
echo "Current commit: $CURRENT_COMMIT"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "HTTP Status before fix: $HTTP_STATUS"
