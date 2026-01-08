/**
 * Capterra Reviews Scraper (Free - Public Data via Serper)
 *
 * Capterra is similar to G2 - a software review platform.
 * We use Serper to search their public pages.
 *
 * Great for finding:
 * - Software complaints and limitations
 * - Feature requests from users
 * - Price complaints (market opportunity)
 * - Alternative tool demands
 */

import { canUseSerper } from './serper';

export interface CapterraReview {
  id: string;
  productName: string;
  title: string;
  content: string;
  url: string;
  category: string;
  date?: string;
}

export interface CapterraSearchResult {
  items: CapterraReview[];
  source: 'capterra';
  query: string;
  totalCount: number;
}

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '';

/**
 * Search Capterra reviews via Google (requires Serper)
 */
export async function searchCapterraReviews(
  query: string,
  options: {
    maxResults?: number;
    focusOn?: 'complaints' | 'all';
  } = {}
): Promise<CapterraSearchResult> {
  const { maxResults = 15, focusOn = 'complaints' } = options;

  if (!canUseSerper()) {
    console.warn('[Capterra] Serper API not available');
    return { items: [], source: 'capterra', query, totalCount: 0 };
  }

  try {
    const searchQuery =
      focusOn === 'complaints'
        ? `site:capterra.com "${query}" reviews "cons" OR "disadvantages" OR "missing"`
        : `site:capterra.com "${query}" reviews`;

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
      console.warn('[Capterra] Serper search failed:', response.status);
      return { items: [], source: 'capterra', query, totalCount: 0 };
    }

    const data = await response.json();
    const organic = data.organic || [];

    const items: CapterraReview[] = organic
      .filter((r: any) => r.link.includes('capterra.com'))
      .map((r: any, index: number) => ({
        id: `capterra-${index}-${Date.now()}`,
        productName: extractProductName(r.title),
        title: r.title,
        content: r.snippet || '',
        url: r.link,
        category: query,
        date: r.date,
      }));

    return {
      items,
      source: 'capterra',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.error('Capterra search failed:', error);
    return { items: [], source: 'capterra', query, totalCount: 0 };
  }
}

/**
 * Extract product name from Capterra title
 */
function extractProductName(title: string): string {
  // Capterra titles: "Product Name Reviews 2024 - Capterra"
  const match = title.match(/^([^-|]+)/);
  return match ? match[1].replace(/Reviews.*$/i, '').trim() : title;
}

/**
 * Search for price complaints - opportunity for cheaper alternatives
 */
export async function searchCapterraPriceComplaints(vertical: string): Promise<CapterraReview[]> {
  const allItems: CapterraReview[] = [];

  const priceQueries = [
    `${vertical} "too expensive"`,
    `${vertical} "overpriced"`,
    `${vertical} "not worth the price"`,
    `${vertical} "cheaper alternative"`,
  ];

  for (const query of priceQueries.slice(0, 2)) {
    const result = await searchCapterraReviews(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Search for feature gaps
 */
export async function searchCapterraFeatureGaps(vertical: string): Promise<CapterraReview[]> {
  const allItems: CapterraReview[] = [];

  const gapQueries = [
    `${vertical} "missing feature"`,
    `${vertical} "wish it could"`,
    `${vertical} "doesn't integrate"`,
    `${vertical} "limited functionality"`,
  ];

  for (const query of gapQueries.slice(0, 3)) {
    const result = await searchCapterraReviews(query, { maxResults: 10 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.url, item])).values()
  );

  return unique;
}

/**
 * Check if Capterra search is available
 */
export function isCapterraAvailable(): boolean {
  return canUseSerper();
}
