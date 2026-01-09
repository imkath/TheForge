/**
 * BetaList Scraper (100% Free)
 *
 * BetaList showcases startups in beta stage - perfect for finding
 * early-stage ideas that are being validated in English markets
 * and could be imported to Spanish-speaking markets.
 *
 * CORS Solution: Uses Cloudflare Worker proxy (no CORS issues)
 *
 * Great for finding:
 * - Early-stage startups before they go mainstream
 * - Ideas being validated in English markets
 * - Trending startup categories
 * - Import opportunities for LATAM/Spain
 */

import { config } from '@/config';

export interface BetaListStartup {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  category: string;
  submittedAt: string;
  isImportOpportunity: boolean; // Flag for Spanish market potential
}

export interface BetaListSearchResult {
  items: BetaListStartup[];
  source: 'betalist';
  query: string;
  totalCount: number;
}

/**
 * Search BetaList via Cloudflare Worker proxy
 * Worker handles HTML scraping and returns parsed JSON
 */
export async function searchBetaList(
  query: string,
  options: {
    maxResults?: number;
    category?: string;
  } = {}
): Promise<BetaListSearchResult> {
  const { maxResults = 15, category } = options;

  try {
    const endpoint = category
      ? `${config.api.baseUrl}/api/betalist/topics/${category}`
      : `${config.api.baseUrl}/api/betalist/startups`;

    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    const startups = (data.startups || []) as Array<{
      id: string;
      name: string;
      tagline: string;
      url: string;
      category: string;
    }>;

    // Transform to our format and filter by query
    const items: BetaListStartup[] = startups
      .slice(0, maxResults)
      .filter((s) => !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.tagline.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({
        id: s.id,
        name: s.name,
        tagline: s.tagline,
        description: s.tagline,
        url: s.url,
        category: s.category || 'startup',
        submittedAt: new Date().toISOString(),
        isImportOpportunity: !s.name.toLowerCase().includes('español') && !s.name.toLowerCase().includes('latam'),
      }));

    console.log(`[BetaList] Found ${items.length} startups for "${query || category || 'all'}"`);

    return {
      items,
      source: 'betalist',
      query,
      totalCount: items.length,
    };
  } catch {
    return { items: [], source: 'betalist', query, totalCount: 0 };
  }
}

/**
 * Search for SaaS ideas on BetaList
 */
export async function searchBetaListSaaS(
  keywords: string[]
): Promise<BetaListStartup[]> {
  const allItems: BetaListStartup[] = [];

  // Search in SaaS-related categories
  for (const category of ['saas', 'developer-tools', 'productivity']) {
    const result = await searchBetaList('', { category, maxResults: 10 });
    allItems.push(...result.items);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Rate limiting
  }

  // Also search with keywords
  for (const keyword of keywords.slice(0, 2)) {
    const result = await searchBetaList(keyword, { maxResults: 10 });
    allItems.push(...result.items);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique;
}

/**
 * Find startups that could be imported to Spanish-speaking markets
 */
export async function searchBetaListImportOpportunities(
  vertical: string
): Promise<BetaListStartup[]> {
  const result = await searchBetaList(vertical, { maxResults: 20 });

  // Filter only import opportunities
  return result.items.filter((item) => item.isImportOpportunity);
}

/**
 * Get trending startups from BetaList
 */
export async function getBetaListTrending(): Promise<BetaListStartup[]> {
  try {
    const result = await searchBetaList('', { maxResults: 20 });
    return result.items;
  } catch {
    // Silent fail - CORS proxy may not work for HTML scraping
    return [];
  }
}
