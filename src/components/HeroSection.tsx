'use client';

import Link from 'next/link';
import { Article } from '@/types/article';
import { formatDistanceToNow } from 'date-fns';

interface HeroSectionProps {
  article: Article;
}

const HeroSection = ({ article }: HeroSectionProps) => {
  const timeAgo    = formatDistanceToNow(new Date(article.published_date), { addSuffix: true });
  const articleHref = `/article/${article.slug ?? article.id}`;

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 border-b border-border">
      <div className="max-w-screen-xl mx-auto">
        <div className="hero-fadein">

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
            <Link
              href={`/category/${article.subcategory ?? article.category}`}
              className="text-primary font-bold font-mono text-[11px] uppercase tracking-[0.15em] hover:underline"
            >
              {article.subcategory ?? article.category}
            </Link>
            <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-[0.1em]">
              {timeAgo}
            </span>
          </div>

          <Link href={articleHref}>
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
            <div className="w-full mb-6 sm:mb-8 overflow-hidden rounded-xl">
              <img
                src={article.image_url}
                alt={article.title}
                width={1200}
                height={630}
                className="w-full h-auto object-cover"
                style={{ maxHeight: '55vh' }}
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link
              href={articleHref}
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