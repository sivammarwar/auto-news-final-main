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

        {/*
          Logo preload REMOVED — logo is now inlined as a base64 data URL
          in SiteHeader.tsx. A preload for a data URL is meaningless since
          there is no network request to initiate. Removing it saves a
          wasted hint slot in the browser's preload scanner.
        */}

        {/*
          Pexels preconnect — hero image origin.
          crossOrigin removed: images don't use CORS so the attribute was
          causing the browser to open a second connection for the actual
          image request, defeating the purpose. Plain preconnect is correct.
        */}
        <link rel="preconnect" href="https://images.pexels.com" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <Analytics />

        {/*
          strategy="lazyOnload" — fires only when browser is fully idle.
          Prevents AdSense from competing with React hydration on mobile,
          eliminates duplicate adsbygoogle.js load, and lets LCP paint first.
          Ads still appear automatically once account is approved.
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