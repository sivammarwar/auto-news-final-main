'use client';

// src/components/ArticleGrid.tsx
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { Article } from '@/types/article';

// How many articles to load per page from the API
const PAGE_SIZE = 24;

interface Props {
  // The initial batch of articles (already fetched server-side on first load).
  // This is intentionally a small set — the homepage now only SSR-fetches the
  // first 24 rows so the initial HTML payload stays small.
  initialArticles: Article[];
  // Whether the server knows there are more articles beyond the initial batch
  initialHasMore: boolean;
  // Cursor values for the next fetch (published_date + id of the last SSR row)
  initialCursor: string | null;
  initialCursorId: number | null;
}

export default function ArticleGrid({
  initialArticles,
  initialHasMore,
  initialCursor,
  initialCursorId,
}: Props) {
  // ── Local state ──────────────────────────────────────────────────────────
  const [articles, setArticles]         = useState<Article[]>(initialArticles);
  const [hasMore, setHasMore]           = useState(initialHasMore);
  const [cursor, setCursor]             = useState<string | null>(initialCursor);
  const [cursorId, setCursorId]         = useState<number | null>(initialCursorId);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Search
  const [query, setQuery]               = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults]   = useState<Article[] | null>(null);
  const [searching, setSearching]           = useState(false);
  const [searchOpen, setSearchOpen]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Debounce search input ────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  // ── Run search against API whenever debounced query changes ──────────────
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      return;
    }

    let cancelled = false;
    setSearching(true);

    fetch(`/api/articles?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(({ articles: results }) => {
        if (!cancelled) {
          setSearchResults(results ?? []);
          setSearching(false);
        }
      })
      .catch(() => {
        if (!cancelled) setSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Load more (pagination) ───────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor)   params.set('cursor',   cursor);
      if (cursorId) params.set('cursorId', String(cursorId));

      const res  = await fetch(`/api/articles?${params}`);
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
  }, [loading, hasMore, cursor, cursorId]);

  // ── Focus search input when panel opens ─────────────────────────────────
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // ── Derived display state ────────────────────────────────────────────────
  const isSearching     = !!debouncedQuery;
  const displayArticles = isSearching ? (searchResults ?? []) : articles;
  const resultCount     = isSearching ? displayArticles.length : null;

  return (
    <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

      {/* ── Header row: label + search toggle ────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Latest history
          {isSearching && resultCount !== null && (
            <span className="ml-2 text-primary">
              — {resultCount} result{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </span>

        <button
          onClick={() => {
            setSearchOpen(v => !v);
            if (searchOpen) {
              setQuery('');
              setDebouncedQuery('');
              setSearchResults(null);
            }
          }}
          aria-label={searchOpen ? 'Close search' : 'Search articles'}
          className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
            searchOpen
              ? 'border-primary text-primary bg-primary/5'
              : 'border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-muted'
          }`}
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          {searchOpen ? 'Close' : 'Search'}
        </button>
      </div>

      {/* ── Full-width search bar ─────────────────────────────────────────── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          searchOpen ? 'max-h-24 opacity-100 mb-6 sm:mb-8' : 'max-h-0 opacity-0 mb-0'
        }`}
        // @ts-ignore — inert is valid HTML but not in React TS types yet
        inert={!searchOpen ? true : undefined}
      >
        <div className="relative w-full">
          {/* Search icon or spinner */}
          {searching ? (
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin"
              fill="none" viewBox="0 0 24 24" aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          ) : (
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search all articles by title, topic, or category…"
            className="w-full pl-11 pr-10 py-3.5 bg-muted border border-border rounded-xl font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setSearchResults(null);
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── No results ───────────────────────────────────────────────────── */}
      {isSearching && !searching && displayArticles.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            No articles found for &ldquo;{debouncedQuery}&rdquo;
          </p>
          <button
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
              setSearchResults(null);
            }}
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* ── Article grid ─────────────────────────────────────────────────── */}
      {displayArticles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {displayArticles.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} />
          ))}
        </div>
      )}

      {/* ── Load More (only shown in non-search mode) ─────────────────────── */}
      {!isSearching && hasMore && (
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
    </section>
  );
}
