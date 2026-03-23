// Previously used OpenAI for summarization and scoring.
// Now uses Groq (llama-3.3-70b) — same functions, same signatures,
// no breaking changes to code that imports this file.
//
// ── KEY SECURITY NOTE ────────────────────────────────────────────────────────
// This file must only be imported from server-side code (API routes, server
// components). The Groq keys have no NEXT_PUBLIC_ prefix — they are never
// bundled into the browser. If you need Groq in a client component, call
// an API route instead.
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_TIMEOUT_MS = 20_000;

async function groqChat(
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature = 0.4
): Promise<string | null> {
  const keys = [
    process.env.GROQ_API_KEY,        // ── CHANGED: removed NEXT_PUBLIC_ prefix
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    console.error('groqChat: no GROQ_API_KEY set');
    return null;
  }

  for (const key of keys) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), GROQ_TIMEOUT_MS);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
      clearTimeout(t);
      if (res.status === 429) continue; // try next key
      if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (e: any) {
      console.error('groqChat error:', e.message);
    }
  }
  return null;
}

// ─── summarizeArticle ─────────────────────────────────────────────────────────
export const summarizeArticle = async (
  title: string,
  content: string
): Promise<string> => {
  if (!content || content.length < 50) return content || title;
  try {
    const result = await groqChat(
      [
        {
          role: 'system',
          content:
            'You summarize history articles. Write a 2-3 sentence teaser that creates curiosity. ' +
            'Be factual, specific — include names, dates, or numbers where relevant. ' +
            'No commentary. No "this article". Just the teaser.',
        },
        {
          role: 'user',
          content: `Summarize:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 2000)}`,
        },
      ],
      150,
      0.6
    );
    return result ?? content.substring(0, 300) + '...';
  } catch (error: any) {
    console.error('summarizeArticle error:', error.message);
    return content.substring(0, 300) + '...';
  }
};

// ─── scoreArticle ─────────────────────────────────────────────────────────────
export const scoreArticle = async (
  title: string,
  summary: string,
  subcategory: string
): Promise<number> => {
  try {
    const result = await groqChat(
      [
        {
          role: 'system',
          content:
            `You score history articles 0-10. ` +
            `Score based on: historical accuracy (3pts), depth of insight (3pts), ` +
            `reader engagement (2pts), originality — does it go beyond the obvious? (2pts). ` +
            `Subcategory: ${subcategory}. ` +
            `Return ONLY a decimal number like 7.5. Nothing else.`,
        },
        {
          role: 'user',
          content: `Score this article:\n\nTitle: ${title}\n\nSummary: ${summary}`,
        },
      ],
      10,
      0.2
    );
    const score = parseFloat(result?.trim() ?? '');
    return isNaN(score) ? 7.0 : Math.min(10, Math.max(0, score));
  } catch (error: any) {
    console.error('scoreArticle error:', error.message);
    return 7.0;
  }
};

// ─── generateHistoryTitle ─────────────────────────────────────────────────────
export const generateHistoryTitle = async (
  topic: string,
  subcategory: string
): Promise<string> => {
  const result = await groqChat(
    [
      {
        role: 'system',
        content:
          `Generate a single compelling history article title (10-18 words). ` +
          `Category: ${subcategory}. ` +
          `Make it create curiosity — contrast the known vs unknown, or reveal something surprising. ` +
          `Return ONLY the title. No quotes. No explanation.`,
      },
      { role: 'user', content: `Topic: "${topic}"` },
    ],
    60,
    0.75
  );
  return result ?? topic;
};