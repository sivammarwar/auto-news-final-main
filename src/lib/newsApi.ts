// newsapi.ts is no longer used for fetching external news.
// This file now exports history-specific helpers used across the pipeline.

// ─── History subcategory slugs ────────────────────────────────────────────────
export const HISTORY_SUBCATEGORY_SLUGS = [
  'ancient-civilizations',
  'medieval-feudal',
  'age-of-exploration',
  'revolutions-politics',
  'world-wars-conflicts',
  'colonial-imperial',
  'human-rights-movements',
  'science-technology',
  'religion-philosophy',
  'cultural-social',
  'economic-trade',
  'military-warfare',
  'regional-history',
  'archaeology-mysteries',
  'famous-figures',
] as const;

export type HistorySubcategory = (typeof HISTORY_SUBCATEGORY_SLUGS)[number];

// ─── Era labels ───────────────────────────────────────────────────────────────
export const ERA_LABELS: Record<string, string> = {
  ancient:      'Ancient (before 500 AD)',
  medieval:     'Medieval (500–1500 AD)',
  'early-modern': 'Early Modern (1500–1800)',
  modern:       'Modern (1800–present)',
  all:          'All eras',
};

// ─── Validate that a slug is a known history subcategory ─────────────────────
export function isHistorySubcategory(slug: string): slug is HistorySubcategory {
  return (HISTORY_SUBCATEGORY_SLUGS as readonly string[]).includes(slug);
}

// ─── Slugify a subcategory label for use in URLs ──────────────────────────────
export function labelToSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Build a readable title from a slug ──────────────────────────────────────
export function slugToLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}