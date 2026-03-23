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

// Same resize function as HeroSection — must match exactly so preload URL
// matches the actual <img> src the browser will request
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

async function getArticles() {
  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await db
    .from('articles')
    .select('id, slug, title, summary, category, subcategory, image_url, published_date, source_name, score, era')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch articles:', error);
    return [];
  }

  return data ?? [];
}

export default async function Home() {
  const articles = await getArticles();

  const heroArticle  = articles[0];
  const gridArticles = articles.slice(1);

  // Build the preload URL at render time — same params as HeroSection's pexelsResize
  const lcpImageUrl = heroArticle?.image_url
    ? pexelsResize(heroArticle.image_url, 700, 75)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/*
        LCP PRELOAD: Tells the browser to fetch the hero image immediately —
        before it even parses the page body or unblocks the CSS chunk.
        This eliminates the 370ms "resource load delay" in the LCP breakdown.
        The URL must exactly match what HeroSection renders as the <img> src.
      */}
      {lcpImageUrl && (
        <link
          rel="preload"
          as="image"
          href={lcpImageUrl}
          // @ts-ignore — fetchPriority is valid on <link> but not in TS types yet
          fetchPriority="high"
        />
      )}

      <SiteHeader />

      <main className="flex-1">
        {!heroArticle ? (
          <EmptyState />
        ) : (
          <>
            <HeroSection article={heroArticle as any} />

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

            <ArticleGrid articles={gridArticles as any[]} />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}