const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2';

const QUERIES: Record<string, string> = {
  cricket:    'cricket news',
  bollywood:  'bollywood OR hindi cinema OR indian films',
  technology: 'technology OR AI OR startups OR software',
};

export const fetchNewsFromNewsAPI = async (category: string) => {
  if (!NEWS_API_KEY) {
    console.log('   ⚠️  NEWS_API_KEY not set, skipping NewsAPI');
    return [];
  }

  try {
    const params = new URLSearchParams({
      q:        QUERIES[category] || category,
      sortBy:   'publishedAt',
      language: 'en',
      pageSize: '30',
      apiKey:   NEWS_API_KEY,
    });

    const res = await fetch(`${NEWS_API_URL}/everything?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`NewsAPI responded with ${res.status}`);
    const data = await res.json();

    return (data.articles || [])
      .filter((a: any) => a.url && a.title && a.title !== '[Removed]')
      .map((article: any) => ({
        title:         article.title,
        sourceUrl:     article.url,
        sourceName:    article.source?.name || 'News API',
        rawContent:    article.content || article.description || '',
        imageUrl:      article.urlToImage || null,
        publishedDate: new Date(article.publishedAt),
        category,
      }));
  } catch (error: any) {
    console.error(`   ✗ NewsAPI error for ${category}: ${error.message}`);
    return [];
  }
};