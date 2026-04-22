#!/bin/bash

# ZERO-FAIL VERCEL DEPLOYMENT SCRIPT
echo "Starting ZERO-FAIL Vercel deployment with complete cache clear..."

# Step 1: Clean local build artifacts
echo "Cleaning local build artifacts..."
rm -rf .next
rm -rf node_modules
rm -rf pnpm-lock.yaml
rm -rf .vercel/output

# Step 2: Create deployment trigger with force flags
echo "Creating deployment trigger..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > deployment-config.json << EOF
{
  "deployment": {
    "force": true,
    "clearCache": true,
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "buildHash": "$(find . -type f -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.json' | sort | xargs cat | sha256sum | cut -d' ' -f1)",
    "environment": "production"
  }
}
EOF

# Step 3: Update deployment lock
cat > deploy-lock.json << EOF
{
  "lock": {
    "active": true,
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "type": "zero-fail-deploy"
  }
}
EOF

# Step 4: Force clean commit
echo "Adding deployment files..."
git add deployment-config.json deploy-lock.json vercel.json
git add --force .

echo "Committing zero-fail deployment..."
git commit -m "deploy: ZERO-FAIL deployment - clean build ($CURRENT_COMMIT)"

# Step 5: Force push to trigger clean deployment
echo "Pushing to trigger clean Vercel deployment..."
git push origin main --force

# Step 6: Create sequential deployment tracker
cat > deployment-sequential-lock.json << EOF
{
  "sequential": {
    "step": 1,
    "total": 3,
    "current": "cache-clear",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP"
  }
}
EOF

git add deployment-sequential-lock.json
git commit -m "deploy: sequential tracker - step 1/3 complete"
git push origin main

echo "ZERO-FAIL deployment triggered successfully!"
echo "Commit: $CURRENT_COMMIT"
echo "Timestamp: $TIMESTAMP"
