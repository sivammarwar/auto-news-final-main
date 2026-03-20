const RSS_SOURCES: Record<string, string[]> = {
    cricket: [
      'https://www.espncricinfo.com/feeds/rss/cricket_news.xml',
      'https://www.cricbuzz.com/rss/news.xml',
    ],
    bollywood: [
      'https://www.bollywoodhungama.com/news/rss',
      'https://www.hindustantimes.com/feeds/rss/entertainment/bollywood.xml',
    ],
    technology: [
      'https://feeds.techcrunch.com/techcrunch/startups',
      'https://feeds.theverge.com/rss/index.xml',
      'https://news.ycombinator.com/rss',
    ],
  };
  
  function extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`));
    return (match?.[1] || match?.[2] || '').trim();
  }
  
  function extractImageFromContent(content: string): string | null {
    if (!content) return null;
    const match = content.match(/<img[^>]+src="([^">]+)"/);
    return match ? match[1] : null;
  }
  
  function parseRSSItems(xml: string, category: string) {
    const items: any[] = [];
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
    for (const item of itemMatches) {
      const title       = extractTag(item, 'title');
      const link        = extractTag(item, 'link');
      const guid        = extractTag(item, 'guid');
      const description = extractTag(item, 'description');
      const pubDate     = extractTag(item, 'pubDate');
      if (!title) continue;
      items.push({
        title,
        sourceUrl:     link || guid,
        sourceName:    'RSS Feed',
        rawContent:    description,
        imageUrl:      extractImageFromContent(description),
        publishedDate: new Date(pubDate || Date.now()),
        category,
      });
    }
    return items;
  }
  
  export const fetchRSSFeed = async (category: string) => {
    const sources = RSS_SOURCES[category] ?? [];
    const articles: any[] = [];
  
    for (const rssUrl of sources) {
      try {
        const res = await fetch(rssUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;
        const xml = await res.text();
        articles.push(...parseRSSItems(xml, category));
      } catch (error: any) {
        console.error(`RSS parsing error for ${rssUrl}:`, error.message);
      }
    }
  
    return articles;
  };