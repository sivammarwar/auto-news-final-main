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
  /*
    SWC minification is default in Next.js 15+ so no need to set swcMinify.
    The legacy JS polyfills (Array.at, Object.hasOwn etc.) are coming from
    dependencies like framer-motion/date-fns, not your own code.
    Nothing to configure here — it's a dependency issue, not a build target issue.
  */
};

export default nextConfig;