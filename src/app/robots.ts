import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',          // block all API routes from crawlers
          '/admin',         // block admin panel
          '/_next/',        // Next.js internals
          '/static/',       // static assets
        ],
      },
      {
        // Block AI training crawlers
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Omgilibot',
          'FacebookBot',
          'Bytespider',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${baseUrl}/api/sitemap`,
  };
}