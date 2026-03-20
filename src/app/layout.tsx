// src/app/layout.tsx
// Server component — do NOT add 'use client' here.
// Client-side providers are in Providers.tsx below.

import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  'Signal History',
    template: '%s | Signal History',
  },

  description:
    'The history they taught you — and the history they buried. Original long-form articles across 15 categories of world history.',

  keywords: [
    'world history', 'history articles', 'ancient civilizations', 'medieval history',
    'historical mysteries', 'famous figures history', 'military history',
    'colonialism history', 'science history', 'Signal History',
  ],

  authors: [{ name: 'Signal History' }],

  openGraph: {
    type:        'website',
    siteName:    'Signal History',
    title:       'Signal History',
    description: 'The history they taught you — and the history they buried.',
    url:         BASE_URL,
    images: [
      {
        url:    '/og-default.jpg',
        width:  1200,
        height: 630,
        alt:    'Signal History',
      },
    ],
  },

  twitter: {
    card:        'summary_large_image',
    title:       'Signal History',
    description: 'The history they taught you — and the history they buried.',
    images:      ['/og-default.jpg'],
  },

  alternates: {
    canonical: BASE_URL,
    types: {
      'application/rss+xml': `${BASE_URL}/rss`,
    },
  },

  robots: {
    index:     true,
    follow:    true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-image-preview': 'large',
      'max-snippet':       -1,
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
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}