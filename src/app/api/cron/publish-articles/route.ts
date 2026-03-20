import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Minimum score to auto-publish — matches the threshold in AdminPanel and API routes
const PUBLISH_SCORE_THRESHOLD = 7.5;

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const timestamp = new Date().toISOString();
  console.log('\n=== PUBLISH PIPELINE STARTED ===\n');

  try {
    // Fetch history drafts that meet the quality bar.
    // Also requires image_url to be set — no article goes live without an image.
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, score, subcategory, image_url')
      .eq('category', 'history')
      .eq('is_published', false)
      .eq('is_draft', true)
      .gt('score', PUBLISH_SCORE_THRESHOLD)
      .not('image_url', 'is', null)      // must have at least a hero image
      .order('score', { ascending: false })
      .order('published_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    console.log(`📄 Found ${articles?.length ?? 0} articles ready to publish`);

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No articles ready to publish (score > ${PUBLISH_SCORE_THRESHOLD} + image required)`,
        timestamp,
        articlesPublished: 0,
      });
    }

    // Publish in one batch update
    const articleIds = articles.map((a: any) => a.id);
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        is_published: true,
        is_draft:     false,
        updated_at:   new Date().toISOString(),
      })
      .in('id', articleIds);

    if (updateError) throw updateError;
    console.log(`✅ Published ${articleIds.length} articles`);

    // Group stats by subcategory (not category — everything is 'history')
    const bySubcategory: Record<string, number> = {};
    const scoreDistribution = { high: 0, mid: 0 }; // ≥9 vs 7.5-9

    articles.forEach((a: any) => {
      const subcat = a.subcategory ?? 'unknown';
      bySubcategory[subcat] = (bySubcategory[subcat] || 0) + 1;
      if (a.score >= 9.0) scoreDistribution.high++;
      else scoreDistribution.mid++;
    });

    // Log each published article
    articles.forEach((a: any) => {
      console.log(`   ✓ #${a.id} [${a.subcategory ?? 'unknown'}] score:${a.score?.toFixed(1)} — ${a.title?.substring(0, 60)}`);
    });

    console.log('\n=== PUBLISH PIPELINE DONE ===\n');

    return NextResponse.json({
      success: true,
      timestamp,
      articlesPublished:  articleIds.length,
      bySubcategory,
      scoreDistribution,
      message: `Published ${articleIds.length} history articles across ${Object.keys(bySubcategory).length} subcategories`,
    });

  } catch (e: any) {
    console.error('\n❌ PUBLISH PIPELINE ERROR:', e.message);
    return NextResponse.json({ error: e.message, timestamp }, { status: 500 });
  }
}