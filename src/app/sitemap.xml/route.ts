import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  'beyond-human-limits',
  'historys-unsung-heroes',
];

const FREQ = {
  home:     'daily',
  category: 'daily',
  article:  'weekly',
  legal:    'monthly',
};

// Sanitize for XML — strips characters that would break the XML document
function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrl(
  domain: string,
  path: string,
  priority: number,
  changefreq: string,
  lastmod: string,
  image?: {
    loc: string;
    title: string;
    caption?: string;
    license?: string;
    geo_location?: string;
  }
) {
  const lines = [
    '  <url>',
    `    <loc>${domain}${path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
  ];

  if (image?.loc) {
    lines.push('    <image:image>');
    lines.push(`      <image:loc>${xmlEscape(image.loc)}</image:loc>`);
    if (image.title)        lines.push(`      <image:title>${xmlEscape(image.title)}</image:title>`);
    if (image.caption)      lines.push(`      <image:caption>${xmlEscape(image.caption)}</image:caption>`);
    if (image.license)      lines.push(`      <image:license>${xmlEscape(image.license)}</image:license>`);
    if (image.geo_location) lines.push(`      <image:geo_location>${xmlEscape(image.geo_location)}</image:geo_location>`);
    lines.push('    </image:image>');
  }

  lines.push('  </url>');
  return lines.join('\n');
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
    'https://www.hiddenhistoryfacts.com';

  const today = new Date().toISOString().split('T')[0];

  try {
    console.log(`Generating sitemap for: ${domain}`);

    // ── Paginated article fetch ───────────────────────────────────────────
    const PAGE_SIZE = 1000;
    let allArticles: any[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('articles')
        .select('id, slug, title, summary, published_date, updated_at, subcategory, image_url')
        .eq('is_published', true)
        .eq('category', 'history')
        .order('published_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allArticles = allArticles.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // ── Batch-fetch hero images for all articles (single query, no N+1) ──
    const articleIds = allArticles.map((a: any) => a.id);
    let heroImageMap: Record<number, any> = {};

    if (articleIds.length > 0) {
      // Fetch position=0 (hero) images for all articles in one go.
      // We only need the first image per article, so we pull all position=0
      // rows and build a map keyed by article_id.
      const { data: heroImages, error: imgError } = await supabase
        .from('article_images')
        .select('article_id, image_url, alt_text, photographer, image_source, wiki_attribution, wiki_license_url')
        .in('article_id', articleIds)
        .eq('position', 0);

      if (!imgError && heroImages) {
        heroImages.forEach((img: any) => {
          // Keep only the first hero image encountered per article
          if (!heroImageMap[img.article_id]) {
            heroImageMap[img.article_id] = img;
          }
        });
      }
    }

    const urls: string[] = [];

    // ── Homepage ──────────────────────────────────────────────────────────
    urls.push(buildUrl(domain, '/', 1.0, FREQ.home, today));

    // ── Top-level history page ────────────────────────────────────────────
    urls.push(buildUrl(domain, '/category/history', 0.9, FREQ.category, today));

    // ── All subcategory pages ─────────────────────────────────────────────
    HISTORY_SUBCATEGORIES.forEach(slug => {
      urls.push(buildUrl(domain, `/category/${slug}`, 0.9, FREQ.category, today));
    });

    // ── Legal + utility pages ─────────────────────────────────────────────
    urls.push(buildUrl(domain, '/contact', 0.5, FREQ.legal, today));
    urls.push(buildUrl(domain, '/privacy', 0.3, FREQ.legal, today));
    urls.push(buildUrl(domain, '/terms',   0.3, FREQ.legal, today));
    urls.push(buildUrl(domain, '/rss',     0.3, FREQ.legal, today));

    // ── Article pages with image tags ─────────────────────────────────────
    allArticles.forEach((article: any) => {
      const lastmod    = new Date(article.updated_at || article.published_date)
        .toISOString()
        .split('T')[0];
      const identifier = article.slug || article.id;

      // Prefer the dedicated hero image row; fall back to the article's own image_url
      const heroImg  = heroImageMap[article.id];
      const imageUrl = heroImg?.image_url || article.image_url;

      let imageTag: Parameters<typeof buildUrl>[5] | undefined;

      if (imageUrl) {
        // Build a caption from the photographer credit or alt text
        let caption: string | undefined;
        if (heroImg?.image_source === 'pexels' && heroImg?.photographer) {
          caption = `Photo by ${heroImg.photographer} on Pexels`;
        } else if (heroImg?.image_source === 'wikimedia' && heroImg?.wiki_attribution) {
          caption = heroImg.wiki_attribution;
        } else if (heroImg?.alt_text) {
          caption = heroImg.alt_text;
        }

        // License URL: use wiki_license_url for Wikimedia, otherwise omit
        const license = heroImg?.image_source === 'wikimedia' && heroImg?.wiki_license_url
          ? heroImg.wiki_license_url
          : undefined;

        imageTag = {
          loc:     imageUrl,
          title:   article.title,
          caption,
          license,
        };
      }

      urls.push(
        buildUrl(domain, `/article/${identifier}`, 0.8, FREQ.article, lastmod, imageTag)
      );
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset',
      '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
      '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...urls,
      '</urlset>',
    ].join('\n');

    const imageCount = allArticles.filter((a: any) =>
      heroImageMap[a.id]?.image_url || a.image_url
    ).length;

    console.log(
      `✓ Sitemap — ${urls.length} URLs (${allArticles.length} articles, ${imageCount} with images)`
    );

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type':     'application/xml; charset=utf-8',
        'Cache-Control':    'public, max-age=3600, s-maxage=3600',
        'X-Sitemap-Count':  String(urls.length),
        'X-Image-Count':    String(imageCount),
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
