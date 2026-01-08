/**
 * BetaList Scraper (100% Free)
 *
 * BetaList showcases startups in beta stage - perfect for finding
 * early-stage ideas that are being validated in English markets
 * and could be imported to Spanish-speaking markets.
 *
 * CORS Solution: Uses CORS proxy for HTML scraping
 *
 * Great for finding:
 * - Early-stage startups before they go mainstream
 * - Ideas being validated in English markets
 * - Trending startup categories
 * - Import opportunities for LATAM/Spain
 */

import { fetchHtmlWithCorsProxy } from '../utils/corsProxy';

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
 * Search BetaList (via CORS proxy for HTML scraping)
 * Uses site scraping since no direct API available
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
    const searchUrl = category
      ? `https://betalist.com/topics/${category}`
      : `https://betalist.com/startups`;

    // Use CORS proxy for HTML scraping
    const html = await fetchHtmlWithCorsProxy(searchUrl);

    // Parse startup cards from HTML
    const items = parseBetaListHTML(html, query, maxResults);

    console.log(`[BetaList] Found ${items.length} startups for "${query || category || 'all'}"`);

    return {
      items,
      source: 'betalist',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.debug('[BetaList] Search failed (CORS proxy):', error);
    return { items: [], source: 'betalist', query, totalCount: 0 };
  }
}

/**
 * Parse BetaList HTML to extract startup data
 */
function parseBetaListHTML(
  html: string,
  query: string,
  maxResults: number
): BetaListStartup[] {
  const items: BetaListStartup[] = [];

  // Look for startup cards in the HTML
  // BetaList uses article tags with startup data
  const startupRegex =
    /<article[^>]*class="[^"]*startup[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  const titleRegex = /<h\d[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/h\d>/i;
  const taglineRegex =
    /<p[^>]*class="[^"]*tagline[^"]*"[^>]*>([^<]+)<\/p>/i;
  const linkRegex = /<a[^>]*href="(\/startups\/[^"]+)"[^>]*>/i;
  const categoryRegex =
    /<span[^>]*class="[^"]*category[^"]*"[^>]*>([^<]+)<\/span>/i;

  let match;
  while ((match = startupRegex.exec(html)) !== null && items.length < maxResults) {
    const articleHTML = match[1];

    const titleMatch = titleRegex.exec(articleHTML);
    const taglineMatch = taglineRegex.exec(articleHTML);
    const linkMatch = linkRegex.exec(articleHTML);
    const categoryMatch = categoryRegex.exec(articleHTML);

    if (titleMatch && taglineMatch) {
      const name = titleMatch[1].trim();
      const tagline = taglineMatch[1].trim();
      const slug = linkMatch ? linkMatch[1] : `/startups/${name.toLowerCase().replace(/\s+/g, '-')}`;
      const category = categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'startup';

      // Check if this is an import opportunity for Spanish market
      const combinedText = `${name} ${tagline}`.toLowerCase();
      const isImportOpportunity = !combinedText.includes('español') &&
        !combinedText.includes('spanish') &&
        !combinedText.includes('latam') &&
        !combinedText.includes('mexico') &&
        !combinedText.includes('argentina');

      // Filter by query if provided
      if (!query || combinedText.includes(query.toLowerCase())) {
        items.push({
          id: `betalist-${slug.replace('/startups/', '')}`,
          name,
          tagline,
          description: tagline, // BetaList cards typically show tagline
          url: `https://betalist.com${slug}`,
          category,
          submittedAt: new Date().toISOString(), // BetaList doesn't show dates in cards
          isImportOpportunity,
        });
      }
    }
  }

  // If regex parsing fails, try JSON-LD parsing (some pages have structured data)
  if (items.length === 0) {
    const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        if (jsonData['@type'] === 'Product' || jsonData['@type'] === 'SoftwareApplication') {
          items.push({
            id: `betalist-${jsonData.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`,
            name: jsonData.name || 'Unknown',
            tagline: jsonData.description?.slice(0, 100) || '',
            description: jsonData.description || '',
            url: jsonData.url || 'https://betalist.com',
            category: 'startup',
            submittedAt: jsonData.datePublished || new Date().toISOString(),
            isImportOpportunity: true,
          });
        }
      } catch {
        // JSON parsing failed, continue
      }
    }
  }

  return items;
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
  } catch (error) {
    console.error('[BetaList] Failed to get trending:', error);
    return [];
  }
}
