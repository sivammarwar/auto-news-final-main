'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Trash2, Zap, RefreshCw, CheckSquare, Square, X, Plus, BookOpen } from 'lucide-react';
import SchedulerPanel from '@/components/SchedulerPanel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Article {
  id: number;
  title: string;
  summary: string;
  raw_content?: string | null;
  category: string;
  subcategory?: string | null;
  source_name: string;
  score: number | null;
  is_published: boolean | null;
  is_draft: boolean | null;
  admin_notes?: string | null;
  era?: string | null;
  difficulty?: string | null;
}
interface ArticleImage {
  id: number;
  article_id?: number | null;
  image_url: string;
  alt_text?: string | null;
  photographer?: string | null;
  photographer_url?: string | null;
  image_source?: string | null;
  wiki_attribution?: string | null;
  wiki_license?: string | null;
  wiki_license_url?: string | null;
  position: number;
  width: number | null;
  height?: number | null;
  size_kb?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}
interface GenLog {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'progress';
  ts: string;
}
interface TopicPoolCount {
  subcategory: string;
  unused: number;
  total: number;
}

// ── topic_pool is not in generated Supabase types yet.
// Cast supabase to any only for topic_pool queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// topic_pool is now in the generated Supabase types — no cast needed.
const db = supabase;

// ════════════════════════════════════════════════════════════════════════════
// AUTHOR PERSONA
// ════════════════════════════════════════════════════════════════════════════
const AUTHOR = {
  name:    'Arjun Mehta',
  tagline: 'Senior Historian & Correspondent, Signal History',
  bio:
    `Arjun Mehta is a historian and investigative journalist with 11 years of experience ` +
    `covering world history, archaeology, and forgotten civilizations. ` +
    `He writes with a sharp, no-nonsense style — blunt, conversational, occasionally ` +
    `provocative, always grounded in verified historical record. ` +
    `He covers both the famous events everyone knows AND the hidden chapters that were ` +
    `deliberately erased or overlooked. He asks: "Why does this matter today?" and answers it. ` +
    `He uses short punchy sentences mixed with longer analytical ones. ` +
    `He never uses academic jargon without explaining it. He never says "it is worth noting". ` +
    `He calls history as it was. His articles are 100% original writing reconstructed from ` +
    `historical record — never copied from any book, article, or Wikipedia page. ` +
    `He ends every article with a sharp one-liner that sticks in the reader's mind.`,
};

// ════════════════════════════════════════════════════════════════════════════
// 15 HISTORY CATEGORIES
// ════════════════════════════════════════════════════════════════════════════
const HISTORY_CATEGORIES: Record<string, {
  label: string;
  emoji: string;
  era: string;
  imageQueries: string[];
}> = {
  'ancient-civilizations': {
    label: 'Ancient Civilizations', emoji: '🏛️', era: 'ancient',
    imageQueries: ['ancient ruins archaeology excavation','Egyptian pyramids Giza desert','ancient Greece Parthenon Athens','Mesopotamia ancient ruins Iraq','ancient Rome Colosseum ruins','Indus Valley Mohenjo-daro ruins','ancient civilization stone carving','archaeological dig ancient artifacts'],
  },
  'medieval-feudal': {
    label: 'Medieval & Feudal', emoji: '⚔️', era: 'medieval',
    imageQueries: ['medieval castle ruins stone fortress','knights armor medieval sword','medieval cathedral gothic architecture','crusades middle ages historical','medieval town village reconstruction','Byzantine mosaic Constantinople','Mongol warrior historical artwork','medieval manuscript illuminated'],
  },
  'age-of-exploration': {
    label: 'Age of Exploration', emoji: '🧭', era: 'early-modern',
    imageQueries: ['old sailing ship ocean historical','antique map parchment exploration','compass navigation maritime historical','Portuguese caravel historic ship','ancient trade route spice market','explorer navigation stars ocean','colonial era harbor port ships','old world map cartography atlas'],
  },
  'revolutions-politics': {
    label: 'Revolutions & Politics', emoji: '✊', era: 'modern',
    imageQueries: ['revolution protest historical crowd','French Revolution historical painting','Bastille storming historical artwork','political uprising streets historical','independence movement historical photo','revolution barricades streets historical','political leaders historical meeting','declaration independence historical document'],
  },
  'world-wars-conflicts': {
    label: 'World Wars & Conflicts', emoji: '🎖️', era: 'modern',
    imageQueries: ['World War memorial cemetery soldiers','World War trench warfare historical','WWII military soldiers historical photo','war memorial monument remembrance','battlefield ruins war historical','military aircraft WWII historical','cold war Berlin wall historical','war veterans soldiers historical portrait'],
  },
  'colonial-imperial': {
    label: 'Colonial & Imperial', emoji: '🌐', era: 'modern',
    imageQueries: ['colonial era architecture building','empire historical map world','colonial port harbor historical ships','independence movement crowd historical','imperial palace historical architecture','colonial era document treaty historical','African independence historical photo','empire ruins archaeological site'],
  },
  'human-rights-movements': {
    label: 'Human Rights Movements', emoji: '🕊️', era: 'modern',
    imageQueries: ['civil rights march protest historical','suffragette women protest historical','human rights demonstration historical','Gandhi Salt March historical photo','civil rights movement historical crowd','abolition slavery historical monument','labor movement workers historical strike','peace protest march historical street'],
  },
  'science-technology': {
    label: 'Science & Technology', emoji: '🔬', era: 'all',
    imageQueries: ['science laboratory historical vintage','telescope observatory astronomy historical','industrial revolution machinery historical','ancient scientific instrument astrolabe','early aviation Wright brothers historical','scientific discovery laboratory equipment','space exploration rocket launch NASA','ancient clockwork mechanism gears'],
  },
  'religion-philosophy': {
    label: 'Religion & Philosophy', emoji: '📿', era: 'all',
    imageQueries: ['ancient temple religious architecture','philosopher ancient manuscript scroll','cathedral interior gothic architecture','religious ceremony ancient historical','monastery ancient stone building','sacred text ancient manuscript','temple ruins archaeological site','philosophy ancient Greek sculpture'],
  },
  'cultural-social': {
    label: 'Cultural & Social', emoji: '🎭', era: 'all',
    imageQueries: ['cultural festival historical celebration','ancient art museum artifact','historical textile fashion costume','ancient theater amphitheater ruins','traditional music instrument historical','cultural heritage craft artisan','ancient market bazaar historical','historical painting renaissance art museum'],
  },
  'economic-trade': {
    label: 'Economic & Trade', emoji: '🏺', era: 'all',
    imageQueries: ['Silk Road ancient trade caravan','ancient market trade spices bazaar','historical coins currency ancient','merchant ship trade historical port','ancient ledger accounting book historical','trade route map historical parchment','economic center historical city ruins','ancient gold treasure historical artifact'],
  },
  'military-warfare': {
    label: 'Military & Warfare', emoji: '🗡️', era: 'all',
    imageQueries: ['ancient battlefield historical warfare','military armor weapons historical museum','siege castle medieval warfare','ancient warrior sword shield historical','military strategy map historical war room','battlefield monument memorial historical','ancient fortification wall ruins','historical military commander portrait'],
  },
  'regional-history': {
    label: 'Regional History', emoji: '🗺️', era: 'all',
    imageQueries: ['ancient Africa kingdom ruins historical','Angkor Wat Cambodia temple ruins','Mughal architecture India historical','ancient Americas ruins civilization','African historical architecture monument','regional heritage temple ancient','ancient city ruins excavation','cultural heritage world site landmark'],
  },
  'archaeology-mysteries': {
    label: 'Archaeology & Mysteries', emoji: '🔍', era: 'all',
    imageQueries: ['archaeological excavation dig site ruins','ancient mystery ruins stone circle','archaeological artifact museum display','ancient ruins archaeological site','Stonehenge mystery stone ancient','Pompeii ruins archaeological site','ancient cave painting archaeology','lost city ruins jungle discovery'],
  },
  'famous-figures': {
    label: 'Famous Figures & Leaders', emoji: '👑', era: 'all',
    imageQueries: ['historical portrait leader ancient','historical figure sculpture monument','famous leader historical portrait museum','ancient ruler emperor historical artwork','historical biography portrait painting','leader monument memorial historical','ancient king queen historical sculpture','famous historical figure bust museum'],
  },
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════════
const BATCH_SIZE             = 10;
const BATCH_PAUSE_MS         = 5 * 60 * 1000;
const INTER_ARTICLE_PAUSE_MS = 8_000;
const GROQ_TIMEOUT_MS        = 40_000;
const MAX_RETRIES            = 5;
const ARTICLES_PER_CATEGORY  = 2;
const AUTO_PUBLISH_SCORE     = 7.5;
const TARGET_IMAGES          = 2;
const MIN_IMAGES_TO_PUBLISH  = 2;
const IMAGE_MIN_WIDTH        = 800;
const LOW_TOPIC_WARNING      = 10;

const nowTS  = () => new Date().toLocaleTimeString('en-IN', { hour12: false });
const sleep  = (ms: number) => new Promise(r => setTimeout(r, ms));
const clamp  = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// ─── Groq API ─────────────────────────────────────────────────────────────────
async function groqRequest(
  key: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  label: string,
  log: (m: string, t: GenLog['type']) => void,
  allKeys?: string[],
  keyExhaustedRef?: Record<number, number>,
  keyIndexRef?: { value: number },
  pipelineSignal?: AbortSignal
): Promise<string | null> {
  const keys      = allKeys ?? [key];
  const exhausted = keyExhaustedRef ?? {};
  const idxRef    = keyIndexRef ?? { value: 0 };
  const maxTotal  = MAX_RETRIES * keys.length;

  for (let attempt = 1; attempt <= maxTotal; attempt++) {
    if (pipelineSignal?.aborted) return null;
    const now = Date.now();
    for (let i = 0; i < keys.length; i++) {
      const idx = (idxRef.value + i) % keys.length;
      if (!exhausted[idx] || exhausted[idx] < now) { idxRef.value = idx; break; }
    }
    const activeKey = keys[idxRef.value];
    const keyLabel  = keys.length > 1 ? ` [key#${idxRef.value + 1}]` : '';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), GROQ_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens, temperature: 0.75 }),
      });
      clearTimeout(t);
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        const errMsg: string = body?.error?.message ?? '';
        const isTPD = errMsg.includes('tokens per day') || errMsg.includes('TPD');
        if (isTPD) {
          log(`🔴 [${label}]${keyLabel} Daily limit hit — rotating key`, 'warn');
          exhausted[idxRef.value] = Date.now() + 24 * 60 * 60 * 1000;
          if (keys.length === 1) await sleep(60_000);
          continue;
        }
        const ra = parseInt(res.headers.get('retry-after') ?? '0', 10);
        const waitMs = Math.max(ra * 1000, 62_000) + (attempt * 2_000);
        log(`⏳ [${label}]${keyLabel} RPM limit — waiting ${Math.round(waitMs / 1000)}s`, 'warn');
        await sleep(waitMs);
        continue;
      }
      if (!res.ok) {
        log(`⚠️ [${label}]${keyLabel} HTTP ${res.status} — attempt ${attempt}`, 'warn');
        await sleep(6000 * Math.ceil(attempt / keys.length));
        continue;
      }
      clearTimeout(t);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim() ?? null;
      if (!text) { log(`⚠️ [${label}] Empty response — attempt ${attempt}`, 'warn'); await sleep(3000); continue; }
      return text;
    } catch (e: any) {
      clearTimeout(t);
      const msg = e?.name === 'AbortError' ? `Timeout after ${GROQ_TIMEOUT_MS / 1000}s` : (e?.message ?? 'unknown error');
      log(`⚠️ [${label}]${keyLabel} ${msg} — attempt ${attempt}`, 'warn');
      await sleep(4000 * Math.ceil(attempt / keys.length));
    }
  }
  log(`✗ [${label}] All keys and retries exhausted`, 'error');
  return null;
}

function extractJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^`{1,3}(?:json)?\s*/i, '').replace(/\s*`{1,3}\s*$/g, '').trim();
  function fixControlChars(s: string): string {
    const out: string[] = [];
    let inStr = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]; const prev = i > 0 ? s[i - 1] : '';
      if (ch === '"' && prev !== '\\') inStr = !inStr;
      if (inStr && ch === '\n') { out.push('\\n'); continue; }
      if (inStr && ch === '\r') { out.push('\\r'); continue; }
      if (inStr && ch === '\t') { out.push('\\t'); continue; }
      out.push(ch);
    }
    return out.join('');
  }
  const attempts = [cleaned, fixControlChars(cleaned)];
  const objM = cleaned.match(/\{[\s\S]*\}/);
  if (objM) attempts.push(objM[0], fixControlChars(objM[0]));
  for (const attempt of attempts) {
    try { return JSON.parse(attempt) as T; } catch { /* try next */ }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// IMAGE HANDLING
// ════════════════════════════════════════════════════════════════════════════
const _usedPexelsIds = new Set<string>();
const _usedWikiIds   = new Set<string>();
const _pexelsPageMap = new Map<string, number>();

function getNextPexelsPage(query: string): number {
  const current = _pexelsPageMap.get(query) ?? 1;
  _pexelsPageMap.set(query, current >= 15 ? 1 : current + 1);
  return current;
}
function clearImageCache() { _usedPexelsIds.clear(); _usedWikiIds.clear(); _pexelsPageMap.clear(); }
function isFreeWikimediaLicense(license: string): boolean {
  if (!license) return false;
  return ['cc0','cc-by','cc by','public domain','pd','cc-sa','cc by-sa','attribution'].some(f => license.toLowerCase().includes(f));
}
function stripHtml(html: string): string { return (html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim(); }

interface HybridPhoto {
  id: string; url: string; alt: string; width: number; height: number;
  source: 'wikimedia' | 'pexels';
  photographer?: string; photographerUrl?: string;
  wikiAttribution?: string; wikiLicense?: string; wikiLicenseUrl?: string;
}

async function fetchPexels(key: string, query: string, count = 2): Promise<HybridPhoto[]> {
  const results: HybridPhoto[] = [];
  const page = getNextPexelsPage(query);
  const perPage = Math.min(count * 5, 25);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=landscape`, { signal: ctrl.signal, headers: { Authorization: key } });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    for (const p of (data.photos ?? [])) {
      if (results.length >= count) break;
      if (p.width < IMAGE_MIN_WIDTH) continue;
      const pid = `pexels_${p.id}`;
      if (_usedPexelsIds.has(pid)) continue;
      results.push({ id: pid, url: p.src.large2x || p.src.large, alt: p.alt || query, width: p.width, height: p.height, source: 'pexels', photographer: p.photographer ?? null, photographerUrl: p.photographer_url ?? null });
    }
  } catch { /* skip */ }
  return results;
}

async function fetchWikimedia(searchTerm: string, count = 2): Promise<HybridPhoto[]> {
  const photos: HybridPhoto[] = [];
  const WIKI_API = 'https://en.wikipedia.org/w/api.php';
  try {
    const ctrl1 = new AbortController(); setTimeout(() => ctrl1.abort(), 8000);
    const sr = await fetch(`${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=${count * 3}&format=json&origin=*`, { signal: ctrl1.signal });
    if (!sr.ok) return photos;
    const sd = await sr.json();
    for (const result of (sd?.query?.search ?? []).slice(0, count * 2)) {
      if (photos.length >= count) break;
      if (!result.title?.startsWith('File:')) continue;
      const ctrl2 = new AbortController(); setTimeout(() => ctrl2.abort(), 6000);
      const ir = await fetch(`${WIKI_API}?action=query&titles=${encodeURIComponent(result.title)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200&format=json&origin=*`, { signal: ctrl2.signal });
      if (!ir.ok) continue;
      const id = await ir.json();
      for (const page of Object.values(id?.query?.pages ?? {}) as any[]) {
        const info = page.imageinfo?.[0];
        if (!info) continue;
        if (!['image/jpeg','image/png','image/webp'].includes(info.mime)) continue;
        if ((info.thumbwidth || info.width) < IMAGE_MIN_WIDTH) continue;
        const license = info.extmetadata?.LicenseShortName?.value ?? '';
        if (!isFreeWikimediaLicense(license)) continue;
        const wid = `wiki_${page.pageid}`;
        if (_usedWikiIds.has(wid)) continue;
        photos.push({ id: wid, url: info.thumburl || info.url, alt: stripHtml(info.extmetadata?.ImageDescription?.value ?? '') || `${searchTerm} — Wikimedia Commons`, width: info.thumbwidth || info.width, height: info.thumbheight || info.height, source: 'wikimedia', wikiAttribution: stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Wikimedia Commons contributor', wikiLicense: license, wikiLicenseUrl: info.extmetadata?.LicenseUrl?.value ?? '' });
        if (photos.length >= count) break;
      }
      await sleep(200);
    }
  } catch { /* skip */ }
  return photos;
}

async function fetchAndSaveImages(pexelsKey: string, articleId: number, title: string, subcategory: string, imageQueries: string[], log: (m: string, t: GenLog['type']) => void): Promise<number> {
  const catConfig = HISTORY_CATEGORIES[subcategory];
  const allPhotos: HybridPhoto[] = [];
  const seen = new Set<string>();
  const add = (photos: HybridPhoto[]) => {
    photos.forEach(p => {
      if (!seen.has(p.id)) {
        seen.add(p.id); allPhotos.push(p);
        if (p.source === 'pexels')    _usedPexelsIds.add(p.id);
        if (p.source === 'wikimedia') _usedWikiIds.add(p.id);
      }
    });
  };
  for (const q of imageQueries.slice(0, 3)) {
    if (allPhotos.length >= TARGET_IMAGES) break;
    add(await fetchPexels(pexelsKey, q, 2)); await sleep(300);
  }
  if (allPhotos.length < TARGET_IMAGES) {
    add(await fetchWikimedia(imageQueries[0] ?? catConfig?.imageQueries[0] ?? 'ancient history ruins', 3));
    await sleep(300);
  }
  if (allPhotos.length < TARGET_IMAGES && catConfig) {
    for (const q of catConfig.imageQueries) {
      if (allPhotos.length >= TARGET_IMAGES) break;
      add(await fetchPexels(pexelsKey, q, 2)); await sleep(300);
    }
  }
  if (allPhotos.length === 0) { log(`    ✗ No images found for "${title}"`, 'error'); return 0; }
  const toSave = allPhotos.slice(0, TARGET_IMAGES);
  const imageRows = toSave.map((photo, i) => ({
    article_id: articleId, image_url: photo.url, alt_text: photo.alt || title,
    position: i, width: photo.width || 1200, height: photo.height || 800, size_kb: 0,
    photographer: photo.photographer ?? null, photographer_url: photo.photographerUrl ?? null,
    image_source: photo.source,
    wiki_attribution: photo.wikiAttribution ?? null,
    wiki_license: photo.wikiLicense ?? null,
    wiki_license_url: photo.wikiLicenseUrl ?? null,
  }));
  const { error } = await supabase.from('article_images').insert(imageRows);
  if (error) { log(`    ✗ Image save error: ${error.message}`, 'error'); return 0; }
  await supabase.from('articles').update({ image_url: imageRows[0].image_url }).eq('id', articleId);
  log(`    ✅ ${toSave.length} images saved`, 'success');
  return toSave.length;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [articles, setArticles]               = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [images, setImages]                   = useState<ArticleImage[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [refetchingImages, setRefetchingImages] = useState(false);
  const [genLogs, setGenLogs]                 = useState<GenLog[]>([]);
  const [genDone, setGenDone]                 = useState(0);
  const [genTotal, setGenTotal]               = useState(0);
  const [batchInfo, setBatchInfo]             = useState('');
  const [adminNotes, setAdminNotes]           = useState('');
  const [filter, setFilter]                   = useState<'draft' | 'published' | 'all'>('draft');
  const [filterCat, setFilterCat]             = useState<string>('all');
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState<string | null>(null);
  const [selectMode, setSelectMode]           = useState(false);
  const [selectedIds, setSelectedIds]         = useState<Set<number>>(new Set());
  const [deleting, setDeleting]               = useState(false);
  const [topicPoolCounts, setTopicPoolCounts] = useState<TopicPoolCount[]>([]);
  const [topicInputCat, setTopicInputCat]     = useState<string>('ancient-civilizations');
  const [topicInputText, setTopicInputText]   = useState<string>('');
  const [savingTopics, setSavingTopics]       = useState(false);
  const [topicSaveMsg, setTopicSaveMsg]       = useState<string | null>(null);
  const [showTopicPool, setShowTopicPool]     = useState(false);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const stopRef         = useRef(false);
  const abortRef        = useRef<AbortController | null>(null);

  useEffect(() => { fetchArticles(); }, [filter, filterCat]);
  useEffect(() => { fetchTopicPoolCounts(); }, []);
  useEffect(() => {
    const c = logContainerRef.current;
    if (c) c.scrollTop = c.scrollHeight;
  }, [genLogs]);

  const addLog = useCallback((message: string, type: GenLog['type'] = 'info') => {
    setGenLogs(prev => [...prev.slice(-400), { id: Date.now() + Math.random(), message, type, ts: nowTS() }]);
  }, []);

  // ── Uses db (any cast) because topic_pool not in Supabase types ──────────
  const fetchTopicPoolCounts = async () => {
    const { data, error: e } = await db.from('topic_pool').select('subcategory, is_used');
    if (e || !data) return;
    const counts: Record<string, { unused: number; total: number }> = {};
    for (const row of data) {
      if (!counts[row.subcategory]) counts[row.subcategory] = { unused: 0, total: 0 };
      counts[row.subcategory].total++;
      if (!row.is_used) counts[row.subcategory].unused++;
    }
    setTopicPoolCounts(Object.entries(counts).map(([subcategory, v]) => ({ subcategory, ...v })));
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let q = supabase.from('articles').select('*').order('created_at', { ascending: false });
      if (filter === 'draft')     q = q.eq('is_draft', true);
      if (filter === 'published') q = q.eq('is_published', true);
      if (filterCat !== 'all')    q = q.eq('subcategory', filterCat);
      const { data, error: e } = await q.limit(200);
      if (e) throw e;
      setArticles(data ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Uses db (any cast) because topic_pool not in Supabase types ──────────
  const handleSaveTopics = async () => {
    const lines = topicInputText.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    if (lines.length === 0) { setTopicSaveMsg('⚠️ No valid topics found. Enter one topic per line.'); return; }
    setSavingTopics(true); setTopicSaveMsg(null);
    const rows = lines.map(topic => ({
      subcategory: topicInputCat, topic,
      topic_key: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120),
      is_used: false,
    }));
    const { error: e } = await db.from('topic_pool').upsert(rows, { onConflict: 'subcategory,topic_key', ignoreDuplicates: true });
    if (e) {
      setTopicSaveMsg(`❌ Save failed: ${e.message}`);
    } else {
      setTopicSaveMsg(`✅ ${lines.length} topics saved to ${HISTORY_CATEGORIES[topicInputCat]?.label}!`);
      setTopicInputText('');
      await fetchTopicPoolCounts();
    }
    setSavingTopics(false);
    setTimeout(() => setTopicSaveMsg(null), 4000);
  };

  // ── Uses db (any cast) because topic_pool not in Supabase types ──────────
  const pickTopicsFromDB = async (subcategory: string, count: number): Promise<{ id: number; topic: string }[]> => {
    const { data, error: e } = await db
      .from('topic_pool').select('id, topic')
      .eq('subcategory', subcategory).eq('is_used', false)
      .order('created_at', { ascending: true }).limit(count);
    if (e || !data) return [];
    return data as { id: number; topic: string }[];
  };

  // ── Uses db (any cast) because topic_pool not in Supabase types ──────────
  const markTopicUsed = async (id: number): Promise<void> => {
    await db.from('topic_pool').update({ is_used: true }).eq('id', id);
  };

  // ════════════════════════════════════════════════════════════════════════
  // MAIN HISTORY GENERATION PIPELINE
  // ════════════════════════════════════════════════════════════════════════
  const handleGenerate = async () => {
    const groqKeys: string[] = [
      process.env.NEXT_PUBLIC_GROQ_API_KEY,
      process.env.NEXT_PUBLIC_GROQ_API_KEY_2,
      process.env.NEXT_PUBLIC_GROQ_API_KEY_3,
    ].filter(Boolean) as string[];
    const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY as string | undefined;
    if (groqKeys.length === 0) { setError('Missing NEXT_PUBLIC_GROQ_API_KEY'); return; }
    if (!pexelsKey)            { setError('Missing NEXT_PUBLIC_PEXELS_API_KEY'); return; }

    setGenerating(true); setError(null); setSuccess(null);
    setGenLogs([]); setGenDone(0); setBatchInfo('');
    stopRef.current = false; abortRef.current = new AbortController();
    clearImageCache();

    const log = addLog;
    const keyIndexRef    = { value: 0 };
    const keyExhausted: Record<number, number> = {};
    const categoryKeys   = Object.keys(HISTORY_CATEGORIES);
    const totalArticles  = categoryKeys.length * ARTICLES_PER_CATEGORY;
    setGenTotal(totalArticles);

    log(`🏛️  Starting HISTORY pipeline — up to ${totalArticles} articles across ${categoryKeys.length} categories`, 'info');
    log(`✍️  Author: ${AUTHOR.name} | Topics sourced from your topic_pool DB table`, 'info');

    let grandTotal = 0; let autoPublished = 0; let globalIdx = 0;

    try {
      for (let ci = 0; ci < categoryKeys.length; ci++) {
        if (stopRef.current) { log('⛔ Stopped.', 'error'); break; }
        const subcatKey = categoryKeys[ci];
        const catConfig = HISTORY_CATEGORIES[subcatKey];
        log(`\n━━━ [${ci + 1}/${categoryKeys.length}] ${catConfig.emoji} ${catConfig.label.toUpperCase()} ━━━`, 'info');

        const pickedTopics = await pickTopicsFromDB(subcatKey, ARTICLES_PER_CATEGORY);
        if (pickedTopics.length === 0) {
          log(`  ⚠️  No unused topics in pool for ${catConfig.label} — skipping. Add topics in the Topic Pool section.`, 'warn');
          setGenDone(d => d + ARTICLES_PER_CATEGORY); globalIdx += ARTICLES_PER_CATEGORY; continue;
        }
        log(`  📋 Picked ${pickedTopics.length} topic(s) from pool`, 'info');

        for (let ti = 0; ti < pickedTopics.length; ti++) {
          if (stopRef.current) { log('⛔ Stopped.', 'error'); break; }
          globalIdx++;
          const { id: topicId, topic } = pickedTopics[ti];

          if (globalIdx > 1 && (globalIdx - 1) % BATCH_SIZE === 0) {
            const pm = Math.round(BATCH_PAUSE_MS / 60000);
            log(`\n⏸️  ${BATCH_SIZE} articles done — taking a ${pm} min break...`, 'warn');
            await sleep(BATCH_PAUSE_MS);
            log(`▶️  Resuming...`, 'info');
          }

          log(`\n  ✍️  [${globalIdx}/${totalArticles}] "${topic}"`, 'progress');
          setBatchInfo(`[${globalIdx}/${totalArticles}] Writing: ${topic.substring(0, 50)}...`);

          await sleep(2000);
          const part1Raw = await groqRequest(
            groqKeys[keyIndexRef.value],
            [{ role: 'system', content: `You are ${AUTHOR.name}, ${AUTHOR.tagline}.\n\n${AUTHOR.bio}\n\nWrite the FIRST HALF of a gripping history article.\n\nTOPIC: "${topic}"\nCATEGORY: ${catConfig.label}\n\n## [Most surprising fact about this topic as a statement]\n(2-3 sentences) Open with the most surprising, counterintuitive, or little-known fact. **Bold** the key detail.\n\n## What Everyone Knows\n(100-150 words) The popular understanding.\n\n## What History Actually Shows\n(300-400 words) The deeper, more accurate version. **Bold** every key fact.\n\nRULES: Paragraphs separated by \\n\\n. No bullet points. Original voice only. Return article text only.` },
             { role: 'user', content: `Write Part 1 for the ${catConfig.label} article: "${topic}"` }],
            1500, `${subcatKey}:p1:${ti + 1}`, log, groqKeys, keyExhausted, keyIndexRef, abortRef.current?.signal
          );

          if (!part1Raw || part1Raw.length < 200) {
            log(`    ✗ Part 1 failed — topic NOT marked as used`, 'error');
            setGenDone(d => d + 1); await sleep(INTER_ARTICLE_PAUSE_MS); continue;
          }

          await sleep(4000);
          const part2Raw = await groqRequest(
            groqKeys[keyIndexRef.value],
            [{ role: 'system', content: `You are ${AUTHOR.name}, ${AUTHOR.tagline}.\n\nWrite the SECOND HALF of the history article about: "${topic}"\n\n## The Part That Got Buried\n(200-250 words) What was deliberately overlooked or suppressed.\n\n## The Ripple Effect\n(150-200 words) How this still shapes the world today.\n\n## The Line That Says It All\n(1 sharp sentence) The most memorable takeaway.\n\nRULES: Same as Part 1. Return article text only.` },
             { role: 'user', content: `Write Part 2 for: "${topic}"` }],
            1200, `${subcatKey}:p2:${ti + 1}`, log, groqKeys, keyExhausted, keyIndexRef, abortRef.current?.signal
          );

          const fullContent = [part1Raw.trim(), (part2Raw ?? '').trim()].filter(Boolean).join('\n\n');

          await sleep(3000);
          const metaRaw = await groqRequest(
            groqKeys[keyIndexRef.value],
            [{ role: 'system', content: 'Return ONLY raw valid JSON — no markdown, no backticks. Format: { "title": "string", "summary": "string", "score": number, "image_queries": ["q1","q2","q3","q4","q5","q6"] }' },
             { role: 'user', content: `Generate metadata for history article about: "${topic}"\n\nPreview: ${fullContent.substring(0, 400)}\n\nReturn:\n- title: 10-18 word compelling headline\n- summary: 3 punchy teaser sentences\n- score: 0-10 quality rating\n- image_queries: 6 specific Pexels search strings\nRaw JSON only.` }],
            500, `${subcatKey}:meta:${ti + 1}`, log, groqKeys, keyExhausted, keyIndexRef, abortRef.current?.signal
          );

          interface HistoryMeta { title: string; summary: string; score: number; image_queries: string[] }
          const meta    = metaRaw ? extractJSON<HistoryMeta>(metaRaw) : null;
          const title   = meta?.title   ?? topic.substring(0, 200);
          const summary = meta?.summary ?? fullContent.substring(0, 300).replace(/\n/g, ' ');
          const score   = clamp(parseFloat(String(meta?.score ?? 8.0)) || 8.0, 0, 10);
          const imgQ    = Array.isArray(meta?.image_queries) ? meta.image_queries : catConfig.imageQueries.slice(0, 6);

          if (stopRef.current) break;

          const { data: saved, error: saveErr } = await supabase.from('articles').insert({
            title: title.substring(0, 255), source_url: null, source_name: AUTHOR.name,
            summary: summary.substring(0, 500), raw_content: fullContent,
            category: 'history', subcategory: subcatKey, score,
            era: catConfig.era, difficulty: 'both',
            published_date: new Date().toISOString(),
            is_draft: true, is_published: false, image_url: null,
            admin_notes: `Topic: "${topic}" | Subcategory: ${catConfig.label}`,
          }).select('id').single();

          if (saveErr) {
            log(`    ✗ DB save failed: ${saveErr.message}`, 'error');
            setGenDone(d => d + 1); await sleep(INTER_ARTICLE_PAUSE_MS); continue;
          }

          grandTotal++;
          const articleId = (saved as any).id;
          log(`    ✅ Article #${articleId} saved | score ${score.toFixed(1)}`, 'success');

          await markTopicUsed(topicId);
          log(`    🔒 Topic marked as used in pool`, 'info');

          const imageCount = await fetchAndSaveImages(pexelsKey, articleId, title, subcatKey, imgQ, log);

          const goodScore = score >= AUTO_PUBLISH_SCORE;
          const hasImages = imageCount >= MIN_IMAGES_TO_PUBLISH;
          if (goodScore && hasImages) {
            const { data: verify } = await supabase.from('articles').select('raw_content, image_url').eq('id', articleId).single();
            if ((verify as any)?.raw_content?.length > 200 && (verify as any)?.image_url) {
              const { error: pubErr } = await supabase.from('articles')
                .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
                .eq('id', articleId);
              if (!pubErr) { autoPublished++; log(`    🚀 AUTO-PUBLISHED #${articleId} (${score.toFixed(1)}⭐, ${imageCount} images)`, 'success'); }
            }
          } else {
            const reason = !hasImages ? `only ${imageCount} images` : `score ${score.toFixed(1)} < ${AUTO_PUBLISH_SCORE}`;
            log(`    📋 Draft (${reason})`, 'info');
          }

          fetchArticles();
          setGenDone(d => d + 1);
          if (ti < pickedTopics.length - 1) await sleep(INTER_ARTICLE_PAUSE_MS);
        }
        if (ci < categoryKeys.length - 1 && !stopRef.current) await sleep(2000);
      }

      log(`\n🎉 HISTORY PIPELINE COMPLETE!`, 'success');
      log(`   📰 Articles written: ${grandTotal}`, 'success');
      log(`   🚀 Auto-published:   ${autoPublished}`, 'success');
      log(`   📋 Left in drafts:   ${grandTotal - autoPublished}`, 'info');
      setSuccess(`✅ Done! ${grandTotal} articles written · ${autoPublished} auto-published · ${grandTotal - autoPublished} in drafts`);
      fetchArticles(); fetchTopicPoolCounts();

    } catch (e: any) {
      log(`\n❌ Fatal: ${e.message}`, 'error');
      setError('Generation failed: ' + e.message);
    } finally {
      setGenerating(false); abortRef.current = null; setBatchInfo('');
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setGenerating(false); setBatchInfo('');
    addLog('⛔ Pipeline stopped.', 'error');
  };

  const selectArticle = async (article: Article) => {
    if (selectMode) return;
    setSelectedArticle(article); setAdminNotes(article.admin_notes ?? '');
    setError(null); setSuccess(null);
    try {
      const { data, error: e } = await supabase.from('article_images').select('*').eq('article_id', article.id).order('position');
      if (e) throw e;
      setImages(data ?? []);
    } catch (e: any) { setError(e.message); }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const deleteSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} article(s)? Cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      await supabase.from('article_images').delete().in('article_id', ids);
      const { error: e } = await supabase.from('articles').delete().in('id', ids);
      if (e) throw e;
      if (selectedArticle && selectedIds.has(selectedArticle.id)) { setSelectedArticle(null); setImages([]); }
      setSelectedIds(new Set()); setSelectMode(false);
      setSuccess(`✅ Deleted ${ids.length} article(s).`);
      await fetchArticles(); setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const handleRefetchImages = async () => {
    if (!selectedArticle) return;
    setRefetchingImages(true); setError(null);
    const pexelsKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY as string | undefined;
    if (!pexelsKey) { setError('NEXT_PUBLIC_PEXELS_API_KEY not set'); setRefetchingImages(false); return; }
    try {
      await supabase.from('article_images').delete().eq('article_id', selectedArticle.id);
      await supabase.from('articles').update({ image_url: null }).eq('id', selectedArticle.id);
      const catConfig = HISTORY_CATEGORIES[selectedArticle.subcategory ?? ''];
      const count = await fetchAndSaveImages(pexelsKey, selectedArticle.id, selectedArticle.title, selectedArticle.subcategory ?? 'famous-figures', catConfig?.imageQueries ?? [], (m) => console.log(m));
      await selectArticle(selectedArticle);
      if (count > 0) { setSuccess(`✅ ${count} images refetched!`); setTimeout(() => setSuccess(null), 3000); }
      else setError('No images found — try uploading manually.');
    } catch (e: any) { setError('Re-fetch failed: ' + e.message); }
    finally { setRefetchingImages(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedArticle || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(true); setError(null);
    try {
      const path = `${selectedArticle.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('article-images').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(path);
      await new Promise<void>((res, rej) => {
        const img = new Image();
        img.onload = async () => {
          try {
            await supabase.from('article_images').insert({ article_id: selectedArticle.id, image_url: publicUrl, position: images.length, width: img.width, height: img.height, size_kb: Math.round(file.size / 1024), alt_text: 'Article image', image_source: 'upload' });
            await selectArticle(selectedArticle);
            setSuccess('✅ Uploaded!'); setTimeout(() => setSuccess(null), 3000); res();
          } catch (err) { rej(err); }
        };
        img.onerror = () => rej(new Error('Failed to read image'));
        img.src = publicUrl;
      });
    } catch (e: any) { setError('Upload failed: ' + e.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const deleteImage = async (id: number) => {
    if (!confirm('Delete this image?')) return;
    try {
      await supabase.from('article_images').delete().eq('id', id);
      setImages(p => p.filter(i => i.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const publishArticle = async () => {
    if (!selectedArticle) return;
    if (images.length < MIN_IMAGES_TO_PUBLISH) { setError(`Need at least ${MIN_IMAGES_TO_PUBLISH} images.`); return; }
    try {
      await supabase.from('articles').update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() }).eq('id', selectedArticle.id);
      setSuccess('✅ Article is live!');
      setTimeout(() => { fetchArticles(); setSelectedArticle(null); setImages([]); }, 1500);
    } catch (e: any) { setError(e.message); }
  };

  const deleteArticle = async (article: Article) => {
    if (!confirm(`Delete "${article.title.substring(0, 60)}..."?`)) return;
    try {
      await supabase.from('article_images').delete().eq('article_id', article.id);
      await supabase.from('articles').delete().eq('id', article.id);
      setSuccess('✅ Deleted.'); setSelectedArticle(null); setImages([]);
      setTimeout(() => setSuccess(null), 3000); fetchArticles();
    } catch (e: any) { setError(e.message); }
  };

  const unpublishArticle = async (article: Article) => {
    if (!confirm('Move back to drafts?')) return;
    try {
      await supabase.from('articles').update({ is_published: false, is_draft: true, updated_at: new Date().toISOString() }).eq('id', article.id);
      setSuccess('✅ Moved to drafts.');
      setTimeout(() => { setSuccess(null); fetchArticles(); setSelectedArticle(null); setImages([]); }, 1500);
    } catch (e: any) { setError(e.message); }
  };

  const updateAdminNotes = async () => {
    if (!selectedArticle) return;
    try {
      await supabase.from('articles').update({ admin_notes: adminNotes }).eq('id', selectedArticle.id);
      setSuccess('✅ Saved!'); setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) { setError(e.message); }
  };

  const scoreColor = (s: number | null) =>
    s === null ? 'text-gray-500 bg-gray-100' :
    s >= 8 ? 'text-green-600 bg-green-50' : s >= 7 ? 'text-yellow-600 bg-yellow-50' : 'text-gray-500 bg-gray-100';
  const logColor = (t: GenLog['type']) =>
    t === 'success' ? 'text-green-400' : t === 'error' ? 'text-red-400' :
    t === 'warn' ? 'text-yellow-300' : t === 'progress' ? 'text-blue-300' : 'text-gray-400';
  const pct = genTotal > 0 ? Math.round((genDone / genTotal) * 100) : 0;
  const getImageCredit = (img: ArticleImage): string | null => {
    if (img.image_source === 'pexels' && img.photographer) return `Photo by ${img.photographer} on Pexels`;
    if (img.image_source === 'wikimedia' && img.wiki_attribution) return `${img.wiki_attribution}${img.wiki_license ? ` · ${img.wiki_license}` : ''} · Wikimedia Commons`;
    return null;
  };
  const lowTopicCategories = topicPoolCounts.filter(c => c.unused < LOW_TOPIC_WARNING);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📜 Signal History — Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">
          {Object.keys(HISTORY_CATEGORIES).length} categories · {ARTICLES_PER_CATEGORY} articles per run · Topics sourced from your pool
        </p>
      </div>

      <SchedulerPanel />

      {lowTopicCategories.length > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-300 rounded-lg">
          <p className="font-bold text-orange-800 text-sm mb-1">⚠️ Low topic pool — add more topics soon:</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {lowTopicCategories.map(c => {
              const cat = HISTORY_CATEGORIES[c.subcategory];
              return (
                <span key={c.subcategory} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                  {cat?.emoji} {cat?.label}: {c.unused} left
                </span>
              );
            })}
          </div>
        </div>
      )}

      <Card className="mb-6 overflow-hidden border-2 border-blue-200">
        <div className="p-4 bg-blue-50 flex items-center justify-between cursor-pointer" onClick={() => setShowTopicPool(s => !s)}>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" />
            <h2 className="font-bold text-blue-900 text-lg">Topic Pool Manager</h2>
            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
              {topicPoolCounts.reduce((s, c) => s + c.unused, 0)} unused topics across all categories
            </span>
          </div>
          <span className="text-blue-500 text-sm">{showTopicPool ? '▲ Hide' : '▼ Show'}</span>
        </div>

        {showTopicPool && (
          <div className="p-5 border-t border-blue-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-6">
              {Object.entries(HISTORY_CATEGORIES).map(([key, cat]) => {
                const counts = topicPoolCounts.find(c => c.subcategory === key);
                const unused = counts?.unused ?? 0;
                const total  = counts?.total  ?? 0;
                const isLow  = unused < LOW_TOPIC_WARNING;
                return (
                  <div key={key} onClick={() => setTopicInputCat(key)}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition ${
                      topicInputCat === key ? 'border-blue-500 bg-blue-50'
                      : isLow ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <p className="text-lg">{cat.emoji}</p>
                    <p className="text-xs font-medium text-gray-700 leading-tight mt-0.5">{cat.label}</p>
                    <p className={`text-xs font-bold mt-1 ${isLow ? 'text-orange-600' : 'text-green-600'}`}>{unused} unused</p>
                    <p className="text-xs text-gray-400">{total} total</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Adding topics to:</label>
                  <select value={topicInputCat} onChange={e => setTopicInputCat(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    {Object.entries(HISTORY_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.emoji} {cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Enter topics — one per line:</label>
              <Textarea value={topicInputText} onChange={e => setTopicInputText(e.target.value)}
                placeholder={`Example:\nthe engineering genius behind the Egyptian pyramids that modern architects still cannot replicate\nthe real reason Rome fell — not barbarians, but something far more internal and surprising`}
                className="min-h-[160px] text-sm font-mono mb-3 border-gray-300" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {topicInputText.split('\n').filter(l => l.trim().length > 10).length} valid topics detected
                </p>
                <Button onClick={handleSaveTopics} disabled={savingTopics || topicInputText.trim().length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
                  <Plus size={16} className="mr-1.5" />
                  {savingTopics ? 'Saving...' : 'Save Topics to Pool'}
                </Button>
              </div>
              {topicSaveMsg && (
                <p className={`mt-2 text-sm font-medium ${topicSaveMsg.startsWith('✅') ? 'text-green-600' : 'text-orange-600'}`}>
                  {topicSaveMsg}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="mb-6 overflow-hidden border-2 border-amber-200">
        <div className="p-5 bg-amber-50">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <h2 className="font-bold text-amber-900 text-lg flex items-center gap-2 mb-1">
                <Zap size={20} className="text-amber-600 shrink-0" />
                Generate All 15 History Categories
              </h2>
              <p className="text-sm text-amber-700 mb-3">
                Picks {ARTICLES_PER_CATEGORY} unused topics per category from your pool → writes articles → marks topics as used.
              </p>
              {generating && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-amber-800">
                    <span>{pct}% · {genDone}/{genTotal} articles</span>
                    {batchInfo && <span className="truncate max-w-[60%] text-amber-700">{batchInfo}</span>}
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full bg-amber-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="shrink-0">
              {generating ? (
                <Button onClick={handleStop} size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold px-6">
                  <X size={18} className="mr-1.5" /> Stop
                </Button>
              ) : (
                <Button onClick={handleGenerate} size="lg" className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-8 shadow-md">
                  <Zap size={18} className="mr-1.5" /> Generate History
                </Button>
              )}
            </div>
          </div>
        </div>
        {genLogs.length > 0 && (
          <div ref={logContainerRef} className="bg-gray-950 p-3 max-h-64 overflow-y-auto font-mono text-xs leading-[1.6] border-t border-gray-800">
            {genLogs.map(l => (
              <div key={l.id} className={logColor(l.type)}>
                <span className="text-gray-600 mr-2 select-none">{l.ts}</span>{l.message}
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-800">
          <div className="flex justify-between gap-4">
            <p className="font-bold">Error</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
          <p className="text-sm whitespace-pre-wrap mt-1">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-800">
          <p className="font-bold">Success</p>
          <p className="text-sm whitespace-pre-wrap mt-1">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Articles ({articles.length})</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
                  className={`text-xs px-2 py-1 rounded font-medium ${selectMode ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                  {selectMode ? '✕ Cancel' : '☑ Select'}
                </button>
                <button onClick={fetchArticles} disabled={loading} className="text-gray-400 hover:text-blue-600">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="flex gap-1 mb-2">
              {(['draft', 'published', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition ${filter === f ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="w-full mb-3 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="all">All categories</option>
              {Object.entries(HISTORY_CATEGORIES).map(([key, c]) => (
                <option key={key} value={key}>{c.emoji} {c.label}</option>
              ))}
            </select>
            {selectMode && selectedIds.size > 0 && (
              <button onClick={deleteSelected} disabled={deleting}
                className="w-full mb-3 flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">
                <Trash2 size={14} /> {deleting ? 'Deleting...' : `Delete (${selectedIds.size})`}
              </button>
            )}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {!loading && articles.length === 0 && (
                <div className="text-center text-gray-400 py-10">
                  <p className="text-3xl mb-2">📜</p>
                  <p className="text-sm">No articles yet.</p>
                </div>
              )}
              {articles.map(article => {
                const catConf = HISTORY_CATEGORIES[article.subcategory ?? ''];
                return (
                  <div key={article.id}
                    onClick={() => selectMode ? toggleSelect(article.id) : selectArticle(article)}
                    className={`flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                      selectedArticle?.id === article.id && !selectMode ? 'border-amber-500 bg-amber-50' :
                      selectedIds.has(article.id) ? 'border-red-300 bg-red-50' :
                      'border-gray-200 hover:border-amber-300 bg-white'
                    }`}
                  >
                    {selectMode && (
                      <div className="mt-0.5 shrink-0">
                        {selectedIds.has(article.id) ? <CheckSquare size={18} className="text-red-500" /> : <Square size={18} className="text-gray-400" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2 mb-1">{article.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {catConf && <span className="text-xs text-amber-700">{catConf.emoji} {catConf.label}</span>}
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreColor(article.score)}`}>⭐ {article.score?.toFixed(1) ?? '—'}</span>
                        {article.is_published && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Live</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedArticle || selectMode ? (
            <Card className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
              {generating
                ? <><p className="text-5xl mb-3 animate-bounce">📜</p><p className="font-medium text-gray-500">Writing history articles...</p></>
                : <><p className="text-5xl mb-3">👈</p><p className="font-medium text-gray-500">Select an article to manage</p></>
              }
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-start gap-3 mb-2">
                  <h3 className="font-bold text-lg leading-snug flex-1">{selectedArticle.title}</h3>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-sm font-bold px-2 py-1 rounded ${scoreColor(selectedArticle.score)}`}>⭐ {selectedArticle.score?.toFixed(1)}</span>
                    {selectedArticle.is_published && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">🟢 Live</span>}
                  </div>
                </div>
                {selectedArticle.subcategory && HISTORY_CATEGORIES[selectedArticle.subcategory] && (
                  <p className="text-xs text-amber-700 mb-2 font-medium">
                    {HISTORY_CATEGORIES[selectedArticle.subcategory].emoji} {HISTORY_CATEGORIES[selectedArticle.subcategory].label}
                    {selectedArticle.era && <span className="ml-2 text-gray-400">· {selectedArticle.era}</span>}
                  </p>
                )}
                <p className="text-xs text-gray-400 mb-3">✍️ By <span className="text-amber-700">{selectedArticle.source_name}</span></p>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{selectedArticle.summary}</p>
                {selectedArticle.raw_content && (
                  <details className="mb-4">
                    <summary className="text-sm text-amber-700 cursor-pointer font-medium hover:underline">📄 View full article</summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {selectedArticle.raw_content}
                    </div>
                  </details>
                )}
                <div className="grid grid-cols-3 gap-3 mb-5 text-center text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Images</p>
                    <p className={`font-bold ${images.length >= MIN_IMAGES_TO_PUBLISH ? 'text-green-600' : 'text-orange-500'}`}>{images.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Era</p>
                    <p className="font-bold text-xs capitalize">{selectedArticle.era ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p className={`font-bold text-xs ${selectedArticle.is_published ? 'text-green-600' : 'text-orange-500'}`}>
                      {selectedArticle.is_published ? '🟢 Live' : '📋 Draft'}
                    </p>
                  </div>
                </div>
                {!selectedArticle.is_published && (
                  <Button onClick={publishArticle} disabled={images.length < MIN_IMAGES_TO_PUBLISH}
                    className={`w-full font-bold py-3 text-base text-white ${images.length >= MIN_IMAGES_TO_PUBLISH ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}>
                    {images.length >= MIN_IMAGES_TO_PUBLISH ? '🚀 Publish Now' : `📸 Need ${MIN_IMAGES_TO_PUBLISH} images`}
                  </Button>
                )}
                {selectedArticle.is_published && (
                  <div className="space-y-2">
                    <div className="w-full py-2.5 text-center text-green-700 font-bold bg-green-50 rounded-lg border border-green-200 text-sm">🟢 Live on your site</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => unpublishArticle(selectedArticle)} variant="outline" className="text-sm font-semibold border-yellow-400 text-yellow-700">📋 Back to Drafts</Button>
                      <Button onClick={() => deleteArticle(selectedArticle)} className="text-sm font-semibold bg-red-600 hover:bg-red-700 text-white"><Trash2 size={15} className="mr-1.5" /> Delete</Button>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h4 className="font-bold mb-2">📝 Admin Notes</h4>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Private notes..." className="mb-2 min-h-[70px] text-sm" />
                <Button onClick={updateAdminNotes} variant="outline" className="w-full text-sm">Save Notes</Button>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">🖼️ Images ({images.length})</h4>
                  <Button variant="outline" onClick={handleRefetchImages} disabled={refetchingImages} className="text-xs h-7 px-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                    <RefreshCw size={11} className={`mr-1 ${refetchingImages ? 'animate-spin' : ''}`} />
                    {refetchingImages ? 'Fetching...' : 'Re-fetch'}
                  </Button>
                </div>
                {images.length < TARGET_IMAGES && (
                  <label className="block mb-4 cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition ${uploading ? 'border-amber-300 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'}`}>
                      <Upload size={24} className="mx-auto mb-1 text-gray-400" />
                      <p className="text-sm font-medium text-gray-600">{uploading ? '⏳ Uploading...' : 'Upload image'}</p>
                      <p className="text-xs text-gray-400">Min 800×600px · JPG or PNG</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                  </label>
                )}
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {images.map((img, idx) => {
                      const credit = getImageCredit(img);
                      return (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                          <img src={img.image_url} alt={img.alt_text || `Image ${idx + 1}`} className="w-full h-36 object-cover" loading="lazy" />
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">#{idx + 1}</span>
                          {credit && (
                            <div className="px-2 py-1 bg-gray-50 border-t border-gray-100">
                              <p className="text-[10px] text-gray-400 truncate">{credit}</p>
                            </div>
                          )}
                          <button onClick={() => deleteImage(img.id)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Trash2 size={24} className="text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm font-bold text-red-600">No images</p>
                    <p className="text-xs text-red-400 mt-1">Use Re-fetch or upload manually.</p>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}