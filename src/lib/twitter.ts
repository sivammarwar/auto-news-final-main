const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

const TWITTER_QUERIES: Record<string, string> = {
  cricket:    '(cricket OR IPL OR TestCricket OR BCCI) lang:en -is:retweet',
  bollywood:  '(bollywood OR "hindi film" OR "new movie" OR "box office") lang:en -is:retweet',
  technology: '(AI OR startup OR "tech news" OR OpenAI OR software) lang:en -is:retweet',
};

export const fetchFromTwitter = async (category: string) => {
  if (!TWITTER_BEARER_TOKEN) {
    console.log('   ⚠️  TWITTER_BEARER_TOKEN not set, skipping Twitter');
    return [];
  }

  const query = TWITTER_QUERIES[category];
  if (!query) return [];

  try {
    const params = new URLSearchParams({
      query,
      max_results:    '20',
      'tweet.fields': 'created_at,author_id,entities,public_metrics',
      expansions:     'author_id',
      'user.fields':  'name,username',
    });

    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params}`,
      {
        headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (res.status === 429) { console.error('   ✗ Twitter rate limit hit'); return []; }
    if (!res.ok) throw new Error(`Twitter API error: ${res.status}`);

    const data = await res.json();
    const tweets = data?.data ?? [];
    const users  = data?.includes?.users ?? [];
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));

    return tweets
      .filter((tweet: any) => tweet.entities?.urls?.length > 0)
      .map((tweet: any) => {
        const author      = userMap[tweet.author_id];
        const expandedUrl = tweet.entities?.urls?.[0]?.expanded_url || `https://twitter.com/i/web/status/${tweet.id}`;
        return {
          title:         tweet.text.replace(/https?:\/\/\S+/g, '').trim().substring(0, 200),
          sourceUrl:     expandedUrl,
          sourceName:    author ? `@${author.username}` : 'Twitter',
          rawContent:    tweet.text,
          imageUrl:      null,
          publishedDate: new Date(tweet.created_at),
          category,
        };
      });
  } catch (error: any) {
    console.error(`   ✗ Twitter error: ${error.message}`);
    return [];
  }
};