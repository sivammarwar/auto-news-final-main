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
        {/* AdSense account verification — required by Google */}
        <meta name="google-adsense-account" content="ca-pub-7368509971017880" />

        <style>{`
          *, *::before, *::after { font-synthesis: none; }

          /*
            CLS FIX: Pre-reserve space for Auto Ads slots BEFORE they load.
            Auto Ads injects <ins class="adsbygoogle"> elements dynamically
            after JS executes. Without reserved height, the injected ad pushes
            all content below it down → CLS 0.196.

            By giving every adsbygoogle element a min-height matching the
            smallest possible ad unit, the page layout is already accounting
            for that space before the ad fills in → no shift.

            display:block is mandatory — AdSense will not render without it.
          */
          ins.adsbygoogle {
            display: block !important;
            min-height: 90px;
          }

          /*
            Anchor ads (sticky bottom bar) are position:fixed so they
            don't cause CLS directly, but they do cover content.
            Adding bottom padding to body prevents content being hidden
            behind the anchor ad on mobile (typical anchor = 50px tall).
          */
          @media (max-width: 768px) {
            body {
              padding-bottom: 60px;
            }
          }
        `}</style>

        {/* Preload logo — LCP element on most pages */}
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
          PERF FIX: Moved AdSense from <head> <script> to Next.js <Script>
          with strategy="afterInteractive".

          Original problem: a raw <script async> in <head> still blocks the
          critical request chain — the browser must resolve it before first paint,
          adding ~500ms to FCP/LCP even with the async attribute.

          strategy="afterInteractive" tells Next.js to inject this script only
          after the page is fully hydrated and interactive. This means:
          - FCP and LCP are no longer blocked by AdSense
          - The script still loads on every page automatically (no code changes needed)
          - Auto Ads works exactly as before — it scans the page and injects ads
          - Once your AdSense account is approved, ads appear with zero code changes

          The trade-off: ads appear ~1-2 seconds later than before.
          For a pending account this makes no difference. Once approved,
          users see content first, ads second — which is actually better UX.
        */}
        <Script
          id="adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7368509971017880"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}