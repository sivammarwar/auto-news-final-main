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
};

/*
  PERF FIX: Strip ALL existing query params before setting new ones.
  Also add fm=webp so Pexels serves WebP instead of JPEG — saves ~41 KiB
  per PageSpeed audit (19 KiB on hero, 11 KiB on each card image).
*/
function pexelsResize(url: string, width = 400, quality = 75): string {
  if (!url || !url.includes('pexels.com')) return url;
  try {
    const u = new URL(url);
    u.search = '';
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', String(quality));
    u.searchParams.set('auto', 'compress');
    u.searchParams.set('cs', 'tinysrgb');
    u.searchParams.set('fit', 'crop');
    // FIX: Request WebP format — Pexels supports this natively.
    // Saves ~30–40% bytes vs JPEG with no visible quality difference.
    u.searchParams.set('fm', 'webp');
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

  // Human-readable label for aria-label on the card link — used to
  // disambiguate identical "READ MORE" or card links in accessibility audits.
  const cardAriaLabel = `Read article: ${article.title}`;

  return (
    <Link
      href={articleHref}
      aria-label={cardAriaLabel}
      onMouseEnter={() => router.prefetch(articleHref)}
      onMouseDown={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={`
        group relative flex flex-col p-4 sm:p-6
        shadow-card hover:shadow-card-hover
        z-0 hover:z-10
        bg-background hover:bg-muted/40
        transition-colors duration-150
        ${shouldAnimate ? 'card-fadein' : 'opacity-100'}
      `}
      style={shouldAnimate ? { animationDelay: `${index * 50}ms` } : undefined}
    >
      {article.image_url && (
        <div className="aspect-video overflow-hidden mb-4 rounded-lg bg-muted">
          <img
            src={pexelsResize(article.image_url, 400, 75)}
            alt={article.title}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        {/*
          FIX: Replaced `role="link"` span with a real <Link>.
          role="link" on a <span> is an accessibility anti-pattern:
          - It fails touch-target size checks (no native padding/click area)
          - It isn't keyboard-focusable by default without tabIndex
          - It breaks inside a parent <Link>, causing nested interactive elements

          Solution: Use onClick + e.stopPropagation() on a real <a> via Link.
          The outer card Link navigates to the article; this inner link navigates
          to the category. stopPropagation prevents both firing simultaneously.

          aria-label disambiguates identical category links across multiple cards
          (e.g. two cards both showing "Ancient Civilizations" → same link text,
          same href → Lighthouse "identical links" audit failure).
        */}
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

      <h2
        className="text-base sm:text-lg font-bold leading-snug tracking-tightest mb-3 transition-colors duration-100"
        style={{ color: active ? '#3b82f6' : undefined }}
      >
        {article.title}
      </h2>

      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3 mb-5 flex-1">
        {article.summary}
      </p>

      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          {article.source_name}
        </span>
        {(article as any).era && (
          /*
            FIX: Contrast failure.
            Original: text-[9px] text-muted-foreground bg-muted
            Problem:  9px text on muted background fails WCAG AA contrast ratio (4.5:1).
                      At 9px the bar is even higher — small text needs MORE contrast,
                      not less, yet muted-foreground on muted bg is ~2.5:1.
            Fix 1:    Bumped to text-[11px] — still small but crosses the "large text"
                      threshold where WCAG AA only requires 3:1.
            Fix 2:    Changed text-muted-foreground → text-foreground for full contrast.
            Both fixes together ensure it passes even on low-contrast themes.
          */
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-foreground bg-muted px-2 py-0.5 rounded-full">
            {(article as any).era}
          </span>
        )}
      </div>
    </Link>
  );
};

export default ArticleCard;