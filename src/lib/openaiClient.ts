import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const summarizeArticle = async (title: string, content: string) => {
  if (!content || content.length < 50) return content || title;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a news summarization AI. Create concise, factual summaries of news articles in 90-120 tokens. Be factual, include key details, no commentary, clear simple language.`,
        },
        {
          role: 'user',
          content: `Summarize this article:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 2000)}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('OpenAI summarization error:', error.message);
    return content.substring(0, 300) + '...';
  }
};

export const scoreArticle = async (title: string, summary: string, category: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a news relevance scoring AI. Score articles 0-10 based on relevance to ${category}, recency, virality, and news value. Return ONLY a number between 0-10, nothing else.`,
        },
        {
          role: 'user',
          content: `Score this article:\n\nTitle: ${title}\n\nSummary: ${summary}`,
        },
      ],
      max_tokens: 5,
      temperature: 0.3,
    });
    const score = parseFloat(response.choices[0].message.content?.trim() ?? '');
    return isNaN(score) ? 5.0 : Math.min(10, Math.max(0, score));
  } catch (error: any) {
    console.error('OpenAI scoring error:', error.message);
    return 5.0;
  }
};