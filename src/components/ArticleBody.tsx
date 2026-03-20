'use client';

// src/components/ArticleBody.tsx
// Extracted as a client component so the article page itself can be a
// server component (needed for generateMetadata + ISR to work properly).
// Handles: markdown rendering, inline image distribution, image credits.

interface ArticleImage {
  id:               number;
  image_url:        string;
  alt_text?:        string | null;
  position:         number;
  width:            number;
  height?:          number | null;
  photographer?:    string | null;
  photographer_url?: string | null;
  image_source?:    string | null;
  wiki_attribution?: string | null;
  wiki_license?:    string | null;
  wiki_license_url?: string | null;
}

interface ArticleBodyProps {
  content: string;
  images:  ArticleImage[];
  title:   string;
}

// ─── RichBlock — renders one paragraph or heading ────────────────────────────
function RichBlock({ text }: { text: string }) {
  if (!text || /^[\s\\n]+$/.test(text)) return null;

  // Section with heading + body in same block
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

  // Standalone heading
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

  // Paragraph with **bold** support
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
}

// ─── InlineImageCredit ────────────────────────────────────────────────────────
function InlineImageCredit({ image }: { image: ArticleImage }) {
  if (image.image_source === 'pexels' && image.photographer) {
    return (
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
        Photo by{' '}
        <a href={image.photographer_url ?? '#'} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">
          {image.photographer}
        </a>{' '}
        on Pexels
      </figcaption>
    );
  }
  if (image.image_source === 'wikimedia' && image.wiki_attribution) {
    return (
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
        {image.wiki_attribution}
        {image.wiki_license && (
          <>
            {' · '}
            <a href={image.wiki_license_url ?? '#'} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">
              {image.wiki_license}
            </a>
          </>
        )}
        {' · Wikimedia Commons'}
      </figcaption>
    );
  }
  if (image.alt_text) {
    return (
      <figcaption className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mt-2 px-4 sm:px-0">
        {image.alt_text}
      </figcaption>
    );
  }
  return null;
}

// ─── ArticleBody ──────────────────────────────────────────────────────────────
export default function ArticleBody({ content, images, title }: ArticleBodyProps) {
  const normalised = content.replace(/\r\n/g, '\n').replace(/\n(## )/g, '\n\n$1');
  const paragraphs = normalised
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !/^[\s\\n]+$/.test(p));

  // Distribute inline images evenly through paragraphs
  const insertEvery = images.length > 0
    ? Math.max(2, Math.floor(paragraphs.length / images.length))
    : 999;

  const blocks: (string | ArticleImage)[] = [];
  let imgIdx = 0;

  paragraphs.forEach((para, i) => {
    blocks.push(para);
    if ((i + 1) % insertEvery === 0 && imgIdx < images.length) {
      blocks.push(images[imgIdx++]);
    }
  });
  // Append any remaining images at the end
  while (imgIdx < images.length) blocks.push(images[imgIdx++]);

  return (
    <>
      {blocks.map((block, idx) => {
        if (typeof block === 'string') {
          return <RichBlock key={idx} text={block} />;
        }
        const img = block as ArticleImage;
        return (
          <figure key={img.id} className="my-8 sm:my-10 -mx-4 sm:mx-0">
            <div className="overflow-hidden sm:rounded-xl bg-muted">
              <img
                src={img.image_url}
                alt={img.alt_text || title}
                className="w-full h-auto block"
                style={{ maxHeight: '60vh', objectFit: 'cover', width: '100%' }}
                loading="lazy"
              />
            </div>
            <InlineImageCredit image={img} />
          </figure>
        );
      })}
    </>
  );
}