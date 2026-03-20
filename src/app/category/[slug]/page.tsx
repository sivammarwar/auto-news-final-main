// src/app/category/[slug]/page.tsx
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import { buildCategoryMetadata, CATEGORY_REVALIDATE_SECONDS } from '@/lib/category-seo';
import { Article } from '@/types/article';

export const revalidate = CATEGORY_REVALIDATE_SECONDS;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUBCATEGORY_SLUGS = new Set([
  'ancient-civilizations', 'medieval-feudal', 'age-of-exploration',
  'revolutions-politics', 'world-wars-conflicts', 'colonial-imperial',
  'human-rights-movements', 'science-technology', 'religion-philosophy',
  'cultural-social', 'economic-trade', 'military-warfare',
  'regional-history', 'archaeology-mysteries', 'famous-figures',
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
};

// ─── generateMetadata ─────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  return buildCategoryMetadata(slug);
}

// ─── generateStaticParams — pre-builds all 16 category pages at deploy time ──
export async function generateStaticParams() {
  return [
    { slug: 'history' },
    ...Array.from(SUBCATEGORY_SLUGS).map(slug => ({ slug })),
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch articles server-side
  let query = supabase
    .from('articles')
    .select('id, title, summary, category, subcategory, image_url, published_date, source_name, score, is_published, is_draft, created_at, updated_at, era, difficulty, source_url, raw_content, admin_notes, scheduled_publish_date')
    .eq('is_published', true)
    .order('published_date', { ascending: false })
    .limit(50);

  if (slug === 'history') {
    query = query.eq('category', 'history');
  } else if (SUBCATEGORY_SLUGS.has(slug)) {
    query = query.eq('subcategory', slug);
  } else {
    notFound();
  }

  const { data: articles } = await query;

  const meta = CATEGORY_META[slug] ?? {
    name:        slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    emoji:       '📜',
    description: '',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">

        {/* Category hero */}
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

        {/* Articles grid */}
        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          {!articles?.length ? (
            <EmptyState
              title={`No ${meta.name} articles yet`}
              message={`Fresh ${meta.name} stories are on their way. Check back soon.`}
            />
          ) : (
            <>
              <div className="mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {articles.length} article{articles.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
                {articles.map((article, i) => (
                  <ArticleCard key={article.id} article={article as Article} index={i} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}