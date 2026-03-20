import { createClient } from '@supabase/supabase-js';

// Client-side supabase (uses public anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Server-side supabase admin (uses service role key — never expose to client)
export const createSupabaseAdmin = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export const deduplicateArticles = async (articles: any[]) => {
  if (articles.length === 0) return articles;
  const urls = articles.map((a: any) => a.sourceUrl);
  const { data: existing, error } = await supabase
    .from('articles').select('source_url').in('source_url', urls);
  if (error) { console.error('Deduplication error:', error); return articles; }
  const existingUrls = new Set((existing ?? []).map((a: any) => a.source_url));
  return articles.filter((a: any) => !existingUrls.has(a.sourceUrl));
};

export const insertArticles = async (articles: any[]) => {
  if (articles.length === 0) return { count: 0 };
  const { error, data } = await supabase.from('articles').insert(articles).select('id');
  if (error) { console.error('Insert error:', error); throw error; }
  return { count: data?.length || 0, data };
};

export const updateArticleScore = async (id: number, score: number, summary: string) => {
  const { error } = await supabase.from('articles')
    .update({ score, summary, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { console.error('Update error:', error); throw error; }
};

export const getArticlesForPublishing = async (limit = 50) => {
  const { data, error } = await supabase.from('articles').select('*')
    .eq('is_published', false).gt('score', 7.0)
    .order('score', { ascending: false })
    .order('published_date', { ascending: false }).limit(limit);
  if (error) { console.error('Fetch error:', error); throw error; }
  return data || [];
};

export const markArticlesAsPublished = async (ids: number[]) => {
  const { error } = await supabase.from('articles').update({ is_published: true }).in('id', ids);
  if (error) { console.error('Publish error:', error); throw error; }
};

export const getPublishedArticles = async (category: string | null = null, limit = 20, offset = 0) => {
  let query = supabase.from('articles').select('*')
    .eq('is_published', true).order('published_date', { ascending: false });
  if (category) query = query.eq('category', category);
  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) { console.error('Fetch published error:', error); throw error; }
  return data || [];
};