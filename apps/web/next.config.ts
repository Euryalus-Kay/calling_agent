import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Empty turbopack config to acknowledge Turbopack is in use
  turbopack: {},
  // Server-only packages that should not be bundled for the client
  serverExternalPackages: ['bullmq', 'ioredis', 'twilio'],
};

export default nextConfig;
