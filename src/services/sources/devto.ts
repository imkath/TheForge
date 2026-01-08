/**
 * DEV.to (Forem) API Service (100% Free)
 *
 * Uses DEV.to public API - no authentication required for read
 * Endpoint: https://dev.to/api/
 *
 * Features:
 * - Search articles by tag, username
 * - Get trending articles
 * - CORS enabled
 *
 * Source: https://developers.forem.com/api/v0
 */

export interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  commentsCount: number;
  positiveReactionsCount: number;
  publicReactionsCount: number;
  tags: string[];
  user: {
    name: string;
    username: string;
  };
  publishedAt: string;
  readingTimeMinutes: number;
}

export interface DevToSearchResult {
  articles: DevToArticle[];
  source: 'devto';
  query: string;
}

const DEVTO_API_URL = 'https://dev.to/api';

/**
 * Get articles by tag
 */
export async function getArticlesByTag(
  tag: string,
  options: {
    page?: number;
    perPage?: number;
    top?: 'week' | 'month' | 'year' | 'infinity';
  } = {}
): Promise<DevToSearchResult> {
  const { page = 1, perPage = 20, top } = options;

  try {
    const params = new URLSearchParams({
      tag,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (top) {
      params.set('top', top);
    }

    const response = await fetch(`${DEVTO_API_URL}/articles?${params}`);

    if (!response.ok) {
      throw new Error(`DEV.to API error: ${response.status}`);
    }

    const data = await response.json();

    const articles: DevToArticle[] = data.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.description,
      url: article.url,
      commentsCount: article.comments_count,
      positiveReactionsCount: article.positive_reactions_count,
      publicReactionsCount: article.public_reactions_count,
      tags: article.tag_list,
      user: {
        name: article.user.name,
        username: article.user.username,
      },
      publishedAt: article.published_at,
      readingTimeMinutes: article.reading_time_minutes,
    }));

    return {
      articles,
      source: 'devto',
      query: tag,
    };
  } catch (error) {
    console.error('DEV.to search failed:', error);
    return { articles: [], source: 'devto', query: tag };
  }
}

/**
 * Get latest articles (general feed)
 */
export async function getLatestArticles(
  options: {
    page?: number;
    perPage?: number;
  } = {}
): Promise<DevToArticle[]> {
  const { page = 1, perPage = 30 } = options;

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const response = await fetch(`${DEVTO_API_URL}/articles/latest?${params}`);

    if (!response.ok) {
      throw new Error(`DEV.to API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.description,
      url: article.url,
      commentsCount: article.comments_count,
      positiveReactionsCount: article.positive_reactions_count,
      publicReactionsCount: article.public_reactions_count,
      tags: article.tag_list,
      user: {
        name: article.user.name,
        username: article.user.username,
      },
      publishedAt: article.published_at,
      readingTimeMinutes: article.reading_time_minutes,
    }));
  } catch (error) {
    console.error('DEV.to latest articles failed:', error);
    return [];
  }
}

/**
 * Search for SaaS and startup related content
 */
export async function searchSaaSContent(): Promise<DevToArticle[]> {
  const relevantTags = [
    'saas',
    'startup',
    'entrepreneurship',
    'sideproject',
    'indiehacker',
    'business',
    'productivity',
  ];

  const allArticles: DevToArticle[] = [];

  for (const tag of relevantTags.slice(0, 4)) {
    const result = await getArticlesByTag(tag, {
      perPage: 10,
      top: 'month',
    });
    allArticles.push(...result.articles);

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Deduplicate by ID
  const unique = Array.from(
    new Map(allArticles.map((a) => [a.id, a])).values()
  );

  // Sort by engagement
  return unique.sort(
    (a, b) => b.publicReactionsCount + b.commentsCount - (a.publicReactionsCount + a.commentsCount)
  );
}

/**
 * Search for articles discussing pain points and tool needs
 */
export async function searchPainPointArticles(vertical: string): Promise<DevToArticle[]> {
  // DEV.to doesn't have a full-text search API, so we search by relevant tags
  // and filter titles/descriptions that mention pain points

  const painIndicators = [
    'struggle',
    'problem',
    'challenge',
    'frustrat',
    'difficult',
    'wish',
    'need',
    'looking for',
    'alternative',
    'better',
  ];

  const verticalTags = getVerticalTags(vertical);
  const allArticles: DevToArticle[] = [];

  for (const tag of verticalTags) {
    const result = await getArticlesByTag(tag, { perPage: 20, top: 'month' });
    allArticles.push(...result.articles);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Filter articles that mention pain points
  const filtered = allArticles.filter((article) => {
    const text = `${article.title} ${article.description}`.toLowerCase();
    return painIndicators.some((indicator) => text.includes(indicator));
  });

  // Deduplicate
  return Array.from(new Map(filtered.map((a) => [a.id, a])).values());
}

/**
 * Map vertical to relevant DEV.to tags
 */
function getVerticalTags(vertical: string): string[] {
  const verticalLower = vertical.toLowerCase();

  if (verticalLower.includes('marketing')) {
    return ['marketing', 'seo', 'analytics', 'growth'];
  }
  if (verticalLower.includes('ecommerce') || verticalLower.includes('commerce')) {
    return ['ecommerce', 'shopify', 'stripe', 'payments'];
  }
  if (verticalLower.includes('fintech') || verticalLower.includes('finance')) {
    return ['fintech', 'finance', 'payments', 'blockchain'];
  }
  if (verticalLower.includes('legal')) {
    return ['legal', 'compliance', 'security', 'privacy'];
  }
  if (verticalLower.includes('edtech') || verticalLower.includes('education')) {
    return ['education', 'learning', 'edtech', 'tutorial'];
  }

  // Default tags for general SaaS hunting
  return ['saas', 'startup', 'productivity', 'automation'];
}
