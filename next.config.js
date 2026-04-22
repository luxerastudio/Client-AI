/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  output: 'standalone',
  reactStrictMode: false,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' }
        ]
      }
    ]
  }
}

module.exports = nextConfig
