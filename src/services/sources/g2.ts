/**
 * G2 Reviews Scraper (Free - Public Data)
 *
 * G2 doesn't have a free public API, but we can use their
 * public category and product pages to find software reviews
 * and market gaps.
 *
 * Note: This uses Serper/Google search to find G2 pages
 * as direct scraping may be blocked by CORS.
 *
 * Great for finding:
 * - Software complaints and feature requests
 * - Market gaps in existing tools
 * - What users dislike about current solutions
 */

import { canUseSerper } from './serper';

export interface G2Review {
  id: string;
  productName: string;
  title: string;
  content: string;
  rating: number;
  pros: string;
  cons: string;
  url: string;
  category: string;
  date?: string;
}

export interface G2SearchResult {
  items: G2Review[];
  source: 'g2';
  query: string;
  totalCount: number;
}

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';

/**
 * Search G2 reviews via Google (requires Serper)
 */
export async function searchG2Reviews(
  query: string,
  options: {
    maxResults?: number;
    focusOn?: 'pros' | 'cons' | 'all';
  } = {}
): Promise<G2SearchResult> {
  const { maxResults = 15, focusOn = 'cons' } = options;

  if (!canUseSerper()) {
    console.warn('[G2] Serper API not available');
    return { items: [], source: 'g2', query, totalCount: 0 };
  }

  try {
    // Search for G2 reviews with focus on complaints/feature requests
    const searchQuery =
      focusOn === 'cons'
        ? `site:g2.com "${query}" reviews "what I dislike" OR "cons" OR "missing features"`
        : focusOn === 'pros'
          ? `site:g2.com "${query}" reviews "what I like" OR "pros"`
          : `site:g2.com "${query}" reviews`;

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
      console.warn('[G2] Serper search failed:', response.status);
      return { items: [], source: 'g2', query, totalCount: 0 };
    }

    const data = await response.json();
    const organic = data.organic || [];

    const items: G2Review[] = organic
      .filter((r: any) => r.link.includes('g2.com'))
      .map((r: any, index: number) => ({
        id: `g2-${index}-${Date.now()}`,
        productName: extractProductName(r.title),
        title: r.title,
        content: r.snippet || '',
        rating: 0, // Would need to scrape individual pages
        pros: '',
        cons: r.snippet || '',
        url: r.link,
        category: query,
        date: r.date,
      }));

    return {
      items,
      source: 'g2',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.error('G2 search failed:', error);
    return { items: [], source: 'g2', query, totalCount: 0 };
  }
}

/**
 * Extract product name from G2 title
 */
function extractProductName(title: string): string {
  // G2 titles are usually like "Product Name Reviews 2024 | G2"
  const match = title.match(/^([^|]+)/);
  return match ? match[1].replace(/Reviews.*$/i, '').trim() : title;
}

/**
 * Search for market gaps - things users complain about
 */
export async function searchG2MarketGaps(vertical: string): Promise<G2Review[]> {
  const allItems: G2Review[] = [];

  const gapQueries = [
    `${vertical} "missing feature"`,
    `${vertical} "wish it had"`,
    `${vertical} "doesn't have"`,
    `${vertical} "limited"`,
    `${vertical} "frustrating"`,
  ];

  for (const query of gapQueries.slice(0, 3)) {
    const result = await searchG2Reviews(query, { maxResults: 10, focusOn: 'cons' });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Search for competitor analysis
 */
export async function searchG2Competitors(vertical: string): Promise<G2Review[]> {
  const result = await searchG2Reviews(`${vertical} software`, {
    maxResults: 20,
    focusOn: 'all',
  });

  return result.items;
}

/**
 * Check if G2 search is available (requires Serper)
 */
export function isG2Available(): boolean {
  return canUseSerper();
}
