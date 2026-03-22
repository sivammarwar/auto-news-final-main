import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hiddenhistoryfacts.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  'Hidden Facts',
    template: '%s | Hidden Facts',
  },
  description:
    'The history they taught you — and the history they buried. Original long-form articles across 15 categories of world history.',
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
        {/* AdSense account verification — required by Google, must stay in <head> */}
        <meta name="google-adsense-account" content="ca-pub-7368509971017880" />

        <style>{`
          *, *::before, *::after { font-synthesis: none; }

          /*
            CLS FIX: Pre-reserve space for Auto Ads slots.
            Without this, Auto Ads injects banners that push content down → CLS.
            min-height reserves the space before the ad fills in → no shift.
          */
          ins.adsbygoogle {
            display: block !important;
            min-height: 90px;
          }

          /*
            Anchor ads are position:fixed so don't cause CLS directly,
            but they cover bottom content on mobile. Reserve 60px padding.
          */
          @media (max-width: 768px) {
            body { padding-bottom: 60px; }
          }
        `}</style>

        {/* Preload logo — it is the LCP element, fetch immediately */}
        <link rel="preload" as="image" href="/logo.webp" />

        {/* Pexels preconnect — hero image origin, saves ~300ms on LCP */}
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />

        {/*
          FIX: Changed strategy from "afterInteractive" → "lazyOnload".

          Problem with afterInteractive on mobile:
          - On slow 4G, afterInteractive fires right after hydration
          - This puts AdSense execution on the main thread simultaneously
            with React hydration → 1,120ms element render delay on LCP
          - Worse: Auto Ads was triggering a SECOND load of adsbygoogle.js
            (the ?fcd=true variant), doubling the AdSense payload to 110 KiB

          lazyOnload fires only when the browser is completely idle —
          after all critical content has painted and the user can interact.
          This means:
          - LCP renders unblocked (no main thread contention)
          - No duplicate script load (idle-time load avoids the race condition)
          - Ads still appear automatically once approved, zero code changes needed
          - On desktop (fast connection) the difference is imperceptible
          - On mobile (slow 4G) this saves ~1,000ms of render delay
        */}
        <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7368509971017880"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}