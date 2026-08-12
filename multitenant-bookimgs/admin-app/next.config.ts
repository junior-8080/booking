import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // LAN devices (e.g. phone testing) hitting the dev server
  allowedDevOrigins: ['192.168.0.108', '*.local'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
