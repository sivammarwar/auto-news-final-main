// src/app/layout.tsx
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
        {/*
          PRECONNECT FIXES:
          1. Added crossOrigin="" — without this, preconnect is ignored for CORS
             image requests (Pexels uses CORS). Lighthouse was warning about this.
          2. Removed wikimedia — it was unused, wasting a connection slot.
          3. Added supabase — Lighthouse flagged 310ms savings from preconnecting
             to your DB origin. This alone can shave ~300ms off LCP.
          4. Kept dns-prefetch as fallback for browsers that don't support preconnect.
        */}
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://gybxyzdjvptlitymvxlc.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://gybxyzdjvptlitymvxlc.supabase.co" />

        {/*
          CLS FIX — font-synthesis:none globally:
          The footer's 0.592 CLS is caused by the browser synthesizing fake bold/italic
          versions of your monospace font BEFORE the real font loads. When the real font
          arrives, all text reflows because glyph widths change. Setting font-synthesis:none
          prevents this — the browser waits for the real font instead of synthesizing.
          This must be in a <style> tag in <head> to apply before first paint.
        */}
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