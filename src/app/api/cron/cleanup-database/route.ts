import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  console.log(`\n=== CLEANUP STARTED at ${timestamp} ===\n`);

  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldDrafts } = await supabase
      .from('articles')
      .select('id')
      .eq('is_draft', true)
      .eq('is_published', false)
      .lt('created_at', cutoff);

    const oldIds = (oldDrafts || []).map((a: any) => a.id);

    if (oldIds.length > 0) {
      await supabase.from('article_images').delete().in('article_id', oldIds);
      const { error } = await supabase.from('articles').delete().in('id', oldIds);
      if (error) throw error;
    }

    console.log(`✅ Deleted ${oldIds.length} old draft articles + their images`);

    const [total, published, drafts, images] = await Promise.all([
      supabase.from('articles').select('id', { count: 'exact', head: true }),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_draft', true),
      supabase.from('article_images').select('id', { count: 'exact', head: true }),
    ]);

    const stats = {
      total_articles:     total.count     || 0,
      published_articles: published.count || 0,
      draft_articles:     drafts.count    || 0,
      total_images:       images.count    || 0,
    };

    console.log('\n=== CLEANUP DONE ===\n');

    return NextResponse.json({
      success: true, deleted: oldIds.length, stats, timestamp,
      message: `Deleted ${oldIds.length} old drafts. ${stats.published_articles} published articles are safe.`,
    });

  } catch (e: any) {
    console.error('\n❌ CLEANUP ERROR:', e.message);
    return NextResponse.json({ error: e.message, timestamp }, { status: 500 });
  }
}