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

      // Scripts: own + Google Ads stack + Vercel Analytics
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
      ].join(' '),

      "style-src 'self' 'unsafe-inline'",

      // Images: own + Pexels + Wikimedia + Supabase + Google Ads
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

      // Connect: own + Supabase + Wikimedia (client-side image search) + Google Ads + Vercel
      // NOTE: Groq and Pexels are server-side only — removed from connect-src
      [
        "connect-src 'self'",
        'https://*.supabase.co',
        'wss://*.supabase.co',
        'https://en.wikipedia.org',         // Wikimedia image search (client-side in AdminPanel)
        'https://api.pexels.com',           // Pexels image search (client-side in AdminPanel)
        'https://www.googletagmanager.com',
        'https://pagead2.googlesyndication.com',
        'https://*.adtrafficquality.google',
        'https://*.googlesyndication.com',
        'https://*.doubleclick.net',
        'https://adservice.google.com',
        'https://va.vercel-scripts.com',
      ].join(' '),

      // Frames: Google Ads iframes
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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: '**.wikipedia.org' },
      // ── REMOVED: omdbapi.com and m.media-amazon.com (leftover from old news site)
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['hiddenhistoryfacts.com', 'www.hiddenhistoryfacts.com'] },
  },
  async headers() {
    return [
      {
        source:  '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;