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
  },
};

export default nextConfig;