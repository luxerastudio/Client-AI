/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  output: 'standalone',
  reactStrictMode: false,
  turbopack: {}, // Fix Turbopack configuration
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' }
        ]
      }
    ]
  },
  
  webpack: (config, { isServer }) => {
    // Add workspace module resolution
    const path = require('path');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@repo/core': path.resolve(__dirname, '../../packages/core/dist'),
      '@repo/shared': path.resolve(__dirname, '../../packages/shared/dist'),
      '@/lib': path.resolve(__dirname, './lib'),
    }
    
    // Ensure modules can be resolved
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules'
    ];
    
    return config
  }
}

module.exports = nextConfig
