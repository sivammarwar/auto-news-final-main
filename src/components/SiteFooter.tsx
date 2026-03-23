'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { label: 'Ancient Civilizations',   emoji: '🏛️', path: '/category/ancient-civilizations' },
  { label: 'Medieval & Feudal',        emoji: '⚔️',  path: '/category/medieval-feudal' },
  { label: 'Age of Exploration',       emoji: '🧭', path: '/category/age-of-exploration' },
  { label: 'Revolutions & Politics',   emoji: '✊',  path: '/category/revolutions-politics' },
  { label: 'World Wars & Conflicts',   emoji: '🎖️', path: '/category/world-wars-conflicts' },
  { label: 'Colonial & Imperial',      emoji: '🌐', path: '/category/colonial-imperial' },
  { label: 'Human Rights Movements',   emoji: '🕊️', path: '/category/human-rights-movements' },
  { label: 'Science & Technology',     emoji: '🔬', path: '/category/science-technology' },
  { label: 'Religion & Philosophy',    emoji: '📿', path: '/category/religion-philosophy' },
  { label: 'Cultural & Social',        emoji: '🎭', path: '/category/cultural-social' },
  { label: 'Economic & Trade',         emoji: '🏺', path: '/category/economic-trade' },
  { label: 'Military & Warfare',       emoji: '🗡️', path: '/category/military-warfare' },
  { label: 'Regional History',         emoji: '🗺️', path: '/category/regional-history' },
  { label: 'Archaeology & Mysteries',  emoji: '🔍', path: '/category/archaeology-mysteries' },
  { label: 'Famous Figures & Leaders', emoji: '👑', path: '/category/famous-figures' },
  { label: 'Beyond Human Limits',      emoji: '🚀', path: '/category/beyond-human-limits' },
  { label: "History's Unsung Heroes",  emoji: '⭐', path: '/category/historys-unsung-heroes' },
];

/*
  LCP FIX: Logo inlined as base64 data URL.
  At 1KB the logo is tiny — base64 adds ~33% overhead making it ~1.4KB in the
  JS bundle, which is negligible. The benefit is zero network requests:
    - Eliminates 340ms resource load delay (was blocked by render-blocking CSS)
    - Eliminates 620ms resource load duration (downloading on slow 4G)
  Only the element render delay remains (AdSense JS on main thread — not fixable).
  fetchPriority removed — meaningless for data URLs, no request to prioritize.
  Also remove <link rel="preload" href="/logo.webp"> from layout.tsx.
*/
const LOGO_DATA_URL =
  'data:image/webp;base64,UklGRigEAABXRUJQVlA4IBwEAACQHwCdASqEAJEAP5XA1mS4rzgpJ9RrSxAyiWMA17mder+fAfRrPn9nue+yuV8El5NH4YyVnovBj++FmVjms29Ijyf2b9XBWQNKgEA+rDovKIZ+rPAie1uKUzIpx6iY49zl3t6ARL01lpq44oafQmBHOfxO9eCsyWOaj1Vz6FYU+vyugwE1G1k2QgLAuV1xLQUaB/V7GNmrEyL/nn97Zo6kAReM9xeUIOJYKcZJOiKuzewNpbLnQlIp+b25AV3xZ032nLi7mUIIcFKCVL1coyo6Q/+6L3CEXvjOp9Ue2deG08JzEgz1owqRz1gqJEua7tqzRm6f/qivq0XF6nt85OTWFLk40oAA/u4gg5+1zHuaFAJ+gQ0LKG31CpGOxofnxG6/PLSmuHMDmpzOHVm7yuUEWV08HGCr9pmFDaMbTaku3jCd3qFp5OVvakHxqRFfG7vyQ5LWfgPNG3FMLNbylcyTfFtCc4CrYY+klGEjHOB9RH3GnTFqIlQuctsPmaA5tSD/HAe229yHfMmvDz1FIm1iPNnTU/6ye3d5CSOdE+Xpx5hkVwdh/hUSJ1JJ3leMqpj5qgFOHp5egYiUeeYLoUnUQKf18SaKIq8a6HiSBpTsWUP8k/ifsQUlgn1Ni7pnrLDzjY9B9JQ6J5ULz+ARPXO7pUkX7SxnH4u3tJ+1asDh1oqb4wy3z9v9lE3wyu4BBRMHHnLUG/73X+gejkO+S9uCtEXurbKqCcNDmYXszKzfgix7j0nkjUix0Fr4ezjQWwy6qgYk4C/QHn6slOyJ1Vi0Eom3cYIipe+6C+BOAOT2i4+n1Et0+mXmDiKAw1SNnZD55rrdH7JHhcw9VABMqvL7W4M+bFy/6evLtxqOUryBHPNW+nw55cKawBppx2nDQEgI0/eyO5dyugnbFmUW+uTq3vrm2l0aZnqan9GvCmaH75oF2SWcYuKgP8ZJnSqAS7TS9nHb6CRqjdYYOBa3+88FIOaNQqueDUG/EHV9oOY54n4WAgLXH3i7MQgvToCf6fqEd0/gm9GhaelVM/zcW4uOuRWBpoqYeuiCdESr8INoTd5guh6Cc0Sgcn2mWydG3MsSPep3HJZCR+Pfkm1n/+EqvlXz3cswc5BuWjtYfmsB5nQFeQgF8eoXpfHDsnRqRUZCKkG+zMPxIO4My6+XNA+HsByd5jiztEqknNNDLBsuMzF3Cq0LxVkpJigJpKKhZ+/FOIz0D7J6vD+f3mAnF3kxH5SVaBRIZF6fpuSgSNOu0oXtS/L19yJJwxkj+qxDjENK9gjVSniTm9jJ3CRlGiKe6LfyQEMy9SDr35wZ63QW+ksJBhS2Jj7MYvQGKMsg5EIlr1URD7wpnyQvSzywDVJWioxycJkQD4FuQ/zzd1D27f1ATLX8fAAAAAAAAA==';

const SiteHeader = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname    = usePathname();
  const dropdownId  = useId();

  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 sm:h-16 flex items-center justify-between gap-4">

          {/* Logo — inlined as data URL, zero network request */}
          <Link
            href="/"
            aria-label="Hidden Facts — home"
            className="shrink-0 flex items-center gap-3 text-black"
          >
            <img
              src={LOGO_DATA_URL}
              alt="Hidden Facts logo"
              width={132}
              height={145}
              className="h-16 w-auto object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-xl tracking-tight text-foreground">
                Hidden Facts
              </span>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
                aria-hidden="true"
              >
                The History Books Left This Out
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              aria-label="Home — Hidden Facts"
              aria-current={pathname === '/' ? 'page' : undefined}
              className={`font-mono text-[11px] uppercase tracking-[0.15em] transition-colors hover:text-primary ${
                pathname === '/' ? 'text-primary font-bold' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>

            <Link
              href="/about"
              aria-current={pathname === '/about' ? 'page' : undefined}
              className={`font-mono text-[11px] uppercase tracking-[0.15em] transition-colors hover:text-primary ${
                pathname === '/about' ? 'text-primary font-bold' : 'text-muted-foreground'
              }`}
            >
              About
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-controls={dropdownId}
                className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors hover:text-primary ${
                  dropdownOpen ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Explore History
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    id={dropdownId}
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1 }}
                    exit={{ opacity: 0,  y: -6,   scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 mt-3 w-96 bg-background border border-border rounded-xl shadow-xl overflow-hidden"
                  >
                    <nav aria-label="History categories">
                      <div className="p-2 grid grid-cols-2 gap-0.5">
                        {CATEGORIES.map(cat => (
                          <Link
                            key={cat.path}
                            href={cat.path}
                            aria-current={pathname === cat.path ? 'page' : undefined}
                            className={`flex items-center gap-2 px-3 py-3 rounded-lg font-mono text-[10px] uppercase tracking-[0.1em] transition-colors min-h-[44px] ${
                              pathname === cat.path
                                ? 'bg-muted text-primary font-bold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <span className="text-sm shrink-0" aria-hidden="true">{cat.emoji}</span>
                            {cat.label}
                          </Link>
                        ))}
                      </div>
                    </nav>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Mobile hamburger — min 44×44 px tap target */}
          <button
            className="md:hidden flex flex-col justify-center items-center gap-[5px] w-11 h-11 -mr-1 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(v => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <span className={`block w-5 h-[2px] bg-foreground transition-all duration-300 origin-center ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-5 h-[2px] bg-foreground transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block w-5 h-[2px] bg-foreground transition-all duration-300 origin-center ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              style={{ top: '3.5rem' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              id="mobile-nav-drawer"
              aria-label="Mobile navigation"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.24, ease: 'easeInOut' }}
              className="fixed top-14 right-0 bottom-0 z-50 w-[85vw] max-w-xs bg-background border-l border-border overflow-y-auto md:hidden"
            >
              <div className="p-4">
                <Link
                  href="/"
                  aria-label="Home — Hidden Facts (mobile)"
                  aria-current={pathname === '/' ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors min-h-[44px] ${
                    pathname === '/' ? 'bg-muted text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-base" aria-hidden="true">🏠</span> Home
                </Link>

                <Link
                  href="/about"
                  aria-label="About — Hidden Facts (mobile)"
                  aria-current={pathname === '/about' ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-2 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors min-h-[44px] ${
                    pathname === '/about' ? 'bg-muted text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-base" aria-hidden="true">📖</span> About
                </Link>

                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-3 py-2">
                  Explore History
                </p>

                {CATEGORIES.map((cat, i) => (
                  <motion.div
                    key={cat.path}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.02, duration: 0.18 }}
                  >
                    <Link
                      href={cat.path}
                      aria-current={pathname === cat.path ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors min-h-[44px] ${
                        pathname === cat.path ? 'bg-muted text-primary font-bold' : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="text-lg w-6 text-center shrink-0" aria-hidden="true">{cat.emoji}</span>
                      <span className="font-medium">{cat.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SiteHeader;