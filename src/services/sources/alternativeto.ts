/**
 * AlternativeTo Scraper (Free - via Serper)
 *
 * AlternativeTo is a platform where users recommend alternatives
 * to popular software. Great for understanding market landscape.
 *
 * Great for finding:
 * - What tools people want alternatives for (opportunity!)
 * - User complaints about existing tools
 * - Market demand for specific features
 * - Emerging competitors
 */

import { canUseSerper } from './serper';

export interface AlternativeToResult {
  id: string;
  softwareName: string;
  title: string;
  description: string;
  url: string;
  reason?: string; // Why they're looking for alternatives
}

export interface AlternativeToSearchResult {
  items: AlternativeToResult[];
  source: 'alternativeto';
  query: string;
  totalCount: number;
}

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';

/**
 * Search AlternativeTo via Serper
 */
export async function searchAlternativeTo(
  query: string,
  options: {
    maxResults?: number;
  } = {}
): Promise<AlternativeToSearchResult> {
  const { maxResults = 15 } = options;

  if (!canUseSerper()) {
    console.warn('[AlternativeTo] Serper API not available');
    return { items: [], source: 'alternativeto', query, totalCount: 0 };
  }

  try {
    const searchQuery = `site:alternativeto.net "${query}"`;

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
      console.warn('[AlternativeTo] Serper search failed:', response.status);
      return { items: [], source: 'alternativeto', query, totalCount: 0 };
    }

    const data = await response.json();
    const organic = data.organic || [];

    const items: AlternativeToResult[] = organic
      .filter((r: any) => r.link.includes('alternativeto.net'))
      .map((r: any, index: number) => ({
        id: `altto-${index}-${Date.now()}`,
        softwareName: extractSoftwareName(r.title),
        title: r.title,
        description: r.snippet || '',
        url: r.link,
      }));

    return {
      items,
      source: 'alternativeto',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.error('AlternativeTo search failed:', error);
    return { items: [], source: 'alternativeto', query, totalCount: 0 };
  }
}

/**
 * Extract software name from AlternativeTo title
 */
function extractSoftwareName(title: string): string {
  // Titles like "Alternatives to Product Name" or "Product Name Alternatives"
  const match = title.match(/(?:Alternatives? to |^)([^-|]+)/i);
  return match ? match[1].replace(/Alternatives?$/i, '').trim() : title;
}

/**
 * Find tools people want alternatives for (market opportunity!)
 */
export async function searchWantedAlternatives(vertical: string): Promise<AlternativeToResult[]> {
  const allItems: AlternativeToResult[] = [];

  const queries = [
    `${vertical} alternatives`,
    `${vertical} software alternatives`,
    `free ${vertical} alternative`,
    `open source ${vertical}`,
    `${vertical} replacement`,
  ];

  for (const query of queries.slice(0, 3)) {
    const result = await searchAlternativeTo(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Find discussions about tool limitations
 */
export async function searchToolLimitations(vertical: string): Promise<AlternativeToResult[]> {
  if (!canUseSerper()) {
    return [];
  }

  try {
    const searchQuery = `site:alternativeto.net "${vertical}" "looking for" OR "need" OR "alternative because"`;

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 15,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const organic = data.organic || [];

    return organic
      .filter((r: any) => r.link.includes('alternativeto.net'))
      .map((r: any, index: number) => ({
        id: `altto-lim-${index}-${Date.now()}`,
        softwareName: extractSoftwareName(r.title),
        title: r.title,
        description: r.snippet || '',
        url: r.link,
        reason: r.snippet,
      }));
  } catch (error) {
    console.error('AlternativeTo limitations search failed:', error);
    return [];
  }
}

/**
 * Check if AlternativeTo search is available
 */
export function isAlternativeToAvailable(): boolean {
  return canUseSerper();
}
