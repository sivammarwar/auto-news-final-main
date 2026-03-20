import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HISTORY_CATEGORIES } from '@/lib/historyCategories';

// ─── Auth ─────────────────────────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────
const GROQ_TIMEOUT_MS        = 40_000;
const INTER_ARTICLE_PAUSE_MS = 8_000;
const BATCH_SIZE             = 10;
const BATCH_PAUSE_MS         = 5 * 60 * 1000;
const MAX_RETRIES            = 5;
const DEFAULT_PER_CATEGORY   = 2;
const AUTO_PUBLISH_SCORE     = 7.5;
const TARGET_IMAGES          = 6;
const MIN_IMAGES_TO_PUBLISH  = 2;
const IMAGE_MIN_WIDTH        = 800;

const AUTHOR = {
  name:    'Arjun Mehta',
  tagline: 'Senior Historian & Correspondent, Signal History',
  bio: `Historian and investigative journalist. Sharp, no-nonsense style. Covers both famous events
AND hidden chapters. 100% original writing. Ends every article with a one-liner that sticks.`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Topic Pool — pick unused topics from DB ──────────────────────────────────
async function pickTopicsFromPool(
  db: ReturnType<typeof getSupabase>,
  subcategory: string,
  count: number
): Promise<{ id: number; topic: string }[]> {
  const { data, error } = await db
    .from('topic_pool')
    .select('id, topic')
    .eq('subcategory', subcategory)
    .eq('is_used', false)
    .order('created_at', { ascending: true }) // FIFO — oldest first
    .limit(count);

  if (error || !data) return [];
  return data as { id: number; topic: string }[];
}

async function markTopicUsed(
  db: ReturnType<typeof getSupabase>,
  id: number
): Promise<void> {
  await db.from('topic_pool').update({ is_used: true }).eq('id', id);
}

// ─── Groq ─────────────────────────────────────────────────────────────────────
async function groqRequest(
  messages: { role: string; content: string }[],
  maxTokens: number
): Promise<string | null> {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error('No GROQ_API_KEY set');

  for (let attempt = 0; attempt < MAX_RETRIES * keys.length; attempt++) {
    const key = keys[attempt % keys.length];
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), GROQ_TIMEOUT_MS);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens, temperature: 0.75 }),
      });
      clearTimeout(t);
      if (res.status === 429) { await sleep(62_000); continue; }
      if (!res.ok) { await sleep(6000); continue; }
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() ?? null;
    } catch { clearTimeout(t); await sleep(4000); }
  }
  return null;
}

function extractJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^`{1,3}(?:json)?\s*/i, '').replace(/\s*`{1,3}$/g, '').trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m?.[0] ?? cleaned) as T; } catch { return null; }
}

// ─── Images ───────────────────────────────────────────────────────────────────
async function fetchPexels(query: string, count = 2): Promise<any[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count * 5}&orientation=landscape`,
      { signal: ctrl.signal, headers: { Authorization: key } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos ?? []).filter((p: any) => p.width >= IMAGE_MIN_WIDTH).slice(0, count);
  } catch { return []; }
}

async function saveImages(
  db: ReturnType<typeof getSupabase>,
  articleId: number,
  title: string,
  subcategory: string,
  imageQueries: string[]
): Promise<number> {
  const catConfig = HISTORY_CATEGORIES[subcategory];
  const queries   = [...imageQueries, ...(catConfig?.imageQueries ?? [])];
  const photos: any[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 6)) {
    if (photos.length >= TARGET_IMAGES) break;
    const results = await fetchPexels(q, 2);
    for (const p of results) {
      const pid = `pexels_${p.id}`;
      if (!seen.has(pid)) { seen.add(pid); photos.push(p); }
    }
    await sleep(300);
  }
  if (photos.length === 0) return 0;

  const rows = photos.slice(0, TARGET_IMAGES).map((p, i) => ({
    article_id: articleId, image_url: p.src.large2x || p.src.large,
    alt_text: p.alt || title, position: i, width: p.width, height: p.height,
    size_kb: 0, photographer: p.photographer ?? null,
    photographer_url: p.photographer_url ?? null, image_source: 'pexels',
  }));

  const { error } = await db.from('article_images').insert(rows);
  if (error) return 0;
  await db.from('articles').update({ image_url: rows[0].image_url }).eq('id', articleId);
  return rows.length;
}

// ─── Write one article ────────────────────────────────────────────────────────
async function writeArticle(
  db: ReturnType<typeof getSupabase>,
  subcatKey: string,
  topicId: number,
  topic: string,
  dryRun: boolean
): Promise<{ status: string; title?: string; articleId?: number; score?: number }> {
  const catConfig = HISTORY_CATEGORIES[subcatKey];

  try {
    // Part 1
    await sleep(2000);
    const part1 = await groqRequest([
      {
        role: 'system',
        content:
          `You are ${AUTHOR.name}, ${AUTHOR.tagline}. ${AUTHOR.bio}\n\n` +
          `Write the FIRST HALF of a gripping history article.\n` +
          `TOPIC: "${topic}"\nCATEGORY: ${catConfig.label}\n\n` +
          `## [Most surprising fact as a statement]\n(2-3 sentences)\n\n` +
          `## What Everyone Knows\n(100-150 words)\n\n` +
          `## What History Actually Shows\n(300-400 words, bold key facts)\n\n` +
          `RULES: Paragraphs separated by \\n\\n. No bullet points. Original voice only. Return text only.`,
      },
      { role: 'user', content: `Write Part 1: "${topic}"` },
    ], 1500);

    if (!part1 || part1.length < 200) {
      return { status: 'part1_failed' };
    }

    // Part 2
    await sleep(4000);
    const part2 = await groqRequest([
      {
        role: 'system',
        content:
          `You are ${AUTHOR.name}. Write the SECOND HALF about: "${topic}"\n\n` +
          `## The Part That Got Buried\n(200-250 words)\n\n` +
          `## The Ripple Effect\n(150-200 words)\n\n` +
          `## The Line That Says It All\n(1 sentence)\n\n` +
          `RULES: Original voice. No bullet points. Return text only.`,
      },
      { role: 'user', content: `Write Part 2 for: "${topic}"` },
    ], 1200);

    const fullContent = [part1.trim(), (part2 ?? '').trim()].filter(Boolean).join('\n\n');

    // Meta
    await sleep(3000);
    const metaRaw = await groqRequest([
      { role: 'system', content: 'Return ONLY raw valid JSON. Format: { "title": "string", "summary": "string", "score": number, "image_queries": ["q1","q2","q3","q4","q5","q6"] }' },
      {
        role: 'user',
        content:
          `Metadata for history article about: "${topic}"\nPreview: ${fullContent.substring(0, 400)}\n` +
          `Return: compelling 10-18 word title, 3-sentence summary, score 0-10, 6 Pexels image queries for ${catConfig.label}. Raw JSON only.`,
      },
    ], 500);

    interface Meta { title: string; summary: string; score: number; image_queries: string[] }
    const meta    = extractJSON<Meta>(metaRaw);
    const title   = meta?.title   ?? topic.substring(0, 200);
    const summary = meta?.summary ?? fullContent.substring(0, 300).replace(/\n/g, ' ');
    const score   = Math.min(10, Math.max(0, parseFloat(String(meta?.score ?? 8.0)) || 8.0));
    const imgQ    = Array.isArray(meta?.image_queries) ? meta.image_queries : catConfig.imageQueries.slice(0, 4);

    if (dryRun) {
      return { status: 'dry_run', title, score };
    }

    // Save article
    const { data: saved, error: saveErr } = await db.from('articles').insert({
      title: title.substring(0, 255), source_url: null, source_name: AUTHOR.name,
      summary: summary.substring(0, 500), raw_content: fullContent,
      category: 'history', subcategory: subcatKey, score,
      era: catConfig.era, difficulty: 'both',
      published_date: new Date().toISOString(),
      is_draft: true, is_published: false, image_url: null,
      admin_notes: `Topic: "${topic}" | Auto: generate-articles API`,
    }).select('id').single();

    if (saveErr) {
      return { status: `save_failed: ${saveErr.message}` };
    }

    const articleId = (saved as any).id;

    // Mark topic as used ONLY after successful article save
    await markTopicUsed(db, topicId);

    // Images
    const imageCount = await saveImages(db, articleId, title, subcatKey, imgQ);

    // Auto-publish
    if (score >= AUTO_PUBLISH_SCORE && imageCount >= MIN_IMAGES_TO_PUBLISH) {
      const { data: verify } = await db.from('articles').select('raw_content, image_url').eq('id', articleId).single();
      if ((verify as any)?.raw_content?.length > 200 && (verify as any)?.image_url) {
        await db.from('articles')
          .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
          .eq('id', articleId);
        return { status: 'published', title, articleId, score };
      }
    }

    const reason = imageCount < MIN_IMAGES_TO_PUBLISH ? `${imageCount} images` : `score ${score.toFixed(1)}`;
    return { status: `draft (${reason})`, title, articleId, score };

  } catch (err: any) {
    return { status: `error: ${err.message}` };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const articlesPerCategory: number = Math.min(body?.articlesPerCategory ?? DEFAULT_PER_CATEGORY, 5);
  const dryRun: boolean             = body?.dryRun === true;

  const db = getSupabase();
  const categoryKeys  = Object.keys(HISTORY_CATEGORIES);
  const totalExpected = categoryKeys.length * articlesPerCategory;

  const summary = {
    total: 0, published: 0, drafts: 0, skipped: 0, errors: 0, dryRun,
    articlesPerCategory, totalExpected,
    details: [] as { subcategory: string; topic: string; status: string; score?: number }[],
  };

  try {
    let globalIdx = 0;

    for (let ci = 0; ci < categoryKeys.length; ci++) {
      const subcatKey = categoryKeys[ci];

      // Pick unused topics from DB pool
      const pickedTopics = await pickTopicsFromPool(db, subcatKey, articlesPerCategory);

      if (pickedTopics.length === 0) {
        summary.skipped += articlesPerCategory;
        summary.details.push({ subcategory: subcatKey, topic: '', status: 'no_topics_in_pool' });
        continue;
      }

      for (const { id: topicId, topic } of pickedTopics) {
        globalIdx++;

        // Batch pause every BATCH_SIZE articles
        if (globalIdx > 1 && (globalIdx - 1) % BATCH_SIZE === 0) {
          await sleep(BATCH_PAUSE_MS);
        }

        const result = await writeArticle(db, subcatKey, topicId, topic, dryRun);

        summary.details.push({ subcategory: subcatKey, topic, status: result.status, score: result.score });

        if (result.status === 'no_topics_in_pool') {
          summary.skipped++;
        } else if (result.status.startsWith('error') || result.status.endsWith('_failed')) {
          summary.errors++;
        } else if (result.status === 'published') {
          summary.total++;
          summary.published++;
        } else {
          summary.total++;
          summary.drafts++;
        }

        await sleep(INTER_ARTICLE_PAUSE_MS);
      }
    }

    return NextResponse.json({ success: true, ...summary }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, ...summary }, { status: 500 });
  }
}