import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Empty turbopack config to acknowledge Turbopack is in use
  turbopack: {},
  // Server-only packages that should not be bundled for the client
  serverExternalPackages: ['bullmq', 'ioredis', 'twilio', 'stripe'],
  // Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ],
};

export default nextConfig;
