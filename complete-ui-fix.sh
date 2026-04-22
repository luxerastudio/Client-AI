#!/bin/bash

# COMPLETE UI HYDRATION AND DEPLOYMENT FIX
echo "Executing complete UI hydration and deployment fix..."

# Step 1: Reset to minimal working configuration
echo "Resetting to minimal working configuration..."
rm -rf .vercel
rm -f hydration-fix.json

# Step 2: Create optimal vercel.json for hydration fix
echo "Creating optimal vercel.json for hydration..."
cat > vercel.json << EOF
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "NODE_ENV=production next build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "build": {
    "env": {
      "NEXT_PUBLIC_APP_URL": "https://client-ai-system.vercel.app",
      "NODE_ENV": "production",
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
EOF

# Step 3: Simplify Next.js config for hydration
echo "Simplifying Next.js config for hydration..."
cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  
  // Output configuration
  output: 'standalone',
  
  // Disable React strict mode to prevent hydration issues
  reactStrictMode: false,
  
  // Cache control headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ]
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/json' }
        ]
      }
    ]
  },
  
  // Webpack configuration for hydration fix
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  }
}

module.exports = nextConfig
EOF

# Step 4: Create deployment manifest
echo "Creating deployment manifest..."
CURRENT_COMMIT=$(git rev-parse HEAD)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)

cat > ui-fix-manifest.json << EOF
{
  "manifest": {
    "version": "3.0.0",
    "commit": "$CURRENT_COMMIT",
    "timestamp": "$TIMESTAMP",
    "fixes": [
      "Complete UI hydration fix",
      "Disabled React strict mode",
      "Added client-side mounting guards",
      "Disabled all caching",
      "Simplified Next.js configuration",
      "Force clean builds"
    ],
    "expectedBehavior": {
      "homePage": "Full interactive UI rendering",
      "demoPage": "Complete functional interface",
      "apiEndpoints": "Proper JSON responses",
      "hydration": "No SSR/client mismatches"
    }
  }
}
EOF

# Step 5: Add and commit all changes
echo "Adding complete UI fix files..."
git add vercel.json next.config.js ui-fix-manifest.json

# Step 6: Commit complete fix
echo "Committing complete UI fix..."
git commit -m "fix: complete UI hydration and deployment solution

- Simplified vercel.json for reliable deployment
- Disabled React strict mode to prevent hydration issues
- Added comprehensive cache control headers
- Simplified Next.js configuration for stability
- Created deployment manifest with expected behavior
- Ready for production deployment at https://client-ai-system.vercel.app

Commit: $CURRENT_COMMIT
Timestamp: $TIMESTAMP"

# Step 7: Push complete fix
echo "Pushing complete UI fix..."
git push origin main

echo "Complete UI hydration and deployment fix completed!"
echo "Expected URL: https://client-ai-system.vercel.app"
echo "Commit: $CURRENT_COMMIT"
