import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { hybridFetchAndSaveImages } from '../image-pipeline';

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
  currentKeyIndex = 0;
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

const ARTICLES_PER_CATEGORY   = 6;
const AUTO_PUBLISH_SCORE      = 7.0;
const MIN_IMAGES_TO_PUBLISH   = 1;
const TARGET_IMAGES           = 4;
const INTER_ARTICLE_DELAY_MS  = 8_000;
const INTER_CATEGORY_DELAY_MS = 3_000;
const BATCH_SIZE              = 10;
const BATCH_PAUSE_MS          = 25 * 60 * 1000;

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

const NEWS_SOURCES: Record<string, { context: string; feeds: string[] }> = {
  cricket:    { context: 'Indian cricket IPL Test matches BCCI player news controversies',
                feeds: ['https://www.thehindu.com/sport/cricket/feeder/default.rss', 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms'] },
  bollywood:  { context: 'Bollywood movies celebrity gossip box office OTT releases controversies',
                feeds: ['https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', 'https://www.thehindu.com/entertainment/feeder/default.rss'] },
  technology: { context: 'AI Indian startups global tech companies gadgets software funding',
                feeds: ['https://news.ycombinator.com/rss', 'https://timesofindia.indiatimes.com/rssfeeds/66949542.cms'] },
  viral:      { context: 'Trending viral news shocking stories human interest outrage India',
                feeds: ['https://feeds.feedburner.com/ndtvnews-top-stories', 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'] },
  business:   { context: 'Indian economy corporate news startup funding RBI government policy',
                feeds: ['https://timesofindia.indiatimes.com/rssfeeds/1898055.cms', 'https://www.thehindu.com/business/feeder/default.rss'] },
  sports:     { context: 'Football kabaddi wrestling badminton chess Olympics Indian sports',
                feeds: ['https://feeds.feedburner.com/ndtvnews-sports', 'https://www.thehindu.com/sport/feeder/default.rss'] },
  india:      { context: 'Indian politics government policy social issues national events elections',
                feeds: ['https://feeds.feedburner.com/ndtvnews-india-news', 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms'] },
  world:      { context: 'International news affecting India US politics Middle East China geopolitics',
                feeds: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://feeds.feedburner.com/ndtvnews-world-news'] },
  health:     { context: 'Health medicine fitness Indian healthcare wellness mental health',
                feeds: ['https://timesofindia.indiatimes.com/rssfeeds/3908999.cms', 'https://feeds.bbci.co.uk/news/health/rss.xml'] },
  science:    { context: 'Space ISRO scientific discoveries environment climate change',
                feeds: ['https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'https://timesofindia.indiatimes.com/rssfeeds/2647163.cms'] },
  stocks:     { context: 'NSE BSE Nifty Sensex Indian stock market equity mutual funds IPO trading investing',
                feeds: ['https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', 'https://www.moneycontrol.com/rss/marketreports.xml'] },
};

const CATEGORY_IMAGE_FALLBACKS: Record<string, string[]> = {
  cricket:    ['cricket sport bat ball',     'cricket stadium crowd',   'sport india',            'cricket player action'],
  bollywood:  ['bollywood cinema hall',       'film production set',     'stage performance',       'indian entertainment'],
  technology: ['technology laptop code',      'startup office india',    'artificial intelligence', 'digital screen data'],
  viral:      ['india street crowd',          'urban india people',      'social media phone',      'india public space'],
  business:   ['stock market trading',        'business meeting india',  'rupee currency finance',  'corporate office'],
  sports:     ['sport stadium athlete',       'football match action',   'olympic sport training',  'sports arena india'],
  india:      ['india new delhi city',        'indian culture festival', 'india parliament',        'india street market'],
  world:      ['world map globe',             'city skyline night',      'airport international',   'global summit'],
  health:     ['doctor hospital india',       'medical healthcare',      'yoga wellness fitness',   'medicine pharmacy'],
  science:    ['rocket launch fire',          'science laboratory',      'space stars galaxy',      'nature forest india'],
  stocks:     ['stock market trading screen', 'nse bse india exchange',  'indian investor money',   'sensex nifty chart'],
};

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

async function fetchHeadlines(feedUrls: string[]): Promise<string[]> {
  const headlines: string[] = [];
  for (const url of feedUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) continue;
      const text = await res.text();
      const matches = text.match(/<title[^>]*>([^<]{5,200})<\/title>/gi) ?? [];
      matches.forEach(m => { const t = m.replace(/<[^>]*>/g, '').trim(); if (t && t.length > 5) headlines.push(t); });
    } catch {}
    await sleep(300);
  }
  return [...new Set(headlines)];
}

function extractJSON(raw: string | null) {
  if (!raw) return null;
  const c = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(c); } catch {}
  const a = c.match(/\[[\s\S]*\]/); if (a) try { return JSON.parse(a[0]); } catch {}
  const o = c.match(/\{[\s\S]*\}/); if (o) try { return JSON.parse(o[0]); } catch {}
  return null;
}
function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function POST(req: NextRequest) {
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 200 });

  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const missing: string[] = [];
  if (!process.env.SUPABASE_URL)              missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.GROQ_API_KEY)              missing.push('GROQ_API_KEY');
  if (!process.env.PEXELS_API_KEY)            missing.push('PEXELS_API_KEY');
  if (missing.length > 0) {
    return NextResponse.json({ success: false, error: `Missing env vars: ${missing.join(', ')}` }, { status: 500 });
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const totalTarget = Object.keys(NEWS_SOURCES).length * ARTICLES_PER_CATEGORY;

  console.log(`\nMANUAL PIPELINE STARTED — ${timestamp} | Total target: ${totalTarget}`);

  let totalSaved = 0, totalPublished = 0, totalDrafts = 0, totalImagesFetched = 0, globalIdx = 0;
  const results: any[] = [];

  try {
    for (const [category, config] of Object.entries(NEWS_SOURCES)) {
      console.log(`\n📰 ${category.toUpperCase()}`);

      const headlines = await fetchHeadlines(config.feeds);
      const headlineContext = headlines.length > 0
        ? headlines.slice(0, 20).map((h, i) => `${i + 1}. ${h}`).join('\n')
        : `[No live feed — use knowledge of: ${config.context}]`;

      const topicsRaw = await groqCall([
        {
          role: 'system',
          content:
            `You are a trending news analyst for Indian audiences. ` +
            `Return a JSON array of exactly ${ARTICLES_PER_CATEGORY} specific trending topics for: ${category}. ` +
            `Context: ${config.context}. ` +
            `Return ONLY the raw JSON array — no markdown, no backticks.`,
        },
        {
          role: 'user',
          content: headlines.length > 0
            ? `${category.toUpperCase()} headlines:\n${headlineContext}\n\nReturn JSON array of ${ARTICLES_PER_CATEGORY} topics. Raw JSON only.`
            : `Generate JSON array of ${ARTICLES_PER_CATEGORY} trending ${category} topics for Indian audiences. Raw JSON only.`,
        },
      ], 300);

      const topics = extractJSON(topicsRaw);
      if (!Array.isArray(topics) || topics.length === 0) {
        console.log(`   ✗ No topics — skipping`); continue;
      }

      const validTopics = topics
        .filter((t: any) => typeof t === 'string' && t.trim().length > 3)
        .slice(0, ARTICLES_PER_CATEGORY);

      for (const topic of validTopics) {
        globalIdx++;
        console.log(`\n   ✍️  [${globalIdx}/${totalTarget}] "${topic}"`);

        if (globalIdx > 1 && (globalIdx - 1) % BATCH_SIZE === 0) {
          console.log(`\n⏸️  Batch pause — waiting ${Math.round(BATCH_PAUSE_MS / 60_000)} min...`);
          await sleep(BATCH_PAUSE_MS);
          console.log(`▶️  Resuming...`);
        }

        await sleep(INTER_ARTICLE_DELAY_MS);

        const raw = await groqCall([
          {
            role: 'system',
            content:
              `You are ${AUTHOR_NAME}, ${AUTHOR_TAGLINE}.\n\nYOUR STYLE:\n${AUTHOR_BIO}\n\n` +
              `LEGAL: 100% ORIGINAL journalism. Not a rewrite.\n\n` +
              `TITLE RULES:\n` +
              `- 12–20 words. Creates curiosity gap or emotional reaction.\n` +
              `- BANNED: plain summaries like "Nifty Falls 200 Points" or "Kohli Trains"\n` +
              `- Use one of:\n` +
              `  • "[X] Just Did [Thing] And Nobody Is Talking About What It Actually Means"\n` +
              `  • "The Real Reason [X] Is Happening And Why Every Indian Should Pay Attention"\n` +
              `  • "Stop Pretending [X] Is Normal — Here Is What Is Actually Going On"\n` +
              `  • "Why [X] Is The Biggest Story Nobody In India Is Taking Seriously Enough"\n` +
              `  • "[X] Just Happened — Here Is Why Your [Wallet/Portfolio/Future] Will Feel It"\n\n` +
              `IMAGE QUERY RULES (4 Pexels search strings):\n` +
              `- Person → their role not name (e.g. "cricket batsman india")\n` +
              `- Place → search directly (e.g. "dalal street mumbai")\n` +
              `- Finance/stocks → visuals (e.g. "stock chart trading screen")\n` +
              `- 3–6 words each\n\n` +
              `Return ONLY raw JSON:\n` +
              `{ "title": "...", "summary": "2-3 punchy teaser sentences", "content": "500-700 word article paragraphs separated by \\n\\n ending with sharp one-liner", "score": 0-10, "image_queries": ["q1","q2","q3","q4"] }`,
          },
          {
            role: 'user',
            content:
              `Write your original ${category} piece on: "${topic}"\n` +
              `Context: ${config.context}\n` +
              (headlines.length > 0
                ? `Background (do NOT copy): ${headlines.slice(0, 3).map(h => `- ${h}`).join('\n')}`
                : 'Write from your own knowledge.') +
              `\n\nSpicy title + 4 image_queries. Raw JSON only.`,
          },
        ], 1300);

        const parsed = extractJSON(raw);
        if (!parsed?.title || !parsed?.summary || !parsed?.content) {
          console.log(`   ✗ Bad response — skipping`); continue;
        }

        const score = clamp(parseFloat(String(parsed.score)) || 7.5, 0, 10);

        const { data: saved, error: saveErr } = await supabase.from('articles').insert({
          title:          parsed.title.substring(0, 255),
          source_url:     `https://ai-generated/${category}/${Date.now()}`,
          source_name:    AUTHOR_NAME,
          summary:        parsed.summary.substring(0, 500),
          raw_content:    parsed.content,
          category,       score,
          published_date: new Date().toISOString(),
          is_draft:       true,
          is_published:   false,
          image_url:      null,
          admin_notes:    `Manual. Topic: "${topic}"`,
        }).select('id').single();

        if (saveErr) { console.log(`   ✗ DB error: ${saveErr.message}`); continue; }

        totalSaved++;
        const articleId = (saved as any).id;
        console.log(`   ✅ #${articleId} | score ${score.toFixed(1)}`);

        const imageQueries = Array.isArray(parsed.image_queries) && parsed.image_queries.length > 0
          ? parsed.image_queries : CATEGORY_IMAGE_FALLBACKS[category] ?? ['india news'];

        const imageCount = await hybridFetchAndSaveImages({
          supabase,
          articleId,
          title:             parsed.title,
          category,
          imageQueries,
          targetImages:      TARGET_IMAGES,
          categoryFallbacks: CATEGORY_IMAGE_FALLBACKS[category],
        });
        totalImagesFetched += imageCount;
        console.log(`   🖼  Images: ${imageCount}`);

        if (score >= AUTO_PUBLISH_SCORE && imageCount >= MIN_IMAGES_TO_PUBLISH && parsed.content?.trim().length > 100) {
          const { data: verify } = await supabase
            .from('articles').select('raw_content, image_url').eq('id', articleId).single();
          if ((verify as any)?.raw_content?.length > 100 && (verify as any)?.image_url) {
            const { error: pubErr } = await supabase.from('articles')
              .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
              .eq('id', articleId);
            if (!pubErr) {
              totalPublished++;
              console.log(`   🚀 PUBLISHED #${articleId}`);
              results.push({ id: articleId, title: parsed.title, score, status: 'published', images: imageCount });
            } else {
              totalDrafts++;
              results.push({ id: articleId, title: parsed.title, score, status: 'draft', images: imageCount });
            }
          } else {
            totalDrafts++;
            results.push({ id: articleId, title: parsed.title, score, status: 'draft', images: imageCount });
          }
        } else {
          totalDrafts++;
          results.push({ id: articleId, title: parsed.title, score, status: 'draft', images: imageCount });
        }
      }

      await sleep(INTER_CATEGORY_DELAY_MS);
    }

    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`\nMANUAL PIPELINE DONE — ${durationSec}s | Saved: ${totalSaved} | Published: ${totalPublished}\n`);

    return NextResponse.json({
      success:           true,
      timestamp,
      durationSeconds:   durationSec,
      totalSaved,
      totalPublished,
      totalDrafts,
      totalImagesFetched,
      message:           `Generated ${totalSaved} articles. Published: ${totalPublished}. Drafts: ${totalDrafts}.`,
      articles:          results,
    });

  } catch (e: any) {
    console.error(`MANUAL PIPELINE ERROR: ${e.message}`);
    return NextResponse.json({ success: false, error: e.message, timestamp }, { status: 500 });
  }
}