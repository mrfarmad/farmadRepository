/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8000',
    HEALTH_API_URL: process.env.NEXT_PUBLIC_HEALTH_API_URL || 'http://localhost:8090',
  },
  async rewrites() {
    return [
      {
        source: '/api/health/:path*',
        destination: 'http://localhost:8090/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
