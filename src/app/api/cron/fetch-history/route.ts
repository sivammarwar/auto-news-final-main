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

const AUTO_PUBLISH_SCORE    = 7.5;
const TARGET_IMAGES         = 8;
const MIN_IMAGES_TO_PUBLISH = 4;

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

const TOPIC_POOL = [
  'a forgotten Indian king or queen whose military genius rivals any general in world history',
  'an Indian empire or dynasty that dominated trade routes but was erased from school textbooks',
  'a revolutionary scientific or mathematical discovery made in ancient India centuries before the West',
  'an Indian freedom fighter who took on the British in ways that history books never mention',
  'a lost city, port, or civilization from the Indian subcontinent that archaeologists are still uncovering',
  'an extraordinary woman from Indian history who broke every rule of her era and paid a brutal price',
  'a forgotten Indian inventor or engineer whose creation the entire world uses but never credits India',
  'a real historical mystery from India that experts have never fully explained',
  'a powerful merchant class, guild, or business empire from Indian history that controlled entire economies',
  'a secret chapter of the Mughal empire that mainstream historians skip over',
  'an Indian contribution to medicine, surgery, or astronomy that predates the commonly credited Western discovery',
  'a devastating famine, plague, or disaster in Indian history and the political cover-up behind it',
  'a forgotten Indian diplomat, spy, or strategist who changed the course of a major world event',
  'a pre-colonial Indian city that was larger and wealthier than any European city of its time',
  'an ancient Indian text or manuscript that contains knowledge so advanced it still confounds modern scientists',
];

const HISTORY_IMAGE_FALLBACKS = [
  'ancient india ruins archaeology', 'india historical temple architecture',
  'mughal architecture india', 'india ancient manuscript scroll',
  'india heritage fort palace', 'indian history museum artifact',
  'india old city ruins stone', 'ancient civilization ruins excavation',
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
  const o = c.match(/\{[\s\S]*\}/); if (o) try { return JSON.parse(o[0]); } catch {}
  return null;
}

function clamp(n: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, n)); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (GROQ_KEYS.length === 0) {
    return NextResponse.json({ error: 'No GROQ_API_KEY set' }, { status: 500 });
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const { data: prev } = await supabase
      .from('articles').select('title').eq('category', 'history')
      .order('published_date', { ascending: false }).limit(30);

    const prevTitles = (prev ?? []).map((a: any) => `- ${a.title}`).join('\n');
    const topicCategory = TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
    console.log(`\nTopic category: "${topicCategory}"`);

    const subjectRaw = await groqCall([
      {
        role: 'system',
        content:
          `You are a historian specialising in obscure, genuinely surprising true stories from Indian and world history.\n\n` +
          `Pick ONE specific, real, verifiable subject that fits: "${topicCategory}"\n\n` +
          `RULES:\n` +
          `- Must be 100% real and historically verified\n` +
          `- Must be genuinely obscure — not taught in school\n` +
          `- Must have specific details: real names, real dates, real numbers\n` +
          `- Must NOT be any of these: ${prevTitles || '(none yet)'}\n\n` +
          `Reply with ONLY the subject as a compelling title (10-15 words). No JSON. No explanation.`,
      },
      { role: 'user', content: 'Pick this week\'s history subject. Make it surprising and specific.' },
    ], 80);

    if (!subjectRaw) {
      return NextResponse.json({ error: 'Could not generate subject', timestamp }, { status: 500 });
    }

    const subject = subjectRaw.trim().replace(/^["']|["']$/g, '');
    console.log(`Subject: "${subject}"`);

    await sleep(4000);

    const articleRaw = await groqCall([
      {
        role: 'system',
        content:
          `You are ${AUTHOR_NAME}, ${AUTHOR_TAGLINE}.\n\nYOUR STYLE:\n${AUTHOR_BIO}\n\n` +
          `Write a 1200-1500 word deep-dive history article about "${subject}".\n` +
          `Use ## section headings and **bold** key facts. Paragraphs separated by \\n\\n. No bullet points.\n\n` +
          `SECTIONS:\n` +
          `## [Hook — most shocking angle] (2-3 sentences)\n` +
          `## The World They Lived In (100-150 words)\n` +
          `## [Subject's Greatest Achievement] (300-400 words)\n` +
          `## The Part History Forgot (200-250 words)\n` +
          `## [The Fall or The Mystery] (150-200 words)\n` +
          `## Why India Should Care Today (100-150 words)\n` +
          `## The Line That Says It All (1 sentence)\n\n` +
          `Return ONLY raw JSON — no markdown, no backticks:\n` +
          `{ "title": "compelling 12-18 word headline", "summary": "3-4 punchy teaser sentences", "content": "full article", "score": 0-10, "image_queries": ["q1","q2","q3","q4","q5","q6","q7","q8"] }`,
      },
      {
        role: 'user',
        content: `Write your deep-dive about: "${subject}". Raw JSON only.`,
      },
    ], 6000);

    const parsed = extractJSON(articleRaw);
    if (!parsed?.title || !parsed?.content || parsed.content.length < 300) {
      return NextResponse.json({ error: 'Article generation failed', timestamp }, { status: 500 });
    }

    const score     = clamp(parseFloat(String(parsed.score)) || 8.0, 0, 10);
    const wordCount = parsed.content.split(/\s+/).length;
    console.log(`✅ Article | ${wordCount} words | score ${score.toFixed(1)}`);

    const { data: saved, error: saveErr } = await supabase.from('articles').insert({
      title:          parsed.title.substring(0, 255),
      source_url:     `https://ai-generated/history/${Date.now()}`,
      source_name:    AUTHOR_NAME,
      summary:        parsed.summary.substring(0, 600),
      raw_content:    parsed.content,
      category:       'history',
      score,
      published_date: new Date().toISOString(),
      is_draft:       true,
      is_published:   false,
      image_url:      null,
      admin_notes:    `Weekly history. Subject: "${subject}" | ${wordCount} words`,
    }).select('id').single();

    if (saveErr) {
      return NextResponse.json({ error: saveErr.message, timestamp }, { status: 500 });
    }

    const articleId = (saved as any).id;
    console.log(`💾 Saved as article #${articleId}`);

    const imageQueries = Array.isArray(parsed.image_queries) && parsed.image_queries.length > 0
      ? parsed.image_queries : HISTORY_IMAGE_FALLBACKS;

    console.log(`\n🖼  Fetching ${TARGET_IMAGES} images...`);
    const imageCount = await hybridFetchAndSaveImages({
      supabase,
      articleId,
      title:             parsed.title,
      category:          'history',
      imageQueries,
      targetImages:      TARGET_IMAGES,
      categoryFallbacks: HISTORY_IMAGE_FALLBACKS,
    });
    console.log(`📸 ${imageCount} images saved`);

    let status = 'draft';
    if (score >= AUTO_PUBLISH_SCORE && imageCount >= MIN_IMAGES_TO_PUBLISH) {
      const { data: verify } = await supabase
        .from('articles').select('raw_content, image_url').eq('id', articleId).single();
      if ((verify as any)?.raw_content?.length > 300 && (verify as any)?.image_url) {
        const { error: pubErr } = await supabase.from('articles')
          .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
          .eq('id', articleId);
        if (!pubErr) {
          status = 'published';
          console.log(`🚀 PUBLISHED #${articleId}`);
        }
      }
    } else {
      const reason = imageCount < MIN_IMAGES_TO_PUBLISH
        ? `only ${imageCount} images (need ${MIN_IMAGES_TO_PUBLISH})`
        : `score ${score.toFixed(1)} < ${AUTO_PUBLISH_SCORE}`;
      console.log(`📋 Kept as draft (${reason})`);
    }

    return NextResponse.json({
      success:  true,
      timestamp,
      duration: Math.round((Date.now() - startTime) / 1000),
      article:  { id: articleId, title: parsed.title, subject, score, wordCount, images: imageCount, status },
    });

  } catch (e: any) {
    console.error(`❌ HISTORY ERROR: ${e.message}`);
    return NextResponse.json({ error: e.message, timestamp }, { status: 500 });
  }
}