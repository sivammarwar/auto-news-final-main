// src/app/article/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ArticleCard from '@/components/ArticleCard';
import ArticleBody from '@/components/ArticleBody';
import { buildArticleJsonLd } from '@/lib/article-seo';

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await db
    .from('articles')
    .select('slug, id')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_date', { ascending: false })
    .limit(500);

  return (data ?? []).map((a) => ({ slug: a.slug ?? String(a.id) }));
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hiddenhistoryfacts.com';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SUBCATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  'ancient-civilizations':  { label: 'Ancient Civilizations',   emoji: '🏛️' },
  'medieval-feudal':        { label: 'Medieval & Feudal',        emoji: '⚔️'  },
  'age-of-exploration':     { label: 'Age of Exploration',       emoji: '🧭' },
  'revolutions-politics':   { label: 'Revolutions & Politics',   emoji: '✊'  },
  'world-wars-conflicts':   { label: 'World Wars & Conflicts',   emoji: '🎖️' },
  'colonial-imperial':      { label: 'Colonial & Imperial',      emoji: '🌐' },
  'human-rights-movements': { label: 'Human Rights Movements',   emoji: '🕊️' },
  'science-technology':     { label: 'Science & Technology',     emoji: '🔬' },
  'religion-philosophy':    { label: 'Religion & Philosophy',    emoji: '📿' },
  'cultural-social':        { label: 'Cultural & Social',        emoji: '🎭' },
  'economic-trade':         { label: 'Economic & Trade',         emoji: '🏺' },
  'military-warfare':       { label: 'Military & Warfare',       emoji: '🗡️' },
  'regional-history':       { label: 'Regional History',         emoji: '🗺️' },
  'archaeology-mysteries':  { label: 'Archaeology & Mysteries',  emoji: '🔍' },
  'famous-figures':         { label: 'Famous Figures & Leaders', emoji: '👑' },
  'beyond-human-limits':    { label: 'Beyond Human Limits',      emoji: '🚀' },
  'historys-unsung-heroes': { label: "History's Unsung Heroes",  emoji: '⭐' },
};

async function fetchArticle(slug: string) {
  const db = getSupabase();

  const { data: bySlug } = await db
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single();

  if (bySlug) return { db, article: bySlug };

  const id = parseInt(slug, 10);
  if (isNaN(id)) return { db, article: null };

  const { data: byId } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single();

  return { db, article: byId ?? null };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const { article } = await fetchArticle(slug);

  if (!article) return { title: 'Article Not Found' };

  const subcatMeta    = SUBCATEGORY_LABELS[article.subcategory ?? ''];
  const categoryLabel = subcatMeta?.label ?? 'History';
  const url           = `${BASE_URL}/article/${article.slug ?? article.id}`;
  const imageUrl      = article.image_url ?? `${BASE_URL}/og-default.jpg`;
  const description   = (article.summary ?? '').slice(0, 160);

  return {
    title:       article.title,
    description,
    authors:     [{ name: article.source_name ?? 'Hidden Facts' }],
    keywords:    [categoryLabel, 'history', 'Hidden Facts'].filter(Boolean),
    openGraph: {
      type:          'article',
      url,
      title:         article.title,
      description,
      siteName:      'Hidden Facts',
      publishedTime: article.published_date,
      modifiedTime:  article.updated_at,
      authors:       [article.source_name ?? 'Hidden Facts'],
      section:       categoryLabel,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: article.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       article.title,
      description,
      images:      [imageUrl],
    },
    alternates: { canonical: url },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { db, article } = await fetchArticle(slug);

  if (!article) notFound();

  const { data: images } = await db
    .from('article_images')
    .select('id, image_url, alt_text, position, width, height, photographer, photographer_url, image_source, wiki_attribution, wiki_license, wiki_license_url')
    .eq('article_id', article.id)
    .order('position', { ascending: true });

  const { data: related } = await db
    .from('articles')
    .select('id, slug, title, summary, category, subcategory, image_url, published_date, source_name, score, is_published, is_draft, created_at, updated_at, era, difficulty, source_url, raw_content, admin_notes, scheduled_publish_date')
    .eq('is_published', true)
    .is('deleted_at', null)
    .eq('subcategory', article.subcategory ?? 'history')
    .neq('id', article.id)
    .order('score', { ascending: false })
    .limit(4);

  const subcatMeta    = article.subcategory ? SUBCATEGORY_LABELS[article.subcategory] : null;
  const categoryPath  = article.subcategory ? `/category/${article.subcategory}` : '/category/history';
  const categoryLabel = subcatMeta ? `${subcatMeta.emoji} ${subcatMeta.label}` : 'History';
  const pubDate       = format(new Date(article.published_date), 'MMMM d, yyyy');
  const jsonLd        = buildArticleJsonLd(article);
  const heroImage     = images?.[0] ?? null;
  const heroSrc       = heroImage?.image_url || article.image_url;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <article>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-6">

              <nav aria-label="Breadcrumb">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
                  <Link
                    href="/category/history"
                    className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                  >
                    History
                  </Link>
                  <span className="text-muted-foreground text-xs" aria-hidden="true">›</span>
                  <Link
                    href={categoryPath}
                    className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary font-bold hover:underline"
                  >
                    {categoryLabel}
                  </Link>
                  <span className="text-muted-foreground text-xs hidden sm:inline" aria-hidden="true">·</span>
                  <time
                    dateTime={article.published_date}
                    className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
                  >
                    {pubDate}
                  </time>
                  {article.era && article.era !== 'all' && (
                    <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground bg-muted px-2 py-0.5 rounded-full">
                      {article.era}
                    </span>
                  )}
                </div>
              </nav>

              <h1
                className="font-bold tracking-tightest leading-[0.95] text-foreground mb-6"
                style={{ fontSize: 'clamp(1.75rem, 5.5vw, 3.5rem)', textWrap: 'balance' } as React.CSSProperties}
              >
                {article.title}
              </h1>

              {article.summary && article.summary !== article.raw_content && (
                <p
                  className="text-muted-foreground leading-relaxed mb-6 border-l-4 border-primary pl-4 italic"
                  style={{ fontSize: 'clamp(1rem, 2.5vw, 1.15rem)' }}
                >
                  {article.summary}
                </p>
              )}
            </div>

            {heroSrc && (
              <div className="w-full mb-8">
                <div className="max-w-3xl mx-auto sm:px-6">
                  <div className="overflow-hidden sm:rounded-xl bg-muted">
                    <img
                      src={heroSrc}
                      alt={heroImage?.alt_text || article.title}
                      className="w-full h-auto block"
                      style={{ maxHeight: '65vh', objectFit: 'cover', width: '100%' }}
                      loading="eager"
                      fetchPriority="high"
                      decoding="sync"
                    />
                  </div>
                  {heroImage && <ImageCredit image={heroImage} />}
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
              <ArticleBody
                content={article.raw_content || article.summary || ''}
                images={(images ?? []).slice(1)}
                title={article.title}
              />
              <div className="border-t border-border mt-10 pt-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Written by{' '}
                  <span className="text-foreground font-bold">{article.source_name}</span>
                </span>
              </div>
            </div>
          </article>

          {related && related.length > 0 && (
            <section className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-16" aria-label="Related articles">
              <div className="border-t border-border pt-10 mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  More from {subcatMeta?.label ?? 'History'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
                {related.map((a, i) => (
                  // @ts-ignore — article prop is correct, TS resolves wrong overload
                  <ArticleCard key={a.id} article={a as any} index={i} />
                ))}
              </div>
            </section>
          )}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

function ImageCredit({ image }: { image: any }) {
  if (image.image_source === 'pexels' && image.photographer) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
        Photo by{' '}
        <a href={image.photographer_url ?? '#'} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">
          {image.photographer}
        </a>{' '}
        on Pexels
      </p>
    );
  }
  if (image.image_source === 'wikimedia' && image.wiki_attribution) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
        {image.wiki_attribution}
        {image.wiki_license && (
          <>
            {' · '}
            <a href={image.wiki_license_url ?? '#'} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">
              {image.wiki_license}
            </a>
          </>
        )}
        {' · Wikimedia Commons'}
      </p>
    );
  }
  if (image.alt_text) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
        {image.alt_text}
      </p>
    );
  }
  return null;
}
