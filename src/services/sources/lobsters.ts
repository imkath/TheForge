/**
 * Lobsters API (100% Free)
 *
 * Lobsters is a computing-focused community similar to Hacker News
 * but with a more curated, technical audience.
 *
 * API: https://lobste.rs/ - JSON endpoints available
 * No authentication required, no rate limits documented
 *
 * CORS Solution: Uses CORS proxy for browser requests
 *
 * Great for finding:
 * - Technical discussions about tools and frameworks
 * - Developer pain points
 * - New project announcements
 */

import { fetchJsonWithCorsProxy } from '../utils/corsProxy';

export interface LobstersStory {
  id: string;
  title: string;
  description: string;
  url: string;
  commentsUrl: string;
  score: number;
  commentCount: number;
  createdAt: string;
  submitter: string;
  tags: string[];
}

export interface LobstersSearchResult {
  items: LobstersStory[];
  source: 'lobsters';
  query: string;
}

const LOBSTERS_BASE_URL = 'https://lobste.rs';

/**
 * Parse Lobsters API response to our format
 */
function parseStories(data: any[]): LobstersStory[] {
  return (data || []).map((story: any) => ({
    id: story.short_id,
    title: story.title,
    description: story.description || '',
    url: story.url || story.comments_url,
    commentsUrl: story.comments_url,
    score: story.score || 0,
    commentCount: story.comment_count || 0,
    createdAt: story.created_at,
    submitter: story.submitter_user?.username || 'unknown',
    tags: story.tags || [],
  }));
}

/**
 * Get hottest stories from Lobsters (via CORS proxy)
 */
export async function getHottestStories(page = 1): Promise<LobstersStory[]> {
  try {
    const url = `${LOBSTERS_BASE_URL}/hottest.json?page=${page}`;
    const data = await fetchJsonWithCorsProxy<any[]>(url);

    console.log(`[Lobsters] Got ${data.length || 0} hottest stories`);
    return parseStories(data);
  } catch (error) {
    console.debug('[Lobsters] Failed to fetch hottest (CORS proxy):', error);
    return [];
  }
}

/**
 * Get newest stories from Lobsters (via CORS proxy)
 */
export async function getNewestStories(page = 1): Promise<LobstersStory[]> {
  try {
    const url = `${LOBSTERS_BASE_URL}/newest.json?page=${page}`;
    const data = await fetchJsonWithCorsProxy<any[]>(url);

    return parseStories(data);
  } catch (error) {
    console.debug('[Lobsters] Failed to fetch newest (CORS proxy):', error);
    return [];
  }
}

/**
 * Get stories by tag (via CORS proxy)
 */
export async function getStoriesByTag(tag: string, page = 1): Promise<LobstersStory[]> {
  try {
    const url = `${LOBSTERS_BASE_URL}/t/${tag}.json?page=${page}`;
    const data = await fetchJsonWithCorsProxy<any[]>(url);

    return parseStories(data);
  } catch (error) {
    console.debug(`[Lobsters] Failed to fetch tag ${tag} (CORS proxy):`, error);
    return [];
  }
}

/**
 * Search Lobsters for pain points and discussions
 * Since Lobsters doesn't have a search API, we search by relevant tags
 */
export async function searchLobstersPainPoints(keywords: string[]): Promise<LobstersStory[]> {
  const allItems: LobstersStory[] = [];

  // Relevant tags for SaaS/tool discussions
  const relevantTags = [
    'ask',
    'show',
    'programming',
    'devops',
    'web',
    'python',
    'javascript',
    'rust',
    'go',
  ];

  // Get stories from relevant tags
  for (const tag of relevantTags.slice(0, 4)) {
    const stories = await getStoriesByTag(tag);
    allItems.push(...stories);

    // Rate limit respect
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Also get hottest stories
  const hottest = await getHottestStories();
  allItems.push(...hottest);

  // Filter by keywords
  const keywordLower = keywords.map((k) => k.toLowerCase());
  const filtered = allItems.filter((story) => {
    const text = `${story.title} ${story.description}`.toLowerCase();
    return keywordLower.some((kw) => text.includes(kw));
  });

  // Deduplicate
  const unique = Array.from(
    new Map(filtered.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.score - a.score);
}

/**
 * Get "Show" posts (like Show HN) - new projects/tools
 */
export async function getShowLobsters(): Promise<LobstersStory[]> {
  return getStoriesByTag('show');
}

/**
 * Get "Ask" posts - questions and discussions
 */
export async function getAskLobsters(): Promise<LobstersStory[]> {
  return getStoriesByTag('ask');
}
