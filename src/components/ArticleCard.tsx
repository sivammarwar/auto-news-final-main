'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';

interface ArticleCardProps {
  article: Article;
  index?: number;
}

// Maps subcategory slug → display label + emoji
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
  const timeAgo = formatDistanceToNow(new Date(article.published_date), { addSuffix: true });

  // Use subcategory for routing if available, otherwise fall back to category
  const subcatMeta  = article.subcategory ? SUBCATEGORY_META[article.subcategory] : null;
  const categoryPath = article.subcategory
    ? `/category/${article.subcategory}`
    : `/category/${article.category}`;
  const categoryLabel = subcatMeta
    ? `${subcatMeta.emoji} ${subcatMeta.label}`
    : article.category;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative flex flex-col bg-background p-4 sm:p-6 transition-all duration-300 shadow-card hover:shadow-card-hover z-0 hover:z-10"
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
        <Link
          href={categoryPath}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary font-bold hover:underline"
        >
          {categoryLabel}
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground shrink-0">
          {timeAgo}
        </span>
      </div>

      <Link href={`/article/${article.id}`} className="block mb-3">
        <h2 className="text-base sm:text-lg font-bold leading-snug tracking-tightest text-foreground group-hover:text-primary transition-colors duration-200">
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
        {/* Era badge — shown when available */}
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