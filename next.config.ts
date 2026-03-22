import type { NextConfig } from 'next';

const securityHeaders = [
  // Clickjacking protection
  {
    key:   'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Prevent MIME-type sniffing
  {
    key:   'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer policy
  {
    key:   'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // HSTS — tells browsers to always use HTTPS for 2 years
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Restrict browser features you don't use
  {
    key:   'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // COOP — same-origin-allow-popups keeps Google OAuth/Ads popups working
  {
    key:   'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  // CSP — tailored to your actual external dependencies
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",

      // Scripts: your own + Google Ads + GTM
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://www.google.com",

      // Styles: your own + inline (Tailwind/framer-motion need unsafe-inline)
      "style-src 'self' 'unsafe-inline'",

      // Images: your own + Pexels + Wikimedia + Supabase storage + data URLs
      "img-src 'self' data: blob: https://*.pexels.com https://*.wikimedia.org https://*.wikipedia.org https://*.supabase.co https://www.google.com https://googleads.g.doubleclick.net",

      // Fonts: your own only
      "font-src 'self'",

      // Fetch/XHR: your own + Supabase + Groq + Pexels + Wikipedia API
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://api.pexels.com https://en.wikipedia.org https://www.googletagmanager.com https://pagead2.googlesyndication.com",

      // Iframes: Google Ads only
      "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",

      // Block plugins (Flash etc.)
      "object-src 'none'",

      // Restrict base tag hijacking
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