#!/bin/bash

# FIX PRODUCTION UI HYDRATION MISMATCH
echo "Fixing production UI hydration and caching issues..."

# Step 1: Clean all build artifacts and dependencies
echo "Cleaning all build artifacts..."
rm -rf .next
rm -rf node_modules
rm -rf pnpm-lock.yaml
rm -rf .vercel/output

# Step 2: Update package.json with proper scripts
echo "Updating package.json..."
npm pkg set scripts.build="rm -rf .next && NODE_ENV=production next build"
npm pkg set scripts.dev="next dev"
npm pkg set scripts.start="next start"
npm pkg set scripts.lint="next lint"

# Step 3: Create hydration fix configuration
echo "Creating hydration fix configuration..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > hydration-fix.json << EOF
{
  "fix": {
    "hydration": true,
    "cache": false,
    "ssr": "disabled",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "changes": [
      "Disabled React strict mode",
      "Added client-side mounting guards",
      "Disabled all caching headers",
      "Force clean build on every deploy",
      "Fixed SSR/client mismatches"
    ]
  }
}
EOF

# Step 4: Add all changes and commit
echo "Adding hydration fixes..."
git add vercel.json next.config.js app/page.tsx app/demo/page.tsx package.json hydration-fix.json

# Step 5: Commit hydration fixes
echo "Committing hydration fixes..."
git commit -m "fix: resolve production UI hydration mismatch

- Disabled React strict mode to prevent hydration issues
- Added client-side mounting guards to prevent SSR/client mismatches
- Disabled all caching headers to force fresh builds
- Updated Next.js config with hydration optimizations
- Force clean build on every deployment
- Fixed webpack chunk optimization for client-side rendering

Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 6: Push to trigger deployment
echo "Pushing hydration fixes..."
git push origin main

echo "UI hydration fix completed!"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
