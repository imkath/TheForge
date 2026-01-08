/**
 * ProductHunt API Service (Free for public access)
 *
 * Uses ProductHunt GraphQL API v2
 * Endpoint: https://api.producthunt.com/v2/api/graphql
 *
 * Note: Requires OAuth token for full access
 * For now, we use public endpoints where possible
 *
 * Source: https://api.producthunt.com/v2/docs
 */

export interface ProductHuntPost {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  topics: string[];
  thumbnail: string | null;
  createdAt: string;
  website: string;
}

export interface PHSearchResult {
  posts: ProductHuntPost[];
  source: 'producthunt';
  query: string;
}

// Note: ProductHunt requires OAuth for API access
// For the free tier, we'll scrape their public RSS/embed feeds
// or use their OAuth client_credentials flow

const PH_API_URL = 'https://api.producthunt.com/v2/api/graphql';

/**
 * Get access token using client credentials
 * Requires VITE_PRODUCTHUNT_API_KEY and VITE_PRODUCTHUNT_API_SECRET
 */
async function getAccessToken(): Promise<string | null> {
  const apiKey = import.meta.env.VITE_PRODUCTHUNT_API_KEY;
  const apiSecret = import.meta.env.VITE_PRODUCTHUNT_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn('ProductHunt API credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.producthunt.com/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get PH access token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('ProductHunt auth failed:', error);
    return null;
  }
}

/**
 * Query ProductHunt GraphQL API
 */
async function queryPH<T>(query: string, variables: Record<string, any> = {}): Promise<T | null> {
  const token = await getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(PH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`PH API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('ProductHunt query failed:', error);
    return null;
  }
}

/**
 * Get today's top products
 */
export async function getTodaysPosts(): Promise<ProductHuntPost[]> {
  const query = `
    query {
      posts(first: 20, order: VOTES) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            votesCount
            commentsCount
            topics {
              edges {
                node {
                  name
                }
              }
            }
            thumbnail {
              url
            }
            createdAt
            website
          }
        }
      }
    }
  `;

  const data = await queryPH<any>(query);

  if (!data?.posts?.edges) {
    return [];
  }

  return data.posts.edges.map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name,
    tagline: edge.node.tagline,
    description: edge.node.description,
    url: edge.node.url,
    votesCount: edge.node.votesCount,
    commentsCount: edge.node.commentsCount,
    topics: edge.node.topics.edges.map((t: any) => t.node.name),
    thumbnail: edge.node.thumbnail?.url || null,
    createdAt: edge.node.createdAt,
    website: edge.node.website,
  }));
}

/**
 * Search posts by topic
 */
export async function searchByTopic(topic: string): Promise<ProductHuntPost[]> {
  const query = `
    query($topic: String!) {
      posts(first: 20, topic: $topic, order: VOTES) {
        edges {
          node {
            id
            name
            tagline
            description
            url
            votesCount
            commentsCount
            topics {
              edges {
                node {
                  name
                }
              }
            }
            thumbnail {
              url
            }
            createdAt
            website
          }
        }
      }
    }
  `;

  const data = await queryPH<any>(query, { topic });

  if (!data?.posts?.edges) {
    return [];
  }

  return data.posts.edges.map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name,
    tagline: edge.node.tagline,
    description: edge.node.description,
    url: edge.node.url,
    votesCount: edge.node.votesCount,
    commentsCount: edge.node.commentsCount,
    topics: edge.node.topics.edges.map((t: any) => t.node.name),
    thumbnail: edge.node.thumbnail?.url || null,
    createdAt: edge.node.createdAt,
    website: edge.node.website,
  }));
}

/**
 * Analyze competitors in a vertical
 * Returns products that might be competitors to a potential Micro-SaaS
 */
export async function analyzeCompetitors(vertical: string): Promise<{
  competitors: ProductHuntPost[];
  gaps: string[];
}> {
  const topicMap: Record<string, string[]> = {
    marketing: ['marketing', 'social-media-tools', 'analytics'],
    ecommerce: ['e-commerce', 'shopify', 'payments'],
    fintech: ['fintech', 'personal-finance', 'invoicing'],
    legal: ['legal', 'privacy', 'compliance'],
    edtech: ['education', 'online-learning', 'productivity'],
  };

  const verticalLower = vertical.toLowerCase();
  const topics = Object.entries(topicMap).find(([key]) =>
    verticalLower.includes(key)
  )?.[1] || ['saas', 'productivity'];

  const allPosts: ProductHuntPost[] = [];

  for (const topic of topics) {
    const posts = await searchByTopic(topic);
    allPosts.push(...posts);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Deduplicate
  const unique = Array.from(new Map(allPosts.map((p) => [p.id, p])).values());

  // Sort by votes
  const sorted = unique.sort((a, b) => b.votesCount - a.votesCount);

  // Identify potential gaps (topics with few high-voted products)
  const gaps: string[] = [];
  const topicCounts = new Map<string, number>();

  for (const post of sorted) {
    for (const topic of post.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }

  // Topics with low representation might be gaps
  for (const [topic, count] of topicCounts) {
    if (count < 3) {
      gaps.push(topic);
    }
  }

  return {
    competitors: sorted.slice(0, 20),
    gaps: gaps.slice(0, 10),
  };
}

/**
 * Check if ProductHunt API is configured and available
 */
export function isProductHuntConfigured(): boolean {
  return !!(
    import.meta.env.VITE_PRODUCTHUNT_API_KEY &&
    import.meta.env.VITE_PRODUCTHUNT_API_SECRET
  );
}
