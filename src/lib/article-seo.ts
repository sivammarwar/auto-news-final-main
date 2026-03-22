import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hiddenhistoryfacts.com';

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
  // ── NEW ────────────────────────────────────────────────────────────────────
  'beyond-human-limits':    'Beyond Human Limits',
  'historys-unsung-heroes': "History's Unsung Heroes",
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
    title:       `${article.title} | Hidden Facts`,
    description,
    authors:     [{ name: article.source_name ?? 'Hidden Facts' }],
    keywords:    [categoryLabel, 'history', 'Hidden Facts', article.subcategory ?? ''].filter(Boolean),

    openGraph: {
      type:        'article',
      url,
      title:       article.title,
      description,
      siteName:    'Hidden Facts',
      publishedTime: article.published_date,
      modifiedTime:  article.updated_at,
      authors:     [article.source_name ?? 'Hidden Facts'],
      section:     categoryLabel,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: article.title }],
    },

    twitter: {
      card:        'summary_large_image',
      title:       article.title,
      description,
      images:      [imageUrl],
    },

    alternates: {
      canonical: url,
    },

    robots: {
      index:          true,
      follow:         true,
      googleBot: {
        index:               true,
        follow:              true,
        'max-image-preview': 'large',
        'max-snippet':       -1,
      },
    },
  };
}

// ─── JSON-LD structured data ──────────────────────────────────────────────────
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
      name:    article.source_name ?? 'Hidden Facts',
    },
    publisher: {
      '@type': 'Organization',
      name:    'Hidden Facts',
      logo: {
        '@type': 'ImageObject',
        url:     `${BASE_URL}/logo.png`,
      },
    },
    isAccessibleForFree: true,
  };
}

// ─── ISR config ───────────────────────────────────────────────────────────────
export const ARTICLE_REVALIDATE_SECONDS = 86400; // 24 hours