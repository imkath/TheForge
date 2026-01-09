/**
 * Cloudflare Worker - API Proxy
 *
 * Handles CORS-free requests to external APIs:
 * - IndieHackers (Algolia)
 * - Lobsters
 * - BetaList
 * - Reddit
 *
 * Deploy: wrangler deploy
 */

interface Env {
  // Environment variables can be added here if needed
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Algolia-Application-Id, X-Algolia-API-Key',
  'Access-Control-Max-Age': '86400',
};

// Rate limiting (simple in-memory, resets on worker restart)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Route requests to appropriate handler
      if (path.startsWith('/api/indiehackers')) {
        return await handleIndieHackers(request, url);
      }
      if (path.startsWith('/api/lobsters')) {
        return await handleLobsters(request, url);
      }
      if (path.startsWith('/api/betalist')) {
        return await handleBetaList(request, url);
      }
      if (path.startsWith('/api/reddit')) {
        return await handleReddit(request, url);
      }
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * IndieHackers - Algolia Search
 * POST /api/indiehackers/search
 */
async function handleIndieHackers(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const IH_ALGOLIA_APP_ID = 'N36RSOIVP9';
  const IH_ALGOLIA_SEARCH_KEY = '69e9e7ecb0654ce498f5e6a44b3d6243';

  try {
    const body = await request.json();
    const indexName = body.indexName || 'posts';
    const algoliaUrl = `https://${IH_ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${indexName}/query`;

    const response = await fetch(algoliaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': IH_ALGOLIA_APP_ID,
        'X-Algolia-API-Key': IH_ALGOLIA_SEARCH_KEY,
      },
      body: JSON.stringify({
        query: body.query || '',
        hitsPerPage: body.hitsPerPage || 20,
        attributesToRetrieve: body.attributesToRetrieve || [
          'objectID',
          'title',
          'body',
          'authorUsername',
          'votesCount',
          'commentsCount',
          'createdAt',
          'slug',
        ],
      }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('IndieHackers error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from IndieHackers' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Lobsters - JSON API
 * GET /api/lobsters/hottest
 * GET /api/lobsters/newest
 * GET /api/lobsters/tag/:tag
 */
async function handleLobsters(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const path = url.pathname.replace('/api/lobsters', '');
  let lobstersUrl: string;

  if (path === '/hottest' || path === '') {
    const page = url.searchParams.get('page') || '1';
    lobstersUrl = `https://lobste.rs/hottest.json?page=${page}`;
  } else if (path === '/newest') {
    const page = url.searchParams.get('page') || '1';
    lobstersUrl = `https://lobste.rs/newest.json?page=${page}`;
  } else if (path.startsWith('/tag/')) {
    const tag = path.replace('/tag/', '');
    const page = url.searchParams.get('page') || '1';
    lobstersUrl = `https://lobste.rs/t/${tag}.json?page=${page}`;
  } else {
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(lobstersUrl, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Lobsters error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from Lobsters' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * BetaList - HTML Scraping
 * GET /api/betalist/startups
 * GET /api/betalist/topics/:topic
 */
async function handleBetaList(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const path = url.pathname.replace('/api/betalist', '');
  let betalistUrl: string;

  if (path === '/startups' || path === '') {
    betalistUrl = 'https://betalist.com/startups';
  } else if (path.startsWith('/topics/')) {
    const topic = path.replace('/topics/', '');
    betalistUrl = `https://betalist.com/topics/${topic}`;
  } else {
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(betalistUrl, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; TheForge/1.0)',
      },
    });
    const html = await response.text();

    // Parse startups from HTML
    const startups = parseBetaListHTML(html);

    return new Response(JSON.stringify({ startups, source: 'betalist' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('BetaList error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from BetaList' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Parse BetaList HTML to extract startup data
 */
function parseBetaListHTML(html: string): Array<{
  id: string;
  name: string;
  tagline: string;
  url: string;
  category: string;
}> {
  const startups: Array<{
    id: string;
    name: string;
    tagline: string;
    url: string;
    category: string;
  }> = [];

  // Match startup cards - BetaList uses various patterns
  const patterns = [
    // Pattern 1: Article with startup class
    /<article[^>]*class="[^"]*startup[^"]*"[^>]*>([\s\S]*?)<\/article>/gi,
    // Pattern 2: Div with startup-card class
    /<div[^>]*class="[^"]*startup-card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    // Pattern 3: Link with startup info
    /<a[^>]*href="(\/startups\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
  ];

  // Try to find startup name/tagline pairs
  const nameRegex = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  const taglineRegex = /<p[^>]*class="[^"]*(?:tagline|description)[^"]*"[^>]*>([^<]+)<\/p>/gi;
  const linkRegex = /href="(\/startups\/([^"]+))"/gi;

  let match;
  const links: string[] = [];

  // Extract all startup links
  while ((match = linkRegex.exec(html)) !== null) {
    if (!links.includes(match[1])) {
      links.push(match[1]);
      const slug = match[2];
      startups.push({
        id: `betalist-${slug}`,
        name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        tagline: '',
        url: `https://betalist.com${match[1]}`,
        category: 'startup',
      });
    }
  }

  // Limit to avoid too many results
  return startups.slice(0, 20);
}

/**
 * Reddit - JSON API
 * GET /api/reddit/search?q=query&subreddit=optional&sort=relevance&t=month&limit=25
 * GET /api/reddit/r/:subreddit/hot
 */
async function handleReddit(request: Request, url: URL): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const path = url.pathname.replace('/api/reddit', '');
  let redditUrl: string;

  if (path === '/search' || path.startsWith('/search?')) {
    const query = url.searchParams.get('q') || '';
    const subreddit = url.searchParams.get('subreddit');
    const sort = url.searchParams.get('sort') || 'relevance';
    const time = url.searchParams.get('t') || 'month';
    const limit = url.searchParams.get('limit') || '25';

    if (subreddit) {
      redditUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=${sort}&t=${time}&limit=${limit}&restrict_sr=true`;
    } else {
      redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=${sort}&t=${time}&limit=${limit}`;
    }
  } else if (path.startsWith('/r/')) {
    // /r/:subreddit/hot or /r/:subreddit/top etc
    const parts = path.split('/').filter(Boolean);
    const subreddit = parts[1];
    const listing = parts[2] || 'hot';
    const limit = url.searchParams.get('limit') || '25';
    redditUrl = `https://www.reddit.com/r/${subreddit}/${listing}.json?limit=${limit}`;
  } else {
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(redditUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TheForge/1.0 (Micro-SaaS Research Tool)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit returned ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reddit error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from Reddit' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
