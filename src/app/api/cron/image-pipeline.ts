// src/lib/image-pipeline.ts
// ════════════════════════════════════════════════════════════════════════════
// HYBRID IMAGE PIPELINE — Priority order per category:
//
//   BOLLYWOOD articles:
//     1. OMDb API — official IMDB movie posters (free, commercial use OK)
//     2. Wikimedia — actor/director photos
//     3. Pexels — film sets, cinema, mood shots
//
//   CRICKET articles:
//     1. Wikimedia — action shots using smart cricket search terms
//     2. Pexels — stadium/crowd atmosphere shots
//
//   ALL OTHER categories:
//     1. Wikimedia — persons/places detected in title
//     2. Pexels — context/atmospheric shots
// ════════════════════════════════════════════════════════════════════════════

const IMAGE_MIN_WIDTH = 800;

const KNOWN_PERSONS: Record<string, string> = {
  'virat kohli': 'Virat Kohli', 'kohli': 'Virat Kohli',
  'rohit sharma': 'Rohit Sharma cricketer', 'rohit': 'Rohit Sharma cricketer',
  'ms dhoni': 'MS Dhoni', 'dhoni': 'MS Dhoni',
  'sachin tendulkar': 'Sachin Tendulkar', 'sachin': 'Sachin Tendulkar',
  'bumrah': 'Jasprit Bumrah', 'jasprit bumrah': 'Jasprit Bumrah',
  'shubman gill': 'Shubman Gill', 'shreyas iyer': 'Shreyas Iyer cricketer',
  'sanju samson': 'Sanju Samson', 'hardik pandya': 'Hardik Pandya',
  'ravindra jadeja': 'Ravindra Jadeja', 'smriti mandhana': 'Smriti Mandhana',
  'pat cummins': 'Pat Cummins', 'ben stokes': 'Ben Stokes', 'joe root': 'Joe Root cricketer',
  'ranveer singh': 'Ranveer Singh actor', 'ranveer': 'Ranveer Singh actor',
  'deepika padukone': 'Deepika Padukone', 'deepika': 'Deepika Padukone',
  'shah rukh khan': 'Shah Rukh Khan', 'srk': 'Shah Rukh Khan',
  'aamir khan': 'Aamir Khan actor', 'salman khan': 'Salman Khan actor',
  'ranbir kapoor': 'Ranbir Kapoor', 'alia bhatt': 'Alia Bhatt',
  'nora fatehi': 'Nora Fatehi', 'priyanka chopra': 'Priyanka Chopra',
  'katrina kaif': 'Katrina Kaif', 'hrithik roshan': 'Hrithik Roshan',
  'akshay kumar': 'Akshay Kumar actor', 'taapsee pannu': 'Taapsee Pannu',
  'vidya balan': 'Vidya Balan', 'kangana ranaut': 'Kangana Ranaut',
  'ayushmann khurrana': 'Ayushmann Khurrana', 'vicky kaushal': 'Vicky Kaushal actor',
  'sara ali khan': 'Sara Ali Khan', 'janhvi kapoor': 'Janhvi Kapoor',
  'tiger shroff': 'Tiger Shroff', 'kartik aaryan': 'Kartik Aaryan',
  'rajkummar rao': 'Rajkummar Rao', 'pankaj tripathi': 'Pankaj Tripathi actor',
  'nawazuddin siddiqui': 'Nawazuddin Siddiqui', 'irrfan khan': 'Irrfan Khan',
  'siddharth malhotra': 'Sidharth Malhotra actor', 'ananya panday': 'Ananya Panday',
  'shraddha kapoor': 'Shraddha Kapoor', 'kareena kapoor': 'Kareena Kapoor',
  'kajol': 'Kajol actress', 'madhuri dixit': 'Madhuri Dixit',
  'aishwarya rai': 'Aishwarya Rai', 'amitabh bachchan': 'Amitabh Bachchan',
  'abhishek bachchan': 'Abhishek Bachchan', 'sunny deol': 'Sunny Deol actor',
  'bobby deol': 'Bobby Deol actor', 'rohit shetty': 'Rohit Shetty director',
  'karan johar': 'Karan Johar director', 'sanjay leela bhansali': 'Sanjay Leela Bhansali',
  'farhan akhtar': 'Farhan Akhtar', 'konkona sen sharma': 'Konkona Sen Sharma',
  'manoj bajpayee': 'Manoj Bajpayee',
  'modi': 'Narendra Modi', 'narendra modi': 'Narendra Modi',
  'rahul gandhi': 'Rahul Gandhi', 'yogi adityanath': 'Yogi Adityanath',
  'arvind kejriwal': 'Arvind Kejriwal', 'mamata banerjee': 'Mamata Banerjee',
  'elon musk': 'Elon Musk', 'donald trump': 'Donald Trump',
  'joe biden': 'Joe Biden', 'xi jinping': 'Xi Jinping',
  'mukesh ambani': 'Mukesh Ambani', 'ambani': 'Mukesh Ambani',
  'adani': 'Gautam Adani', 'gautam adani': 'Gautam Adani',
  'ratan tata': 'Ratan Tata', 'sundar pichai': 'Sundar Pichai',
  'neeraj chopra': 'Neeraj Chopra', 'pv sindhu': 'PV Sindhu',
  'mary kom': 'Mary Kom', 'bajrang punia': 'Bajrang Punia',
};

const KNOWN_PLACES: Record<string, string> = {
  'mumbai': 'Mumbai city skyline', 'delhi': 'New Delhi India',
  'new delhi': 'New Delhi India', 'bangalore': 'Bangalore city India',
  'bengaluru': 'Bengaluru city India', 'chennai': 'Chennai city India',
  'kolkata': 'Kolkata city India', 'hyderabad': 'Hyderabad city India',
  'pune': 'Pune city India', 'ahmedabad': 'Ahmedabad city India',
  'jaipur': 'Jaipur city India', 'varanasi': 'Varanasi ghats India',
  'agra': 'Agra Taj Mahal', 'taj mahal': 'Taj Mahal Agra',
  'dubai': 'Dubai skyline', 'london': 'London cityscape',
  'new york': 'New York City skyline', 'washington': 'Washington DC Capitol',
  'beijing': 'Beijing China', 'islamabad': 'Islamabad Pakistan',
  'haifa': 'Haifa Israel', 'tel aviv': 'Tel Aviv Israel',
  'tehran': 'Tehran Iran', 'moscow': 'Moscow Russia',
  'wankhede': 'Wankhede Stadium Mumbai', 'eden gardens': 'Eden Gardens Kolkata',
  "lords": "Lord's Cricket Ground London",
};

interface Photo {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  source: 'wikimedia' | 'pexels' | 'omdb';
  credit?: string;
  downloadLocation?: null;
}

interface HybridFetchParams {
  supabase: any;
  articleId: number;
  title: string;
  category: string;
  imageQueries?: string[];
  targetImages?: number;
  categoryFallbacks?: string[];
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════════════════
export async function hybridFetchAndSaveImages({
  supabase,
  articleId,
  title,
  category,
  imageQueries = [],
  targetImages = 4,
  categoryFallbacks = [],
}: HybridFetchParams): Promise<number> {
  const pexelsKey = process.env.PEXELS_API_KEY;

  const textToScan    = [title, ...imageQueries].join(' ').toLowerCase();
  const detectedPersons = detectEntities(textToScan, KNOWN_PERSONS);
  const detectedPlaces  = detectEntities(textToScan, KNOWN_PLACES);

  console.log(`   🔍 Persons: ${detectedPersons.map(p => p.wikiTerm).join(', ') || 'none'}`);
  console.log(`   🔍 Places:  ${detectedPlaces.map(p => p.wikiTerm).join(', ') || 'none'}`);

  const allPhotos: Photo[] = [];
  const seen = new Set<string>();

  const addPhotos = (photos: Photo[]) => {
    for (const p of photos) {
      if (!seen.has(p.id)) { seen.add(p.id); allPhotos.push(p); }
    }
  };

  // ── BOLLYWOOD: OMDb first ──────────────────────────────────────────────────
  if (category === 'bollywood') {
    const omdb = await fetchOMDbImages(title, 2);
    addPhotos(omdb);
    console.log(`   🎬 OMDb: ${omdb.length} photos`);
    await sleep(300);
  }

  // ── CRICKET: Wikimedia action shots ───────────────────────────────────────
  if (category === 'cricket') {
    const cricketQueries = extractCricketQueries(title, imageQueries);
    for (const q of cricketQueries.slice(0, 2)) {
      if (allPhotos.length >= 2) break;
      const w = await fetchWikimediaImages(q, 2);
      addPhotos(w);
      console.log(`   🏏 Wikimedia cricket "${q}": ${w.length}`);
      await sleep(300);
    }
  }

  // ── Persons via Wikimedia ──────────────────────────────────────────────────
  for (const person of detectedPersons.slice(0, 2)) {
    if (allPhotos.length >= Math.floor(targetImages / 2)) break;
    const w = await fetchWikimediaImages(person.wikiTerm, 2);
    addPhotos(w);
    console.log(`   👤 Wikimedia "${person.wikiTerm}": ${w.length}`);
    await sleep(300);
  }

  // ── Places via Wikimedia ───────────────────────────────────────────────────
  for (const place of detectedPlaces.slice(0, 2)) {
    if (allPhotos.length >= Math.floor(targetImages / 2)) break;
    const w = await fetchWikimediaImages(place.wikiTerm, 2);
    addPhotos(w);
    console.log(`   📍 Wikimedia "${place.wikiTerm}": ${w.length}`);
    await sleep(300);
  }

  // ── Pexels fill ────────────────────────────────────────────────────────────
  if (pexelsKey && allPhotos.length < targetImages) {
    const fallbacks = categoryFallbacks.length > 0 ? categoryFallbacks : ['india news', 'current events'];
    const pexelsQueries = [
      ...imageQueries.filter(q => q.trim().length > 2).slice(0, 4),
      ...fallbacks,
    ].slice(0, 6);

    for (const q of pexelsQueries) {
      if (allPhotos.length >= targetImages) break;
      addPhotos(await fetchPexelsImages(pexelsKey, q, 2));
      await sleep(400);
    }

    if (allPhotos.length < Math.ceil(targetImages / 2) && fallbacks.length > 0) {
      addPhotos(await fetchPexelsImages(pexelsKey, fallbacks[0], targetImages));
    }
  }

  if (allPhotos.length === 0) {
    console.log(`   ⚠ No images found for article #${articleId}`);
    return 0;
  }

  const toSave = allPhotos.slice(0, targetImages);
  const sourceLabels: Record<string, string> = { wikimedia: 'Wikimedia Commons', pexels: 'Pexels', omdb: 'OMDb' };
  console.log(`   🖼  Saving ${toSave.length} (${toSave.filter(p => p.source === 'omdb').length} OMDb + ${toSave.filter(p => p.source === 'wikimedia').length} Wiki + ${toSave.filter(p => p.source === 'pexels').length} Pexels)`);

  const imageRows = toSave.map((photo, i) => ({
    article_id: articleId,
    image_url:  photo.url,
    alt_text:   photo.alt || `${title} — via ${sourceLabels[photo.source] || photo.source}`,
    position:   i,
    width:      photo.width  || 1080,
    height:     photo.height || 720,
    size_kb:    0,
  }));

  const { error } = await supabase.from('article_images').insert(imageRows);
  if (error) { console.log(`   ✗ Image DB error: ${error.message}`); return 0; }

  await supabase.from('articles').update({ image_url: imageRows[0].image_url }).eq('id', articleId);
  return toSave.length;
}

// ════════════════════════════════════════════════════════════════════════════
// WIKIMEDIA FETCHER
// ════════════════════════════════════════════════════════════════════════════
async function fetchWikimediaImages(searchTerm: string, count = 2): Promise<Photo[]> {
  const photos: Photo[] = [];
  const WIKI = 'https://en.wikipedia.org/w/api.php';

  try {
    const searchRes = await fetch(
      `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=${count * 3}&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return fetchWikimediaByTitle(searchTerm, count);
    const searchData = await searchRes.json();
    const results: any[] = searchData?.query?.search ?? [];
    if (results.length === 0) return fetchWikimediaByTitle(searchTerm, count);

    for (const result of results.slice(0, count * 2)) {
      if (photos.length >= count) break;
      if (!result.title?.startsWith('File:')) continue;

      const infoRes = await fetch(
        `${WIKI}?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json&origin=*`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const pages = Object.values(infoData?.query?.pages ?? {}) as any[];

      for (const page of pages) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
        if ((info.thumbwidth || info.width) < IMAGE_MIN_WIDTH) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        if (!isFreeWikimediaLicense(license)) continue;

        photos.push({
          id:     `wiki_${page.pageid}`,
          url:    info.thumburl || info.url,
          alt:    stripHtml(info.extmetadata?.ImageDescription?.value ?? '') || `${searchTerm} — Wikimedia Commons`,
          width:  info.thumbwidth  || info.width,
          height: info.thumbheight || info.height,
          source: 'wikimedia',
          credit: stripHtml(info.extmetadata?.Artist?.value ?? ''),
          downloadLocation: null,
        });
        if (photos.length >= count) break;
      }
      await sleep(200);
    }
  } catch (e: any) {
    console.log(`   ⚠ Wikimedia error for "${searchTerm}": ${e.message}`);
  }

  return photos.length === 0 ? fetchWikimediaByTitle(searchTerm, count) : photos;
}

async function fetchWikimediaByTitle(searchTerm: string, count = 2): Promise<Photo[]> {
  const photos: Photo[] = [];
  const WIKI = 'https://en.wikipedia.org/w/api.php';

  try {
    const searchRes = await fetch(
      `${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srlimit=3&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!searchRes.ok) return photos;
    const searchData = await searchRes.json();
    const results: any[] = searchData?.query?.search ?? [];
    if (results.length === 0) return photos;

    const pageTitle = results[0].title;
    const imagesRes = await fetch(
      `${WIKI}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&imlimit=10&format=json&origin=*`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!imagesRes.ok) return photos;
    const imagesData = await imagesRes.json();
    const pages = Object.values(imagesData?.query?.pages ?? {}) as any[];
    const imageFiles: string[] = (pages[0]?.images ?? [])
      .map((i: any) => i.title as string)
      .filter((t: string) => /\.(jpg|jpeg|png|webp)$/i.test(t) && !t.toLowerCase().includes('icon') && !t.toLowerCase().includes('logo') && !t.toLowerCase().includes('flag'));

    for (const fileTitle of imageFiles.slice(0, count * 3)) {
      if (photos.length >= count) break;
      const infoRes = await fetch(
        `${WIKI}?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json&origin=*`,
        { signal: AbortSignal.timeout(6000) }
      );
      if (!infoRes.ok) continue;
      const infoData = await infoRes.json();
      const infoPages = Object.values(infoData?.query?.pages ?? {}) as any[];

      for (const page of infoPages) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) continue;
        if ((info.thumbwidth || info.width) < IMAGE_MIN_WIDTH) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        if (!isFreeWikimediaLicense(license)) continue;

        photos.push({
          id:     `wiki_${page.pageid}`,
          url:    info.thumburl || info.url,
          alt:    stripHtml(info.extmetadata?.ImageDescription?.value ?? '') || `${searchTerm} — Wikimedia Commons`,
          width:  info.thumbwidth  || info.width,
          height: info.thumbheight || info.height,
          source: 'wikimedia',
          credit: stripHtml(info.extmetadata?.Artist?.value ?? ''),
          downloadLocation: null,
        });
        if (photos.length >= count) break;
      }
      await sleep(150);
    }
  } catch (e: any) {
    console.log(`   ⚠ Wikimedia article search error: ${e.message}`);
  }
  return photos;
}

// ════════════════════════════════════════════════════════════════════════════
// OMDb FETCHER
// ════════════════════════════════════════════════════════════════════════════
async function fetchOMDbImages(title: string, count = 2): Promise<Photo[]> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) return [];

  const photos: Photo[] = [];
  const OMDB = 'https://www.omdbapi.com';

  try {
    const searchTitle = title.split(' ').slice(0, 4).join(' ');
    let searchData: any = null;

    const movieRes = await fetch(`${OMDB}/?apikey=${apiKey}&s=${encodeURIComponent(searchTitle)}&type=movie`, { signal: AbortSignal.timeout(8000) });
    if (movieRes.ok) searchData = await movieRes.json();

    let searchResults: any[] = searchData?.Search ?? [];

    if (searchResults.length === 0) {
      const tvRes = await fetch(`${OMDB}/?apikey=${apiKey}&s=${encodeURIComponent(searchTitle)}&type=series`, { signal: AbortSignal.timeout(8000) });
      if (tvRes.ok) { const tvData = await tvRes.json(); searchResults = tvData?.Search ?? []; }
    }

    if (searchResults.length === 0) return photos;

    for (const result of searchResults.slice(0, count)) {
      if (photos.length >= count || !result.imdbID) continue;
      const detailRes = await fetch(`${OMDB}/?apikey=${apiKey}&i=${result.imdbID}&plot=short`, { signal: AbortSignal.timeout(8000) });
      if (!detailRes.ok) continue;
      const movie = await detailRes.json();
      if (!movie?.Poster || movie.Poster === 'N/A') continue;

      const highRes = movie.Poster.replace('SX300', 'SX1000').replace('SY150', 'SY1000');
      photos.push({
        id: `omdb_${result.imdbID}`, url: highRes,
        alt: `${movie.Title} (${movie.Year}) — via OMDb`,
        width: 1000, height: 1500, source: 'omdb',
        credit: `OMDb — ${movie.Title}`, downloadLocation: null,
      });
      await sleep(200);
    }
  } catch (e: any) {
    console.log(`   ⚠ OMDb error: ${e.message}`);
  }
  return photos;
}

// ════════════════════════════════════════════════════════════════════════════
// PEXELS FETCHER
// ════════════════════════════════════════════════════════════════════════════
async function fetchPexelsImages(pexelsKey: string, query: string, count = 2): Promise<Photo[]> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: pexelsKey }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos ?? [])
      .filter((p: any) => p.width >= IMAGE_MIN_WIDTH)
      .map((p: any) => ({
        id: `pexels_${p.id}`, url: p.src.large2x || p.src.large || p.src.original,
        alt: p.alt || query, width: p.width, height: p.height,
        source: 'pexels' as const, credit: p.photographer, downloadLocation: null,
      }));
  } catch { return []; }
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function detectEntities(text: string, entityMap: Record<string, string>) {
  const found: { keyword: string; wikiTerm: string }[] = [];
  const seenTerms = new Set<string>();
  const lower = text.toLowerCase();
  for (const [keyword, wikiTerm] of Object.entries(entityMap)) {
    if (lower.includes(keyword) && !seenTerms.has(wikiTerm)) {
      seenTerms.add(wikiTerm); found.push({ keyword, wikiTerm });
    }
  }
  return found;
}

function extractCricketQueries(title: string, imageQueries: string[]): string[] {
  const lower = title.toLowerCase();
  const queries: string[] = [];
  const playerActions: Record<string, string> = {
    'virat kohli': 'Virat Kohli batting cricket', 'kohli': 'Virat Kohli batting cricket',
    'rohit sharma': 'Rohit Sharma batting cricket', 'rohit': 'Rohit Sharma cricket',
    'ms dhoni': 'MS Dhoni wicketkeeper cricket', 'dhoni': 'MS Dhoni cricket',
    'bumrah': 'Jasprit Bumrah bowling cricket', 'jasprit bumrah': 'Jasprit Bumrah bowling',
    'hardik pandya': 'Hardik Pandya cricket', 'shubman gill': 'Shubman Gill batting',
    'sachin': 'Sachin Tendulkar cricket', 'jadeja': 'Ravindra Jadeja cricket',
    'pat cummins': 'Pat Cummins bowling cricket', 'ben stokes': 'Ben Stokes cricket',
  };
  for (const [keyword, action] of Object.entries(playerActions)) {
    if (lower.includes(keyword)) { queries.push(action); break; }
  }
  if (lower.includes('ipl'))         queries.push('IPL cricket match');
  if (lower.includes('test'))        queries.push('Test cricket match');
  if (lower.includes('t20'))         queries.push('T20 cricket match');
  if (lower.includes('world cup'))   queries.push('Cricket World Cup');
  if (lower.includes('bcci'))        queries.push('BCCI cricket India');
  if (lower.includes('rcb'))         queries.push('Royal Challengers Bangalore cricket');
  if (lower.includes('csk'))         queries.push('Chennai Super Kings cricket');
  if (lower.includes('mumbai indians')) queries.push('Mumbai Indians cricket IPL');
  if (queries.length === 0) queries.push('cricket batting action India', 'cricket match stadium India');
  return [...new Set(queries)];
}

function isFreeWikimediaLicense(license: string): boolean {
  if (!license) return false;
  const free = ['cc0', 'cc-by', 'cc by', 'public domain', 'pd', 'cc-sa', 'cc by-sa', 'attribution'];
  return free.some(f => license.toLowerCase().includes(f));
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }