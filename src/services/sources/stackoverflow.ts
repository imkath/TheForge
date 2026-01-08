/**
 * Stack Overflow/Stack Exchange API (100% Free)
 *
 * Uses Stack Exchange API v2.3 - no auth required (300 requests/day)
 * With API key: 10,000 requests/day (free key from stackapps.com)
 *
 * Great for finding:
 * - Common problems developers face
 * - Frequently asked questions (market demand)
 * - Pain points with existing tools
 */

export interface StackOverflowQuestion {
  id: number;
  title: string;
  body: string;
  url: string;
  tags: string[];
  score: number;
  answerCount: number;
  viewCount: number;
  createdAt: string;
  isAnswered: boolean;
}

export interface StackOverflowSearchResult {
  items: StackOverflowQuestion[];
  source: 'stackoverflow';
  query: string;
  totalCount: number;
}

const SO_API_URL = 'https://api.stackexchange.com/2.3';

/**
 * Search Stack Overflow questions
 */
export async function searchStackOverflow(
  query: string,
  options: {
    pageSize?: number;
    sort?: 'activity' | 'votes' | 'creation' | 'relevance';
    tagged?: string[];
    minViews?: number;
  } = {}
): Promise<StackOverflowSearchResult> {
  const { pageSize = 20, sort = 'votes', tagged = [], minViews } = options;

  try {
    const params = new URLSearchParams({
      order: 'desc',
      sort,
      intitle: query,
      site: 'stackoverflow',
      pagesize: pageSize.toString(),
      filter: '!nNPvSNPI7A', // Include body excerpt
    });

    if (tagged.length > 0) {
      params.set('tagged', tagged.join(';'));
    }

    const response = await fetch(`${SO_API_URL}/search/advanced?${params}`);

    if (!response.ok) {
      if (response.status === 400) {
        console.warn('[StackOverflow] Bad request or rate limited');
        return { items: [], source: 'stackoverflow', query, totalCount: 0 };
      }
      throw new Error(`StackOverflow API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error_id) {
      console.warn('[StackOverflow] API error:', data.error_message);
      return { items: [], source: 'stackoverflow', query, totalCount: 0 };
    }

    let items: StackOverflowQuestion[] = data.items.map((q: any) => ({
      id: q.question_id,
      title: q.title,
      body: q.body_markdown?.slice(0, 300) || '',
      url: q.link,
      tags: q.tags || [],
      score: q.score || 0,
      answerCount: q.answer_count || 0,
      viewCount: q.view_count || 0,
      createdAt: new Date(q.creation_date * 1000).toISOString(),
      isAnswered: q.is_answered || false,
    }));

    // Filter by minimum views if specified
    if (minViews) {
      items = items.filter((q) => q.viewCount >= minViews);
    }

    return {
      items,
      source: 'stackoverflow',
      query,
      totalCount: data.total || items.length,
    };
  } catch (error) {
    console.error('StackOverflow search failed:', error);
    return { items: [], source: 'stackoverflow', query, totalCount: 0 };
  }
}

/**
 * Search for unanswered questions (indicates unmet needs)
 */
export async function searchUnansweredQuestions(keywords: string[]): Promise<StackOverflowQuestion[]> {
  const allItems: StackOverflowQuestion[] = [];

  for (const keyword of keywords.slice(0, 3)) {
    try {
      const params = new URLSearchParams({
        order: 'desc',
        sort: 'votes',
        intitle: keyword,
        site: 'stackoverflow',
        pagesize: '15',
        accepted: 'False',
      });

      const response = await fetch(`${SO_API_URL}/search/advanced?${params}`);
      const data = await response.json();

      if (data.items) {
        const items = data.items.map((q: any) => ({
          id: q.question_id,
          title: q.title,
          body: '',
          url: q.link,
          tags: q.tags || [],
          score: q.score || 0,
          answerCount: q.answer_count || 0,
          viewCount: q.view_count || 0,
          createdAt: new Date(q.creation_date * 1000).toISOString(),
          isAnswered: false,
        }));
        allItems.push(...items);
      }

      // Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`SO search failed for ${keyword}:`, error);
    }
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.viewCount - a.viewCount);
}

/**
 * Search questions with high engagement (many views, few answers)
 */
export async function searchHighDemandQuestions(keywords: string[]): Promise<StackOverflowQuestion[]> {
  const allItems: StackOverflowQuestion[] = [];

  for (const keyword of keywords.slice(0, 2)) {
    const result = await searchStackOverflow(keyword, {
      pageSize: 20,
      sort: 'votes',
      minViews: 1000,
    });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Filter for questions with high views but few answers (unmet demand)
  const highDemand = allItems.filter(
    (q) => q.viewCount >= 1000 && q.answerCount <= 2
  );

  const unique = Array.from(
    new Map(highDemand.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.viewCount - a.viewCount);
}
