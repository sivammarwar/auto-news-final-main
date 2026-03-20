import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

const SUBCATEGORY_LABELS: Record<string, string> = {
  'ancient-civilizations':  'Ancient Civilizations',
  'medieval-feudal':        'Medieval & Feudal History',
  'age-of-exploration':     'Age of Exploration',
  'revolutions-politics':   'Revolutions & Politics',
  'world-wars-conflicts':   'World Wars & Conflicts',
  'colonial-imperial':      'Colonial & Imperial History',
  'human-rights-movements': 'Human Rights Movements',
  'science-technology':     'History of Science & Technology',
  'religion-philosophy':    'Religion & Philosophy',
  'cultural-social':        'Cultural & Social History',
  'economic-trade':         'Economic & Trade History',
  'military-warfare':       'Military & Warfare',
  'regional-history':       'Regional History',
  'archaeology-mysteries':  'Archaeology & Mysteries',
  'famous-figures':         'Famous Figures & Leaders',
};

// ─── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const id = parseInt(slug, 10);
  if (isNaN(id)) return { title: 'Article Not Found' };

  const { data: article } = await supabase
    .from('articles')
    .select('id, title, summary, image_url, published_date, updated_at, subcategory, source_name')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (!article) return { title: 'Article Not Found' };

  const categoryLabel = SUBCATEGORY_LABELS[article.subcategory ?? ''] ?? 'History';
  const url           = `${BASE_URL}/article/${article.id}`;
  const imageUrl      = article.image_url ?? `${BASE_URL}/og-default.jpg`;
  const description   = article.summary?.slice(0, 160) ?? '';

  return {
    title:       `${article.title} | Signal History`,
    description,
    authors:     [{ name: article.source_name ?? 'Signal History' }],
    keywords:    [categoryLabel, 'history', 'Signal History', article.subcategory ?? ''].filter(Boolean),

    // ── Open Graph ─────────────────────────────────────────────────────────
    openGraph: {
      type:        'article',
      url,
      title:       article.title,
      description,
      siteName:    'Signal History',
      publishedTime: article.published_date,
      modifiedTime:  article.updated_at,
      authors:     [article.source_name ?? 'Signal History'],
      section:     categoryLabel,
      images: [
        {
          url:   imageUrl,
          width:  1200,
          height: 630,
          alt:    article.title,
        },
      ],
    },

    // ── Twitter / X card ───────────────────────────────────────────────────
    twitter: {
      card:        'summary_large_image',
      title:       article.title,
      description,
      images:      [imageUrl],
    },

    // ── Canonical ──────────────────────────────────────────────────────────
    alternates: {
      canonical: url,
    },

    // ── Robots ─────────────────────────────────────────────────────────────
    robots: {
      index:          true,
      follow:         true,
      googleBot: {
        index:             true,
        follow:            true,
        'max-image-preview': 'large',
        'max-snippet':       -1,
      },
    },
  };
}

// ─── JSON-LD structured data ──────────────────────────────────────────────────
// Call this inside the page component and render as a <script> tag
export function buildArticleJsonLd(article: {
  id: number;
  title: string;
  summary: string;
  published_date: string;
  updated_at: string;
  image_url: string | null;
  source_name: string;
  subcategory: string | null;
  raw_content: string | null;
}) {
  const categoryLabel = SUBCATEGORY_LABELS[article.subcategory ?? ''] ?? 'History';
  const url           = `${BASE_URL}/article/${article.id}`;
  const imageUrl      = article.image_url ?? `${BASE_URL}/og-default.jpg`;
  const wordCount     = article.raw_content?.trim().split(/\s+/).length ?? 0;

  return {
    '@context':       'https://schema.org',
    '@type':          'Article',
    headline:         article.title,
    description:      article.summary?.slice(0, 200) ?? '',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished:    article.published_date,
    dateModified:     article.updated_at,
    wordCount,
    articleSection:   categoryLabel,
    inLanguage:       'en',
    image: {
      '@type':  'ImageObject',
      url:      imageUrl,
      width:    1200,
      height:   630,
    },
    author: {
      '@type': 'Person',
      name:    article.source_name ?? 'Signal History',
    },
    publisher: {
      '@type': 'Organization',
      name:    'Signal History',
      logo: {
        '@type': 'ImageObject',
        url:     `${BASE_URL}/logo.png`,
      },
    },
    isAccessibleForFree: true,
  };
}

// ─── ISR config — revalidate every 24 hours ───────────────────────────────────
// Export this from your page file:
// export const revalidate = 86400;
// New articles get fresh HTML within 24h, existing articles are served from cache
export const ARTICLE_REVALIDATE_SECONDS = 86400; // 24 hours