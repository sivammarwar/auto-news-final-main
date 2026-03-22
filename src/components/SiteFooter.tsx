'use client';

import Link from 'next/link';

const FOOTER_CATEGORIES = [
  { label: '🏛️ Ancient Civilizations',   path: '/category/ancient-civilizations' },
  { label: '⚔️ Medieval & Feudal',         path: '/category/medieval-feudal' },
  { label: '🧭 Age of Exploration',        path: '/category/age-of-exploration' },
  { label: '✊ Revolutions & Politics',    path: '/category/revolutions-politics' },
  { label: '🎖️ World Wars & Conflicts',   path: '/category/world-wars-conflicts' },
  { label: '🌐 Colonial & Imperial',       path: '/category/colonial-imperial' },
  { label: '🕊️ Human Rights Movements',   path: '/category/human-rights-movements' },
  { label: '🔬 Science & Technology',      path: '/category/science-technology' },
  { label: '📿 Religion & Philosophy',     path: '/category/religion-philosophy' },
  { label: '🎭 Cultural & Social',         path: '/category/cultural-social' },
  { label: '🏺 Economic & Trade',          path: '/category/economic-trade' },
  { label: '🗡️ Military & Warfare',        path: '/category/military-warfare' },
  { label: '🗺️ Regional History',          path: '/category/regional-history' },
  { label: '🔍 Archaeology & Mysteries',   path: '/category/archaeology-mysteries' },
  { label: '👑 Famous Figures & Leaders',  path: '/category/famous-figures' },
  { label: '🚀 Beyond Human Limits',       path: '/category/beyond-human-limits' },
  { label: "⭐ History's Unsung Heroes",   path: '/category/historys-unsung-heroes' },
];

const SiteFooter = () => {
  return (
    /*
      CLS FIX: The footer was causing a 0.592 layout shift — the largest culprit.
      Root cause: font loading (especially font-mono / tracking classes) caused
      all text nodes to reflow after paint, shifting everything below the fold.

      Fixes applied:
      1. `contain: layout` on the footer — prevents internal layout changes from
         affecting elements outside the footer (stops upward CLS propagation).
      2. `min-h-[320px]` — reserves space so the footer occupies its final height
         before fonts load, preventing the page from reflowing around it.
      3. `[font-synthesis:none]` — stops the browser from synthesizing bold/italic
         variants before the real font loads, which is a major source of text CLS.
      4. `will-change: auto` (implicit) — removed any unnecessary transforms.
    */
    <footer
      className="bg-background border-t border-border pt-12 pb-8 px-4 sm:px-6 min-h-[320px] [contain:layout] [font-synthesis:none]"
    >
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">

          {/* Brand */}
          <div>
            <Link
              href="/"
              className="font-bold text-xl tracking-tightest text-foreground hover:text-primary transition-colors"
            >
              <span className="font-mono text-[11px] text-muted-foreground tracking-[0.2em] uppercase align-middle ml-1">
                History
              </span>
            </Link>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground uppercase tracking-tighter max-w-xs">
              The history they taught you — and the history they buried. Original writing. Zero copyright risk.
            </p>
          </div>

          {/* Category columns */}
          <div className="lg:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Explore by Era &amp; Theme
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
              {FOOTER_CATEGORIES.map(cat => (
                <Link
                  key={cat.path}
                  href={cat.path}
                  className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground hover:text-primary transition-colors leading-relaxed"
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-tighter">
            © 2026 Hidden Facts. All content is original writing.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms"   className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors">Terms</Link>
            <Link href="/rss"     className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors">RSS</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;