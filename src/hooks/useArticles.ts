import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Article } from '@/types/article';

const FIELDS = [
  'id', 'slug', 'created_at', 'updated_at', 'title', 'source_url', 'source_name',
  'summary', 'raw_content', 'category', 'subcategory', 'score', 'image_url',
  'published_date', 'is_published', 'is_draft', 'admin_notes', 'era', 'difficulty',
].join(', ');

const SUBCATEGORY_SLUGS = new Set([
  'ancient-civilizations', 'medieval-feudal', 'age-of-exploration',
  'revolutions-politics', 'world-wars-conflicts', 'colonial-imperial',
  'human-rights-movements', 'science-technology', 'religion-philosophy',
  'cultural-social', 'economic-trade', 'military-warfare',
  'regional-history', 'archaeology-mysteries', 'famous-figures',
  // ── NEW ──
  'beyond-human-limits', 'historys-unsung-heroes',
]);

function isSubcategory(slug: string): boolean {
  return SUBCATEGORY_SLUGS.has(slug);
}

export function useArticles(slug?: string, limit = 50) {
  return useQuery<Article[]>({
    queryKey: ['articles', slug, limit],
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select(FIELDS)
        .eq('is_published', true)
        .order('published_date', { ascending: false })
        .limit(limit);

      if (slug) {
        if (isSubcategory(slug)) {
          query = query.eq('subcategory', slug);
        } else {
          query = query.eq('category', slug);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as Article[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useArticle(slugOrId: string) {
  return useQuery<Article | null>({
    queryKey: ['article', slugOrId],
    queryFn: async () => {
      // Try slug first (new SEO-friendly URLs)
      const { data: bySlug, error: slugError } = await supabase
        .from('articles')
        .select(FIELDS)
        .eq('slug', slugOrId)
        .eq('is_published', true)
        .single();

      if (bySlug) return bySlug as unknown as Article;

      // Fall back to numeric ID for old links
      const numericId = parseInt(slugOrId, 10);
      if (isNaN(numericId)) return null;

      const { data: byId, error: idError } = await supabase
        .from('articles')
        .select(FIELDS)
        .eq('id', numericId)
        .eq('is_published', true)
        .single();

      if (idError?.code === 'PGRST116') return null;
      if (idError) throw idError;
      return byId as unknown as Article;
    },
    enabled: !!slugOrId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useRelatedArticles(article: Article | null, limit = 4) {
  return useQuery<Article[]>({
    queryKey: ['related', article?.id, article?.subcategory, article?.category],
    queryFn: async () => {
      if (!article) return [];

      let query = supabase
        .from('articles')
        .select(FIELDS)
        .eq('is_published', true)
        .neq('id', article.id)
        .order('score', { ascending: false })
        .limit(limit);

      if (article.subcategory) {
        query = query.eq('subcategory', article.subcategory);
      } else {
        query = query.eq('category', article.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (article.subcategory && (data?.length ?? 0) < limit) {
        const needed = limit - (data?.length ?? 0);
        const existingIds = [article.id, ...((data as unknown as Article[]) ?? []).map((a: Article) => a.id)];
        const { data: extra } = await supabase
          .from('articles')
          .select(FIELDS)
          .eq('category', article.category)
          .eq('is_published', true)
          .not('id', 'in', `(${existingIds.join(',')})`)
          .order('score', { ascending: false })
          .limit(needed);
        return ([...(data ?? []), ...(extra ?? [])] as unknown as Article[]);
      }

      return (data as unknown as Article[]) ?? [];
    },
    enabled: !!article,
    staleTime: 10 * 60 * 1000,
  });
}