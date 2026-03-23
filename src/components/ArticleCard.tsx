'use client';

import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';
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

// ── FIX: Added fm=webp — Pexels serves WebP natively via this param.
// PageSpeed flagged 3 card images serving JPEG totalling 32KB of wasted bytes.
// WebP at q=75 is ~30-40% smaller with no visible quality difference.
// Also reduced quality from 75→70 for card thumbnails — acceptable at 400px.
function pexelsResize(url: string, width = 400, quality = 70): string {
  if (!url || !url.includes('pexels.com')) return url;
  try {
    const u = new URL(url);
    u.search = '';
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', String(quality));
    u.searchParams.set('auto', 'compress');
    u.searchParams.set('cs', 'tinysrgb');
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('fm', 'webp');      // ── CHANGED: force WebP format
    return u.toString();
  } catch {
    return url;
  }
}

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
        <div className="aspect-video overflow-hidden mb-4 rounded-lg bg-muted">
          <img
            src={pexelsResize(article.image_url, 400, 70)}
            alt={article.title}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            fetchPriority="auto"
            decoding="async"
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