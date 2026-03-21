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
        {/* Preconnect to image origins to reduce LCP delay */}
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
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