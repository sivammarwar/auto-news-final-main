'use client';

import { motion } from 'framer-motion';
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

  // Flash blue first, then navigate after the flash is visible
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't intercept category link clicks
    if ((e.target as HTMLElement).closest('a[data-category]')) return;
    e.preventDefault();
    setClicking(true);
    setTimeout(() => {
      router.push(articleHref);
    }, 200); // navigate after 200ms so flash is visible
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onClick={handleCardClick}
      className={`
        group relative flex flex-col p-4 sm:p-6
        shadow-card hover:shadow-card-hover
        z-0 hover:z-10 cursor-pointer select-none
        ${clicking ? 'bg-blue-100 dark:bg-blue-900' : 'bg-background'}
      `}
      style={{ transition: 'background-color 0.15s ease' }}
    >
      {article.image_url && (
        <div className="aspect-video overflow-hidden mb-4 rounded-lg">
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
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
    </motion.article>
  );
};

export default ArticleCard;