/**
 * IndieHackers Scraper (100% Free)
 *
 * IndieHackers doesn't have a public API, but we can use their
 * Algolia-powered search (similar to HN)
 *
 * CORS Solution: Uses Cloudflare Worker proxy (no CORS issues)
 *
 * Great for finding:
 * - SaaS ideas being discussed
 * - Founder problems and pain points
 * - What indie hackers are building
 * - Revenue discussions
 */

import { config } from '@/config';

export interface IndieHackersPost {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  votes: number;
  comments: number;
  createdAt: string;
  type: 'post' | 'product' | 'milestone';
}

export interface IndieHackersSearchResult {
  items: IndieHackersPost[];
  source: 'indiehackers';
  query: string;
  totalCount: number;
}

/**
 * Search IndieHackers posts via Cloudflare Worker proxy
 */
export async function searchIndieHackers(
  query: string,
  options: {
    hitsPerPage?: number;
    type?: 'posts' | 'products' | 'all';
  } = {}
): Promise<IndieHackersSearchResult> {
  const { hitsPerPage = 20, type = 'posts' } = options;

  try {
    const indexName = type === 'products' ? 'products' : 'posts';

    // Use Cloudflare Worker proxy (no CORS issues)
    const response = await fetch(`${config.api.baseUrl}/api/indiehackers/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        hitsPerPage,
        indexName,
        attributesToRetrieve: [
          'objectID',
          'title',
          'body',
          'authorUsername',
          'votesCount',
          'commentsCount',
          'createdAt',
          'slug',
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    const items: IndieHackersPost[] = (data.hits || []).map((hit: any) => ({
      id: hit.objectID,
      title: hit.title || '',
      content: hit.body?.slice(0, 400) || '',
      url: `https://www.indiehackers.com/post/${hit.slug || hit.objectID}`,
      author: hit.authorUsername || 'anonymous',
      votes: hit.votesCount || 0,
      comments: hit.commentsCount || 0,
      createdAt: hit.createdAt || '',
      type: 'post',
    }));

    console.log(`[IndieHackers] Found ${items.length} posts for "${query}"`);

    return {
      items,
      source: 'indiehackers',
      query,
      totalCount: data.nbHits || 0,
    };
  } catch {
    // Silent fail - return empty results
    return { items: [], source: 'indiehackers', query, totalCount: 0 };
  }
}

/**
 * Search for problem discussions (pain points)
 */
export async function searchIHPainPoints(keywords: string[]): Promise<IndieHackersPost[]> {
  const allItems: IndieHackersPost[] = [];
  const painPhrases = [
    'struggling with',
    'need help',
    'looking for',
    'anyone built',
    'frustrated',
    'problem',
    'pain point',
  ];

  for (const keyword of keywords.slice(0, 3)) {
    // Search with keyword alone
    const result1 = await searchIndieHackers(keyword, { hitsPerPage: 10 });
    allItems.push(...result1.items);

    // Search with pain phrases
    for (const phrase of painPhrases.slice(0, 2)) {
      const result2 = await searchIndieHackers(`${keyword} ${phrase}`, {
        hitsPerPage: 5,
      });
      allItems.push(...result2.items);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.votes - a.votes);
}

/**
 * Search for SaaS idea discussions
 */
export async function searchIHIdeas(vertical: string): Promise<IndieHackersPost[]> {
  const ideaPhrases = [
    `${vertical} idea`,
    `${vertical} saas`,
    `${vertical} tool`,
    `building ${vertical}`,
    `${vertical} business`,
  ];

  const allItems: IndieHackersPost[] = [];

  for (const phrase of ideaPhrases) {
    const result = await searchIndieHackers(phrase, { hitsPerPage: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.filter((item) => item.votes >= 2 || item.comments >= 3);
}

/**
 * Search for revenue/monetization discussions
 */
export async function searchIHRevenue(keywords: string[]): Promise<IndieHackersPost[]> {
  const allItems: IndieHackersPost[] = [];
  const revenuePhrases = ['MRR', 'revenue', 'paying customers', 'monetize', 'pricing'];

  for (const keyword of keywords.slice(0, 2)) {
    for (const phrase of revenuePhrases.slice(0, 2)) {
      const result = await searchIndieHackers(`${keyword} ${phrase}`, {
        hitsPerPage: 10,
      });
      allItems.push(...result.items);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.comments - a.comments);
}
