'use client';

// src/components/ArticleGrid.tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import ArticleCard from '@/components/ArticleCard';
import { Article } from '@/types/article'; // ← import shared type, no local duplicate

const PAGE_SIZE = 12;

interface Props {
  articles: Article[];
}

export default function ArticleGrid({ articles }: Props) {
  const [query, setQuery]               = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchOpen, setSearchOpen]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        (a.summary ?? '').toLowerCase().includes(q) ||
        (a.subcategory ?? '').toLowerCase().includes(q)
    );
  }, [query, articles]);

  const visible   = filtered.slice(0, visibleCount);
  const hasMore   = visibleCount < filtered.length;
  const remaining = filtered.length - visibleCount;

  return (
    <section className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

      {/* ── Header row: label + search toggle button ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Latest history
          {query && (
            <span className="ml-2 text-primary">
              — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>

        <button
          onClick={() => {
            setSearchOpen(v => !v);
            if (searchOpen) setQuery('');
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

      {/* ── Full-width search bar ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          searchOpen ? 'max-h-24 opacity-100 mb-6 sm:mb-8' : 'max-h-0 opacity-0 mb-0'
        }`}
        // @ts-ignore — inert is valid HTML but not yet in React TS types
        inert={!searchOpen ? '' : undefined}
      >
        <div className="relative w-full">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search articles by title, topic, or category…"
            className="w-full pl-11 pr-10 py-3.5 bg-muted border border-border rounded-xl font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
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

      {/* ── No results ── */}
      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            No articles found for &ldquo;{query}&rdquo;
          </p>
          <button
            onClick={() => setQuery('')}
            className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* ── Article grid ── */}
      {visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {visible.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} />
          ))}
        </div>
      )}

      {/* ── Load More button ── */}
      {hasMore && (
        <div className="flex flex-col items-center gap-3 mt-12">
          <button
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="group flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary border border-border hover:border-primary px-8 py-3.5 rounded-full transition-colors hover:bg-muted"
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-y-0.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            Load more articles
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80">
            {remaining} more article{remaining !== 1 ? 's' : ''} remaining
          </span>
        </div>
      )}
    </section>
  );
}