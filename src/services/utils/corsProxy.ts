/**
 * CORS Proxy Utility
 *
 * Provides robust CORS proxy handling with multiple fallbacks
 * for making browser requests to APIs that don't support CORS.
 *
 * Proxy options (in order of reliability):
 * 1. corsproxy.io - Fast, reliable, supports JSON/XML/CSV
 * 2. allorigins.win - Good fallback, returns raw content
 * 3. codetabs proxy - Another reliable option
 */

// Proxy configurations with their URL formatters
interface ProxyConfig {
  name: string;
  formatUrl: (url: string) => string;
  parseResponse?: (response: Response) => Promise<Response>;
}

const CORS_PROXIES: ProxyConfig[] = [
  {
    // Primary - corsproxy.io is fast and reliable
    name: 'corsproxy.io',
    formatUrl: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  },
  {
    // Fallback 1 - AllOrigins
    name: 'allorigins.win',
    formatUrl: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    // Fallback 2 - Codetabs proxy
    name: 'codetabs',
    formatUrl: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  },
  {
    // Fallback 3 - Alternative format for corsproxy
    name: 'corsproxy-alt',
    formatUrl: (url: string) => `https://proxy.cors.sh/${url}`,
  },
];

// Track which proxy is currently working best
let currentProxyIndex = 0;
let proxyFailures: Map<string, number> = new Map();

// Reset failure counts periodically (every 5 minutes)
setInterval(() => {
  proxyFailures.clear();
}, 5 * 60 * 1000);

/**
 * Fetch a URL using CORS proxy with automatic fallback
 *
 * @param url - The URL to fetch
 * @param options - Fetch options (headers, etc.)
 * @returns Promise<Response>
 */
export async function fetchWithCorsProxy(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const errors: Error[] = [];

  // Try each proxy in order, starting with the one that's been working
  for (let attempt = 0; attempt < CORS_PROXIES.length; attempt++) {
    const proxyIndex = (currentProxyIndex + attempt) % CORS_PROXIES.length;
    const proxy = CORS_PROXIES[proxyIndex];

    // Skip proxies that have failed too many times recently
    const failures = proxyFailures.get(proxy.name) || 0;
    if (failures >= 3 && attempt < CORS_PROXIES.length - 1) {
      continue;
    }

    const proxiedUrl = proxy.formatUrl(url);

    try {
      const response = await fetch(proxiedUrl, {
        ...options,
        headers: {
          'Accept': 'application/json, text/html, */*',
          ...options.headers,
        },
      });

      if (response.ok) {
        // Success! Remember this proxy works
        currentProxyIndex = proxyIndex;
        // Reset failure count for this proxy
        proxyFailures.set(proxy.name, 0);
        return response;
      }

      // Non-OK response, try next proxy
      proxyFailures.set(proxy.name, failures + 1);
      errors.push(new Error(`${proxy.name} returned ${response.status}`));
    } catch (error) {
      // Network error, try next proxy
      proxyFailures.set(proxy.name, failures + 1);
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // All proxies failed
  throw new Error(
    `All CORS proxies failed for ${url}. Errors: ${errors.map(e => e.message).join(', ')}`
  );
}

/**
 * Fetch JSON through CORS proxy
 */
export async function fetchJsonWithCorsProxy<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithCorsProxy(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

/**
 * Fetch HTML through CORS proxy
 */
export async function fetchHtmlWithCorsProxy(
  url: string,
  options: RequestInit = {}
): Promise<string> {
  const response = await fetchWithCorsProxy(url, {
    ...options,
    headers: {
      'Accept': 'text/html',
      ...options.headers,
    },
  });
  return response.text();
}

/**
 * POST request through CORS proxy
 * Note: For POST requests, we try direct first (some APIs support CORS),
 * then fall back to proxy approaches
 */
export async function postWithCorsProxy<T = unknown>(
  url: string,
  body: unknown,
  options: RequestInit = {}
): Promise<T> {
  const errors: Error[] = [];

  // Strategy 1: Try direct POST (some APIs actually support CORS)
  try {
    const directResponse = await fetch(url, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });

    if (directResponse.ok) {
      return directResponse.json();
    }
  } catch (e) {
    // CORS error expected, continue to proxy
  }

  // Strategy 2: Try corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      method: 'POST',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return response.json();
    }
    errors.push(new Error(`corsproxy.io returned ${response.status}`));
  } catch (e) {
    errors.push(e instanceof Error ? e : new Error(String(e)));
  }

  // Strategy 3: AllOrigins with POST endpoint
  try {
    const allOriginsUrl = `https://api.allorigins.win/post?url=${encodeURIComponent(url)}`;
    const response = await fetch(allOriginsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: body }),
    });

    if (response.ok) {
      const result = await response.json();
      return JSON.parse(result.contents);
    }
  } catch (e) {
    errors.push(e instanceof Error ? e : new Error(String(e)));
  }

  // All strategies failed
  throw new Error(
    `POST request failed for ${url}. Errors: ${errors.map(e => e.message).join(', ')}`
  );
}

/**
 * Check if a URL needs a CORS proxy
 * (Some APIs support CORS natively)
 */
export function needsCorsProxy(url: string): boolean {
  const corsEnabledDomains = [
    'algolia.net', // HN search
    'api.stackexchange.com',
    'api.github.com',
    'dev.to',
    'hn.algolia.com',
  ];

  return !corsEnabledDomains.some(domain => url.includes(domain));
}

/**
 * Smart fetch - uses direct fetch for CORS-enabled APIs,
 * proxy for others
 */
export async function smartFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (needsCorsProxy(url)) {
    return fetchWithCorsProxy(url, options);
  }
  return fetch(url, options);
}

/**
 * Smart fetch JSON
 */
export async function smartFetchJson<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await smartFetch(url, options);
  return response.json();
}

/**
 * Get proxy status for debugging
 */
export function getProxyStatus(): {
  currentProxy: string;
  failures: Record<string, number>;
} {
  return {
    currentProxy: CORS_PROXIES[currentProxyIndex].name,
    failures: Object.fromEntries(proxyFailures),
  };
}
