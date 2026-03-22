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
];

const SiteHeader = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname    = usePathname();
  // Stable ID for aria-controls linking button → dropdown panel
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

  // Lock body scroll when mobile drawer is open; always restore on unmount
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Close dropdown on Escape key
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

          {/* Logo */}
          <Link
            href="/"
            aria-label="Hidden Facts — home"
            className="shrink-0 flex items-center gap-3 text-black"
          >
            {/*
              fetchPriority="high": logo is above-the-fold LCP candidate.
              Do NOT add loading="lazy" here — it would conflict with fetchPriority.
            */}
            <img
              src="/logo.webp"
              alt="Hidden Facts logo"
              width={132}
              height={145}
              className="h-16 w-auto object-contain"
              fetchPriority="high"
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

          {/* Desktop nav — labelled so screen readers can distinguish it from the mobile nav */}
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
                    {/*
                      FIX: Removed role="menu" / role="menuitem".
                      These ARIA roles are for application menus (e.g. Cut/Copy/Paste),
                      NOT for navigation links. Using them on <a> elements fails
                      accessibility audits and breaks screen reader behaviour.
                      A plain <nav> wrapping <Link>s is the correct pattern.
                    */}
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
                {/*
                  FIX: Identical links — desktop nav also has "Home" and "About".
                  Accessibility audit flags identical link text pointing to the same
                  href across the page. We disambiguate with aria-label on mobile links.
                */}
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