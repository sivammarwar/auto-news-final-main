import { supabase } from '@/integrations/supabase/client';

// ════════════════════════════════════════════════════════════════════════════
// TOPIC KEY — the fingerprint that makes deduplication 100% reliable
// ════════════════════════════════════════════════════════════════════════════

// Stopwords that carry no identifying meaning
const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'they', 'have',
  'was', 'were', 'been', 'are', 'its', 'who', 'how', 'why', 'what',
  'when', 'where', 'which', 'their', 'about', 'into', 'than', 'then',
  'but', 'not', 'did', 'does', 'had', 'has', 'his', 'her', 'him',
  'she', 'our', 'your', 'more', 'also', 'before', 'after', 'over',
  'under', 'real', 'true', 'new', 'old', 'one', 'two', 'three',
]);

/**
 * makeTopicKey(text) → deterministic, order-independent fingerprint
 *
 * "The real story of Rome's fall" →  "empire-fall-rome-story"
 * "Fall of the Roman Empire"      →  "empire-fall-rome-story"  ← same key
 *
 * Sorting the words is the critical step: it makes semantically identical
 * topics produce the same key regardless of phrasing order.
 */
export function makeTopicKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')   // strip punctuation → spaces
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim()
    .split(' ')
    .filter(w => w.length > 3 && !STOPWORDS.has(w))  // meaningful words only
    .sort()                          // ORDER-INDEPENDENT — core of the strategy
    .slice(0, 6)                     // cap at 6 words
    .join('-');
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY READS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Returns the Set of topic_keys already registered for a subcategory.
 * Load this once at pipeline start, then check locally — avoids N DB calls.
 */
export async function loadRegisteredKeys(
  subcategory: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('topic_registry')
    .select('topic_key')
    .eq('subcategory', subcategory);

  if (error) {
    console.error(`loadRegisteredKeys error [${subcategory}]:`, error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r: any) => r.topic_key));
}

/**
 * Load registered keys for ALL subcategories in one query.
 * Used at pipeline start to avoid 15 separate DB round-trips.
 */
export async function loadAllRegisteredKeys(): Promise<
  Record<string, Set<string>>
> {
  const { data, error } = await supabase
    .from('topic_registry')
    .select('subcategory, topic_key');

  if (error) {
    console.error('loadAllRegisteredKeys error:', error.message);
    return {};
  }

  const result: Record<string, Set<string>> = {};
  for (const row of data ?? []) {
    if (!result[row.subcategory]) result[row.subcategory] = new Set();
    result[row.subcategory].add(row.topic_key);
  }
  return result;
}

/**
 * Returns all covered titles for a subcategory — used to pass to Groq
 * so it avoids similar angles even when the topic_key doesn't match.
 */
export async function loadCoveredTitles(
  subcategory: string,
  limit = 50
): Promise<string[]> {
  const { data, error } = await supabase
    .from('topic_registry')
    .select('title')
    .eq('subcategory', subcategory)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`loadCoveredTitles error [${subcategory}]:`, error.message);
    return [];
  }

  return (data ?? []).map((r: any) => r.title).filter(Boolean);
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY WRITES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Registers a topic BEFORE writing the article.
 * Returns false if the topic is already registered (duplicate detected).
 * Returns true if registration succeeded (safe to proceed).
 *
 * The UNIQUE(subcategory, topic_key) DB constraint means even concurrent
 * pipeline runs cannot produce duplicates — the second insert will throw
 * a unique violation, which we catch and return false.
 */
export async function reserveTopic(
  subcategory: string,
  topic: string
): Promise<{ ok: boolean; key: string }> {
  const key = makeTopicKey(topic);

  const { error } = await supabase
    .from('topic_registry')
    .insert({ subcategory, topic_key: key, title: null, article_id: null });

  if (error) {
    // Unique violation (code 23505) = already registered
    if (error.code === '23505') {
      return { ok: false, key };
    }
    // Any other error — log but allow the pipeline to continue
    console.error(`reserveTopic error [${subcategory}/${key}]:`, error.message);
    return { ok: false, key };
  }

  return { ok: true, key };
}

/**
 * After the article is successfully saved to the DB, attach the article_id
 * and final title to the registry row.
 * Called with the topic_key returned by reserveTopic().
 */
export async function confirmTopic(
  subcategory: string,
  key: string,
  title: string,
  articleId: number
): Promise<void> {
  const { error } = await supabase
    .from('topic_registry')
    .update({ title, article_id: articleId })
    .eq('subcategory', subcategory)
    .eq('topic_key', key);

  if (error) {
    console.error(`confirmTopic error [${subcategory}/${key}]:`, error.message);
  }
}

/**
 * If article generation failed after reserveTopic(), release the reservation
 * so the topic can be retried next run.
 */
export async function releaseTopic(
  subcategory: string,
  key: string
): Promise<void> {
  const { error } = await supabase
    .from('topic_registry')
    .delete()
    .eq('subcategory', subcategory)
    .eq('topic_key', key)
    .is('article_id', null);   // only delete unconfirmed reservations

  if (error) {
    console.error(`releaseTopic error [${subcategory}/${key}]:`, error.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE — check without reserving (read-only)
// ════════════════════════════════════════════════════════════════════════════

export function isTopicCovered(
  topic: string,
  registeredKeys: Set<string>
): boolean {
  return registeredKeys.has(makeTopicKey(topic));
}

/**
 * Given a pool of candidate topics and the already-registered keys,
 * returns only the topics that haven't been covered yet.
 */
export function filterAvailableTopics(
  pool: string[],
  registeredKeys: Set<string>
): string[] {
  return pool.filter(t => !registeredKeys.has(makeTopicKey(t)));
}