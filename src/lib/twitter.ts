// twitter.ts previously fetched tweets for news categories.
// Twitter/X is no longer needed for a history content site.
// This file now exports the Pexels image fetching utilities
// used alongside Wikimedia in the history image pipeline.

const IMAGE_MIN_WIDTH = 800;

export interface PexelsPhoto {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  pexelsPageUrl: string;
}

// Per-query page tracking to avoid showing the same images on consecutive runs
const _pageMap = new Map<string, number>();

function getNextPage(query: string): number {
  const current = _pageMap.get(query) ?? 1;
  _pageMap.set(query, current >= 15 ? 1 : current + 1);
  return current;
}

export function resetPexelsPageMap(): void {
  _pageMap.clear();
}

// ─── fetchPexelsImages ────────────────────────────────────────────────────────
// Searches Pexels for landscape history images.
// Pexels license requires showing "Photo by [name] on Pexels" attribution.
export async function fetchPexelsImages(
  query: string,
  count = 2,
  usedIds?: Set<string>
): Promise<PexelsPhoto[]> {
  const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  if (!pexelsKey) {
    console.warn('fetchPexelsImages: NEXT_PUBLIC_PEXELS_API_KEY not set');
    return [];
  }

  const results: PexelsPhoto[] = [];
  const page    = getNextPage(query);
  const perPage = Math.min(count * 5, 25);

  try {
    const ctrl = new AbortController();
    const t    = setTimeout(() => ctrl.abort(), 8000);
    const res  = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`,
      { signal: ctrl.signal, headers: { Authorization: pexelsKey } }
    );
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();

    for (const p of data.photos ?? []) {
      if (results.length >= count) break;
      if (p.width < IMAGE_MIN_WIDTH) continue;
      const pid = `pexels_${p.id}`;
      if (usedIds?.has(pid)) continue;
      results.push({
        id:              pid,
        url:             p.src.large2x || p.src.large,
        alt:             p.alt || query,
        width:           p.width,
        height:          p.height,
        photographer:    p.photographer    ?? '',
        photographerUrl: p.photographer_url ?? '',
        pexelsPageUrl:   p.url             ?? '',
      });
    }
  } catch (e: any) {
    console.error('fetchPexelsImages error:', e.message);
  }

  return results;
}

// ─── fetchPexelsForArticle ────────────────────────────────────────────────────
// Higher-level helper: tries multiple queries until it collects enough photos.
export async function fetchPexelsForArticle(
  imageQueries: string[],
  categoryFallbacks: string[],
  count = 4,
  usedIds?: Set<string>
): Promise<PexelsPhoto[]> {
  const all = [...imageQueries, ...categoryFallbacks];
  const results: PexelsPhoto[] = [];
  const seen = usedIds ?? new Set<string>();

  for (const query of all) {
    if (results.length >= count) break;
    const photos = await fetchPexelsImages(query, count - results.length, seen);
    for (const p of photos) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        results.push(p);
      }
    }
    // Small delay between Pexels requests
    await new Promise(r => setTimeout(r, 250));
  }

  return results.slice(0, count);
}