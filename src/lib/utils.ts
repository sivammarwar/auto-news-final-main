import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── cn ───────────────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── formatEra ────────────────────────────────────────────────────────────────
// Converts an era slug into a human-readable label for display.
export function formatEra(era: string | null | undefined): string {
  if (!era) return '';
  const map: Record<string, string> = {
    ancient:        'Ancient',
    medieval:       'Medieval',
    'early-modern': 'Early Modern',
    modern:         'Modern',
    all:            '',
  };
  return map[era] ?? era;
}

// ─── formatSubcategory ────────────────────────────────────────────────────────
// Converts a subcategory slug into a readable label.
export function formatSubcategory(slug: string | null | undefined): string {
  if (!slug) return 'History';
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── truncate ─────────────────────────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const trimmed = text.substring(0, maxLength);
  return trimmed.substring(0, trimmed.lastIndexOf(' ')) + '…';
}

// ─── readingTime ──────────────────────────────────────────────────────────────
// Estimates reading time in minutes from word count.
export function readingTime(content: string | null | undefined): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

// ─── slugToPath ───────────────────────────────────────────────────────────────
// Returns the correct /category/[slug] path for a history article.
// Uses subcategory if available, otherwise falls back to top-level category.
export function categoryPath(
  category: string,
  subcategory: string | null | undefined
): string {
  if (subcategory) return `/category/${subcategory}`;
  return `/category/${category}`;
}