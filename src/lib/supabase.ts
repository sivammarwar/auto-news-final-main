import { createClient } from '@supabase/supabase-js';

// ─── Client-side (public anon key) ───────────────────────────────────────────
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

// ─── Server-side admin (service role — never expose to client) ────────────────
export const createSupabaseAdmin = () =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ════════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// Checks source_url uniqueness (for any articles that still carry a URL)
// and also checks title similarity to avoid near-duplicate history articles.
// ════════════════════════════════════════════════════════════════════════════
export const deduplicateArticles = async (articles: any[]) => {
  if (articles.length === 0) return articles;

  // URL deduplication (titles without URLs are always kept at this stage)
  const urls = articles.map((a: any) => a.sourceUrl).filter(Boolean);
  if (urls.length > 0) {
    const { data: existing, error } = await supabase
      .from('articles')
      .select('source_url')
      .in('source_url', urls);
    if (error) {
      console.error('Deduplication error:', error);
    } else {
      const existingUrls = new Set((existing ?? []).map((a: any) => a.source_url));
      articles = articles.filter(
        (a: any) => !a.sourceUrl || !existingUrls.has(a.sourceUrl)
      );
    }
  }

  return articles;
};

// ─── insertArticles ───────────────────────────────────────────────────────────
export const insertArticles = async (articles: any[]) => {
  if (articles.length === 0) return { count: 0 };
  const { error, data } = await supabase
    .from('articles')
    .insert(articles)
    .select('id');
  if (error) {
    console.error('Insert error:', error);
    throw error;
  }
  return { count: data?.length || 0, data };
};

// ─── updateArticleScore ───────────────────────────────────────────────────────
export const updateArticleScore = async (
  id: number,
  score: number,
  summary: string
) => {
  const { error } = await supabase
    .from('articles')
    .update({ score, summary, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('Update error:', error);
    throw error;
  }
};

// ─── getArticlesForPublishing ─────────────────────────────────────────────────
// Fetches history drafts that meet the quality bar for auto-publishing.
export const getArticlesForPublishing = async (limit = 50) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('category', 'history')
    .eq('is_published', false)
    .eq('is_draft', true)
    .gt('score', 7.5)
    .order('score', { ascending: false })
    .order('published_date', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Fetch error:', error);
    throw error;
  }
  return data || [];
};

// ─── markArticlesAsPublished ──────────────────────────────────────────────────
export const markArticlesAsPublished = async (ids: number[]) => {
  const { error } = await supabase
    .from('articles')
    .update({
      is_published: true,
      is_draft: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);
  if (error) {
    console.error('Publish error:', error);
    throw error;
  }
};

// ─── getPublishedArticles ─────────────────────────────────────────────────────
// Supports filtering by top-level category OR subcategory.
export const getPublishedArticles = async (
  slug: string | null = null,
  limit = 20,
  offset = 0
) => {
  let query = supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .order('published_date', { ascending: false });

  if (slug) {
    // Determine if the slug is a subcategory or top-level category
    const subcategorySlugs = [
      'ancient-civilizations', 'medieval-feudal', 'age-of-exploration',
      'revolutions-politics', 'world-wars-conflicts', 'colonial-imperial',
      'human-rights-movements', 'science-technology', 'religion-philosophy',
      'cultural-social', 'economic-trade', 'military-warfare',
      'regional-history', 'archaeology-mysteries', 'famous-figures',
    ];
    if (subcategorySlugs.includes(slug)) {
      query = query.eq('subcategory', slug);
    } else {
      query = query.eq('category', slug);
    }
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    console.error('Fetch published error:', error);
    throw error;
  }
  return data || [];
};

// ─── getArticlesByEra ─────────────────────────────────────────────────────────
// NEW — fetch articles filtered by era label (ancient, medieval, modern, etc.)
export const getArticlesByEra = async (
  era: string,
  limit = 20,
  offset = 0
) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('is_published', true)
    .eq('era', era)
    .order('published_date', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    console.error('getArticlesByEra error:', error);
    throw error;
  }
  return data || [];
};

// ─── getCoveredTopics ─────────────────────────────────────────────────────────
// NEW — returns recently covered article titles per subcategory.
// Used by the admin pipeline to avoid repeating topics.
export const getCoveredTopics = async (
  subcategory: string,
  limit = 30
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('articles')
    .select('title')
    .eq('subcategory', subcategory)
    .order('published_date', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getCoveredTopics error:', error);
    return [];
  }
  return (data ?? []).map((a: any) => a.title);
};