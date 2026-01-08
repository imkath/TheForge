/**
 * Medium Search via Serper (Free)
 *
 * Medium has tons of technical articles discussing
 * problems, solutions, and tool comparisons.
 *
 * Great for finding:
 * - Technical pain points in articles
 * - Tool comparison articles (market landscape)
 * - "I built X because Y didn't exist"
 * - Trending tech topics
 */

import { canUseSerper } from './serper';

export interface MediumArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  author?: string;
  publication?: string;
  readTime?: string;
  topic: string;
}

export interface MediumSearchResult {
  items: MediumArticle[];
  source: 'medium';
  query: string;
  totalCount: number;
}

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';

/**
 * Search Medium via Serper
 */
export async function searchMedium(
  query: string,
  options: {
    maxResults?: number;
    recentOnly?: boolean;
  } = {}
): Promise<MediumSearchResult> {
  const { maxResults = 15, recentOnly = false } = options;

  if (!canUseSerper()) {
    console.warn('[Medium] Serper API not available');
    return { items: [], source: 'medium', query, totalCount: 0 };
  }

  try {
    let searchQuery = `site:medium.com "${query}"`;
    if (recentOnly) {
      searchQuery += ' after:2024-01-01';
    }

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: maxResults,
      }),
    });

    if (!response.ok) {
      console.warn('[Medium] Serper search failed:', response.status);
      return { items: [], source: 'medium', query, totalCount: 0 };
    }

    const data = await response.json();
    const organic = data.organic || [];

    const items: MediumArticle[] = organic
      .filter((r: any) => r.link.includes('medium.com'))
      .map((r: any, index: number) => ({
        id: `medium-${index}-${Date.now()}`,
        title: cleanMediumTitle(r.title),
        description: r.snippet || '',
        url: r.link,
        author: extractMediumAuthor(r.link),
        topic: query,
      }));

    return {
      items,
      source: 'medium',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.error('Medium search failed:', error);
    return { items: [], source: 'medium', query, totalCount: 0 };
  }
}

/**
 * Clean Medium title
 */
function cleanMediumTitle(title: string): string {
  return title.replace(/\s*\|\s*Medium\s*$/i, '').trim();
}

/**
 * Extract author from Medium URL
 */
function extractMediumAuthor(url: string): string | undefined {
  const match = url.match(/medium\.com\/@([^/]+)/);
  return match ? match[1] : undefined;
}

/**
 * Search for "I built this because..." articles
 */
export async function searchMediumBuiltBecause(vertical: string): Promise<MediumArticle[]> {
  const allItems: MediumArticle[] = [];

  const queries = [
    `"I built" ${vertical}`,
    `"why I created" ${vertical}`,
    `${vertical} "didn't exist"`,
    `${vertical} "needed a tool"`,
    `building ${vertical} saas`,
  ];

  for (const query of queries.slice(0, 3)) {
    const result = await searchMedium(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Search for pain point articles
 */
export async function searchMediumPainPoints(keywords: string[]): Promise<MediumArticle[]> {
  const allItems: MediumArticle[] = [];

  const painPhrases = [
    'problems with',
    'challenges',
    'struggles',
    'pain points',
    'frustrations',
    'why I stopped using',
  ];

  for (const keyword of keywords.slice(0, 3)) {
    for (const phrase of painPhrases.slice(0, 2)) {
      const result = await searchMedium(`${keyword} ${phrase}`, { maxResults: 8 });
      allItems.push(...result.items);

      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Search for tool comparison articles
 */
export async function searchMediumComparisons(vertical: string): Promise<MediumArticle[]> {
  const allItems: MediumArticle[] = [];

  const compQueries = [
    `${vertical} vs`,
    `${vertical} comparison`,
    `best ${vertical} tools`,
    `${vertical} alternatives`,
    `${vertical} review 2024`,
  ];

  for (const query of compQueries.slice(0, 3)) {
    const result = await searchMedium(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Check if Medium search is available
 */
export function isMediumAvailable(): boolean {
  return canUseSerper();
}
