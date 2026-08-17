import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Push notifications are the whole point here, so the service worker stays
  // enabled in dev too — not just in production.
});

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

export default withSerwist(nextConfig);
