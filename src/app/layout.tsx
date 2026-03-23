import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hiddenhistoryfacts.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  'Hidden Facts',
    template: '%s | Hidden Facts',
  },
  description:
    'The history they taught you — and the history they buried. Original long-form articles across 17 categories of world history.',
  keywords: [
    'world history', 'history articles', 'ancient civilizations', 'medieval history',
    'historical mysteries', 'famous figures history', 'military history',
    'colonialism history', 'science history', 'Hidden Facts',
  ],
  authors: [{ name: 'Hidden Facts' }],
  openGraph: {
    type:        'website',
    siteName:    'Hidden Facts',
    title:       'Hidden Facts',
    description: 'The history they taught you — and the history they buried.',
    url:         BASE_URL,
    images: [{ url: '/og-default.jpg', width: 1200, height: 630, alt: 'Hidden Facts' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Hidden Facts',
    description: 'The history they taught you — and the history they buried.',
    images:      ['/og-default.jpg'],
  },
  alternates: {
    canonical: BASE_URL,
    types: { 'application/rss+xml': `${BASE_URL}/rss` },
  },
  robots: {
    index: true, follow: true,
    googleBot: {
      index: true, follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor:   '#78350f',
  width:        'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* AdSense account verification — do not touch */}
        <meta name="google-adsense-account" content="ca-pub-7368509971017880" />

        {/*
          FIX: AdSense loaded as a plain <script> tag — NOT via Next.js <Script>.
          Next.js <Script> injects data-nscript attribute which:
            1. AdSense validator rejects → logs warning in console
            2. Causes React hydration mismatch (error #418) because the
               attribute is present server-side but AdSense strips it client-side
          Plain <script async> in <head> is exactly what Google's docs specify.
          It loads after HTML parse (async) so it doesn't block rendering.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7368509971017880"
          crossOrigin="anonymous"
        />

        <style>{`
          *, *::before, *::after { font-synthesis: none; }

          ins.adsbygoogle {
            display: block !important;
            min-height: 90px;
          }

          @media (max-width: 768px) {
            body { padding-bottom: 60px; }
          }
        `}</style>

        {/* ── PERFORMANCE: Resource hints ─────────────────────────────────
            preconnect on Pexels saves ~100-150ms before LCP image loads.
            dns-prefetch on Wikimedia/Supabase is the cheaper version —
            just resolves DNS without opening a TCP connection.
            All hrefs are static strings — no dynamic env vars to avoid
            hydration mismatches (React error #418).
        ──────────────────────────────────────────────────────────────── */}
        <link rel="preconnect"   href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://supabase.co" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}