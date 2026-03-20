import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  console.log('\n=== PUBLISH PIPELINE STARTED ===\n');

  try {
    // Get high-scoring unpublished articles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('*')
      .eq('is_published', false)
      .eq('is_draft', true)
      .gt('score', 6.0)
      .order('score', { ascending: false })
      .order('published_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    console.log(`📄 Found ${articles?.length ?? 0} articles to publish`);

    if (!articles || articles.length === 0) {
      return NextResponse.json({ success: true, message: 'No articles to publish', timestamp });
    }

    // Mark articles as published
    const articleIds = articles.map((a: any) => a.id);
    const { error: updateError } = await supabase
      .from('articles')
      .update({ is_published: true, is_draft: false, updated_at: new Date().toISOString() })
      .in('id', articleIds);

    if (updateError) throw updateError;
    console.log(`✅ Published ${articleIds.length} articles`);

    // Stats by category
    const byCategory: Record<string, number> = {};
    articles.forEach((a: any) => {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    });

    console.log('\n=== PUBLISH PIPELINE DONE ===\n');

    return NextResponse.json({
      success: true,
      timestamp,
      articlesPublished: articleIds.length,
      byCategory,
      message: `Published ${articleIds.length} articles across ${Object.keys(byCategory).length} categories`,
    });

  } catch (e: any) {
    console.error('\n❌ PUBLISH PIPELINE ERROR:', e.message);
    return NextResponse.json({ error: e.message, timestamp }, { status: 500 });
  }
}