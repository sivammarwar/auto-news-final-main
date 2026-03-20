'use client';

import { use } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ArticleCard from '@/components/ArticleCard';
import EmptyState from '@/components/EmptyState';
import { useArticles } from '@/hooks/useArticles';

const CATEGORY_META: Record<string, { name: string; emoji: string; description: string }> = {
  cricket:    { name: 'Cricket',        emoji: '🏏', description: 'IPL, Tests, BCCI and everything on the pitch' },
  bollywood:  { name: 'Bollywood',      emoji: '🎬', description: 'Box office, OTT, gossip and the drama behind the drama' },
  technology: { name: 'Technology',     emoji: '💻', description: 'Startups, gadgets and the future of India Inc.' },
  viral:      { name: 'Viral Today',    emoji: '🔥', description: "Stories the internet can't stop talking about" },
  business:   { name: 'Business',       emoji: '📈', description: 'Markets, RBI, startups, funding and the economy' },
  sports:     { name: 'Sports',         emoji: '🏆', description: 'Football, kabaddi, Olympics and more' },
  india:      { name: 'India',          emoji: '🇮🇳', description: "Politics, policy and what's shaping the nation" },
  world:      { name: 'World',          emoji: '🌍', description: 'Global news that matters to every Indian' },
  health:     { name: 'Health',         emoji: '❤️',  description: "Medicine, wellness and India's healthcare story" },
  science:    { name: 'Science',        emoji: '🚀', description: 'ISRO, discoveries, climate and the universe' },
  history:    { name: 'Hidden History', emoji: '📜', description: 'The forgotten stories that rewrote the world' },
  stocks:     { name: 'Stocks',         emoji: '📊', description: 'NSE, BSE, Nifty, Sensex, IPOs and smart money moves' },
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: articles, isLoading } = useArticles(slug);

  const meta = CATEGORY_META[slug ?? ''] ?? {
    name: slug ?? 'Category',
    emoji: '📰',
    description: '',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
            <div className="flex flex-col gap-2">
              <span className="text-3xl sm:text-4xl" role="img" aria-label={meta.name}>{meta.emoji}</span>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary font-bold mb-1">Category</p>
                <h1 className="font-bold tracking-tightest leading-none text-foreground" style={{ fontSize: 'clamp(2rem, 8vw, 5rem)' }}>
                  {meta.name}
                </h1>
              </div>
              {meta.description && (
                <p className="text-muted-foreground text-sm sm:text-base max-w-xl mt-1 leading-relaxed">{meta.description}</p>
              )}
            </div>
          </div>
        </section>

        <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          {isLoading ? (
            <div className="py-16 text-center">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Loading...</span>
            </div>
          ) : !articles?.length ? (
            <EmptyState title={`No ${meta.name} articles yet`} message={`Fresh ${meta.name} stories are on their way. Check back soon.`} />
          ) : (
            <>
              <div className="mb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {articles.length} article{articles.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
                {articles.map((article, i) => (
                  <ArticleCard key={article.id} article={article} index={i} />
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