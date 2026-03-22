// src/lib/image-pipeline.ts
// ════════════════════════════════════════════════════════════════════════════
// HISTORY IMAGE PIPELINE
//
// Priority order for ALL history articles:
//   1. Wikimedia Commons — searches using the article's AI-generated image
//      queries, falls back to subcategory defaults. Free CC/PD license only.
//   2. Pexels — atmospheric/contextual shots for any remaining slots.
//      Pexels license requires "Photo by [name] on Pexels" attribution.
//
// Entity detection (persons/places) is removed — history articles are about
// events, eras, and ideas, not named living individuals. Instead we use the
// AI-generated image_queries from Groq which are already optimized for
// historical visual content (ruins, artifacts, paintings, monuments).
// ════════════════════════════════════════════════════════════════════════════

const IMAGE_MIN_WIDTH = 800;

// ─── Per-subcategory Pexels fallback queries ──────────────────────────────────
// Used when AI queries + Wikimedia don't fill targetImages.
const SUBCATEGORY_FALLBACKS: Record<string, string[]> = {
  'ancient-civilizations':  ['ancient ruins archaeology', 'Egyptian pyramids desert', 'ancient Rome Colosseum', 'ancient Greece temple'],
  'medieval-feudal':        ['medieval castle ruins', 'gothic cathedral architecture', 'knights armor sword', 'medieval town historical'],
  'age-of-exploration':     ['old sailing ship ocean', 'antique map parchment', 'ancient compass navigation', 'explorer ship historical'],
  'revolutions-politics':   ['revolution protest historical', 'political uprising crowd', 'historical parliament building', 'revolution barricades'],
  'world-wars-conflicts':   ['World War memorial soldiers', 'war monument remembrance', 'military historical photo', 'battlefield memorial'],
  'colonial-imperial':      ['colonial era architecture', 'empire historical building', 'historical harbor ships', 'colonial monument'],
  'human-rights-movements': ['civil rights march historical', 'protest crowd historical', 'freedom march street', 'human rights memorial'],
  'science-technology':     ['science laboratory vintage', 'telescope observatory', 'industrial revolution machinery', 'ancient scientific instrument'],
  'religion-philosophy':    ['ancient temple ruins', 'gothic cathedral interior', 'ancient manuscript scroll', 'monastery stone building'],
  'cultural-social':        ['ancient art museum', 'historical textile fashion', 'ancient theater ruins', 'cultural heritage artifact'],
  'economic-trade':         ['Silk Road caravan desert', 'ancient market bazaar', 'historical coins currency', 'ancient trade port ships'],
  'military-warfare':       ['ancient battlefield ruins', 'military armor weapons museum', 'medieval siege castle', 'ancient fortress wall'],
  'regional-history':       ['ancient world heritage site', 'archaeological ruins landscape', 'ancient palace architecture', 'historical monument ruins'],
  'archaeology-mysteries':  ['archaeological excavation dig', 'ancient mystery ruins stone', 'Stonehenge ancient stone', 'archaeological artifact display'],
  'famous-figures':         ['historical portrait museum painting', 'ancient sculpture bust museum', 'historical monument leader', 'ancient ruler artifact'],
  // ── NEW ──
  'beyond-human-limits':    ['human achievement triumph historical', 'moon landing space NASA', 'engineering marvel construction historical', 'first flight aviation Wright brothers'],
  'historys-unsung-heroes': ['ordinary people courage historical', 'humanitarian aid help historical', 'forgotten hero memorial monument', 'resilience community strength historical'],
};

// General fallback used when subcategory is unknown
const GENERAL_HISTORY_FALLBACKS = [
  'ancient ruins archaeology',
  'historical monument heritage',
  'ancient civilization artifact',
  'history museum display',
];

interface HistoryPhoto {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  source: 'wikimedia' | 'pexels';
  // Attribution — required by both Pexels and Wikimedia CC licenses
  photographer?: string | null;
  photographerUrl?: string | null;
  wikiAttribution?: string | null;
  wikiLicense?: string | null;
  wikiLicenseUrl?: string | null;
}

interface HistoryImagePipelineParams {
  supabase: any;
  articleId: number;
  title: string;
  subcategory: string;
  imageQueries?: string[];   // AI-generated Pexels/Wikimedia queries from Groq
  targetImages?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
export async function historyFetchAndSaveImages({
  supabase,
  articleId,
  title,
  subcategory,
  imageQueries = [],
  targetImages = 6,
}: HistoryImagePipelineParams): Promise<number> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  const allPhotos: HistoryPhoto[] = [];
  const seen = new Set<string>();

  const add = (photos: HistoryPhoto[]) => {
    for (const p of photos) {
      if (!seen.has(p.id)) { seen.add(p.id); allPhotos.push(p); }
    }
  };

  const fallbacks = SUBCATEGORY_FALLBACKS[subcategory] ?? GENERAL_HISTORY_FALLBACKS;

  // ── 1. Wikimedia from AI image queries ────────────────────────────────────
  const validQueries = imageQueries.filter(q => q?.trim().length > 2);
  for (const q of validQueries.slice(0, 4)) {
    if (allPhotos.length >= targetImages) break;
    const photos = await fetchWikimediaImages(q, 2);
    add(photos);
    if (photos.length > 0) console.log(`   📜 Wikimedia "${q}": ${photos.length}`);
    await sleep(250);
  }

  // ── 2. Wikimedia from subcategory fallbacks ───────────────────────────────
  if (allPhotos.length < Math.ceil(targetImages / 2)) {
    for (const q of fallbacks.slice(0, 3)) {
      if (allPhotos.length >= targetImages) break;
      const photos = await fetchWikimediaImages(q, 2);
      add(photos);
      if (photos.length > 0) console.log(`   📜 Wikimedia fallback "${q}": ${photos.length}`);
      await sleep(250);
    }
  }

  // ── 3. Pexels fill from AI queries ────────────────────────────────────────
  if (pexelsKey && allPhotos.length < targetImages) {
    for (const q of validQueries.slice(0, 4)) {
      if (allPhotos.length >= targetImages) break;
      const photos = await fetchPexelsImages(pexelsKey, q, 2);
      add(photos);
      await sleep(350);
    }
  }

  // ── 4. Pexels fill from subcategory fallbacks ─────────────────────────────
  if (pexelsKey && allPhotos.length < targetImages) {
    for (const q of fallbacks) {
      if (allPhotos.length >= targetImages) break;
      const photos = await fetchPexelsImages(pexelsKey, q, 2);
      add(photos);
      await sleep(350);
    }
  }

  if (allPhotos.length === 0) {
    console.log(`   ⚠ No images found for article #${articleId}`);
    return 0;
  }

  const toSave = allPhotos.slice(0, targetImages);
  const wikiCount  = toSave.filter(p => p.source === 'wikimedia').length;
  const pexelCount = toSave.filter(p => p.source === 'pexels').length;
  console.log(`   🖼  Saving ${toSave.length} (${wikiCount} Wikimedia + ${pexelCount} Pexels)`);

  // Save with full attribution columns
  const imageRows = toSave.map((photo, i) => ({
    article_id:       articleId,
    image_url:        photo.url,
    alt_text:         photo.alt || title,
    position:         i,
    width:            photo.width  || 1200,
    height:           photo.height || 800,
    size_kb:          0,
    image_source:     photo.source,
    photographer:     photo.photographer     ?? null,
    photographer_url: photo.photographerUrl  ?? null,
    wiki_attribution: photo.wikiAttribution  ?? null,
    wiki_license:     photo.wikiLicense      ?? null,
    wiki_license_url: photo.wikiLicenseUrl   ?? null,
  }));

  const { error } = await supabase.from('article_images').insert(imageRows);
  if (error) { console.log(`   ✗ Image DB error: ${error.message}`); return 0; }

  await supabase.from('articles').update({ image_url: imageRows[0].image_url }).eq('id', articleId);
  return toSave.length;
}

// ════════════════════════════════════════════════════════════════════════════
// WIKIMEDIA FETCHER
// Free-license images only (CC0, CC-BY, CC-BY-SA, Public Domain).
// ════════════════════════════════════════════════════════════════════════════
async function fetchWikimediaImages(searchTerm: string, count = 2): Promise<HistoryPhoto[]> {
  const photos: HistoryPhoto[] = [];
  const WIKI = 'https://en.wikipedia.org/w/api.php';

  try {
    // Search File namespace directly
    const searchRes = await fetch(
      `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=${count * 4}&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return fetchWikimediaViaArticle(searchTerm, count);
    const searchData = await searchRes.json();
    const results: any[] = searchData?.query?.search ?? [];

    for (const result of results) {
      if (photos.length >= count) break;
      if (!result.title?.startsWith('File:')) continue;

      const infoRes = await fetch(
        `${WIKI}?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json&origin=*`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();

      for (const page of Object.values(infoData?.query?.pages ?? {}) as any[]) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
        if ((info.thumbwidth || info.width) < IMAGE_MIN_WIDTH) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        if (!isFreeWikimediaLicense(license)) continue;

        photos.push({
          id:              `wiki_${page.pageid}`,
          url:             info.thumburl || info.url,
          alt:             stripHtml(info.extmetadata?.ImageDescription?.value ?? '') || `${searchTerm} — Wikimedia Commons`,
          width:           info.thumbwidth  || info.width,
          height:          info.thumbheight || info.height,
          source:          'wikimedia',
          wikiAttribution: stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Wikimedia Commons contributor',
          wikiLicense:     license,
          wikiLicenseUrl:  info.extmetadata?.LicenseUrl?.value ?? '',
        });
        if (photos.length >= count) break;
      }
      await sleep(150);
    }
  } catch (e: any) {
    console.log(`   ⚠ Wikimedia error "${searchTerm}": ${e.message}`);
  }

  return photos.length > 0 ? photos : fetchWikimediaViaArticle(searchTerm, count);
}

// Fallback: find a Wikipedia article and extract its images
async function fetchWikimediaViaArticle(searchTerm: string, count = 2): Promise<HistoryPhoto[]> {
  const photos: HistoryPhoto[] = [];
  const WIKI = 'https://en.wikipedia.org/w/api.php';

  try {
    const searchRes = await fetch(
      `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srlimit=2&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return photos;
    const searchData = await searchRes.json();
    const pageTitle  = searchData?.query?.search?.[0]?.title;
    if (!pageTitle) return photos;

    const imagesRes = await fetch(
      `${WIKI}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=15&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!imagesRes.ok) return photos;
    const imagesData = await imagesRes.json();
    const pages = Object.values(imagesData?.query?.pages ?? {}) as any[];
    const imageFiles: string[] = (pages[0]?.images ?? [])
      .map((i: any) => i.title as string)
      .filter((t: string) =>
        /\.(jpg|jpeg|png|webp)$/i.test(t) &&
        !t.toLowerCase().includes('icon') &&
        !t.toLowerCase().includes('logo') &&
        !t.toLowerCase().includes('flag') &&
        !t.toLowerCase().includes('map')
      );

    for (const fileTitle of imageFiles.slice(0, count * 4)) {
      if (photos.length >= count) break;

      const infoRes = await fetch(
        `${WIKI}?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json&origin=*`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();

      for (const page of Object.values(infoData?.query?.pages ?? {}) as any[]) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
        if ((info.thumbwidth || info.width) < IMAGE_MIN_WIDTH) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        if (!isFreeWikimediaLicense(license)) continue;

        photos.push({
          id:              `wiki_${page.pageid}`,
          url:             info.thumburl || info.url,
          alt:             stripHtml(info.extmetadata?.ImageDescription?.value ?? '') || `${searchTerm} — Wikimedia Commons`,
          width:           info.thumbwidth  || info.width,
          height:          info.thumbheight || info.height,
          source:          'wikimedia',
          wikiAttribution: stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Wikimedia Commons contributor',
          wikiLicense:     license,
          wikiLicenseUrl:  info.extmetadata?.LicenseUrl?.value ?? '',
        });
        if (photos.length >= count) break;
      }
      await sleep(150);
    }
  } catch (e: any) {
    console.log(`   ⚠ Wikimedia article fallback error: ${e.message}`);
  }

  return photos;
}

// ════════════════════════════════════════════════════════════════════════════
// PEXELS FETCHER
// ════════════════════════════════════════════════════════════════════════════
async function fetchPexelsImages(key: string, query: string, count = 2): Promise<HistoryPhoto[]> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count * 4}&orientation=landscape`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos ?? [])
      .filter((p: any) => p.width >= IMAGE_MIN_WIDTH)
      .slice(0, count)
      .map((p: any) => ({
        id:              `pexels_${p.id}`,
        url:             p.src.large2x || p.src.large,
        alt:             p.alt || query,
        width:           p.width,
        height:          p.height,
        source:          'pexels' as const,
        photographer:    p.photographer    ?? null,
        photographerUrl: p.photographer_url ?? null,
      }));
  } catch { return []; }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function isFreeWikimediaLicense(license: string): boolean {
  if (!license) return false;
  const free = ['cc0', 'cc-by', 'cc by', 'public domain', 'pd', 'cc-sa', 'cc by-sa', 'attribution'];
  return free.some(f => license.toLowerCase().includes(f));
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}