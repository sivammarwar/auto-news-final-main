// src/app/api/articles/category/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PAGE_SIZE = 24;

const SUBCATEGORY_SLUGS = new Set([
  'ancient-civilizations', 'medieval-feudal', 'age-of-exploration',
  'revolutions-politics', 'world-wars-conflicts', 'colonial-imperial',
  'human-rights-movements', 'science-technology', 'religion-philosophy',
  'cultural-social', 'economic-trade', 'military-warfare',
  'regional-history', 'archaeology-mysteries', 'famous-figures',
  'beyond-human-limits', 'historys-unsung-heroes',
]);

function getDb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const slug     = searchParams.get('slug') ?? '';
  const cursor   = searchParams.get('cursor');
  const cursorId = searchParams.get('cursorId');
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10), 100);

  // Validate slug
  if (slug !== 'history' && !SUBCATEGORY_SLUGS.has(slug)) {
    return NextResponse.json({ error: 'Invalid category slug' }, { status: 400 });
  }

  const db = getDb();

  const SELECT =
    'id, slug, title, summary, category, subcategory, image_url, published_date, source_name, score, era';

  let query = db
    .from('articles')
    .select(SELECT)
    .eq('is_published', true)
    .is('deleted_at', null);

  if (slug === 'history') {
    query = query.eq('category', 'history');
  } else {
    query = query.eq('subcategory', slug);
  }

  // Cursor-based pagination: same (published_date DESC, id DESC) ordering
  if (cursor && cursorId) {
    query = query.or(
      `published_date.lt.${cursor},and(published_date.eq.${cursor},id.lt.${cursorId})`
    );
  }

  query = query
    .order('published_date', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  const { data, error } = await query;

  if (error) {
    console.error('[/api/articles/category] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }

  const rows     = data ?? [];
  const hasMore  = rows.length > limit;
  const articles = hasMore ? rows.slice(0, limit) : rows;
  const last     = articles[articles.length - 1];

  return NextResponse.json({
    articles,
    hasMore,
    nextCursor:   last ? last.published_date : null,
    nextCursorId: last ? last.id            : null,
  });
}
