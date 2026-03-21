'use client';

import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
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

/**
 * Resize Pexels images to card display size.
 * Cards display at ~609px wide — use 640px + WebP for best quality/size ratio.
 * Saves ~300-400 KB per card vs the default 1880px originals.
 */
function pexelsResize(url: string, width = 640, quality = 75): string {
  if (!url || !url.includes('pexels.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    u.searchParams.set('q', String(quality));
    u.searchParams.set('auto', 'compress');
    u.searchParams.set('cs', 'tinysrgb');
    u.searchParams.set('fit', 'crop');
    return u.toString();
  } catch {
    return url;
  }
}

const ArticleCard = ({ article, index = 0 }: ArticleCardProps) => {
  const router      = useRouter();
  const timeAgo     = formatDistanceToNow(new Date(article.published_date), { addSuffix: true });
  const articleHref = `/article/${article.slug ?? article.id}`;
  const [clicking, setClicking] = useState(false);

  const subcatMeta    = article.subcategory ? SUBCATEGORY_META[article.subcategory] : null;
  const categoryPath  = article.subcategory
    ? `/category/${article.subcategory}`
    : `/category/${article.category}`;
  const categoryLabel = subcatMeta
    ? `${subcatMeta.emoji} ${subcatMeta.label}`
    : article.category;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a[data-category]')) return;
    e.preventDefault();
    setClicking(true);
    setTimeout(() => router.push(articleHref), 200);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`
        card-fadein group relative flex flex-col p-4 sm:p-6
        shadow-card hover:shadow-card-hover
        z-0 hover:z-10 cursor-pointer select-none
        ${clicking ? 'bg-blue-100 dark:bg-blue-900' : 'bg-background'}
      `}
      style={{
        animationDelay: `${index * 50}ms`,
        transition: 'background-color 0.15s ease',
      }}
    >
      {article.image_url && (
        /*
          CLS FIX: Added explicit width/height + aspect-video container.
          The aspect-video class (16/9 ratio) reserves the exact space before
          the image loads, preventing any layout shift from image pop-in.

          IMAGE SIZE FIX: pexelsResize() shrinks from 1880px → 640px.
          This saves ~300-400 KB per card. With 8 cards on the page,
          that's potentially 2-3 MB saved = major LCP improvement.
        */
        <div className="aspect-video overflow-hidden mb-4 rounded-lg bg-muted">
          <img
            src={pexelsResize(article.image_url)}
            alt={article.title}
            width={640}
            height={360}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        <a
          data-category="true"
          href={categoryPath}
          onClick={e => e.stopPropagation()}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary font-bold hover:underline"
        >
          {categoryLabel}
        </a>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground shrink-0">
          {timeAgo}
        </span>
      </div>

      <h2 className={`
        text-base sm:text-lg font-bold leading-snug tracking-tightest mb-3
        transition-colors duration-200
        ${clicking ? 'text-blue-600 dark:text-blue-300' : 'text-foreground group-hover:text-primary'}
      `}>
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
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {(article as any).era}
          </span>
        )}
      </div>
    </article>
  );
};

export default ArticleCard;