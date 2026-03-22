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
        {/* AdSense account verification — DO NOT TOUCH */}
        <meta name="google-adsense-account" content="ca-pub-7368509971017880" />

        {/* AdSense script — DO NOT TOUCH */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7368509971017880"
          crossOrigin="anonymous"
        />

        {/*
          PERF FIX: Reduced from 6 preconnects to 2.
          PageSpeed warned "More than 4 preconnect connections were found".
          Too many preconnects compete for TCP slots and slow down the actual
          critical connections. Kept only the two most important origins:
          - Pexels: serves article hero images (directly affects LCP)
          - AdSense: must stay for ad revenue
          Supabase is server-side only so browser preconnect is wasted.
        */}
        {/*
          PERF FIX: Swapped Pexels preconnect for fundingchoicesmessages.google.com.
          PageSpeed flagged Pexels as "unused preconnect" on the homepage
          (hero image loads after hydration so the preconnect is wasted).
          PageSpeed specifically recommended fundingchoicesmessages.google.com
          as a preconnect candidate with est. 300ms LCP savings — it's the
          Google consent/funding choices script that loads with AdSense.
        */}
        <link rel="preconnect" href="https://fundingchoicesmessages.google.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fundingchoicesmessages.google.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />

        <style>{`
          *, *::before, *::after {
            font-synthesis: none;
          }
        `}</style>
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