// src/app/page.tsx
import { createClient } from '@supabase/supabase-js';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HeroSection from '@/components/HeroSection';
import EmptyState from '@/components/EmptyState';
import ArticleGrid from '@/components/ArticleGrid';
import Link from 'next/link';

export const revalidate = 1800;

const QUICK_LINKS = [
  { label: '🏛️ Ancient',       path: '/category/ancient-civilizations' },
  { label: '⚔️ Medieval',       path: '/category/medieval-feudal' },
  { label: '🧭 Exploration',    path: '/category/age-of-exploration' },
  { label: '✊ Revolutions',    path: '/category/revolutions-politics' },
  { label: '🎖️ World Wars',    path: '/category/world-wars-conflicts' },
  { label: '🌐 Colonial',       path: '/category/colonial-imperial' },
  { label: '🕊️ Human Rights',  path: '/category/human-rights-movements' },
  { label: '🔬 Science',        path: '/category/science-technology' },
  { label: '📿 Religion',       path: '/category/religion-philosophy' },
  { label: '🎭 Culture',        path: '/category/cultural-social' },
  { label: '🏺 Trade',          path: '/category/economic-trade' },
  { label: '🗡️ Military',       path: '/category/military-warfare' },
  { label: '🗺️ Regional',       path: '/category/regional-history' },
  { label: '🔍 Archaeology',    path: '/category/archaeology-mysteries' },
  { label: '👑 Famous Figures', path: '/category/famous-figures' },
  { label: '🚀 Beyond Limits',  path: '/category/beyond-human-limits' },
  { label: '⭐ Unsung Heroes',  path: '/category/historys-unsung-heroes' },
];

// Must match HeroSection's pexelsResize exactly so the preload URL matches
// the actual <img> src the browser requests (avoids a double-fetch).
function pexelsResize(url: string, width = 700, quality = 75): string {
  if (!url || !url.includes('pexels.com')) return url;
  try {
    const u = new URL(url);
    u.search = '';
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', String(quality));
    u.searchParams.set('auto', 'compress');
    u.searchParams.set('cs', 'tinysrgb');
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('fm', 'webp');
    return u.toString();
  } catch {
    return url;
  }
}

const PAGE_SIZE = 24;

const SELECT =
  'id, slug, title, summary, category, subcategory, image_url, published_date, source_name, score, era';

async function getInitialArticles() {
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch PAGE_SIZE + 1 grid articles (after the hero) so we can determine
  // whether there are more pages — we pass this to ArticleGrid as initialHasMore.
  // We fetch PAGE_SIZE + 1 + 1 (the hero) = PAGE_SIZE + 2 total.
  const { data, error } = await db
    .from('articles')
    .select(SELECT)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 2); // hero (1) + first grid page (24) + hasMore probe (1)

  if (error) {
    console.error('Failed to fetch articles:', error);
    return { hero: null, gridArticles: [], hasMore: false, nextCursor: null, nextCursorId: null };
  }

  const rows = data ?? [];

  // First row is the hero
  const hero        = rows[0] ?? null;
  // Remaining rows are grid candidates (up to PAGE_SIZE + 1)
  const gridRows    = rows.slice(1);
  const hasMore     = gridRows.length > PAGE_SIZE;
  const gridArticles = hasMore ? gridRows.slice(0, PAGE_SIZE) : gridRows;

  const last = gridArticles[gridArticles.length - 1];

  return {
    hero,
    gridArticles,
    hasMore,
    nextCursor:   last ? last.published_date : null,
    nextCursorId: last ? last.id            : null,
  };
}

export default async function Home() {
  const { hero, gridArticles, hasMore, nextCursor, nextCursorId } =
    await getInitialArticles();

  const lcpImageUrl = hero?.image_url
    ? pexelsResize(hero.image_url, 700, 75)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* LCP hero image preload — see original page.tsx comment for rationale */}
      {lcpImageUrl && (
        <link
          rel="preload"
          as="image"
          href={lcpImageUrl}
          // @ts-ignore — fetchPriority valid on <link> but not in TS types yet
          fetchPriority="high"
        />
      )}

      <SiteHeader />

      <main className="flex-1">
        {!hero ? (
          <EmptyState />
        ) : (
          <>
            <HeroSection article={hero as any} />

            {/* Category quick-nav */}
            <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-14 sm:top-16 z-30">
              <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
                <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
                  {QUICK_LINKS.map(link => (
                    <Link
                      key={link.path}
                      href={link.path}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:text-primary hover:bg-muted px-3 py-1.5 rounded-full border border-border hover:border-primary transition-colors whitespace-nowrap"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <ArticleGrid
              initialArticles={gridArticles as any[]}
              initialHasMore={hasMore}
              initialCursor={nextCursor}
              initialCursorId={nextCursorId}
            />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
