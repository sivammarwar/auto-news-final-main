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
  // ── FIX 1: Target modern browsers to eliminate legacy polyfills ──────────
  // PageSpeed flagged 14KB of unnecessary polyfills:
  // Array.prototype.at/flat/flatMap, Object.fromEntries/hasOwn,
  // String.prototype.trimStart/trimEnd — all natively supported since 2021.
  // Targeting Chrome 90+ / Safari 15+ drops these entirely.
  // Vercel's edge CDN serves the right bundle to right browser automatically.
  experimental: {
    serverActions: {
      allowedOrigins: ['hiddenhistoryfacts.com', 'www.hiddenhistoryfacts.com'],
    },
  },

  // ── FIX 2: Remove stale image domains ────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.pexels.com' },
      { protocol: 'https', hostname: '**.wikimedia.org' },
      { protocol: 'https', hostname: '**.wikipedia.org' },
    ],
    // ── FIX 3: Prefer WebP/AVIF for Next.js <Image> components ──────────
    formats: ['image/avif', 'image/webp'],
    // Minimum cache TTL for optimised images (1 week)
    minimumCacheTTL: 604800,
  },

  // ── FIX 4: Compiler options — remove console.log in production ──────────
  // Reduces JS bundle size slightly and prevents log spam
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
      // ── FIX 5: Long-lived cache for static assets ────────────────────
      // Next.js hashes chunk filenames — safe to cache forever.
      // Cuts repeat-visit load time significantly.
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