import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'What Hidden Facts is, why it exists, and who writes it.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">

        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          About
        </span>

        <h1
          className="font-bold text-foreground mt-4 mb-8 leading-[1.05]"
          style={{ fontSize: 'clamp(2rem, 6vw, 3.25rem)', textWrap: 'balance' } as React.CSSProperties}
        >
          The history they taught you and the history they buried.
        </h1>

        <div className="space-y-6 text-[1.0625rem] leading-[1.8] text-muted-foreground">

          <p>
            Hidden Facts exists for one reason: most history education gives you the outline
            and skips the substance. The dates, the names, the approved narrative.
            What gets left out is often the most important part.
          </p>

          <p>
            This site publishes deeply researched articles across 17 categories of world history.
            Ancient civilizations, military conflicts, forgotten revolutions, the people who shaped
            empires, and the events that textbooks quietly glossed over.{' '}
            <span className="text-foreground font-semibold">Around 17 new articles go live every day</span>,
            published in the early hours between 4:00 AM and 7:00 AM.
          </p>

          <div className="border-l-4 border-primary pl-5 py-1 my-8">
            <p className="text-foreground font-medium leading-relaxed">
              {'"History isn\'t just the past. It\'s the explanation for almost everything happening right now."'}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground mt-3">
              {'— Arjun Mehta'}
            </p>
          </div>

          <h2 className="font-bold text-foreground text-xl pt-2">The Author</h2>

          <p>
            Every article on Hidden Facts is written by{' '}
            <span className="text-foreground font-semibold">Arjun Mehta</span>{' '}
            a historian and investigative journalist who has spent over a decade obsessing over
            the chapters of history that rarely make it into classrooms.
          </p>

          <p>
            Arjun writes with a direct, no-nonsense voice. No academic padding, no vague summaries.
            Just the real story, why it matters, and what it still explains about the world today.
            His rule is simple: if it is not interesting enough to stop you mid-scroll, it does not
            get published.
          </p>

          <h2 className="font-bold text-foreground text-xl pt-2">What We Cover</h2>

          <p>
            Seventeen categories from ancient civilizations and medieval warfare to colonial empires,
            human rights movements, scientific breakthroughs, the feats that defied all logic,
            the unsung heroes history forgot to celebrate, and famous figures who changed
            the course of events. Every piece is original, sourced from historical record,
            and written to be read by anyone, not just historians.
          </p>

          <div className="flex flex-wrap gap-2 py-2">
            {[
              { label: '🏛️ Ancient',          path: '/category/ancient-civilizations' },
              { label: '⚔️ Medieval',          path: '/category/medieval-feudal' },
              { label: '🎖️ World Wars',        path: '/category/world-wars-conflicts' },
              { label: '🔬 Science',            path: '/category/science-technology' },
              { label: '👑 Famous Figures',     path: '/category/famous-figures' },
              { label: '🔍 Archaeology',        path: '/category/archaeology-mysteries' },
              { label: '🕊️ Human Rights',      path: '/category/human-rights-movements' },
              { label: '🌐 Colonial',           path: '/category/colonial-imperial' },
              { label: '🚀 Beyond Human Limits', path: '/category/beyond-human-limits' },
              { label: "⭐ Unsung Heroes",      path: '/category/historys-unsung-heroes' },
            ].map(c => (
              <Link
                key={c.path}
                href={c.path}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:text-primary hover:bg-muted px-3 py-1.5 rounded-full border border-border hover:border-primary transition-colors whitespace-nowrap"
              >
                {c.label}
              </Link>
            ))}
          </div>

          <div className="border border-border rounded-xl p-6 mt-6 bg-muted/30">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Get in touch
            </p>
            <p className="text-foreground font-medium mb-1">
              Questions, corrections, or feedback?
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Every article on this site is thoroughly researched, but history is vast and occasionally
              a date, name, or detail may slip through incorrectly. If you spot something that
              does not look right, please point it out. Accuracy matters here, and corrections
              are always welcome.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              For mistakes, broken links, or anything else, send a mail. Every message gets read.
            </p>
            <a
              href="mailto:gys738421@gmail.com"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-primary hover:underline"
            >
              {'gys738421@gmail.com ->'}
            </a>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}