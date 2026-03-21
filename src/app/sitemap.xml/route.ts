import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// All 15 history subcategory slugs + the top-level catch-all
const HISTORY_SUBCATEGORIES = [
  'ancient-civilizations',
  'medieval-feudal',
  'age-of-exploration',
  'revolutions-politics',
  'world-wars-conflicts',
  'colonial-imperial',
  'human-rights-movements',
  'science-technology',
  'religion-philosophy',
  'cultural-social',
  'economic-trade',
  'military-warfare',
  'regional-history',
  'archaeology-mysteries',
  'famous-figures',
];

const FREQ = {
  home:     'daily',
  category: 'daily',
  article:  'weekly',
  legal:    'monthly',
};

function buildUrl(
  domain: string,
  path: string,
  priority: number,
  changefreq: string,
  lastmod: string
) {
  return [
    '  <url>',
    `    <loc>${domain}${path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    '  </url>',
  ].join('\n');
}

function minimalSitemap(domain: string) {
  const today = new Date().toISOString().split('T')[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;
}

export async function GET(req: NextRequest) {
  const domain =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `https://${req.headers.get('host')}` ||
    'https://hiddenhistoryfacts.com';

  const today = new Date().toISOString().split('T')[0];

  try {
    console.log(`Generating sitemap for: ${domain}`);

    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, slug, published_date, updated_at, subcategory')
      .eq('is_published', true)
      .eq('category', 'history')
      .order('published_date', { ascending: false })
      .limit(50000);

    if (error) throw error;

    const urls: string[] = [];

    // ── Homepage ──────────────────────────────────────────────────────────
    urls.push(buildUrl(domain, '/', 1.0, FREQ.home, today));

    // ── Top-level history page ────────────────────────────────────────────
    urls.push(buildUrl(domain, '/category/history', 0.9, FREQ.category, today));

    // ── All 15 subcategory pages ──────────────────────────────────────────
    HISTORY_SUBCATEGORIES.forEach(slug => {
      urls.push(buildUrl(domain, `/category/${slug}`, 0.9, FREQ.category, today));
    });

    // ── Legal + utility pages ─────────────────────────────────────────────
    urls.push(buildUrl(domain, '/contact', 0.5, FREQ.legal, today));
    urls.push(buildUrl(domain, '/privacy', 0.3, FREQ.legal, today));
    urls.push(buildUrl(domain, '/terms',   0.3, FREQ.legal, today));
    urls.push(buildUrl(domain, '/rss',     0.3, FREQ.legal, today));

    // ── Article pages — use slug, fall back to id for old articles ────────
    (articles ?? []).forEach((article: any) => {
      const lastmod    = new Date(article.updated_at || article.published_date)
        .toISOString()
        .split('T')[0];
      const identifier = article.slug || article.id;
      urls.push(buildUrl(domain, `/article/${identifier}`, 0.8, FREQ.article, lastmod));
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset',
      '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...urls,
      '</urlset>',
    ].join('\n');

    console.log(`✓ Sitemap — ${urls.length} URLs (${articles?.length ?? 0} articles)`);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type':    'application/xml; charset=utf-8',
        'Cache-Control':   'public, max-age=3600, s-maxage=3600',
        'X-Sitemap-Count': String(urls.length),
      },
    });

  } catch (err: any) {
    console.error('❌ Sitemap error:', err.message);
    return new NextResponse(minimalSitemap(domain), {
      status: 200,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}