import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
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
      <head suppressHydrationWarning>
        {/* AdSense account verification */}
        <meta name="google-adsense-account" content="ca-pub-7368509971017880" />

        <style suppressHydrationWarning>{`
          *, *::before, *::after { font-synthesis: none; }

          ins.adsbygoogle {
            display: block !important;
            min-height: 90px;
          }

          @media (max-width: 768px) {
            body { padding-bottom: 60px; }
          }
        `}</style>

        <link rel="preconnect"   href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
        <link rel="dns-prefetch" href="https://supabase.co" />
      </head>
      <body suppressHydrationWarning>
        {/* Logo - static image, no hydration issues */}
        <div
          data-prerender-logo=""
          aria-hidden="true"
          style={{
            position:      'fixed',
            top:           0,
            left:          0,
            right:         0,
            zIndex:        50,
            height:        '4rem',
            display:       'flex',
            alignItems:    'center',
            padding:       '0 1rem',
            pointerEvents: 'none',
            background:    'var(--background)',
          }}
        >
          <img
            src="data:image/webp;base64,UklGRigEAABXRUJQVlA4IBwEAACQHwCdASqEAJEAP5XA1mS4rzgpJ9RrSxAyiWMA17mder+fAfRrPn9nue+yuV8El5NH4YyVnovBj++FmVjms29Ijyf2b9XBWQNKgEA+rDovKIZ+rPAie1uKUzIpx6iY49zl3t6ARL01lpq44oafQmBHOfxO9eCsyWOaj1Vz6FYU+vyugwE1G1k2QgLAuV1xLQUaB/V7GNmrEyL/nn97Zo6kAReM9xeUIOJYKcZJOiKuzewNpbLnQlIp+b25AV3xZ032nLi7mUIIcFKCVL1coyo6Q/+6L3CEXvjOp9Ue2deG08JzEgz1owqRz1gqJEua7tqzRm6f/qivq0XF6nt85OTWFLk40oAA/u4gg5+1zHuaFAJ+gQ0LKG31CpGOxofnxG6/PLSmuHMDmpzOHVm7yuUEWV08HGCr9pmFDaMbTaku3jCd3qFp5OVvakHxqRFfG7vyQ5LWfgPNG3FMLNbylcyTfFtCc4CrYY+klGEjHOB9RH3GnTFqIlQuctsPmaA5tSD/HAe229yHfMmvDz1FIm1iPNnTU/6ye3d5CSOdE+Xpx5hkVwdh/hUSJ1JJ3leMqpj5qgFOHp5egYiUeeYLoUnUQKf18SaKIq8a6HiSBpTsWUP8k/ifsQUlgn1Ni7pnrLDzjY9B9JQ6J5ULz+ARPXO7pUkX7SxnH4u3tJ+1asDh1oqb4wy3z9v9lE3wyu4BBRMHHnLUG/73X+gejkO+S9uCtEXurbKqCcNDmYXszKzfgix7j0nkjUix0Fr4ezjQWwy6qgYk4C/QHn6slOyJ1Vi0Eom3cYIipe+6C+BOAOT2i4+n1Et0+mXmDiKAw1SNnZD55rrdH7JHhcw9VABMqvL7W4M+bFy/6evLtxqOUryBHPNW+nw55cKawBppx2nDQEgI0/eyO5dyugnbFmUW+uTq3vrm2l0aZnqan9GvCmaH75oF2SWcYuKgP8ZJnSqAS7TS9nHb6CRqjdYYOBa3+88FIOaNQqueDUG/EHV9oOY54n4WAgLXH3i7MQgvToCf6fqEd0/gm9GhaelVM/zcW4uOuRWBpoqYeuiCdESr8INoTd5guh6Cc0Sgcn2mWydG3MsSPep3HJZCR+Pfkm1n/+EqvlXz3cswc5BuWjtYfmsB5nQFeQgF8eoXpfHDsnRqRUZCKkG+zMPxIO4My6+XNA+HsByd5jiztEqknNNDLBsuMzF3Cq0LxVkpJigJpKKhZ+/FOIz0D7J6vD+f3mAnF3kxH5SVaBRIZF6fpuSgSNOu0oXtS/L19yJJwxkj+qxDjENK9gjVSniTm9jJ3CRlGiKe6LfyQEMy9SDr35wZ63QW+ksJBhS2Jj7MYvQGKMsg5EIlr1URD7wpnyQvSzywDVJWioxycJkQD4FuQ/zzd1D27f1ATLX8fAAAAAAAAA=="
            alt=""
            width={132}
            height={64}
            fetchPriority="high"
            style={{ height: '4rem', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* AdSense Deferred Script */}
        <Script
          id="google-adsense-deferred"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                setTimeout(function() {
                  var s = document.createElement('script');
                  s.async = true;
                  s.crossOrigin = 'anonymous';
                  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7368509971017880';
                  document.head.appendChild(s);
                }, 2000);
              });
            `
          }}
        />

        <Providers>
          {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}