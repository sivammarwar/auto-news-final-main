// src/app/category/[slug]/page.tsx
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import EmptyState from '@/components/EmptyState';
import CategoryArticleGrid from '@/components/CategoryArticleGrid';
import { buildCategoryMetadata } from '@/lib/category-seo';
import { Article } from '@/types/article';

export const revalidate = 3600;

const SUBCATEGORY_SLUGS = new Set([
  'ancient-civilizations', 'medieval-feudal', 'age-of-exploration',
  'revolutions-politics', 'world-wars-conflicts', 'colonial-imperial',
  'human-rights-movements', 'science-technology', 'religion-philosophy',
  'cultural-social', 'economic-trade', 'military-warfare',
  'regional-history', 'archaeology-mysteries', 'famous-figures',
  'beyond-human-limits', 'historys-unsung-heroes',
]);

const CATEGORY_META: Record<string, { name: string; emoji: string; description: string }> = {
  'history':                { name: 'All History',               emoji: '📜', description: 'The history they taught you — and the history they buried.' },
  'ancient-civilizations':  { name: 'Ancient Civilizations',     emoji: '🏛️', description: 'Egypt, Rome, Greece, Mesopotamia — the empires that built the world we live in.' },
  'medieval-feudal':        { name: 'Medieval & Feudal',         emoji: '⚔️',  description: 'Kingdoms, crusades, plagues and the brutal reality behind the romantic legend.' },
  'age-of-exploration':     { name: 'Age of Exploration',        emoji: '🧭', description: 'Columbus, Zheng He, trade routes and the maps that remade the world.' },
  'revolutions-politics':   { name: 'Revolutions & Politics',    emoji: '✊',  description: 'French, American, Russian — and the revolutions the textbooks forgot.' },
  'world-wars-conflicts':   { name: 'World Wars & Conflicts',    emoji: '🎖️', description: 'WWI, WWII, the Cold War and the millions whose stories were never told.' },
  'colonial-imperial':      { name: 'Colonial & Imperial',       emoji: '🌐', description: 'Empires, trade, independence movements and the long shadow colonialism cast.' },
  'human-rights-movements': { name: 'Human Rights Movements',    emoji: '🕊️', description: 'Civil rights, suffrage, abolition — the long fight for basic human dignity.' },
  'science-technology':     { name: 'Science & Technology',      emoji: '🔬', description: 'Inventions, medicine, space — and the scientists history tried to erase.' },
  'religion-philosophy':    { name: 'Religion & Philosophy',     emoji: '📿', description: 'Beliefs, myths, philosophers and the ideas that have moved civilizations.' },
  'cultural-social':        { name: 'Cultural & Social',         emoji: '🎭', description: 'Art, fashion, food, language — the texture of lives lived across the centuries.' },
  'economic-trade':         { name: 'Economic & Trade',          emoji: '🏺', description: 'The Silk Road, currency, banking and the commercial forces that shaped history.' },
  'military-warfare':       { name: 'Military & Warfare',        emoji: '🗡️', description: 'Battles, tactics, espionage — the strategies that won and lost empires.' },
  'regional-history':       { name: 'Regional History',          emoji: '🗺️', description: 'Asia, Africa, the Americas, Europe — the world beyond the Western narrative.' },
  'archaeology-mysteries':  { name: 'Archaeology & Mysteries',   emoji: '🔍', description: 'Lost cities, buried artifacts, unsolved ruins — history still being uncovered.' },
  'famous-figures':         { name: 'Famous Figures & Leaders',  emoji: '👑', description: 'Rulers, scientists, reformers — the real people behind the legends.' },
  'beyond-human-limits':    { name: 'Beyond Human Limits',       emoji: '🚀', description: 'The moon landing, the first flight, the engineering feats that defied all logic — moments when humanity did the impossible.' },
  'historys-unsung-heroes': { name: "History's Unsung Heroes",   emoji: '⭐', description: 'The nurses, the codebreakers, the ordinary people who changed history without ever getting a statue.' },
};

const PAGE_SIZE = 24;

const SELECT =
  'id, slug, title, summary, category, subcategory, image_url, published_date, source_name, score, era';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  return buildCategoryMetadata(slug);
}

export async function generateStaticParams() {
  return [
    { slug: 'history' },
    ...Array.from(SUBCATEGORY_SLUGS).map(slug => ({ slug })),
  ];
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Validate slug before hitting the DB
  if (slug !== 'history' && !SUBCATEGORY_SLUGS.has(slug)) notFound();

  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = db
    .from('articles')
    .select(SELECT)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1); // fetch one extra to determine hasMore

  if (slug === 'history') {
    query = query.eq('category', 'history');
  } else {
    query = query.eq('subcategory', slug);
  }

  const { data } = await query;
  const rows = data ?? [];

  const hasMore      = rows.length > PAGE_SIZE;
  const articles     = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const last         = articles[articles.length - 1];
  const nextCursor   = last ? last.published_date : null;
  const nextCursorId = last ? last.id : null;

  const meta = CATEGORY_META[slug] ?? {
    name:        slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    emoji:       '📜',
    description: '',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">

        {/* Category header */}
        <section className="border-b border-border">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            <div className="flex flex-col gap-2">
              <span className="text-3xl sm:text-4xl" role="img" aria-label={meta.name}>
                {meta.emoji}
              </span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary font-bold mb-1">
                  History
                </p>
                <h1
                  className="font-bold tracking-tightest leading-none text-foreground"
                  style={{ fontSize: 'clamp(2rem, 8vw, 5rem)' }}
                >
                  {meta.name}
                </h1>
              </div>
              {meta.description && (
                <p className="text-muted-foreground text-sm sm:text-base max-w-xl mt-1 leading-relaxed">
                  {meta.description}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Article grid with client-side load more */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          {!articles.length ? (
            <EmptyState
              title={`No ${meta.name} articles yet`}
              message={`Fresh ${meta.name} stories are on their way. Check back soon.`}
            />
          ) : (
            <CategoryArticleGrid
              slug={slug}
              initialArticles={articles as Article[]}
              initialHasMore={hasMore}
              initialCursor={nextCursor}
              initialCursorId={nextCursorId}
            />
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
