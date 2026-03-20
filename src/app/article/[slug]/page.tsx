'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ArticleCard from '@/components/ArticleCard';
import { useArticle, useRelatedArticles } from '@/hooks/useArticles';
import { supabase } from '@/integrations/supabase/client';

interface ArticleImage {
    id: number;
    image_url: string;
    alt_text?: string | null;  // ← add | null
    position: number;
    width: number;
    height?: number | null;    // ← add | null
  }

// ─── RichBlock ────────────────────────────────────────────────────────────────
const RichBlock = ({ text }: { text: string }) => {
  if (!text || /^[\\n\\r\\t\\s]+$/.test(text) || text === '\\n' || text === '\n') return null;

  if (text.includes('\n') && text.split('\n')[0].startsWith('## ')) {
    const lines   = text.split('\n');
    const heading = lines[0].slice(3).trim();
    const rest    = lines.slice(1).join('\n').trim();
    return (
      <>
        <h2
          className="font-bold text-foreground mt-10 mb-4 leading-tight border-l-4 border-primary pl-4"
          style={{ fontSize: 'clamp(1.15rem, 3vw, 1.4rem)' }}
        >
          {heading}
        </h2>
        {rest && <RichBlock text={rest} />}
      </>
    );
  }

  if (text.startsWith('## ')) {
    return (
      <h2
        className="font-bold text-foreground mt-10 mb-4 leading-tight border-l-4 border-primary pl-4"
        style={{ fontSize: 'clamp(1.15rem, 3vw, 1.4rem)' }}
      >
        {text.slice(3).trim()}
      </h2>
    );
  }

  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p
      className="text-foreground leading-[1.85] mb-5 sm:mb-7"
      style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' }}
    >
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-foreground bg-primary/8 px-0.5 rounded">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: article, isLoading } = useArticle(slug);
  const { data: related } = useRelatedArticles(article ?? null);
  const [images, setImages] = useState<ArticleImage[]>([]);

  useEffect(() => {
    if (!slug) return;
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('article_images')
          .select('*')
          .eq('article_id', parseInt(slug))
          .order('position', { ascending: true });
        if (error) throw error;
        setImages(data || []);
      } catch (err) {
        console.error('Error fetching images:', err);
      }
    };
    fetchImages();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground animate-pulse">
            Loading...
          </span>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 px-6 text-center">
          <h1 className="text-2xl font-bold tracking-tightest">Article not found</h1>
          <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary hover:underline">
            ← Back to home
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const pubDate    = format(new Date(article.published_date), 'MMMM d, yyyy');
  const rawContent = article.raw_content || article.summary || '';
  const normalised = rawContent.replace(/\r\n/g, '\n').replace(/\n(## )/g, '\n\n$1');
  const paragraphs = normalised
    .split(/\n\n+/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0 && p !== '\\n' && p !== '\n' && !/^[\\n\s]+$/.test(p));

  const bodyImages  = images.slice(1);
  const blocks: (string | ArticleImage)[] = [];
  const insertEvery = bodyImages.length > 0
    ? Math.max(2, Math.floor(paragraphs.length / bodyImages.length))
    : 999;
  let imgIdx = 0;

  paragraphs.forEach((para, i) => {
    blocks.push(para);
    if ((i + 1) % insertEvery === 0 && imgIdx < bodyImages.length) {
      blocks.push(bodyImages[imgIdx++]);
    }
  });
  while (imgIdx < bodyImages.length) blocks.push(bodyImages[imgIdx++]);

  const heroImage = images[0] ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5">
              <Link
                href={`/category/${article.category}`}
                className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary font-bold hover:underline"
              >
                {article.category}
              </Link>
              <span className="text-muted-foreground text-xs hidden sm:inline">·</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                {pubDate}
              </span>
            </div>

            <h1
              className="font-bold tracking-tightest leading-[0.95] text-foreground mb-6"
              style={{ fontSize: 'clamp(1.75rem, 5.5vw, 3.5rem)', textWrap: 'balance' } as React.CSSProperties}
            >
              {article.title}
            </h1>

            {article.summary && article.summary !== rawContent && (
              <p
                className="text-muted-foreground leading-relaxed mb-6 border-l-4 border-primary pl-4 italic"
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.15rem)' }}
              >
                {article.summary}
              </p>
            )}
          </div>

          {(heroImage || article.image_url) && (
            <div className="w-full mb-8">
              <div className="max-w-3xl mx-auto sm:px-6">
                <div className="overflow-hidden sm:rounded-xl bg-muted">
                  <img
                    src={heroImage?.image_url || article.image_url || ''}
                    alt={heroImage?.alt_text || article.title}
                    className="w-full h-auto block"
                    style={{ maxHeight: '65vh', objectFit: 'cover', width: '100%' }}
                    loading="eager"
                  />
                </div>
                {heroImage?.alt_text && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
                    {heroImage.alt_text}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
            {blocks.map((block, idx) => {
              if (typeof block === 'string') return <RichBlock key={idx} text={block} />;
              const img = block as ArticleImage;
              return (
                <figure key={img.id} className="my-8 sm:my-10 -mx-4 sm:mx-0">
                  <div className="overflow-hidden sm:rounded-xl bg-muted">
                    <img
                      src={img.image_url}
                      alt={img.alt_text || article.title}
                      className="w-full h-auto block"
                      style={{ maxHeight: '60vh', objectFit: 'cover', width: '100%' }}
                      loading="lazy"
                    />
                  </div>
                  {img.alt_text && (
                    <figcaption className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
                      {img.alt_text}
                    </figcaption>
                  )}
                </figure>
              );
            })}

            <div className="border-t border-border mt-10 pt-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Written by <span className="text-foreground font-bold">{article.source_name}</span>
              </span>
            </div>
          </div>
        </motion.article>

        {related && related.length > 0 && (
          <section className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-16">
            <div className="border-t border-border pt-10 mb-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Related Articles
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {related.map((a, i) => (
                <ArticleCard key={a.id} article={a} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}