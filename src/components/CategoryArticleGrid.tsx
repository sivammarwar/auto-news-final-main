'use client';

// src/components/CategoryArticleGrid.tsx
// Client component that handles "Load more" for category pages.
// The category API route filters by slug, so we pass it as a param.
import { useState, useCallback } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { Article } from '@/types/article';

const PAGE_SIZE = 24;

interface Props {
  slug:             string;
  initialArticles:  Article[];
  initialHasMore:   boolean;
  initialCursor:    string | null;
  initialCursorId:  number | null;
}

export default function CategoryArticleGrid({
  slug,
  initialArticles,
  initialHasMore,
  initialCursor,
  initialCursorId,
}: Props) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [hasMore, setHasMore]   = useState(initialHasMore);
  const [cursor, setCursor]     = useState<string | null>(initialCursor);
  const [cursorId, setCursorId] = useState<number | null>(initialCursorId);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        slug,
        limit: String(PAGE_SIZE),
      });
      if (cursor)   params.set('cursor',   cursor);
      if (cursorId) params.set('cursorId', String(cursorId));

      const res  = await fetch(`/api/articles/category?${params}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? 'Failed to load');

      setArticles(prev => [...prev, ...(json.articles ?? [])]);
      setHasMore(json.hasMore);
      setCursor(json.nextCursor);
      setCursorId(json.nextCursorId);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, cursorId, slug]);

  return (
    <>
      <div className="mb-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {articles.length} article{articles.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
        {articles.map((article, i) => (
          <ArticleCard key={article.id} article={article} index={i} />
        ))}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center gap-3 mt-12">
          <button
            onClick={loadMore}
            disabled={loading}
            className="group flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary border border-border hover:border-primary px-8 py-3.5 rounded-full transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Loading…
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                Load more articles
              </>
            )}
          </button>

          {error && (
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive">
              {error} — <button onClick={loadMore} className="underline hover:text-primary">Retry</button>
            </span>
          )}
        </div>
      )}
    </>
  );
}
