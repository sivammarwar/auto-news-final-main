import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Frame-Options',            value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',     value: 'nosniff' },
  { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      [
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        'https://pagead2.googlesyndication.com',
        'https://www.googletagmanager.com',
        'https://partner.googleadservices.com',
        'https://tpc.googlesyndication.com',
        'https://www.google.com',
        'https://adservice.google.com',
        'https://googleads.g.doubleclick.net',
        'https://*.googlesyndication.com',
        'https://*.adtrafficquality.google',
        'https://va.vercel-scripts.com',
        'https://fundingchoicesmessages.google.com', // ← AdSense consent script
      ].join(' '),
      "style-src 'self' 'unsafe-inline'",
      [
        "img-src 'self' data: blob:",
        'https://*.pexels.com',
        'https://*.wikimedia.org',
        'https://*.wikipedia.org',
        'https://*.supabase.co',
        'https://www.google.com',
        'https://googleads.g.doubleclick.net',
        'https://*.googlesyndication.com',
        'https://*.doubleclick.net',
        'https://*.adtrafficquality.google',
      ].join(' '),
      "font-src 'self'",
      [
        "connect-src 'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://en.wikipedia.org',
        'https://api.pexels.com',
        'https://www.googletagmanager.com',
        'https://pagead2.googlesyndication.com',
        'https://*.adtrafficquality.google',
        'https://*.googlesyndication.com',
        'https://*.doubleclick.net',
        'https://adservice.google.com',
        'https://va.vercel-scripts.com',
        'https://fundingchoicesmessages.google.com', // ← AdSense consent API calls
      ].join(' '),
      [
        'frame-src',
        'https://*.adtrafficquality.google',
        'https://googleads.g.doubleclick.net',
        'https://tpc.googlesyndication.com',
        'https://www.google.com',
        'https://*.doubleclick.net',
        'https://*.googlesyndication.com',
      ].join(' '),
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['hiddenhistoryfacts.com', 'www.hiddenhistoryfacts.com'],
    },
    optimizeCss: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: '**.wikipedia.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 604800,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  async headers() {
    return [
      {
        source:  '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key:   'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;