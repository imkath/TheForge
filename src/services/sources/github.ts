/**
 * GitHub Issues Search API (100% Free)
 *
 * Uses GitHub's public search API - no authentication required for basic searches
 * Rate limit: 10 requests/minute for unauthenticated
 *
 * Great for finding:
 * - Feature requests in popular repos
 * - Bug reports and pain points
 * - Discussions about tools and workflows
 */

export interface GitHubIssue {
  id: number;
  title: string;
  body: string;
  url: string;
  user: string;
  state: string;
  comments: number;
  reactions: number;
  createdAt: string;
  labels: string[];
  repository: string;
}

export interface GitHubSearchResult {
  items: GitHubIssue[];
  source: 'github';
  query: string;
  totalCount: number;
}

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Search GitHub issues for pain points and feature requests
 */
export async function searchGitHubIssues(
  query: string,
  options: {
    perPage?: number;
    labels?: string[];
    state?: 'open' | 'closed' | 'all';
    sort?: 'comments' | 'reactions' | 'created' | 'updated';
  } = {}
): Promise<GitHubSearchResult> {
  const { perPage = 20, labels = [], state = 'open', sort = 'reactions' } = options;

  try {
    // Build search query
    let searchQuery = `${query} is:issue`;

    if (state !== 'all') {
      searchQuery += ` state:${state}`;
    }

    if (labels.length > 0) {
      searchQuery += ` ${labels.map(l => `label:"${l}"`).join(' ')}`;
    }

    const params = new URLSearchParams({
      q: searchQuery,
      per_page: perPage.toString(),
      sort,
      order: 'desc',
    });

    const response = await fetch(`${GITHUB_API_URL}/search/issues?${params}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.warn('[GitHub] Rate limit exceeded');
        return { items: [], source: 'github', query, totalCount: 0 };
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    const items: GitHubIssue[] = data.items.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      body: issue.body?.slice(0, 500) || '',
      url: issue.html_url,
      user: issue.user?.login || 'unknown',
      state: issue.state,
      comments: issue.comments || 0,
      reactions: issue.reactions?.total_count || 0,
      createdAt: issue.created_at,
      labels: issue.labels?.map((l: any) => l.name) || [],
      repository: issue.repository_url?.split('/').slice(-2).join('/') || '',
    }));

    return {
      items,
      source: 'github',
      query,
      totalCount: data.total_count,
    };
  } catch (error) {
    console.error('GitHub search failed:', error);
    return { items: [], source: 'github', query, totalCount: 0 };
  }
}

/**
 * Search for feature requests across popular repos
 */
export async function searchFeatureRequests(keywords: string[]): Promise<GitHubIssue[]> {
  const allItems: GitHubIssue[] = [];
  const featureLabels = ['enhancement', 'feature request', 'feature', 'help wanted'];

  for (const keyword of keywords.slice(0, 3)) {
    const result = await searchGitHubIssues(keyword, {
      labels: featureLabels,
      perPage: 15,
      sort: 'reactions',
    });
    allItems.push(...result.items);

    // Respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Deduplicate by ID
  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.sort((a, b) => b.reactions - a.reactions);
}

/**
 * Search for bug reports and pain points
 */
export async function searchBugReports(keywords: string[]): Promise<GitHubIssue[]> {
  const allItems: GitHubIssue[] = [];
  const painPhrases = ['bug', 'broken', 'not working', 'issue', 'problem'];

  for (const keyword of keywords.slice(0, 2)) {
    for (const phrase of painPhrases.slice(0, 2)) {
      const result = await searchGitHubIssues(`${keyword} ${phrase}`, {
        perPage: 10,
        sort: 'comments',
      });
      allItems.push(...result.items);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const unique = Array.from(
    new Map(allItems.map((item) => [item.id, item])).values()
  );

  return unique.filter((item) => item.comments >= 3);
}
