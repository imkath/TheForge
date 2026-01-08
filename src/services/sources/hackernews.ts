/**
 * Hacker News Algolia API Service (100% Free)
 *
 * Uses Algolia-powered search - no authentication required
 * Endpoint: https://hn.algolia.com/api/v1/
 *
 * Features:
 * - Full text search across all HN content
 * - Filter by story, comment, ask_hn, show_hn
 * - Date range filtering
 * - No rate limits for reasonable usage
 *
 * Source: https://hn.algolia.com/api
 */

export interface HNItem {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number;
  numComments: number;
  storyText: string | null;
  commentText: string | null;
  createdAt: string;
  createdAtTimestamp: number;
  tags: string[];
  permalink: string;
}

export interface HNSearchResult {
  items: HNItem[];
  source: 'hackernews';
  query: string;
  totalHits: number;
}

const HN_ALGOLIA_URL = 'https://hn.algolia.com/api/v1';

type HNSearchType = 'story' | 'comment' | 'ask_hn' | 'show_hn' | 'job' | 'all';

/**
 * Search Hacker News by relevance
 */
export async function searchHN(
  query: string,
  options: {
    type?: HNSearchType;
    page?: number;
    hitsPerPage?: number;
    minPoints?: number;
  } = {}
): Promise<HNSearchResult> {
  const { type = 'all', page = 0, hitsPerPage = 20, minPoints } = options;

  try {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      hitsPerPage: hitsPerPage.toString(),
    });

    // Add tag filter if not searching all
    if (type !== 'all') {
      params.set('tags', type);
    }

    // Add points filter if specified
    if (minPoints) {
      params.set('numericFilters', `points>=${minPoints}`);
    }

    const response = await fetch(`${HN_ALGOLIA_URL}/search?${params}`);

    if (!response.ok) {
      throw new Error(`HN API error: ${response.status}`);
    }

    const data = await response.json();

    const items: HNItem[] = data.hits.map((hit: any) => ({
      objectID: hit.objectID,
      title: hit.title || hit.story_title || '',
      url: hit.url || hit.story_url || null,
      author: hit.author,
      points: hit.points || 0,
      numComments: hit.num_comments || 0,
      storyText: hit.story_text || null,
      commentText: hit.comment_text || null,
      createdAt: hit.created_at,
      createdAtTimestamp: hit.created_at_i,
      tags: hit._tags || [],
      permalink: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));

    return {
      items,
      source: 'hackernews',
      query,
      totalHits: data.nbHits,
    };
  } catch (error) {
    console.error('HN search failed:', error);
    return { items: [], source: 'hackernews', query, totalHits: 0 };
  }
}

/**
 * Search HN by date (most recent first)
 */
export async function searchHNByDate(
  query: string,
  options: {
    type?: HNSearchType;
    hitsPerPage?: number;
    afterTimestamp?: number;
  } = {}
): Promise<HNSearchResult> {
  const { type = 'all', hitsPerPage = 20, afterTimestamp } = options;

  try {
    const params = new URLSearchParams({
      query,
      hitsPerPage: hitsPerPage.toString(),
    });

    if (type !== 'all') {
      params.set('tags', type);
    }

    if (afterTimestamp) {
      params.set('numericFilters', `created_at_i>${afterTimestamp}`);
    }

    const response = await fetch(`${HN_ALGOLIA_URL}/search_by_date?${params}`);

    if (!response.ok) {
      throw new Error(`HN API error: ${response.status}`);
    }

    const data = await response.json();

    const items: HNItem[] = data.hits.map((hit: any) => ({
      objectID: hit.objectID,
      title: hit.title || hit.story_title || '',
      url: hit.url || hit.story_url || null,
      author: hit.author,
      points: hit.points || 0,
      numComments: hit.num_comments || 0,
      storyText: hit.story_text || null,
      commentText: hit.comment_text || null,
      createdAt: hit.created_at,
      createdAtTimestamp: hit.created_at_i,
      tags: hit._tags || [],
      permalink: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    }));

    return {
      items,
      source: 'hackernews',
      query,
      totalHits: data.nbHits,
    };
  } catch (error) {
    console.error('HN search by date failed:', error);
    return { items: [], source: 'hackernews', query, totalHits: 0 };
  }
}

/**
 * Search for "Ask HN" posts about tools and pain points
 */
export async function searchAskHN(keywords: string[]): Promise<HNItem[]> {
  const allItems: HNItem[] = [];

  for (const keyword of keywords) {
    const result = await searchHN(keyword, {
      type: 'ask_hn',
      hitsPerPage: 15,
      minPoints: 10, // Filter low-quality posts
    });
    allItems.push(...result.items);
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allItems.map((item) => [item.objectID, item])).values()
  );

  return unique.sort((a, b) => b.points - a.points);
}

/**
 * Search for "Show HN" posts (competitors/existing solutions)
 */
export async function searchShowHN(vertical: string): Promise<HNItem[]> {
  const result = await searchHN(vertical, {
    type: 'show_hn',
    hitsPerPage: 30,
    minPoints: 5,
  });

  return result.items;
}

/**
 * Search HN comments for pain points and complaints
 */
export async function searchHNComments(keywords: string[]): Promise<HNItem[]> {
  const painPhrases = [
    'wish there was',
    'frustrated with',
    'looking for',
    'anyone know',
    'alternative to',
    'hate when',
    'manual process',
  ];

  const allItems: HNItem[] = [];

  for (const keyword of keywords.slice(0, 3)) {
    for (const phrase of painPhrases.slice(0, 3)) {
      const result = await searchHN(`${keyword} ${phrase}`, {
        type: 'comment',
        hitsPerPage: 10,
      });
      allItems.push(...result.items);

      // Small delay to be nice to the API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Deduplicate and filter to only comments with substance
  const unique = Array.from(
    new Map(allItems.map((item) => [item.objectID, item])).values()
  ).filter((item) => item.commentText && item.commentText.length > 50);

  return unique;
}

/**
 * Get recent discussions about a topic (last 30 days)
 */
export async function getRecentDiscussions(topic: string): Promise<HNItem[]> {
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

  const result = await searchHNByDate(topic, {
    type: 'story',
    hitsPerPage: 50,
    afterTimestamp: thirtyDaysAgo,
  });

  return result.items;
}
