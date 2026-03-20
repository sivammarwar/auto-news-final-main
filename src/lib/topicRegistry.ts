import { supabase } from '@/integrations/supabase/client';

// ════════════════════════════════════════════════════════════════════════════
// TOPIC KEY
// ════════════════════════════════════════════════════════════════════════════

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'they', 'have',
  'was', 'were', 'been', 'are', 'its', 'who', 'how', 'why', 'what',
  'when', 'where', 'which', 'their', 'about', 'into', 'than', 'then',
  'but', 'not', 'did', 'does', 'had', 'has', 'his', 'her', 'him',
  'she', 'our', 'your', 'more', 'also', 'before', 'after', 'over',
  'under', 'real', 'true', 'new', 'old', 'one', 'two', 'three',
]);

export function makeTopicKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
    .sort()
    .slice(0, 6)
    .join('-');
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY READS
// ════════════════════════════════════════════════════════════════════════════

export async function loadRegisteredKeys(subcategory: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('topic_registry')
    .select('topic_key')
    .eq('subcategory', subcategory);
  if (error) { console.error(`loadRegisteredKeys error [${subcategory}]:`, error.message); return new Set(); }
  return new Set((data ?? []).map(r => r.topic_key));
}

export async function loadAllRegisteredKeys(): Promise<Record<string, Set<string>>> {
  const { data, error } = await supabase
    .from('topic_registry')
    .select('subcategory, topic_key');
  if (error) { console.error('loadAllRegisteredKeys error:', error.message); return {}; }
  const result: Record<string, Set<string>> = {};
  for (const row of data ?? []) {
    if (!result[row.subcategory]) result[row.subcategory] = new Set();
    result[row.subcategory].add(row.topic_key);
  }
  return result;
}

export async function loadCoveredTitles(subcategory: string, limit = 50): Promise<string[]> {
  const { data, error } = await supabase
    .from('topic_registry')
    .select('title')
    .eq('subcategory', subcategory)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error(`loadCoveredTitles error [${subcategory}]:`, error.message); return []; }
  return (data ?? []).map(r => r.title).filter(Boolean) as string[];
}

// ════════════════════════════════════════════════════════════════════════════
// REGISTRY WRITES
// ════════════════════════════════════════════════════════════════════════════

export async function reserveTopic(subcategory: string, topic: string): Promise<{ ok: boolean; key: string }> {
  const key = makeTopicKey(topic);
  const { error } = await supabase
    .from('topic_registry')
    .insert({ subcategory, topic_key: key, title: null, article_id: null });
  if (error) {
    if (error.code === '23505') return { ok: false, key };
    console.error(`reserveTopic error [${subcategory}/${key}]:`, error.message);
    return { ok: false, key };
  }
  return { ok: true, key };
}

export async function confirmTopic(subcategory: string, key: string, title: string, articleId: number): Promise<void> {
  const { error } = await supabase
    .from('topic_registry')
    .update({ title, article_id: articleId })
    .eq('subcategory', subcategory)
    .eq('topic_key', key);
  if (error) console.error(`confirmTopic error [${subcategory}/${key}]:`, error.message);
}

export async function releaseTopic(subcategory: string, key: string): Promise<void> {
  const { error } = await supabase
    .from('topic_registry')
    .delete()
    .eq('subcategory', subcategory)
    .eq('topic_key', key)
    .is('article_id', null);
  if (error) console.error(`releaseTopic error [${subcategory}/${key}]:`, error.message);
}

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE
// ════════════════════════════════════════════════════════════════════════════

export function isTopicCovered(topic: string, registeredKeys: Set<string>): boolean {
  return registeredKeys.has(makeTopicKey(topic));
}

export function filterAvailableTopics(pool: string[], registeredKeys: Set<string>): string[] {
  return pool.filter(t => !registeredKeys.has(makeTopicKey(t)));
}