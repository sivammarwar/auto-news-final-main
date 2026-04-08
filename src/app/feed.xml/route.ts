import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hiddenhistoryfacts.com';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function escapeXml(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const revalidate = 3600;

export async function GET() {
  const db = getSupabase();
  const { data: articles } = await db
    .from('articles')
    .select('id, slug, title, summary, published_date, image_url, subcategory')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('published_date', { ascending: false })
    .limit(50);

  const items = (articles ?? []).map(a => {
    const url = `${BASE_URL}/article/${a.slug ?? a.id}`;
    return `
    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.summary)}</description>
      <pubDate>${new Date(a.published_date).toUTCString()}</pubDate>
      ${a.image_url ? `<enclosure url="${escapeXml(a.image_url)}" type="image/jpeg" length="0"/>` : ''}
    </item>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hidden Facts</title>
    <link>${BASE_URL}</link>
    <description>The history they taught you — and the history they buried.</description>
    <language>en-us</language>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
