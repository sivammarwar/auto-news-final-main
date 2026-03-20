import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { hybridFetchAndSaveImages } from '../image-pipeline';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3,
].filter(Boolean) as string[];

let currentKeyIndex = 0;
let keyExhaustedUntil: Record<number, number> = {};

function getActiveGroq() {
  const now = Date.now();
  for (let i = 0; i < GROQ_KEYS.length; i++) {
    const idx = (currentKeyIndex + i) % GROQ_KEYS.length;
    if (!keyExhaustedUntil[idx] || keyExhaustedUntil[idx] < now) {
      currentKeyIndex = idx;
      return new Groq({ apiKey: GROQ_KEYS[idx] });
    }
  }
  return new Groq({ apiKey: GROQ_KEYS[0] });
}

function markKeyExhausted(keyIdx: number, waitMs: number) {
  keyExhaustedUntil[keyIdx] = Date.now() + waitMs;
  for (let i = 1; i < GROQ_KEYS.length; i++) {
    const next = (keyIdx + i) % GROQ_KEYS.length;
    if (!keyExhaustedUntil[next] || keyExhaustedUntil[next] < Date.now()) {
      currentKeyIndex = next;
      return;
    }
  }
}

const TOP_N              = 10;
const AUTO_PUBLISH_SCORE = 7.0;
const MIN_IMAGES         = 1;
const TARGET_IMAGES      = 4;
const INTER_DELAY        = 8000;

const AUTHOR_NAME    = 'Arjun Mehta';
const AUTHOR_TAGLINE = 'Senior Correspondent, The Daily Pulse';
const AUTHOR_BIO =
  `Arjun Mehta is a 34-year-old investigative journalist from Mumbai with 11 years of experience ` +
  `covering politics, cricket, Bollywood, and technology for major Indian publications. ` +
  `He is known for his sharp, no-nonsense writing style — blunt, conversational, occasionally ` +
  `sarcastic, always factual. He does not write press releases. He writes like he is explaining ` +
  `a story to a smart friend over chai. He uses short punchy sentences mixed with longer analytical ones. ` +
  `He always asks "why does this matter to the average Indian?" and answers it in every article. ` +
  `He never uses corporate jargon. He never says "it is worth noting" or "it is important to mention". ` +
  `He calls things as they are. His opinions are informed and direct but always backed by facts. ` +
  `He ends every article with a sharp one-liner that sticks in the reader's mind.`;

const VIRAL_SOURCES = [
  'https://feeds.feedburner.com/ndtvnews-top-stories',
  'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
  'https://www.thehindu.com/news/feeder/default.rss',
  'https://feeds.bbci.co.uk/news/world/rss.xml',
];

const VIRAL_FALLBACKS = [
  'india street crowd people', 'urban india city life',
  'social media phone screen', 'india public space market',
];

async function groqCall(messages: any[], maxTokens: number): Promise<string | null> {
  for (let attempt = 1; attempt <= 5 * Math.max(GROQ_KEYS.length, 1); attempt++) {
    const keyIdx = currentKeyIndex;
    const client = getActiveGroq();
    try {
      const r = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens, temperature: 0.75,
      });
      return r.choices[0]?.message?.content?.trim() ?? null;
    } catch (e: any) {
      const msg = e?.message ?? ''; const status = e?.status ?? 0;
      if (status === 429 || msg.includes('rate_limit')) {
        if (msg.includes('tokens per day') || msg.includes('TPD')) {
          markKeyExhausted(keyIdx, 24 * 60 * 60 * 1000);
          if (GROQ_KEYS.length === 1) await sleep(60_000);
          continue;
        }
        await sleep(62_000 + attempt * 2_000); continue;
      }
      if (status === 503 || status === 500) { await sleep(attempt * 6_000); continue; }
      await sleep(attempt * 3_000);
    }
  }
  return null;
}

function extractJSON(raw: string | null) {
  if (!raw) return null;
  const c = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(c); } catch {}
  const a = c.match(/\[[\s\S]*\]/); if (a) try { return JSON.parse(a[0]); } catch {}
  const o = c.match(/\{[\s\S]*\}/); if (o) try { return JSON.parse(o[0]); } catch {}
  return null;
}

function extractDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return 'feed'; }
}
function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  let totalSaved = 0, totalPublished = 0;
  const results: any[] = [];

  console.log(`\nVIRAL PIPELINE STARTED — ${timestamp}`);

  try {
    // ── Step 1: Fetch headlines ──────────────────────────────────────────────
    const allHeadlines: { title: string; source: string }[] = [];
    for (const url of VIRAL_SOURCES) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
          signal: AbortSignal.timeout(9000),
        });
        if (!res.ok) continue;
        const text = await res.text();
        const matches = text.match(/<title[^>]*>([^<]{5,200})<\/title>/gi) ?? [];
        matches.forEach(m => {
          const t = m.replace(/<[^>]*>/g, '').trim();
          if (t && t.length > 10) allHeadlines.push({ title: t, source: extractDomain(url) });
        });
        console.log(`  ✓ ${extractDomain(url)}: ${matches.length}`);
      } catch { console.log(`  ✗ ${extractDomain(url)}: failed`); }
      await sleep(300);
    }

    const seenTitles = new Set<string>();
    const unique = allHeadlines.filter(h => {
      if (seenTitles.has(h.title)) return false;
      seenTitles.add(h.title); return true;
    });

    if (unique.length === 0) {
      return NextResponse.json({ success: true, message: 'No headlines found', timestamp });
    }

    // ── Step 2: Skip already-saved titles ───────────────────────────────────
    const { data: recent } = await supabase.from('articles').select('title').eq('category', 'viral')
      .gte('published_date', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    const recentSet = new Set((recent ?? []).map((a: any) => a.title.toLowerCase().substring(0, 50)));
    const fresh = unique.filter(h => !recentSet.has(h.title.toLowerCase().substring(0, 50)));

    if (fresh.length === 0) {
      return NextResponse.json({ success: true, message: 'No new stories', timestamp });
    }

    // ── Step 3: Score headlines ──────────────────────────────────────────────
    const toScore = fresh.slice(0, 30);
    const scoringRaw = await groqCall([
      {
        role: 'system',
        content: 'Score each headline 0-10 for virality with Indian audiences. Consider: emotional impact, shareability, controversy, surprise. Return ONLY a JSON array of numbers in the same order.',
      },
      {
        role: 'user',
        content: `Score these ${toScore.length} headlines:\n${toScore.map((h, i) => `${i + 1}. ${h.title}`).join('\n')}\n\nReturn ONLY the JSON array.`,
      },
    ], 200);

    const scores = extractJSON(scoringRaw);
    const scored = toScore.map((h, i) => ({
      ...h,
      score: clamp(Array.isArray(scores) ? parseFloat(scores[i]) || 5.0 : 5.0, 0, 10),
    }));
    const topStories = scored.sort((a, b) => b.score - a.score).slice(0, TOP_N);
    console.log(`Top ${topStories.length} stories selected`);

    // ── Step 4: Write + image + publish each story ───────────────────────────
    for (const story of topStories) {
      await sleep(INTER_DELAY);
      console.log(`\n✍️  Writing: "${story.title.substring(0, 70)}"`);

      const raw = await groqCall([
        {
          role: 'system',
          content:
            `You are ${AUTHOR_NAME}, ${AUTHOR_TAGLINE}.\n\nYOUR STYLE:\n${AUTHOR_BIO}\n\n` +
            `LEGAL: 100% ORIGINAL journalism. Not a rewrite.\n\n` +
            `TITLE RULES:\n` +
            `- 12-20 words. Creates curiosity gap or emotional reaction.\n` +
            `- BANNED: plain copy of original headline\n` +
            `- Use one of:\n` +
            `  • "[X] Just Happened And Nobody Is Talking About What It Actually Means"\n` +
            `  • "The Real Reason [X] Is Happening And Why Every Indian Should Pay Attention"\n` +
            `  • "Stop Pretending [X] Is Normal — Here Is What Is Actually Going On"\n` +
            `  • "Why [X] Is The Biggest Story Nobody In India Is Taking Seriously Enough"\n\n` +
            `IMAGE QUERIES: exactly 4 Pexels search strings specific to this story.\n` +
            `- Famous person → their role/action not their name\n` +
            `- Famous place → search it directly\n` +
            `- Event → genre/atmosphere/location\n` +
            `- 3-5 words each\n\n` +
            `Return ONLY raw JSON:\n` +
            `{ "title": "SPICY 12-20 WORD TITLE", "summary": "2-3 punchy teaser sentences", "content": "400-500 word article paragraphs separated by \\n\\n ending with sharp one-liner", "score": 0-10, "image_queries": ["q1","q2","q3","q4"] }`,
        },
        {
          role: 'user',
          content: `Write your original viral piece based on: "${story.title}"\nSource: ${story.source}\nRaw JSON only.`,
        },
      ], 900);

      const parsed = extractJSON(raw);
      if (!parsed?.title || !parsed?.content) { console.log(`   ✗ Bad response — skipping`); continue; }

      const finalScore = clamp(parseFloat(String(parsed.score)) || story.score, 0, 10);

      const { data: saved, error: saveErr } = await supabase.from('articles').insert({
        title:          parsed.title.substring(0, 255),
        source_url:     `https://ai-generated/viral/${Date.now()}`,
        source_name:    AUTHOR_NAME,
        summary:        parsed.summary.substring(0, 500),
        raw_content:    parsed.content,
        category:       'viral',
        score:          finalScore,
        published_date: new Date().toISOString(),
        is_draft:       true,
        is_published:   false,
        image_url:      null,
        admin_notes:    `Viral. Original: "${story.title.substring(0, 100)}"`,
      }).select('id').single();

      if (saveErr) { console.log(`   ✗ DB error: ${saveErr.message}`); continue; }

      totalSaved++;
      const articleId = (saved as any).id;
      console.log(`   ✅ #${articleId} saved | score ${finalScore.toFixed(1)}`);

      const imageQueries = Array.isArray(parsed.image_queries) && parsed.image_queries.length > 0
        ? parsed.image_queries : VIRAL_FALLBACKS;

      const imageCount = await hybridFetchAndSaveImages({
        supabase,
        articleId,
        title:             parsed.title,
        category:          'viral',
        imageQueries,
        targetImages:      TARGET_IMAGES,
        categoryFallbacks: VIRAL_FALLBACKS,
      });
      console.log(`   🖼  Images: ${imageCount}`);

      if (finalScore >= AUTO_PUBLISH_SCORE && imageCount >= MIN_IMAGES) {
        const { error: pubErr } = await supabase.from('articles')
          .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
          .eq('id', articleId);
        if (!pubErr) {
          totalPublished++;
          console.log(`   🚀 AUTO-PUBLISHED #${articleId}`);
          results.push({ id: articleId, title: parsed.title, score: finalScore, status: 'published', images: imageCount });
        }
      } else {
        results.push({ id: articleId, title: parsed.title, score: finalScore, status: 'draft', images: imageCount });
      }
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`\nVIRAL DONE — ${durationSec}s | Saved: ${totalSaved} | Published: ${totalPublished}`);

    return NextResponse.json({
      success: true, timestamp,
      durationSeconds: durationSec,
      totalSaved, totalPublished, articles: results,
    });

  } catch (e: any) {
    console.error(`❌ VIRAL ERROR: ${e.message}`);
    return NextResponse.json({ error: e.message, timestamp }, { status: 500 });
  }
}