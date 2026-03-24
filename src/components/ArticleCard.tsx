'use client';

import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ArticleCardProps {
  article: Article;
  index?: number;
}

const SUBCATEGORY_META: Record<string, { label: string; emoji: string }> = {
  'ancient-civilizations':  { label: 'Ancient Civilizations',   emoji: '🏛️' },
  'medieval-feudal':        { label: 'Medieval & Feudal',        emoji: '⚔️'  },
  'age-of-exploration':     { label: 'Age of Exploration',       emoji: '🧭' },
  'revolutions-politics':   { label: 'Revolutions & Politics',   emoji: '✊'  },
  'world-wars-conflicts':   { label: 'World Wars & Conflicts',   emoji: '🎖️' },
  'colonial-imperial':      { label: 'Colonial & Imperial',      emoji: '🌐' },
  'human-rights-movements': { label: 'Human Rights Movements',   emoji: '🕊️' },
  'science-technology':     { label: 'Science & Technology',     emoji: '🔬' },
  'religion-philosophy':    { label: 'Religion & Philosophy',    emoji: '📿' },
  'cultural-social':        { label: 'Cultural & Social',        emoji: '🎭' },
  'economic-trade':         { label: 'Economic & Trade',         emoji: '🏺' },
  'military-warfare':       { label: 'Military & Warfare',       emoji: '🗡️' },
  'regional-history':       { label: 'Regional History',         emoji: '🗺️' },
  'archaeology-mysteries':  { label: 'Archaeology & Mysteries',  emoji: '🔍' },
  'famous-figures':         { label: 'Famous Figures & Leaders', emoji: '👑' },
  'beyond-human-limits':    { label: 'Beyond Human Limits',      emoji: '🚀' },
  'historys-unsung-heroes': { label: "History's Unsung Heroes",  emoji: '⭐' },
};

// pexelsResize and resizeImage helpers are intentionally removed.
// Next.js <Image> handles resizing, WebP/AVIF conversion, and caching
// for ALL sources (Pexels, Supabase, Wikimedia) via Vercel's image CDN,
// provided their hostnames are listed in next.config.ts remotePatterns.

const ArticleCard = ({ article, index = 0 }: ArticleCardProps) => {
  const router  = useRouter();
  const [active, setActive] = useState(false);
  const mounted = useRef(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const [timeAgo, setTimeAgo] = useState<string>(() => {
    const d = new Date(article.published_date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  useEffect(() => {
    setTimeAgo(formatDistanceToNow(new Date(article.published_date), { addSuffix: true }));
  }, [article.published_date]);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      if (window.performance?.navigation?.type !== 2) {
        setShouldAnimate(true);
      }
    }
  }, []);

  const articleHref  = `/article/${article.slug ?? article.id}`;
  const subcatMeta   = article.subcategory ? SUBCATEGORY_META[article.subcategory] : null;
  const categoryPath = article.subcategory
    ? `/category/${article.subcategory}`
    : `/category/${article.category}`;
  const categoryLabel = subcatMeta
    ? `${subcatMeta.emoji} ${subcatMeta.label}`
    : article.category;

  return (
    <div
      role="article"
      aria-label={`Read article: ${article.title}`}
      onMouseEnter={() => router.prefetch(articleHref)}
      onMouseDown={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => router.push(articleHref)}
      onKeyDown={e => { if (e.key === 'Enter') router.push(articleHref); }}
      tabIndex={0}
      className={`
        group relative flex flex-col p-4 sm:p-6 cursor-pointer
        shadow-card hover:shadow-card-hover
        z-0 hover:z-10
        bg-background hover:bg-muted/40
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${shouldAnimate ? 'card-fadein' : 'opacity-100'}
      `}
      style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : undefined}
    >
      {article.image_url && (
        <div className="aspect-video overflow-hidden mb-4 rounded-lg bg-muted relative">
          {/*
            FIX: Replaced raw <img> with Next.js <Image>.

            Previously a raw <img> tag was used with a manual pexelsResize()
            helper that only handled Pexels URLs — Supabase images fell through
            and were served as raw files (3.3 MB PNG → 20s LCP on mobile).

            Next.js <Image> handles ALL sources automatically:
            - Resizes to the requested width (400px here)
            - Converts to AVIF or WebP based on browser Accept header
            - Serves via Vercel's edge image CDN with 7-day cache
            - Generates correct srcset for responsive display
            - No manual URL manipulation needed for any image source

            `sizes` tells the browser how wide the image actually renders so it
            can pick the right srcset entry — prevents downloading oversized
            images on small screens.

            All cards use loading="lazy" / priority={false} (the default).
            Card thumbnails are never the intended LCP element — the logo is.
          */}
          <Image
            src={article.image_url}
            alt={article.title}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            quality={70}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href={categoryPath}
          aria-label={`Category: ${subcatMeta?.label ?? article.category} — view all articles`}
          onClick={e => e.stopPropagation()}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary font-bold hover:underline min-h-[44px] inline-flex items-center"
        >
          {categoryLabel}
        </Link>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground shrink-0"
          aria-label={`Published ${timeAgo}`}
        >
          {timeAgo}
        </span>
      </div>

      <Link
        href={articleHref}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
        className="focus:outline-none"
        aria-hidden="true"
      >
        <h2
          className="text-base sm:text-lg font-bold leading-snug tracking-tightest mb-3 transition-colors duration-100 hover:text-primary"
          style={{ color: active ? '#3b82f6' : undefined }}
        >
          {article.title}
        </h2>
      </Link>

      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3 mb-5 flex-1">
        {article.summary}
      </p>

      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {article.source_name}
        </span>
        {(article as any).era && (
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground bg-muted px-2 py-0.5 rounded-full">
            {(article as any).era}
          </span>
        )}
      </div>
    </div>
  );
};

export default ArticleCard;