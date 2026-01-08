/**
 * Oasis of Ideas Scraper (100% Free)
 *
 * Oasis of Ideas is a repository where people share business ideas
 * they don't have time to build. These are raw, unvalidated ideas
 * that could inspire Micro-SaaS opportunities.
 *
 * CORS Solution: Uses CORS proxy for HTML scraping
 *
 * Great for finding:
 * - Raw business ideas from the community
 * - Problems people identify but don't solve
 * - Inspiration for Micro-SaaS concepts
 * - Ideas voted by the community
 *
 * Note: Unlike IndieHackers, these are IDEAS not validated businesses
 */

import { fetchHtmlWithCorsProxy } from '../utils/corsProxy';

export interface OasisIdea {
  id: string;
  title: string;
  description: string;
  url: string;
  votes: number;
  category: string;
  submittedAt: string;
  status: 'raw_idea' | 'in_development' | 'launched';
}

export interface OasisSearchResult {
  items: OasisIdea[];
  source: 'oasisofideas';
  query: string;
  totalCount: number;
}

const OASIS_BASE_URL = 'https://oasis-of-ideas.com';

/**
 * Search Oasis of Ideas (via CORS proxy)
 * Note: Site doesn't have API, we scrape public pages
 */
export async function searchOasisOfIdeas(
  query: string,
  options: {
    maxResults?: number;
  } = {}
): Promise<OasisSearchResult> {
  const { maxResults = 20 } = options;

  try {
    // Use CORS proxy for HTML scraping
    const html = await fetchHtmlWithCorsProxy(OASIS_BASE_URL);
    const items = parseOasisHTML(html, query, maxResults);

    console.log(`[OasisOfIdeas] Found ${items.length} ideas for "${query || 'all'}"`);

    return {
      items,
      source: 'oasisofideas',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.debug('[OasisOfIdeas] Search failed (CORS proxy):', error);
    return { items: [], source: 'oasisofideas', query, totalCount: 0 };
  }
}

/**
 * Parse Oasis of Ideas HTML to extract idea data
 */
function parseOasisHTML(
  html: string,
  query: string,
  maxResults: number
): OasisIdea[] {
  const items: OasisIdea[] = [];

  // Look for idea cards in the HTML
  // Common patterns: cards with title, description, vote count
  const ideaCardRegex =
    /<(?:div|article)[^>]*class="[^"]*(?:idea|card|post)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/gi;
  const titleRegex = /<h[23][^>]*>([^<]+)<\/h[23]>/i;
  const descRegex = /<p[^>]*>([^<]{20,})<\/p>/i;
  const voteRegex = /(\d+)\s*(?:votes?|upvotes?|likes?)/i;
  const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>/i;

  let match;
  let cardIndex = 0;

  while ((match = ideaCardRegex.exec(html)) !== null && items.length < maxResults) {
    const cardHTML = match[1];

    const titleMatch = titleRegex.exec(cardHTML);
    const descMatch = descRegex.exec(cardHTML);
    const voteMatch = voteRegex.exec(cardHTML);
    const linkMatch = linkRegex.exec(cardHTML);

    if (titleMatch) {
      const title = titleMatch[1].trim();
      const description = descMatch ? descMatch[1].trim() : '';
      const votes = voteMatch ? parseInt(voteMatch[1], 10) : 0;
      const url = linkMatch
        ? linkMatch[1].startsWith('http')
          ? linkMatch[1]
          : `${OASIS_BASE_URL}${linkMatch[1]}`
        : OASIS_BASE_URL;

      // Filter by query if provided
      const combinedText = `${title} ${description}`.toLowerCase();
      if (!query || combinedText.includes(query.toLowerCase())) {
        items.push({
          id: `oasis-${cardIndex++}`,
          title,
          description: description.slice(0, 300),
          url,
          votes,
          category: categorizeIdea(title, description),
          submittedAt: new Date().toISOString(),
          status: 'raw_idea',
        });
      }
    }
  }

  // Fallback: look for any list items that might be ideas
  if (items.length === 0) {
    const listItemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((match = listItemRegex.exec(html)) !== null && items.length < maxResults) {
      const content = match[1].replace(/<[^>]+>/g, ' ').trim();
      if (content.length > 30 && content.length < 500) {
        const combinedText = content.toLowerCase();
        if (!query || combinedText.includes(query.toLowerCase())) {
          items.push({
            id: `oasis-list-${cardIndex++}`,
            title: content.slice(0, 80),
            description: content,
            url: OASIS_BASE_URL,
            votes: 0,
            category: categorizeIdea(content, ''),
            submittedAt: new Date().toISOString(),
            status: 'raw_idea',
          });
        }
      }
    }
  }

  return items.sort((a, b) => b.votes - a.votes);
}

/**
 * Categorize an idea based on keywords
 */
function categorizeIdea(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  const categories: Record<string, string[]> = {
    'developer-tools': ['api', 'code', 'developer', 'programming', 'github', 'devops'],
    'productivity': ['productivity', 'task', 'todo', 'workflow', 'automation'],
    'marketing': ['marketing', 'seo', 'social media', 'content', 'analytics'],
    'fintech': ['finance', 'money', 'payment', 'invoice', 'accounting'],
    'ecommerce': ['shop', 'store', 'ecommerce', 'product', 'inventory'],
    'ai-tools': ['ai', 'machine learning', 'gpt', 'automation', 'smart'],
    'health': ['health', 'fitness', 'medical', 'wellness', 'therapy'],
    'education': ['learn', 'education', 'course', 'tutorial', 'training'],
    'communication': ['chat', 'message', 'email', 'communication', 'team'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return category;
    }
  }

  return 'general';
}

/**
 * Get top voted ideas from Oasis
 */
export async function getOasisTopIdeas(): Promise<OasisIdea[]> {
  const result = await searchOasisOfIdeas('', { maxResults: 30 });
  return result.items.sort((a, b) => b.votes - a.votes);
}

/**
 * Search for SaaS-related ideas
 */
export async function searchOasisSaaSIdeas(
  keywords: string[]
): Promise<OasisIdea[]> {
  const allItems: OasisIdea[] = [];

  // Search with provided keywords
  for (const keyword of keywords.slice(0, 3)) {
    const result = await searchOasisOfIdeas(keyword, { maxResults: 10 });
    allItems.push(...result.items);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Also search with SaaS-specific terms
  const saasTerms = ['saas', 'tool', 'app', 'platform', 'software'];
  for (const term of saasTerms.slice(0, 2)) {
    const result = await searchOasisOfIdeas(term, { maxResults: 10 });
    allItems.push(...result.items);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique;
}

/**
 * Find ideas that match a specific vertical
 */
export async function searchOasisByVertical(
  vertical: string
): Promise<OasisIdea[]> {
  return (await searchOasisOfIdeas(vertical, { maxResults: 15 })).items;
}
