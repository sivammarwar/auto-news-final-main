import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HISTORY_CATEGORIES } from '@/lib/historyCategories';

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const GROQ_TIMEOUT_MS        = 40_000;
const INTER_ARTICLE_PAUSE_MS = 8_000;
const MAX_RETRIES            = 5;
const AUTO_PUBLISH_SCORE     = 7.5;
const TARGET_IMAGES          = 2;
const MIN_IMAGES_TO_PUBLISH  = 2;
const IMAGE_MIN_WIDTH        = 800;
const ARTICLES_PER_CATEGORY  = 1;

const AUTHOR = {
  name:    'Arjun Mehta',
  tagline: 'Senior Historian & Correspondent, Hidden Facts',
  bio: `Historian and investigative journalist. Sharp, no-nonsense style. Covers both famous events
AND hidden chapters. 100% original writing. Ends every article with a one-liner that sticks.`,
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Generate a URL-safe slug from a title */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
    .substring(0, 100);              // max 100 chars
}

/** Ensure slug is unique — appends -2, -3 etc. if needed */
async function uniqueSlug(
  db: ReturnType<typeof getSupabase>,
  base: string
): Promise<string> {
  let slug = base;
  let attempt = 1;
  while (true) {
    const { data } = await db
      .from('articles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!data) return slug;          // slug is free
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

async function getSetting(db: ReturnType<typeof getSupabase>, key: string): Promise<string> {
  const { data } = await db.from('settings').select('value').eq('key', key).single();
  return data?.value ?? '';
}

async function setSetting(db: ReturnType<typeof getSupabase>, key: string, value: string) {
  await db.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
}

function computeNextRun(hourUtc: number): string {
  const now  = new Date();
  const next = new Date();
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

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
    .order('created_at', { ascending: true })
    .limit(count);
  if (error || !data) return [];
  return data as { id: number; topic: string }[];
}

async function markTopicUsed(db: ReturnType<typeof getSupabase>, id: number): Promise<void> {
  await db.from('topic_pool').update({ is_used: true }).eq('id', id);
}

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

  for (const q of queries.slice(0, 4)) {
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

// ════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db   = getSupabase();
  const body = await req.json().catch(() => ({}));
  const isManual: boolean = body?.manual === true;

  // ── FIX: respect subcategory from request body ───────────────────────────
  const requestedSubcat: string | undefined = body?.subcategory;
  const allKeys = requestedSubcat && HISTORY_CATEGORIES[requestedSubcat]
    ? [requestedSubcat]
    : Object.keys(HISTORY_CATEGORIES);
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`\n🏛️ generate-history called — manual: ${isManual} | subcategory: ${requestedSubcat ?? 'ALL'}`);

  await setSetting(db, 'schedule_status',   'running');
  await setSetting(db, 'schedule_last_run', new Date().toISOString());

  const results = {
    total: 0, published: 0, drafts: 0, skipped: 0, errors: 0,
    details: [] as { subcategory: string; title: string; status: string }[],
  };

  try {
    console.log(`📋 Running ${allKeys.length} category(ies): ${allKeys.join(', ')}`);

    for (const subcatKey of allKeys) {
      const catConfig    = HISTORY_CATEGORIES[subcatKey];
      const pickedTopics = await pickTopicsFromPool(db, subcatKey, ARTICLES_PER_CATEGORY);

      if (pickedTopics.length === 0) {
        results.skipped++;
        results.details.push({ subcategory: subcatKey, title: '', status: 'no_topics_in_pool' });
        console.log(`⚠️  [${subcatKey}] No unused topics — skipping`);
        continue;
      }

      for (const { id: topicId, topic } of pickedTopics) {
        try {
          console.log(`\n✍️  Writing: "${topic}" [${subcatKey}]`);
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
            results.errors++;
            results.details.push({ subcategory: subcatKey, title: topic, status: 'part1_failed' });
            console.log(`   ✗ Part 1 failed`);
            continue;
          }

          await sleep(4000);
          const part2 = await groqRequest([
            {
              role: 'system',
              content:
                `You are ${AUTHOR.name}. Write the SECOND HALF about: "${topic}"\n\n` +
                `## The Part That Got Buried\n(200-250 words)\n\n` +
                `## The Ripple Effect\n(150-200 words)\n\n` +
                `## The Line That Says It All\n(1 sentence)\n\n` +
                `Original voice. No bullet points. Return text only.`,
            },
            { role: 'user', content: `Write Part 2: "${topic}"` },
          ], 1200);

          const fullContent = [part1.trim(), (part2 ?? '').trim()].filter(Boolean).join('\n\n');

          await sleep(3000);
          const metaRaw = await groqRequest([
            {
              role: 'system',
              content: 'Return ONLY raw valid JSON. Format: { "title": "string", "summary": "string", "score": number, "image_queries": ["q1","q2","q3","q4"] }',
            },
            {
              role: 'user',
              content:
                `Metadata for: "${topic}"\nPreview: ${fullContent.substring(0, 400)}\n` +
                `Compelling 10-18 word title, 3-sentence summary, score 0-10, 4 Pexels image queries. Raw JSON only.`,
            },
          ], 500);

          interface Meta { title: string; summary: string; score: number; image_queries: string[] }
          const meta    = extractJSON<Meta>(metaRaw);
          const title   = meta?.title   ?? topic.substring(0, 200);
          const summary = meta?.summary ?? fullContent.substring(0, 300).replace(/\n/g, ' ');
          const score   = Math.min(10, Math.max(0, parseFloat(String(meta?.score ?? 8.0)) || 8.0));
          const imgQ    = Array.isArray(meta?.image_queries) ? meta.image_queries : catConfig.imageQueries.slice(0, 4);

          // ── Generate unique SEO slug from title ──────────────────────────
          const baseSlug    = generateSlug(title);
          const articleSlug = await uniqueSlug(db, baseSlug);
          console.log(`   🔗 Slug: ${articleSlug}`);

          const { data: saved, error: saveErr } = await db.from('articles').insert({
            title: title.substring(0, 255),
            slug: articleSlug,
            source_url: null,
            source_name: AUTHOR.name,
            summary: summary.substring(0, 500),
            raw_content: fullContent,
            category: 'history',
            subcategory: subcatKey,
            score,
            era: catConfig.era,
            difficulty: 'both',
            published_date: new Date().toISOString(),
            is_draft: true,
            is_published: false,
            image_url: null,
            admin_notes: `Topic: "${topic}" | ${isManual ? 'Manual trigger' : 'Auto cron'}`,
          }).select('id').single();

          if (saveErr) {
            results.errors++;
            results.details.push({ subcategory: subcatKey, title: topic, status: `save_failed: ${saveErr.message}` });
            console.log(`   ✗ Save failed: ${saveErr.message}`);
            continue;
          }

          const articleId = (saved as any).id;
          await markTopicUsed(db, topicId);
          results.total++;
          console.log(`   ✅ Article #${articleId} saved | score ${score.toFixed(1)}`);

          const imageCount = await saveImages(db, articleId, title, subcatKey, imgQ);
          console.log(`   🖼  ${imageCount} images saved`);

          if (score >= AUTO_PUBLISH_SCORE && imageCount >= MIN_IMAGES_TO_PUBLISH) {
            const { data: verify } = await db
              .from('articles')
              .select('raw_content, image_url')
              .eq('id', articleId)
              .single();
            if ((verify as any)?.raw_content?.length > 200 && (verify as any)?.image_url) {
              await db.from('articles')
                .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
                .eq('id', articleId);
              results.published++;
              results.details.push({ subcategory: subcatKey, title, status: `published (score ${score.toFixed(1)})` });
              console.log(`   🚀 AUTO-PUBLISHED #${articleId} → /article/${articleSlug}`);
            } else {
              results.drafts++;
              results.details.push({ subcategory: subcatKey, title, status: 'draft (verify failed)' });
            }
          } else {
            results.drafts++;
            const reason = imageCount < MIN_IMAGES_TO_PUBLISH
              ? `only ${imageCount} images`
              : `score ${score.toFixed(1)} < ${AUTO_PUBLISH_SCORE}`;
            results.details.push({ subcategory: subcatKey, title, status: `draft (${reason})` });
            console.log(`   📋 Draft — ${reason}`);
          }

          await sleep(INTER_ARTICLE_PAUSE_MS);

        } catch (err: any) {
          results.errors++;
          results.details.push({ subcategory: subcatKey, title: topic, status: `error: ${err.message}` });
          console.log(`   ❌ Error: ${err.message}`);
        }
      }
    }

    const configuredHour = parseInt(await getSetting(db, 'schedule_hour_utc') || '9', 10);
    await setSetting(db, 'schedule_status',   'idle');
    await setSetting(db, 'schedule_next_run', computeNextRun(configuredHour));

    console.log(`\n🎉 DONE — ${results.total} written · ${results.published} published · ${results.drafts} drafts · ${results.skipped} skipped`);
    return NextResponse.json({ success: true, ...results }, { status: 200 });

  } catch (err: any) {
    await setSetting(db, 'schedule_status', 'error');
    console.log(`\n❌ Fatal: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message, ...results }, { status: 500 });
  }
}

export async function GET(req: NextRequest) { return POST(req); }
