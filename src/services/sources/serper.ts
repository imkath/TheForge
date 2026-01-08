/**
 * Serper.dev API Service (2,500 free queries - HARD LIMIT)
 *
 * Fast Google Search API with structured results
 * Endpoint: https://google.serper.dev/search
 *
 * IMPORTANT: This service tracks usage locally to NEVER exceed the free tier.
 * Once 2,500 queries are used, Serper is disabled until manually reset.
 *
 * Source: https://serper.dev/
 */

// ============================================
// USAGE TRACKING SYSTEM
// ============================================

const SERPER_STORAGE_KEY = 'forge_serper_usage';
const SERPER_MAX_QUERIES = 2500;
const SERPER_SAFETY_BUFFER = 100; // Stop 100 queries before limit for safety

interface SerperUsage {
  count: number;
  firstUsed: number;
  lastUsed: number;
  disabled: boolean;
}

function getUsage(): SerperUsage {
  try {
    const stored = localStorage.getItem(SERPER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // localStorage not available or corrupted
  }
  return {
    count: 0,
    firstUsed: 0,
    lastUsed: 0,
    disabled: false,
  };
}

function saveUsage(usage: SerperUsage): void {
  try {
    localStorage.setItem(SERPER_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    console.warn('Could not save Serper usage to localStorage');
  }
}

function incrementUsage(): boolean {
  const usage = getUsage();

  // Check if already disabled
  if (usage.disabled) {
    console.warn('[Serper] DISABLED - Query limit reached. Use resetSerperUsage() to reset.');
    return false;
  }

  // Check if we've hit the safety limit
  if (usage.count >= SERPER_MAX_QUERIES - SERPER_SAFETY_BUFFER) {
    usage.disabled = true;
    saveUsage(usage);
    console.error(`[Serper] LIMIT REACHED! ${usage.count} queries used. Serper is now DISABLED.`);
    return false;
  }

  // Increment and save
  usage.count += 1;
  usage.lastUsed = Date.now();
  if (usage.firstUsed === 0) {
    usage.firstUsed = Date.now();
  }
  saveUsage(usage);

  // Log warning when approaching limit
  const remaining = SERPER_MAX_QUERIES - SERPER_SAFETY_BUFFER - usage.count;
  if (remaining <= 500) {
    console.warn(`[Serper] WARNING: Only ${remaining} queries remaining!`);
  }

  return true;
}

/**
 * Get current Serper usage statistics
 */
export function getSerperUsageStats(): {
  used: number;
  remaining: number;
  limit: number;
  disabled: boolean;
  percentUsed: number;
} {
  const usage = getUsage();
  const effectiveLimit = SERPER_MAX_QUERIES - SERPER_SAFETY_BUFFER;
  return {
    used: usage.count,
    remaining: Math.max(0, effectiveLimit - usage.count),
    limit: effectiveLimit,
    disabled: usage.disabled,
    percentUsed: Math.round((usage.count / effectiveLimit) * 100),
  };
}

/**
 * Reset Serper usage counter (use when you get new credits)
 */
export function resetSerperUsage(): void {
  const newUsage: SerperUsage = {
    count: 0,
    firstUsed: 0,
    lastUsed: 0,
    disabled: false,
  };
  saveUsage(newUsage);
  console.log('[Serper] Usage counter reset. You have 2,400 queries available.');
}

/**
 * Check if Serper can be used (configured AND has remaining queries)
 */
export function canUseSerper(): boolean {
  if (!isSerperConfigured()) {
    return false;
  }
  const usage = getUsage();
  return !usage.disabled && usage.count < SERPER_MAX_QUERIES - SERPER_SAFETY_BUFFER;
}

// ============================================
// API TYPES
// ============================================

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  date?: string;
  sitelinks?: { title: string; link: string }[];
}

export interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
}

export interface SerperSearchResult {
  organic: SerperOrganicResult[];
  news?: SerperNewsResult[];
  peopleAlsoAsk?: { question: string; snippet: string; link: string }[];
  relatedSearches?: string[];
  source: 'serper';
  query: string;
  credits?: number;
}

const SERPER_API_URL = 'https://google.serper.dev';

/**
 * Check if Serper API key is configured
 */
export function isSerperConfigured(): boolean {
  return !!import.meta.env.VITE_SERPER_API_KEY;
}

function getApiKey(): string | null {
  return import.meta.env.VITE_SERPER_API_KEY || null;
}

// ============================================
// CORE SEARCH FUNCTION (with usage tracking)
// ============================================

/**
 * Perform a Google search via Serper
 * AUTOMATICALLY tracks usage and blocks when limit reached
 */
export async function searchGoogle(
  query: string,
  options: {
    num?: number;
    gl?: string;
    hl?: string;
    type?: 'search' | 'news' | 'images';
  } = {}
): Promise<SerperSearchResult> {
  const apiKey = getApiKey();

  // Check configuration
  if (!apiKey) {
    console.warn('[Serper] API key not configured');
    return { organic: [], source: 'serper', query };
  }

  // CHECK USAGE LIMIT BEFORE MAKING REQUEST
  if (!canUseSerper()) {
    const stats = getSerperUsageStats();
    console.warn(`[Serper] BLOCKED - Limit reached (${stats.used}/${stats.limit} used)`);
    return { organic: [], source: 'serper', query };
  }

  // Increment usage BEFORE request (fail-safe)
  if (!incrementUsage()) {
    return { organic: [], source: 'serper', query };
  }

  const { num = 10, gl = 'us', hl = 'en', type = 'search' } = options;

  try {
    const endpoint =
      type === 'search'
        ? `${SERPER_API_URL}/search`
        : type === 'news'
        ? `${SERPER_API_URL}/news`
        : `${SERPER_API_URL}/images`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num,
        gl,
        hl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    const stats = getSerperUsageStats();
    console.log(`[Serper] Query successful. ${stats.remaining} queries remaining.`);

    return {
      organic: (data.organic || []).map((result: any, index: number) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: index + 1,
        date: result.date,
        sitelinks: result.sitelinks,
      })),
      news: data.news?.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        date: result.date,
        source: result.source,
        imageUrl: result.imageUrl,
      })),
      peopleAlsoAsk: data.peopleAlsoAsk,
      relatedSearches: data.relatedSearches?.map((r: any) => r.query),
      source: 'serper',
      query,
      credits: data.credits,
    };
  } catch (error) {
    console.error('[Serper] Search failed:', error);
    return { organic: [], source: 'serper', query };
  }
}

// ============================================
// SPECIALIZED SEARCH FUNCTIONS
// ============================================

/**
 * Search for pain points on specific platforms
 */
export async function searchPainPointsOnPlatform(
  vertical: string,
  platform: 'reddit' | 'twitter' | 'quora' | 'g2'
): Promise<SerperOrganicResult[]> {
  if (!canUseSerper()) return [];

  const siteQueries: Record<string, string> = {
    reddit: `site:reddit.com ${vertical} (frustrated OR "wish there was" OR "need tool" OR workaround)`,
    twitter: `site:twitter.com ${vertical} (frustrated OR annoying OR "looking for")`,
    quora: `site:quora.com ${vertical} (recommend OR alternative OR "best tool")`,
    g2: `site:g2.com ${vertical} review (cons OR missing OR "wish it had")`,
  };

  const query = siteQueries[platform];
  const result = await searchGoogle(query, { num: 15 });

  return result.organic;
}

/**
 * Search for recent news about a vertical
 */
export async function searchVerticalNews(vertical: string): Promise<SerperNewsResult[]> {
  if (!canUseSerper()) return [];

  const result = await searchGoogle(`${vertical} startup OR saas OR tool`, {
    type: 'news',
    num: 20,
  });

  return result.news || [];
}

/**
 * Search for competitor analysis
 */
export async function searchCompetitors(
  ideaKeywords: string
): Promise<{
  directCompetitors: SerperOrganicResult[];
  alternativesDiscussions: SerperOrganicResult[];
}> {
  if (!canUseSerper()) {
    return { directCompetitors: [], alternativesDiscussions: [] };
  }

  const competitorSearch = await searchGoogle(
    `${ideaKeywords} software tool saas`,
    { num: 10 }
  );

  const alternativesSearch = await searchGoogle(
    `${ideaKeywords} alternative OR "instead of" OR "better than"`,
    { num: 10 }
  );

  return {
    directCompetitors: competitorSearch.organic,
    alternativesDiscussions: alternativesSearch.organic,
  };
}

/**
 * Search multiple platforms for user complaints about a topic
 */
export async function aggregatePainPoints(vertical: string): Promise<{
  reddit: SerperOrganicResult[];
  quora: SerperOrganicResult[];
  forums: SerperOrganicResult[];
}> {
  if (!canUseSerper()) {
    return { reddit: [], quora: [], forums: [] };
  }

  // Run sequentially to control usage
  const reddit = await searchPainPointsOnPlatform(vertical, 'reddit');
  if (!canUseSerper()) return { reddit, quora: [], forums: [] };

  const quora = await searchPainPointsOnPlatform(vertical, 'quora');
  if (!canUseSerper()) return { reddit, quora, forums: [] };

  const forumsResult = await searchGoogle(
    `${vertical} forum (problem OR issue OR frustrated OR help)`,
    { num: 10 }
  );

  return { reddit, quora, forums: forumsResult.organic };
}

/**
 * Search for lead user signals (people building custom solutions)
 */
export async function searchLeadUserSignals(vertical: string): Promise<SerperOrganicResult[]> {
  if (!canUseSerper()) return [];

  const leadUserQueries = [
    `${vertical} "python script" OR "built my own" OR "custom solution"`,
    `${vertical} "google sheets" OR "excel macro" OR "airtable"`,
    `${vertical} "zapier" OR "make.com" OR "n8n" automation`,
  ];

  const allResults: SerperOrganicResult[] = [];

  for (const query of leadUserQueries) {
    if (!canUseSerper()) break;

    const result = await searchGoogle(query, { num: 10 });
    allResults.push(...result.organic);

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return Array.from(new Map(allResults.map((r) => [r.link, r])).values());
}
