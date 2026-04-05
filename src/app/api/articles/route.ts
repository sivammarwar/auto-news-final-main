// src/app/api/articles/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PAGE_SIZE = 24;

function getDb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const cursor   = searchParams.get('cursor');   // published_date of last item (ISO string)
  const cursorId = searchParams.get('cursorId'); // id of last item (for tie-breaking)
  const q        = (searchParams.get('q') ?? '').trim();
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10), 100);

  const db = getDb();

  const SELECT =
    'id, slug, title, summary, category, subcategory, image_url, published_date, source_name, score, era';

  let query = db
    .from('articles')
    .select(SELECT)
    .eq('is_published', true)
    .is('deleted_at', null);

  // ── Search mode: use Postgres full-text search via the `fts` column,
  //    falling back to ilike on title+summary if fts is empty/null.
  //    We do NOT paginate search results with a cursor — just return up to
  //    500 matches ordered by relevance so the client can handle it in-memory.
  if (q) {
    // Try fts first (tsvector column that Supabase auto-generates).
    // websearch_to_tsquery handles multi-word queries gracefully.
    query = query
      .textSearch('fts', q, { type: 'websearch', config: 'english' })
      .order('published_date', { ascending: false })
      .limit(500);
  } else {
    // ── Cursor-based pagination for the normal feed.
    //    Rows are ordered by (published_date DESC, id DESC).
    //    The cursor is the (published_date, id) of the last row seen.
    if (cursor && cursorId) {
      // Fetch rows that come *after* the cursor in descending date order.
      // Supabase doesn't support multi-column cursors natively, so we use
      // a compound filter:  date < cursor  OR  (date = cursor AND id < cursorId)
      query = query.or(
        `published_date.lt.${cursor},and(published_date.eq.${cursor},id.lt.${cursorId})`
      );
    }

    query = query
      .order('published_date', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1); // fetch one extra to determine hasMore
  }

  const { data, error } = await query;

  if (error) {
    console.error('[/api/articles] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }

  const rows = data ?? [];

  if (q) {
    // Search: return all matches, no cursor needed
    return NextResponse.json({ articles: rows, hasMore: false, nextCursor: null, nextCursorId: null });
  }

  // Pagination: slice off the extra row we used to check hasMore
  const hasMore = rows.length > limit;
  const articles = hasMore ? rows.slice(0, limit) : rows;
  const last = articles[articles.length - 1];

  return NextResponse.json({
    articles,
    hasMore,
    nextCursor:   last ? last.published_date : null,
    nextCursorId: last ? last.id            : null,
  });
}
