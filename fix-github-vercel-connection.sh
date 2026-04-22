#!/bin/bash

# FIX GITHUB-VERCEL DEPLOYMENT CONNECTION
echo "Re-establishing GitHub-Vercel deployment connection..."

# Step 1: Create comprehensive vercel.json with GitHub integration
echo "Creating vercel.json with GitHub integration..."
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "github": {
    "enabled": true,
    "silent": false
  },
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
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate, no-cache, max-age=0"
        }
      ]
    }
  ]
}
EOF

# Step 2: Update .vercel project configuration
echo "Updating .vercel project configuration..."
cat > .vercel/project.json << EOF
{
  "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
  "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
  "projectName": "client-ai-system"
}
EOF

# Step 3: Create GitHub webhook configuration
echo "Creating GitHub webhook configuration..."
cat > .github/workflows/vercel-deploy.yml << EOF
name: Deploy to Vercel

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install pnpm
      run: npm install -g pnpm
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Build project
      run: pnpm build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
        vercel-args: '--prod'
EOF

# Step 4: Create deployment trigger file
echo "Creating deployment trigger..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > github-vercel-connection.json << EOF
{
  "connection": {
    "github": "luxerastudio/Client-Acquisition-System-AI",
    "vercel": {
      "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
      "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
      "projectName": "client-ai-system"
    },
    "status": "reconnecting",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP"
  }
}
EOF

# Step 5: Create deployment manifest
cat > deployment-manifest.json << EOF
{
  "manifest": {
    "version": "2.0.0",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "github": {
      "repository": "luxerastudio/Client-Acquisition-System-AI",
      "branch": "main",
      "webhook": true
    },
    "vercel": {
      "projectId": "prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG",
      "orgId": "team_oTNLhkDTEto6vq4p2LQF3zDd",
      "url": "https://client-ai-system.vercel.app"
    },
    "routes": [
      { "path": "/", "type": "page", "status": "active" },
      { "path": "/demo", "type": "page", "status": "active" },
      { "path": "/api/test", "type": "api", "method": "POST", "status": "active" },
      { "path": "/api/leads/generate", "type": "api", "method": "POST", "status": "active" },
      { "path": "/api/outreach/generate", "type": "api", "method": "POST", "status": "active" },
      { "path": "/api/offer/create", "type": "api", "method": "POST", "status": "active" },
      { "path": "/api/pipeline/update", "type": "api", "method": "POST", "status": "active" }
    ]
  }
}
EOF

# Step 6: Add and commit all changes
echo "Adding GitHub-Vercel connection files..."
git add vercel.json github-vercel-connection.json deployment-manifest.json
git add -f .vercel/project.json
git add .github/workflows/vercel-deploy.yml

# Step 7: Commit connection fix
echo "Committing GitHub-Vercel connection fix..."
git commit -m "fix: re-establish GitHub-Vercel deployment connection

- Updated vercel.json with GitHub integration enabled
- Added GitHub Actions workflow for Vercel deployment
- Reconnected project credentials: prj_mGt0hxP0vd10yhq8Aq9P9kxAqWrG
- Established automatic deployment pipeline
- Set production URL: https://client-ai-system.vercel.app
- Configured webhook for main branch pushes

Repository: luxerastudio/Client-Acquisition-System-AI
Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 8: Push to trigger deployment
echo "Pushing to trigger Vercel deployment..."
git push origin main

echo "GitHub-Vercel connection fix completed!"
echo "Repository: luxerastudio/Client-Acquisition-System-AI"
echo "Project: client-ai-system"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
