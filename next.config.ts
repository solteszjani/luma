import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  serverExternalPackages: ['ably'],
};
export default nextConfig;
