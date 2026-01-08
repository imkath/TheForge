/**
 * Hashnode API (100% Free)
 *
 * Hashnode is a developer blogging platform with a public GraphQL API.
 * No authentication required for reading public content.
 *
 * CORS Solution: Uses CORS proxy for GraphQL requests
 * API Updated: Using new Hashnode API (gql.hashnode.com)
 *
 * Great for finding:
 * - Developer pain points
 * - Technical discussions
 * - Tool reviews and comparisons
 * - Project announcements
 */

import { postWithCorsProxy } from '../utils/corsProxy';

export interface HashnodePost {
  id: string;
  title: string;
  brief: string;
  url: string;
  author: string;
  dateAdded: string;
  reactions: number;
  responseCount: number;
  tags: string[];
}

export interface HashnodeSearchResult {
  items: HashnodePost[];
  source: 'hashnode';
  query: string;
  totalCount: number;
}

const HASHNODE_API_URL = 'https://gql.hashnode.com';

/**
 * Search Hashnode posts via GraphQL (with CORS proxy)
 * Note: Hashnode's search API has changed - we use feed search
 */
export async function searchHashnode(
  query: string,
  options: {
    first?: number;
  } = {}
): Promise<HashnodeSearchResult> {
  const { first = 20 } = options;

  try {
    // Updated GraphQL query for new Hashnode API
    const graphqlQuery = {
      query: `
        query Feed($first: Int!) {
          feed(first: $first, filter: { type: RELEVANT }) {
            edges {
              node {
                id
                title
                brief
                url
                author {
                  username
                }
                publishedAt
                reactionCount
                responseCount
                tags {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { first },
    };

    // Use CORS proxy for the GraphQL request
    const data = await postWithCorsProxy<{
      data?: { feed?: { edges?: any[] } };
      errors?: any[];
    }>(HASHNODE_API_URL, graphqlQuery);

    if (data.errors) {
      console.debug('[Hashnode] GraphQL errors:', data.errors);
      return { items: [], source: 'hashnode', query, totalCount: 0 };
    }

    const edges = data?.data?.feed?.edges || [];

    // Filter by query keywords
    const queryLower = query.toLowerCase();
    const filteredEdges = edges.filter((edge: any) => {
      const text = `${edge.node.title} ${edge.node.brief}`.toLowerCase();
      return text.includes(queryLower) || queryLower.split(' ').some((word: string) => text.includes(word));
    });

    const items: HashnodePost[] = filteredEdges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      brief: edge.node.brief || '',
      url: edge.node.url,
      author: edge.node.author?.username || 'unknown',
      dateAdded: edge.node.publishedAt,
      reactions: edge.node.reactionCount || 0,
      responseCount: edge.node.responseCount || 0,
      tags: (edge.node.tags || []).map((t: any) => t.name),
    }));

    console.log(`[Hashnode] Found ${items.length} posts for "${query}"`);

    return {
      items,
      source: 'hashnode',
      query,
      totalCount: items.length,
    };
  } catch (error) {
    console.debug('[Hashnode] Search failed (CORS proxy):', error);
    return { items: [], source: 'hashnode', query, totalCount: 0 };
  }
}

/**
 * Search for pain point articles
 */
export async function searchHashnodePainPoints(keywords: string[]): Promise<HashnodePost[]> {
  const allItems: HashnodePost[] = [];

  const painPhrases = [
    'problem',
    'struggle',
    'challenge',
    'pain point',
    'frustration',
    'solution',
  ];

  for (const keyword of keywords.slice(0, 3)) {
    // Search keyword directly
    const result1 = await searchHashnode(keyword, { first: 15 });
    allItems.push(...result1.items);

    // Search with pain phrases
    for (const phrase of painPhrases.slice(0, 2)) {
      const result2 = await searchHashnode(`${keyword} ${phrase}`, { first: 10 });
      allItems.push(...result2.items);

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.reactions - a.reactions);
}

/**
 * Search for tool/project related posts
 */
export async function searchHashnodeProjects(vertical: string): Promise<HashnodePost[]> {
  const allItems: HashnodePost[] = [];

  const projectQueries = [
    `${vertical} tool`,
    `building ${vertical}`,
    `${vertical} project`,
    `${vertical} tutorial`,
    `${vertical} saas`,
  ];

  for (const query of projectQueries.slice(0, 3)) {
    const result = await searchHashnode(query, { first: 15 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.reactions - a.reactions);
}

/**
 * Search for comparison/review posts
 */
export async function searchHashnodeComparisons(vertical: string): Promise<HashnodePost[]> {
  const allItems: HashnodePost[] = [];

  const compQueries = [
    `${vertical} vs`,
    `${vertical} comparison`,
    `${vertical} review`,
    `best ${vertical}`,
    `${vertical} alternatives`,
  ];

  for (const query of compQueries.slice(0, 3)) {
    const result = await searchHashnode(query, { first: 15 });
    allItems.push(...result.items);

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.reactions - a.reactions);
}

/**
 * Get trending posts (by reactions)
 */
export async function getTrendingHashnodePosts(): Promise<HashnodePost[]> {
  const result = await searchHashnode('saas startup tool', { first: 30 });
  return result.items.sort((a, b) => b.reactions - a.reactions).slice(0, 20);
}
