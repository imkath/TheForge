/**
 * Reddit API Service (Free JSON Endpoint)
 *
 * Uses Reddit's public JSON API - no authentication required
 * Endpoint: https://www.reddit.com/search.json
 *
 * CORS Solution: Uses Cloudflare Worker proxy (no CORS issues)
 *
 * Limitations:
 * - Rate limited (respect 1 request per second)
 * - No NSFW content
 * - Public posts only
 *
 * Source: https://www.reddit.com/dev/api/
 */

import { config } from '@/config';

export interface RedditPost {
  title: string;
  selftext: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
  url: string;
  createdUtc: number;
  permalink: string;
}

export interface RedditSearchResult {
  posts: RedditPost[];
  source: 'reddit';
  query: string;
}

const REDDIT_BASE_URL = 'https://www.reddit.com';

// Subreddits relevant for Micro-SaaS opportunity hunting
const SAAS_SUBREDDITS = [
  'SaaS',
  'startups',
  'Entrepreneur',
  'smallbusiness',
  'webdev',
  'programming',
  'freelance',
  'digital_marketing',
  'ecommerce',
  'fintech',
  'indiehackers',
  'microsaas',
];

// Keywords that indicate friction/pain points
const PAIN_KEYWORDS = [
  'frustrated',
  'annoying',
  'wish there was',
  'hate when',
  'looking for tool',
  'need help with',
  'manual process',
  'takes too long',
  'spreadsheet',
  'workaround',
  'alternative to',
  'better than',
];

/**
 * Search Reddit for posts matching a query via Cloudflare Worker
 */
export async function searchReddit(
  query: string,
  options: {
    subreddit?: string;
    sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    limit?: number;
  } = {}
): Promise<RedditSearchResult> {
  const { sort = 'relevance', time = 'month', limit = 25, subreddit } = options;

  try {
    const params = new URLSearchParams({
      q: query,
      sort,
      t: time,
      limit: limit.toString(),
    });

    if (subreddit) {
      params.set('subreddit', subreddit);
    }

    console.log(`[Reddit] Searching: ${query}`);

    const response = await fetch(`${config.api.baseUrl}/api/reddit/search?${params}`);
    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();

    if (!data.data?.children) {
      return { posts: [], source: 'reddit', query };
    }

    const posts: RedditPost[] = data.data.children.map((child: any) => ({
      title: child.data.title,
      selftext: child.data.selftext || '',
      subreddit: child.data.subreddit,
      author: child.data.author,
      score: child.data.score,
      numComments: child.data.num_comments,
      url: child.data.url,
      createdUtc: child.data.created_utc,
      permalink: `${REDDIT_BASE_URL}${child.data.permalink}`,
    }));

    console.log(`[Reddit] Found ${posts.length} posts for "${query}"`);

    return {
      posts,
      source: 'reddit',
      query,
    };
  } catch {
    return { posts: [], source: 'reddit', query };
  }
}

/**
 * Search for pain points across SaaS-relevant subreddits
 */
export async function searchPainPoints(vertical: string): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  // Create search queries combining vertical with pain keywords
  const queries = PAIN_KEYWORDS.slice(0, 3).map(
    (pain) => `${vertical} ${pain}`
  );

  for (const query of queries) {
    // Add delay to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = await searchReddit(query, {
      sort: 'relevance',
      time: 'year',
      limit: 15,
    });

    allPosts.push(...result.posts);
  }

  // Deduplicate by permalink
  const unique = Array.from(
    new Map(allPosts.map((post) => [post.permalink, post])).values()
  );

  // Sort by engagement (score + comments)
  return unique.sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments));
}

/**
 * Search specific subreddit for complaints/feature requests
 */
export async function searchSubredditComplaints(
  subreddit: string,
  keywords: string[]
): Promise<RedditPost[]> {
  const query = keywords.join(' OR ');
  const result = await searchReddit(query, {
    subreddit,
    sort: 'top',
    time: 'month',
    limit: 25,
  });

  return result.posts;
}

/**
 * Get trending posts from SaaS-related subreddits via Cloudflare Worker
 */
export async function getTrendingSaaSPosts(): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  for (const subreddit of SAAS_SUBREDDITS.slice(0, 3)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const response = await fetch(`${config.api.baseUrl}/api/reddit/r/${subreddit}/hot?limit=10`);
      if (!response.ok) continue;

      const data = await response.json();

      if (data.data?.children) {
        const posts = data.data.children.map((child: any) => ({
          title: child.data.title,
          selftext: child.data.selftext || '',
          subreddit: child.data.subreddit,
          author: child.data.author,
          score: child.data.score,
          numComments: child.data.num_comments,
          url: child.data.url,
          createdUtc: child.data.created_utc,
          permalink: `${REDDIT_BASE_URL}${child.data.permalink}`,
        }));
        allPosts.push(...posts);
        console.log(`[Reddit] Got ${posts.length} trending posts from r/${subreddit}`);
      }
    } catch {
      // Silent fail for individual subreddits
    }
  }

  return allPosts;
}

/**
 * Search for "Ask" style posts (questions = pain points)
 */
export async function searchRedditQuestions(keywords: string[]): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  const questionPhrases = [
    'how do I',
    'is there a tool',
    'what do you use for',
    'looking for',
    'need help',
    'recommendation',
  ];

  for (const keyword of keywords.slice(0, 2)) {
    for (const phrase of questionPhrases.slice(0, 2)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await searchReddit(`${keyword} ${phrase}`, {
        sort: 'relevance',
        time: 'year',
        limit: 10,
      });

      allPosts.push(...result.posts);
    }
  }

  // Deduplicate
  const unique = Array.from(
    new Map(allPosts.map((post) => [post.permalink, post])).values()
  );

  return unique.sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments));
}

/**
 * Check if Reddit API is available via Worker
 */
export async function isRedditAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${config.api.baseUrl}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
