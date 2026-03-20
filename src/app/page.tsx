'use client';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import HeroSection from '@/components/HeroSection';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import Link from 'next/link';
import { useArticles } from '@/hooks/useArticles';

// All 15 subcategories shown as quick-nav pills below the hero
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
];

export default function Home() {
  const { data: articles, isLoading } = useArticles();

  const heroArticle  = articles?.[0];
  const gridArticles = articles?.slice(1) ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {isLoading ? (
          <div className="py-32 text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
              Loading history...
            </span>
          </div>
        ) : !heroArticle ? (
          <EmptyState />
        ) : (
          <>
            <HeroSection article={heroArticle} />

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

            {/* Latest articles grid */}
            <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
              <div className="mb-6 sm:mb-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Latest history
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
                {gridArticles.map((article, i) => (
                  <ArticleCard key={article.id} article={article} index={i} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}