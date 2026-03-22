import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: '**.wikipedia.org' },
      { protocol: 'https', hostname: '**.omdbapi.com' },
      { protocol: 'https', hostname: '**.m.media-amazon.com' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['hiddenhistoryfacts.com', 'www.hiddenhistoryfacts.com'] },
    // optimizeCss removed — causes 4,570ms TBT regression on mobile with Next.js 16 + React 19
  },
};

export default nextConfig;