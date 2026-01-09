/**
 * Lobsters API (100% Free)
 *
 * Lobsters is a computing-focused community similar to Hacker News
 * but with a more curated, technical audience.
 *
 * API: https://lobste.rs/ - JSON endpoints available
 * No authentication required, no rate limits documented
 *
 * CORS Solution: Uses Cloudflare Worker proxy (no CORS issues)
 *
 * Great for finding:
 * - Technical discussions about tools and frameworks
 * - Developer pain points
 * - New project announcements
 */

import { config } from '@/config';

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
 * Get hottest stories from Lobsters via Cloudflare Worker
 */
export async function getHottestStories(page = 1): Promise<LobstersStory[]> {
  try {
    const response = await fetch(`${config.api.baseUrl}/api/lobsters/hottest?page=${page}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();

    console.log(`[Lobsters] Got ${data.length || 0} hottest stories`);
    return parseStories(data);
  } catch {
    return [];
  }
}

/**
 * Get newest stories from Lobsters via Cloudflare Worker
 */
export async function getNewestStories(page = 1): Promise<LobstersStory[]> {
  try {
    const response = await fetch(`${config.api.baseUrl}/api/lobsters/newest?page=${page}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();

    return parseStories(data);
  } catch {
    return [];
  }
}

/**
 * Get stories by tag via Cloudflare Worker
 */
export async function getStoriesByTag(tag: string, page = 1): Promise<LobstersStory[]> {
  try {
    const response = await fetch(`${config.api.baseUrl}/api/lobsters/tag/${tag}?page=${page}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();

    return parseStories(data);
  } catch {
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
