// src/app/api/admin/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const adminDb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function checkPassword(req: NextRequest): boolean {
  const pw = req.headers.get('x-admin-password');
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || !pw) return false;
  return pw === adminPassword;
}

export async function POST(req: NextRequest) {
  if (!checkPassword(req)) return unauthorized();

  const { action, payload } = await req.json();

  switch (action) {

    case 'insert_article': {
      const { data, error } = await adminDb
        .from('articles')
        .insert(payload)
        .select('id')
        .single();
      return NextResponse.json({ data, error });
    }

    case 'update_article': {
      const { id, ...updates } = payload;
      const { data, error } = await adminDb
        .from('articles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);
      return NextResponse.json({ data, error });
    }

    // ── PUBLISH: force is_published=true AND is_draft=false, clear deleted_at ──
    case 'publish_article': {
      const { id } = payload;
      const { data, error } = await adminDb
        .from('articles')
        .update({
          is_published:  true,
          is_draft:      false,
          deleted_at:    null,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id);
      if (error) console.error('publish_article error:', error);
      return NextResponse.json({ data, error });
    }

    // ── UNPUBLISH: force is_published=false AND is_draft=true ──────────────────
    case 'unpublish_article': {
      const { id } = payload;
      const { data, error } = await adminDb
        .from('articles')
        .update({
          is_published:  false,
          is_draft:      true,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', id);
      if (error) console.error('unpublish_article error:', error);
      return NextResponse.json({ data, error });
    }

    case 'delete_article': {
      const { data, error } = await adminDb
        .rpc('soft_delete_article', { p_id: payload.id });
      return NextResponse.json({ data, error });
    }

    case 'delete_articles_bulk': {
      const ids: number[] = payload.ids;
      const results = await Promise.all(
        ids.map(id => adminDb.rpc('soft_delete_article', { p_id: id }))
      );
      const errors = results
        .map((r, i) => r.error ? `${ids[i]}: ${r.error.message}` : null)
        .filter(Boolean) as string[];
      return NextResponse.json({ errors: errors.length ? errors : null });
    }

    case 'insert_images': {
      const { data, error } = await adminDb
        .from('article_images')
        .insert(payload);
      return NextResponse.json({ data, error });
    }

    case 'update_article_image_url': {
      const { id, image_url } = payload;
      const { data, error } = await adminDb
        .from('articles')
        .update({ image_url })
        .eq('id', id);
      return NextResponse.json({ data, error });
    }

    case 'delete_image': {
      const { id } = payload;
      const { data, error } = await adminDb
        .from('article_images')
        .delete()
        .eq('id', id);
      return NextResponse.json({ data, error });
    }

    case 'delete_images_by_article': {
      const { article_id } = payload;
      const { data, error } = await adminDb
        .from('article_images')
        .delete()
        .eq('article_id', article_id);
      return NextResponse.json({ data, error });
    }

    case 'upsert_topics': {
      const { data, error } = await adminDb
        .from('topic_pool')
        .upsert(payload, { onConflict: 'subcategory,topic_key', ignoreDuplicates: true });
      return NextResponse.json({ data, error });
    }

    case 'mark_topic_used': {
      const { id } = payload;
      const { data, error } = await adminDb
        .from('topic_pool')
        .update({ is_used: true })
        .eq('id', id);
      return NextResponse.json({ data, error });
    }

    case 'update_admin_notes': {
      const { id, admin_notes } = payload;
      const { data, error } = await adminDb
        .from('articles')
        .update({ admin_notes })
        .eq('id', id);
      return NextResponse.json({ data, error });
    }

    case 'refresh_category_counts': {
      const { data, error } = await adminDb.rpc('refresh_category_counts');
      return NextResponse.json({ data, error });
    }

    // ── UPLOAD IMAGE — uses service role key, bypasses RLS entirely ────────────
    case 'upload_image': {
      const { path, base64, contentType, bucket } = payload;

      const fileBuffer = Buffer.from(base64, 'base64');

      const { error } = await adminDb.storage
        .from(bucket)
        .upload(path, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (error) return NextResponse.json({ data: null, error }, { status: 500 });

      const { data: { publicUrl } } = adminDb.storage
        .from(bucket)
        .getPublicUrl(path);

      return NextResponse.json({ data: { publicUrl }, error: null });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// GET — read-only admin queries
export async function GET(req: NextRequest) {
  if (!checkPassword(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type      = searchParams.get('type');
  const filter    = searchParams.get('filter') ?? 'draft';
  const filterCat = searchParams.get('filterCat') ?? 'all';
  const articleId = searchParams.get('articleId');

  if (type === 'articles') {
    let q = adminDb
      .from('articles')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (filter === 'draft')     q = q.eq('is_draft', true).eq('is_published', false);
    if (filter === 'published') q = q.eq('is_published', true).eq('is_draft', false);
    if (filterCat !== 'all')    q = q.eq('subcategory', filterCat);

    const { data, error } = await q;
    return NextResponse.json({ data, error });
  }

  if (type === 'article_content' && articleId) {
    const { data, error } = await adminDb
      .from('articles')
      .select('id, raw_content, image_url')
      .eq('id', Number(articleId))
      .is('deleted_at', null)
      .single();
    return NextResponse.json({ data, error });
  }

  if (type === 'images' && articleId) {
    const { data, error } = await adminDb
      .from('article_images')
      .select('*')
      .eq('article_id', Number(articleId))
      .order('position', { ascending: true });
    return NextResponse.json({ data, error });
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}