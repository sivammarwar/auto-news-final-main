'use client';

import Link from 'next/link';
import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

interface HeroSectionProps {
  article: Article;
}

/*
  FIX: Added fm=webp param — Pexels serves WebP natively when requested.
  PageSpeed flagged the hero image as serving JPEG with 19 KiB wasted bytes.
  WebP at equivalent quality is ~30% smaller with no visible difference.
*/
function pexelsResize(url: string, width = 800, quality = 80): string {
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

const HeroSection = ({ article }: HeroSectionProps) => {
  /*
    HYDRATION FIX (React error #418):
    formatDistanceToNow() produces a time-dependent string like "19 minutes ago".
    When Next.js SSR runs it on the server, then React hydrates on the client
    a few milliseconds later, the two strings don't match → hydration mismatch.

    Fix: render a static date string on the server (same on both sides),
    then replace it with the relative time only after client hydration via useEffect.
  */
  const [timeAgo, setTimeAgo] = useState<string>(() => {
    const d = new Date(article.published_date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  useEffect(() => {
    setTimeAgo(formatDistanceToNow(new Date(article.published_date), { addSuffix: true }));
  }, [article.published_date]);

  const articleHref = `/article/${article.slug ?? article.id}`;

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 border-b border-border">
      <div className="max-w-screen-xl mx-auto">
        <div className="hero-fadein">

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <Link
              href={`/category/${article.subcategory ?? article.category}`}
              aria-label={`Category: ${article.subcategory ?? article.category} — view all articles`}
              className="text-primary font-bold font-mono text-[11px] uppercase tracking-[0.15em] hover:underline"
            >
              {article.subcategory ?? article.category}
            </Link>
            <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-[0.1em]">
              {timeAgo}
            </span>
          </div>

          <Link href={articleHref} aria-label={`Read article: ${article.title}`}>
            <h1
              className="font-bold tracking-tightest leading-[0.92] text-foreground hover:text-primary transition-colors duration-300 mb-6 sm:mb-8"
              style={{ fontSize: 'clamp(2rem, 6vw, 5rem)', textWrap: 'balance' } as React.CSSProperties}
            >
              {article.title}
            </h1>
          </Link>

          <p
            className="text-muted-foreground leading-relaxed mb-6 sm:mb-8 max-w-3xl"
            style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
          >
            {article.summary}
          </p>

          {article.image_url && (
            /*
              CLS FIX: aspect-ratio wrapper reserves exact space before image loads.
              Prevents layout shift (CLS) caused by image popping in.
            */
            <div
              className="w-full mb-6 sm:mb-8 overflow-hidden rounded-xl bg-muted"
              style={{ aspectRatio: '16/9', maxHeight: '55vh' }}
            >
              <img
                src={pexelsResize(article.image_url, 700, 75)}
                alt={article.title}
                width={700}
                height={394}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link
              href={articleHref}
              aria-label={`Read full article: ${article.title}`}
              className="inline-flex items-center font-mono text-sm font-bold border-b-2 border-foreground pb-0.5 hover:text-primary hover:border-primary transition-all"
            >
              READ MORE →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;